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
// holds the next version while it is developed (1.0.0 before the first release). The checks see
// GitHub's state: the script fetches `origin` with its tags first, so a tag that exists only there
// counts, and a `main` that lacks commits of `origin/main` is refused — its pushed tag would
// publish a commit that is not on `main` (audit M18).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RELEASE_VERSION, syncVersion } from './sync-version.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');
/** Releases are cut from here: the release workflow builds the tagged commit of this branch. */
export const RELEASE_BRANCH = 'main';
/** The remote whose release branch and tags a release must build on — GitHub. */
export const RELEASE_REMOTE = 'origin';
const UNRELEASED = 'Unreleased';
const UNRELEASED_HEADING = `## [${UNRELEASED}]`;
/** A release tag: `v` and a release version (the pattern of RELEASE_VERSION without its anchors). */
const RELEASE_TAG = new RegExp(`^v(${RELEASE_VERSION.source.slice(1, -1)})$`);
/** A commit email that keeps private addresses out of the history: `<id>+<login>@users.noreply.github.com`. */
const NOREPLY_EMAIL = /^\d+\+[A-Za-z0-9-]+@users\.noreply\.github\.com$/;

// --- Versions and tags --------------------------------------------------------------------

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

// --- CHANGELOG ----------------------------------------------------------------------------

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

/** A date in the local time zone the way the CHANGELOG writes it: `YYYY-MM-DD`. */
export function formatDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// --- Release checks -----------------------------------------------------------------------

/** Whether a commit email is a GitHub noreply address with id and login. */
export function isNoreplyEmail(email) {
  return NOREPLY_EMAIL.test(email);
}

/** Why `version` cannot be released next to these tags — empty when it can. */
export function findVersionProblems(version, tags) {
  if (typeof version !== 'string' || !RELEASE_VERSION.test(version)) {
    return [`${JSON.stringify(version)} is not a release version — use x.y.z without leading zeros, e.g. 1.0.0`];
  }
  if (tags.includes(`v${version}`)) {
    return [`the tag v${version} exists already`];
  }
  const latest = findLatestRelease(tags);
  if (latest !== undefined && compareVersions(version, latest) <= 0) {
    return [`${version} is not higher than the latest release ${latest}`];
  }
  return [];
}

/** Why the repository is not ready for a release — branch, remote state, changes, commit email. */
function findRepositoryProblems(state) {
  const { branch, fetchError, hasRemoteBranch, isDirty, email } = state;
  const remoteBranch = `${RELEASE_REMOTE}/${RELEASE_BRANCH}`;
  const problems = [];
  if (branch !== RELEASE_BRANCH) {
    problems.push(`releases are cut from ${RELEASE_BRANCH}, not from ${JSON.stringify(branch)}`);
  }
  if (fetchError !== undefined) {
    problems.push(`${RELEASE_REMOTE} cannot be fetched (${fetchError}) — a release needs GitHub's current state`);
  } else if (!hasRemoteBranch) {
    problems.push(`HEAD lacks commits of ${remoteBranch} (behind or diverged) — pull first`);
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
  return problems;
}

/** Why the CHANGELOG cannot be released: no "Unreleased" section, or an empty one. */
function findChangelogProblems(unreleased) {
  if (unreleased === undefined) {
    return [`CHANGELOG.md has no "${UNRELEASED_HEADING}" section`];
  }
  return unreleased === ''
    ? [`the "${UNRELEASED_HEADING}" section of CHANGELOG.md is empty — note the changes first`]
    : [];
}

/**
 * Why a release cannot be cut, one message per reason — empty when it can. `state` holds the
 * requested version, the repository's tags (after the fetch), branch, the fetch's error message
 * (`undefined` when it worked), whether HEAD contains the remote release branch, uncommitted
 * changes, the commit email, and what the CHANGELOG's "Unreleased" section holds.
 */
export function findReleaseProblems(state) {
  return [
    ...findVersionProblems(state.version, state.tags),
    ...findRepositoryProblems(state),
    ...findChangelogProblems(state.unreleased)
  ];
}

// --- Repository state (git) ---------------------------------------------------------------

/** Runs git in `cwd` and returns its trimmed output; a failing git throws with its stderr. */
function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
}

/** The first line git wrote to stderr — the reason a git command failed. */
function describeGitError(error) {
  const stderr = String(error?.stderr ?? '').trim();
  return stderr === '' ? String(error?.message ?? error) : stderr.split('\n')[0];
}

/**
 * Fetches the release remote with its tags into the repository at `cwd`. Returns why it failed,
 * or `undefined` when it worked — a failed fetch refuses the release instead of checking stale
 * state.
 */
export function fetchRemote(cwd = ROOT) {
  try {
    git(['fetch', '--quiet', '--tags', RELEASE_REMOTE], cwd);
    return undefined;
  } catch (error) {
    return describeGitError(error);
  }
}

/**
 * Whether HEAD contains the release branch as last fetched from the remote: being ahead is fine
 * (the atomic push sends those commits along), being behind or diverged is not.
 */
export function includesRemoteBranch(cwd = ROOT) {
  try {
    git(['merge-base', '--is-ancestor', `${RELEASE_REMOTE}/${RELEASE_BRANCH}`, 'HEAD'], cwd);
    return true;
  } catch {
    // Exit code 1: not an ancestor; 128: no such branch — either way not safe to release
    return false;
  }
}

/** The release tags of the repository at `cwd` (`v*`). */
export function readTags(cwd = ROOT) {
  return git(['tag', '--list', 'v*'], cwd)
    .split('\n')
    .filter((tag) => tag !== '');
}

/** The commit email git would use; empty when none is set. */
function readEmail() {
  try {
    return git(['config', 'user.email'], ROOT);
  } catch {
    // `git config` exits with 1 when the key is not set
    return '';
  }
}

/** The repository's state after fetching the remote, for `findReleaseProblems`. */
function readState(version) {
  const fetchError = fetchRemote(ROOT);
  return {
    version,
    tags: readTags(ROOT),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], ROOT),
    fetchError,
    hasRemoteBranch: fetchError === undefined && includesRemoteBranch(ROOT),
    isDirty: git(['status', '--porcelain'], ROOT) !== '',
    email: readEmail(),
    unreleased: readUnreleased(readFileSync(CHANGELOG, 'utf8'))
  };
}

// --- Command line -------------------------------------------------------------------------

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
  // A mistyped version is refused before anything is fetched or read
  const problems = RELEASE_VERSION.test(version ?? '')
    ? findReleaseProblems(readState(version))
    : findVersionProblems(version, []);
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
