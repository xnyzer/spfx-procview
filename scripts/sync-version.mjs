// One version for the whole solution (F-009) — dependency-free. package.json holds it; SharePoint
// reads the version of the solution and of every feature from config/package-solution.json, with
// four parts (`x.y.z.0`), and the App Catalog only treats a package as an update when it is higher.
//
//   node scripts/sync-version.mjs          write package.json's version into package-solution.json
//   node scripts/sync-version.mjs --check  fail if package-solution.json differs (`just check`)
//   … --package <file> --solution <file>   use other files (tests)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_JSON = join(ROOT, 'package.json');
const SOLUTION_JSON = join(ROOT, 'config', 'package-solution.json');

/**
 * A release version: `x.y.z`, the Semantic Versioning core — digits only, no leading zeros (npm
 * would turn `1.0.01` into `1.0.1` behind the tag's back), and no pre-release, for which the
 * solution version has no room.
 */
export const RELEASE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** The four-part solution version of a release version: `x.y.z` → `x.y.z.0`. */
export function toSolutionVersion(version) {
  if (typeof version !== 'string' || !RELEASE_VERSION.test(version)) {
    throw new Error(`${JSON.stringify(version)} is not a release version (x.y.z)`);
  }
  return `${version}.0`;
}

/** Every version in a parsed package-solution.json: the solution's and each feature's. */
export function listSolutionVersions(solutionFile) {
  const solution = solutionFile.solution ?? {};
  const features = Array.isArray(solution.features) ? solution.features : [];
  return [
    { where: 'solution.version', version: solution.version },
    ...features.map((feature, index) => ({ where: `solution.features[${index}].version`, version: feature.version }))
  ];
}

/** What does not match package.json's version, one message per place. */
export function findMismatches(version, solutionFile) {
  const expected = toSolutionVersion(version);
  return listSolutionVersions(solutionFile)
    .filter((entry) => entry.version !== expected)
    .map((entry) => `${entry.where} is ${JSON.stringify(entry.version)}, expected "${expected}"`);
}

/**
 * The text of package-solution.json with every version set to `version` — written the way the
 * file is formatted (two spaces, final line break), which Prettier keeps checking.
 */
export function setSolutionVersions(text, version) {
  const expected = toSolutionVersion(version);
  const solutionFile = JSON.parse(text);
  if (!solutionFile.solution) {
    throw new Error('package-solution.json has no "solution"');
  }
  solutionFile.solution.version = expected;
  (solutionFile.solution.features ?? []).forEach((feature) => {
    feature.version = expected;
  });
  return `${JSON.stringify(solutionFile, null, 2)}\n`;
}

/** Writes package.json's version into package-solution.json; true when the file changed. */
export function syncVersion(packageFile = PACKAGE_JSON, solutionFile = SOLUTION_JSON) {
  const { version } = JSON.parse(readFileSync(packageFile, 'utf8'));
  const before = readFileSync(solutionFile, 'utf8');
  const after = setSolutionVersions(before, version);
  if (after !== before) {
    writeFileSync(solutionFile, after);
  }
  return after !== before;
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function check(packageFile, solutionFile) {
  const { version } = JSON.parse(readFileSync(packageFile, 'utf8'));
  const mismatches = findMismatches(version, JSON.parse(readFileSync(solutionFile, 'utf8')));
  if (mismatches.length > 0) {
    console.error(
      `Version check failed — package.json says ${version}:\n` +
        `${mismatches.map((problem) => `  - ${problem}`).join('\n')}\n` +
        'Run `node scripts/sync-version.mjs`; releases set the version with `just release`.'
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Version ${version} is the same everywhere.`);
}

function main() {
  // --package / --solution: other files instead of the project's (tests)
  const packageFile = readOption(process.argv, '--package') ?? PACKAGE_JSON;
  const solutionFile = readOption(process.argv, '--solution') ?? SOLUTION_JSON;
  try {
    if (process.argv.includes('--check')) {
      check(packageFile, solutionFile);
      return;
    }
    const changed = syncVersion(packageFile, solutionFile);
    console.log(changed ? 'package-solution.json updated to the version in package.json.' : 'Version already set.');
  } catch (error) {
    console.error(`Version sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
