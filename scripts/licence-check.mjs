// Licence gate (CODING-STANDARDS §8, ADR-0001) — dependency-free, on npm's own `npm query`:
//
//   1. every installed package (runtime and build) is under a permissive licence; an SPDX `OR`
//      expression passes when one option is permissive, `AND` needs all parts to be;
//   2. THIRD-PARTY-NOTICES.md names the exact versions of the third-party code compiled into the
//      web part bundle.
//
//   node scripts/licence-check.mjs                 check the installed packages (`just check`)
//   node scripts/licence-check.mjs --input <file>  check a saved `npm query '*'` output instead
//
// Unknown or missing licences fail — the allow-list is the rule, not a list of forbidden ones.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTICES = join(ROOT, 'THIRD-PARTY-NOTICES.md');
/** Upper bound for the `npm query` output (about 1 MB per 400 packages today). */
const QUERY_BUFFER_BYTES = 64 * 1024 * 1024;

/** Permissive SPDX licences accepted everywhere. */
export const PERMISSIVE = new Set([
  '0BSD',
  'Apache-2.0',
  'BlueOak-1.0.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'Python-2.0',
  'Unlicense',
  'Zlib'
]);

/** Non-SPDX spellings found in package metadata, mapped to their SPDX id. */
const ALIASES = new Map([['MIT/X11', 'MIT']]);

/** Microsoft's SharePoint Framework licence terms — accepted for Microsoft's packages only (ADR-0001). */
const SPFX_LICENCE = 'https://aka.ms/spfx/license';

/** Packages without licence metadata, accepted one by one with the reason. */
export const MISSING_LICENCE_EXCEPTIONS = new Map([
  [
    '@microsoft/microsoft-graph-client',
    'SPFx build of the MIT-licensed Graph client; SharePoint provides it at runtime (ADR-0001)'
  ]
]);

/** Third-party packages compiled into the bundle — each needs its notice (by location in node_modules). */
export const BUNDLED = [
  { name: 'tslib', location: 'node_modules/tslib' },
  {
    name: '@microsoft/load-themed-styles',
    location: 'node_modules/@microsoft/sp-css-loader/node_modules/@microsoft/load-themed-styles'
  }
];

/** The licence of a package as one SPDX expression, or `undefined` when it declares none. */
export function licenceOf(pkg) {
  const declared = pkg.license ?? pkg.licenses;
  if (Array.isArray(declared)) {
    const names = declared.map((entry) => (typeof entry === 'string' ? entry : entry?.type)).filter(Boolean);
    return names.length > 0 ? names.join(' OR ') : undefined;
  }
  if (declared && typeof declared === 'object') {
    return declared.type;
  }
  return typeof declared === 'string' && declared.trim() !== '' ? declared.trim() : undefined;
}

/**
 * Whether an SPDX expression can be used under permissive terms. `WITH` exceptions only add
 * permissions, so they do not change the result. Throws on an expression it cannot parse.
 */
export function isPermissive(expression) {
  const tokens = expression.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').trim().split(/\s+/);
  let position = 0;

  function parseAtom() {
    const token = tokens[position++];
    if (token === '(') {
      const value = parseOr();
      if (tokens[position++] !== ')') {
        throw new Error(`cannot parse licence "${expression}"`);
      }
      return value;
    }
    if (token === undefined || token === ')' || token === 'AND' || token === 'OR') {
      throw new Error(`cannot parse licence "${expression}"`);
    }
    if (tokens[position] === 'WITH') {
      position += 2;
    }
    return PERMISSIVE.has(ALIASES.get(token) ?? token);
  }

  function parseAnd() {
    let value = parseAtom();
    while (tokens[position] === 'AND') {
      position++;
      const right = parseAtom();
      value = value && right;
    }
    return value;
  }

  function parseOr() {
    let value = parseAnd();
    while (tokens[position] === 'OR') {
      position++;
      const right = parseAnd();
      value = value || right;
    }
    return value;
  }

  const result = parseOr();
  if (position !== tokens.length) {
    throw new Error(`cannot parse licence "${expression}"`);
  }
  return result;
}

/** Why a package breaks the licence rule, or `undefined` when it is fine. */
export function licenceProblem(pkg) {
  const licence = licenceOf(pkg);
  if (licence === undefined) {
    return MISSING_LICENCE_EXCEPTIONS.has(pkg.name) ? undefined : 'declares no licence';
  }
  if (licence === SPFX_LICENCE) {
    return pkg.name.indexOf('@microsoft/') === 0 ? undefined : `uses the SPFx licence terms (${licence})`;
  }
  try {
    return isPermissive(licence) ? undefined : `is not permissive (${licence})`;
  } catch (error) {
    return error.message;
  }
}

/** Problems of all packages and of the notices file — empty when everything is fine. */
export function findProblems(packages, notices) {
  const problems = [];
  const seen = new Set();
  packages.forEach((pkg) => {
    const id = `${pkg.name}@${pkg.version}`;
    const problem = seen.has(id) ? undefined : licenceProblem(pkg);
    seen.add(id);
    if (problem) {
      problems.push(`${id} ${problem}`);
    }
  });
  BUNDLED.forEach(({ name, location }) => {
    const pkg = packages.find((candidate) => candidate.location === location);
    if (!pkg) {
      problems.push(`bundled ${name} not found at ${location} — update BUNDLED in scripts/licence-check.mjs`);
    } else if (notices.indexOf(`## ${name} ${pkg.version}\n`) < 0) {
      problems.push(`THIRD-PARTY-NOTICES.md has no section "## ${name} ${pkg.version}"`);
    }
  });
  return problems;
}

function readPackages(argv) {
  const inputIndex = argv.indexOf('--input');
  const json =
    inputIndex >= 0
      ? readFileSync(argv[inputIndex + 1], 'utf8')
      : execFileSync('npm', ['query', '*'], { cwd: ROOT, encoding: 'utf8', maxBuffer: QUERY_BUFFER_BYTES });
  return JSON.parse(json);
}

function main() {
  const packages = readPackages(process.argv);
  const problems = findProblems(packages, readFileSync(NOTICES, 'utf8'));
  if (problems.length > 0) {
    console.error(`Licence check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  const count = new Set(packages.map((pkg) => `${pkg.name}@${pkg.version}`)).size;
  console.log(`Licences are fine (${count} packages); third-party notices match the bundle.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
