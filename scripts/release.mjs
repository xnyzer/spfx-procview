// Release preparation for `just release x.y.z` (F-009, README "Versioning and releases") —
// dependency-free. It refuses a release that cannot be cut, then sets the version (package.json
// and its lock with npm, package-solution.json with sync-version.mjs) and turns the CHANGELOG's
// "Unreleased" section into the release's section. The recipe then runs `just check`, commits and
// tags — nothing here commits, tags or pushes.
//
//   node scripts/release.mjs x.y.z                prepare release x.y.z (`just release`)
//   node scripts/release.mjs --notes x.y.z        print its CHANGELOG section (release workflow)
//   node scripts/release.mjs --notes Unreleased   print the unreleased changes (its dry run)
//   … --notes <name> --changelog <file>           read another CHANGELOG (tests)
//
// A release must be higher than the latest `vx.y.z` tag — not than package.json, which already
// holds the next version while it is developed (1.0.0 before the first release).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RELEASE_VERSION, syncVersion } from './sync-version.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');
/** Releases are cut from here: the release workflow builds the tagged commit of this branch. */
export const RELEASE_BRANCH = 'main';
const UNRELEASED = 'Unreleased';
const UNRELEASED_HEADING = `## [${UNRELEASED}]`;
const RELEASE_TAG = /^v(\d+\.\d+\.\d+)$/;
/** A commit email that keeps private addresses out of the history: `<id>+<login>@users.noreply.github.com`. */
const NOREPLY_EMAIL = /^\d+\+[A-Za-z0-9-]+@users\.noreply\.github\.com$/;

/** Compares two release versions part by part: negative, zero or positive. */
export function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

/** The highest version among the release tags (`vx.y.z`), or `undefined` before the first release. */
export function findLatestRelease(tags) {
  return tags
    .map((tag) => RELEASE_TAG.exec(tag.trim())?.[1])
    .filter((version) => version !== undefined)
    .sort(compareVersions)
    .pop();
}

/** Whether a commit email is a GitHub noreply address with id and login. */
export function isNoreplyEmail(email) {
  return NOREPLY_EMAIL.test(email);
}

/** The line of the heading `## [name]` — `Unreleased` or a version (`## [1.0.0] - 2026-10-02`). */
function findSectionHeading(lines, name) {
  const heading = `## [${name}]`;
  return lines.findIndex((line) => line.trim() === heading || line.startsWith(`${heading} `));
}

/** What the section `## [name]` holds (without its heading, trimmed), or `undefined` without it. */
export function readSection(changelog, name) {
  const lines = changelog.split('\n');
  const start = findSectionHeading(lines, name);
  if (start < 0) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** What "Unreleased" holds, or `undefined` without such a section. */
export function readUnreleased(changelog) {
  return readSection(changelog, UNRELEASED);
}

/**
 * The release notes of a version, or the unreleased changes for the release workflow's dry run.
 * Throws when there is no such section, or when a release's section is empty.
 */
export function readReleaseNotes(changelog, name) {
  const isRelease = typeof name === 'string' && RELEASE_VERSION.test(name);
  if (!isRelease && name !== UNRELEASED) {
    throw new Error(`${JSON.stringify(name)} is neither a release version (x.y.z) nor ${UNRELEASED}`);
  }
  const notes = readSection(changelog, name);
  if (notes === undefined) {
    throw new Error(`CHANGELOG.md has no "## [${name}]" section`);
  }
  if (isRelease && notes === '') {
    throw new Error(`the "## [${name}]" section of CHANGELOG.md is empty`);
  }
  return notes;
}

/**
 * The changelog with the entries of "Unreleased" under `## [x.y.z] - date`; "Unreleased" stays on
 * top, empty, for the next changes.
 */
export function moveUnreleased(changelog, version, date) {
  const lines = changelog.split('\n');
  const start = findSectionHeading(lines, UNRELEASED);
  if (start < 0) {
    throw new Error(`CHANGELOG.md has no "${UNRELEASED_HEADING}" section`);
  }
  return [...lines.slice(0, start + 1), '', `## [${version}] - ${date}`, ...lines.slice(start + 1)].join('\n');
}

/**
 * Why a release cannot be cut, one message per reason — empty when it can. `state` holds the
 * requested version, the repository's tags, branch, uncommitted changes and commit email, and
 * what the CHANGELOG's "Unreleased" section holds.
 */
export function findReleaseProblems(state) {
  const { version, tags, branch, isDirty, email, unreleased } = state;
  const problems = [];
  if (typeof version !== 'string' || !RELEASE_VERSION.test(version)) {
    problems.push(`${JSON.stringify(version)} is not a release version — use x.y.z, e.g. 1.0.0`);
  } else {
    const latest = findLatestRelease(tags);
    if (tags.includes(`v${version}`)) {
      problems.push(`the tag v${version} exists already`);
    } else if (latest !== undefined && compareVersions(version, latest) <= 0) {
      problems.push(`${version} is not higher than the latest release ${latest}`);
    }
  }
  if (branch !== RELEASE_BRANCH) {
    problems.push(`releases are cut from ${RELEASE_BRANCH}, not from ${JSON.stringify(branch)}`);
  }
  if (isDirty) {
    problems.push('the working tree has uncommitted changes — commit or stash them first');
  }
  if (!isNoreplyEmail(email)) {
    problems.push(
      `the commit email ${JSON.stringify(email)} is not a GitHub noreply address ` +
        '(<id>+<login>@users.noreply.github.com, see `git config --local user.email`)'
    );
  }
  if (unreleased === undefined) {
    problems.push(`CHANGELOG.md has no "${UNRELEASED_HEADING}" section`);
  } else if (unreleased === '') {
    problems.push(`the "${UNRELEASED_HEADING}" section of CHANGELOG.md is empty — note the changes first`);
  }
  return problems;
}

/** A date in the local time zone the way the CHANGELOG writes it: `YYYY-MM-DD`. */
export function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

/** The commit email git would use; empty when none is set. */
function readEmail() {
  try {
    return git(['config', 'user.email']);
  } catch {
    return '';
  }
}

function readState(version) {
  return {
    version,
    tags: git(['tag', '--list', 'v*'])
      .split('\n')
      .filter((tag) => tag !== ''),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    isDirty: git(['status', '--porcelain']) !== '',
    email: readEmail(),
    unreleased: readUnreleased(readFileSync(CHANGELOG, 'utf8'))
  };
}

/** Prints the release notes for `--notes`; a missing or empty section fails with exit code 1. */
function printReleaseNotes(name, changelogFile) {
  try {
    process.stdout.write(`${readReleaseNotes(readFileSync(changelogFile, 'utf8'), name)}\n`);
  } catch (error) {
    console.error(`Release notes failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

function readOption(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function main() {
  if (process.argv[2] === '--notes') {
    printReleaseNotes(process.argv[3], readOption(process.argv, '--changelog') ?? CHANGELOG);
    return;
  }
  const version = process.argv[2];
  const problems = findReleaseProblems(readState(version));
  if (problems.length > 0) {
    console.error(`Release refused:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  execFileSync('npm', ['version', version, '--no-git-tag-version', '--allow-same-version'], {
    cwd: ROOT,
    stdio: 'inherit'
  });
  syncVersion();
  writeFileSync(CHANGELOG, moveUnreleased(readFileSync(CHANGELOG, 'utf8'), version, formatDate(new Date())));
  console.log(`Release ${version} prepared: package.json, package-lock.json, package-solution.json, CHANGELOG.md.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
