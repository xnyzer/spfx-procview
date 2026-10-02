// Release preparation for `just release x.y.z` (F-009, README "Versioning and releases") —
// dependency-free. It refuses a release that cannot be cut, then sets the version (package.json
// and its lock with npm, package-solution.json with sync-version.mjs) and turns the CHANGELOG's
// "Unreleased" section into the release's section. The recipe then runs `just check`, commits and
// tags — nothing here commits, tags or pushes.
//
//   node scripts/release.mjs x.y.z
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
const UNRELEASED_HEADING = '## [Unreleased]';
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

function findUnreleasedHeading(lines) {
  return lines.findIndex((line) => line.trim() === UNRELEASED_HEADING);
}

/** What "Unreleased" holds (without its heading, trimmed), or `undefined` without such a section. */
export function readUnreleased(changelog) {
  const lines = changelog.split('\n');
  const start = findUnreleasedHeading(lines);
  if (start < 0) {
    return undefined;
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

/**
 * The changelog with the entries of "Unreleased" under `## [x.y.z] - date`; "Unreleased" stays on
 * top, empty, for the next changes.
 */
export function moveUnreleased(changelog, version, date) {
  const lines = changelog.split('\n');
  const start = findUnreleasedHeading(lines);
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

function main() {
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
