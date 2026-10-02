// Licence gate (CODING-STANDARDS §8, ADR-0001) — dependency-free, on npm's own `npm query`:
//
//   1. every installed package (runtime and build) is under a permissive licence; an SPDX `OR`
//      expression passes when one option is permissive, `AND` needs all parts to be;
//   2. THIRD-PARTY-NOTICES.md has a section with the exact version of every third-party package
//      compiled into the web part bundle, and no section for anything else. The bundled packages
//      come from the build's source map in dist/, which `just test` writes before this runs.
//
//   node scripts/licence-check.mjs                  check the installed packages (`just check`)
//   node scripts/licence-check.mjs --input <file>   check a saved `npm query '*'` output instead
//   node scripts/licence-check.mjs --dist <folder>  read the source maps from another folder
//
// Unknown or missing licences fail — the allow-list is the rule, not a list of forbidden ones.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTICES = join(ROOT, 'THIRD-PARTY-NOTICES.md');
/** Where the build writes the web part bundle and its source map. */
const DIST = join(ROOT, 'dist');
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

/**
 * Package folders (e.g. `node_modules/@scope/name`, nested ones included) of the third-party code
 * in a webpack source map — the code the SharePoint Framework build compiled into the bundle.
 */
export function findBundledLocations(sourceMap) {
  const locations = new Set();
  (sourceMap.sources ?? []).forEach((source) => {
    const start = source.indexOf('node_modules/');
    if (start < 0) {
      return;
    }
    const segments = source.slice(start).split('/');
    let end = 0;
    while (segments[end] === 'node_modules' && segments[end + 1]) {
      end += segments[end + 1].indexOf('@') === 0 ? 3 : 2;
    }
    locations.add(segments.slice(0, end).join('/'));
  });
  return [...locations];
}

/** The package folders of all source maps in `dist`, or `undefined` when there is none. */
export function readBundledLocations(dist) {
  const maps = existsSync(dist) ? readdirSync(dist).filter((name) => name.endsWith('.js.map')) : [];
  if (maps.length === 0) {
    return undefined;
  }
  const locations = new Set();
  maps.forEach((name) =>
    findBundledLocations(JSON.parse(readFileSync(join(dist, name), 'utf8'))).forEach((location) =>
      locations.add(location)
    )
  );
  return [...locations];
}

/** The `## <name> <version>` sections of THIRD-PARTY-NOTICES.md. */
export function parseNoticeSections(notices) {
  return notices
    .split('\n')
    .map((line) => /^## (\S+) (\S+)$/.exec(line))
    .filter(Boolean)
    .map(([, name, version]) => ({ name, version }));
}

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

/** Problems with the licences of `packages`. */
function findLicenceProblems(packages) {
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
  return problems;
}

/** Problems between the notices file and the packages at the bundled locations — both ways. */
function findNoticeProblems(packages, notices, bundled) {
  const problems = [];
  const bundledPackages = [];
  bundled.forEach((location) => {
    const pkg = packages.find((candidate) => candidate.location === location);
    if (!pkg) {
      problems.push(`the bundle contains code from ${location}, which is no installed package`);
    } else {
      bundledPackages.push(pkg);
      if (notices.indexOf(`## ${pkg.name} ${pkg.version}\n`) < 0) {
        problems.push(`THIRD-PARTY-NOTICES.md has no section "## ${pkg.name} ${pkg.version}" for code in the bundle`);
      }
    }
  });
  parseNoticeSections(notices).forEach(({ name, version }) => {
    if (!bundledPackages.some((pkg) => pkg.name === name && pkg.version === version)) {
      problems.push(`THIRD-PARTY-NOTICES.md lists ${name} ${version}, which is not in the bundle`);
    }
  });
  return problems;
}

/**
 * Problems of all packages and of the notices file — empty when everything is fine. `bundled`
 * holds the package folders of the code in the bundle (`findBundledLocations`).
 */
export function findProblems(packages, notices, bundled) {
  return findLicenceProblems(packages).concat(findNoticeProblems(packages, notices, bundled));
}

/** The value after a command-line option, or `undefined`. */
function readOption(argv, option) {
  const index = argv.indexOf(option);
  return index >= 0 ? argv[index + 1] : undefined;
}

function readPackages(argv) {
  const input = readOption(argv, '--input');
  const json = input
    ? readFileSync(input, 'utf8')
    : execFileSync('npm', ['query', '*'], { cwd: ROOT, encoding: 'utf8', maxBuffer: QUERY_BUFFER_BYTES });
  return JSON.parse(json);
}

function main() {
  const dist = readOption(process.argv, '--dist') ?? DIST;
  const bundled = readBundledLocations(dist);
  if (!bundled) {
    console.error(`Licence check failed: no source map in ${dist} — build first (\`just test\` writes it)`);
    process.exitCode = 1;
    return;
  }
  const packages = readPackages(process.argv);
  const problems = findProblems(packages, readFileSync(NOTICES, 'utf8'), bundled);
  if (problems.length > 0) {
    console.error(`Licence check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  const count = new Set(packages.map((pkg) => `${pkg.name}@${pkg.version}`)).size;
  console.log(
    `Licences are fine (${count} packages); third-party notices match the bundle (${bundled.length} packages).`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
