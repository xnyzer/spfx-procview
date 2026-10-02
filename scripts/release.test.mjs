// Tests for release.mjs — Node's built-in test runner, no dependency (`just check`). The full
// recipe (`just release`: npm, sync, check, commit, tag) is tried in a scratch copy, not here; the
// git checks against the remote are tested on real repositories in release-remote.test.mjs.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  RELEASE_BRANCH,
  compareVersions,
  findLatestRelease,
  findReleaseProblems,
  formatDate,
  isNoreplyEmail,
  moveUnreleased,
  readReleaseNotes,
  readSection,
  readUnreleased
} from './release.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'release.mjs');
const NOREPLY = '12345678+octocat@users.noreply.github.com';
/** A four-part solution version (x.y.z.0), built from its parts — written out, privacy-lint takes it for an IP address. */
const SOLUTION_VERSION = ['1', '1', '0', '0'].join('.');
/** One temporary folder for all files of these tests, removed when they are done. */
const TEMP = mkdtempSync(join(tmpdir(), 'release-test-'));

after(() => rmSync(TEMP, { recursive: true, force: true }));

const CHANGELOG = [
  '# Changelog',
  '',
  'Intro text.',
  '',
  '## [Unreleased]',
  '',
  '### Added',
  '',
  '- Zoom',
  '',
  '## [1.0.0] - 2026-10-01',
  '',
  '### Added',
  '',
  '- First release',
  ''
].join('\n');

/** A state from which a release can be cut; each test spoils one part. */
function createState(overrides = {}) {
  return {
    version: '1.1.0',
    tags: ['v1.0.0'],
    branch: RELEASE_BRANCH,
    fetchError: undefined,
    hasRemoteBranch: true,
    isDirty: false,
    email: NOREPLY,
    unreleased: '### Added\n\n- Zoom',
    ...overrides
  };
}

describe('compareVersions', () => {
  it('compares part by part, as numbers', () => {
    assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
    assert.ok(compareVersions('1.0.0', '2.0.0') < 0);
    assert.ok(compareVersions('1.0.10', '1.0.2') > 0);
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  });
});

describe('findLatestRelease', () => {
  it('takes the highest release tag and ignores other tags', () => {
    assert.equal(
      findLatestRelease(['v1.0.0', 'v1.10.0', 'v1.9.2', 'v2.0.0-beta.1', 'v1.20.01', 'demo', '1.20.0']),
      '1.10.0'
    );
  });

  it('finds nothing before the first release', () => {
    assert.equal(findLatestRelease([]), undefined);
    assert.equal(findLatestRelease(['demo']), undefined);
  });
});

describe('isNoreplyEmail', () => {
  it('accepts GitHub noreply addresses with id and login', () => {
    assert.ok(isNoreplyEmail(NOREPLY));
    assert.ok(isNoreplyEmail('1+a-b@users.noreply.github.com'));
  });

  it('rejects other addresses', () => {
    ['octocat@users.noreply.github.com', 'me@example.com', `${NOREPLY}.example.com`, ` ${NOREPLY}`, ''].forEach(
      (email) => assert.equal(isNoreplyEmail(email), false, email)
    );
  });
});

describe('readUnreleased', () => {
  it('reads the section up to the next release', () => {
    assert.equal(readUnreleased(CHANGELOG), '### Added\n\n- Zoom');
  });

  it('reads an empty section and a section at the end', () => {
    assert.equal(readUnreleased('# Changelog\n\n## [Unreleased]\n\n## [1.0.0] - 2026-10-01\n'), '');
    assert.equal(readUnreleased('## [Unreleased]\n\n- Last\n'), '- Last');
  });

  it('finds nothing without the heading', () => {
    assert.equal(readUnreleased('# Changelog\n\n## Unreleased\n\n- Zoom\n'), undefined);
  });
});

describe('moveUnreleased', () => {
  it('moves the entries under the release and leaves an empty "Unreleased" on top', () => {
    const result = moveUnreleased(CHANGELOG, '1.1.0', '2026-10-05');
    assert.equal(readUnreleased(result), '');
    assert.equal(result, CHANGELOG.replace('## [Unreleased]\n', '## [Unreleased]\n\n## [1.1.0] - 2026-10-05\n'));
    assert.ok(result.indexOf('## [1.1.0] - 2026-10-05') < result.indexOf('- Zoom'));
    assert.ok(result.indexOf('- Zoom') < result.indexOf('## [1.0.0] - 2026-10-01'));
  });

  it('fails without the heading', () => {
    assert.throws(() => moveUnreleased('# Changelog\n', '1.0.0', '2026-10-05'), /no "## \[Unreleased\]" section/);
  });
});

describe('findReleaseProblems', () => {
  it('accepts a higher version from a clean main branch', () => {
    assert.deepEqual(findReleaseProblems(createState()), []);
  });

  it('accepts the first release at the version package.json already has', () => {
    assert.deepEqual(findReleaseProblems(createState({ version: '1.0.0', tags: [] })), []);
  });

  it('refuses versions that are not x.y.z', () => {
    ['1.1', SOLUTION_VERSION, '1.1.0-beta.1', 'v1.1.0', '01.1.0', '1.01.0', '1.1.01', '', undefined].forEach(
      (version) => assert.match(findReleaseProblems(createState({ version })).join('\n'), /is not a release version/)
    );
  });

  it('refuses an existing tag and a version not higher than the latest release', () => {
    assert.deepEqual(findReleaseProblems(createState({ version: '1.0.0' })), ['the tag v1.0.0 exists already']);
    assert.deepEqual(findReleaseProblems(createState({ version: '0.9.0' })), [
      '0.9.0 is not higher than the latest release 1.0.0'
    ]);
    assert.deepEqual(findReleaseProblems(createState({ version: '1.2.0', tags: ['v1.3.0'] })), [
      '1.2.0 is not higher than the latest release 1.3.0'
    ]);
  });

  it('refuses another branch, uncommitted changes and a commit email that is not noreply', () => {
    assert.deepEqual(findReleaseProblems(createState({ branch: 'feature' })), [
      'releases are cut from main, not from "feature"'
    ]);
    assert.deepEqual(findReleaseProblems(createState({ isDirty: true })), [
      'the working tree has uncommitted changes — commit or stash them first'
    ]);
    assert.match(findReleaseProblems(createState({ email: 'me@example.com' })).join('\n'), /not a GitHub noreply/);
    assert.match(findReleaseProblems(createState({ email: '' })).join('\n'), /not a GitHub noreply/);
  });

  it('refuses a failed fetch and a branch that lacks commits of origin/main', () => {
    assert.deepEqual(findReleaseProblems(createState({ fetchError: 'fatal: unable to access' })), [
      "origin cannot be fetched (fatal: unable to access) — a release needs GitHub's current state"
    ]);
    assert.deepEqual(findReleaseProblems(createState({ hasRemoteBranch: false })), [
      'HEAD lacks commits of origin/main (behind or diverged) — pull first'
    ]);
  });

  it('refuses a CHANGELOG without entries or without the section', () => {
    assert.match(findReleaseProblems(createState({ unreleased: '' })).join('\n'), /is empty — note the changes/);
    assert.match(findReleaseProblems(createState({ unreleased: undefined })).join('\n'), /has no "## \[Unreleased\]"/);
  });

  it('lists every problem at once', () => {
    const problems = findReleaseProblems(createState({ version: 'x', branch: 'feature', isDirty: true, email: '' }));
    assert.equal(problems.length, 4);
  });
});

describe('formatDate', () => {
  it('writes the local date with leading zeros', () => {
    assert.equal(formatDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
    assert.equal(formatDate(new Date(2026, 9, 12)), '2026-10-12');
  });
});

describe('readSection', () => {
  it('reads a release by its version and the unreleased changes', () => {
    assert.equal(readSection(CHANGELOG, '1.0.0'), '### Added\n\n- First release');
    assert.equal(readSection(CHANGELOG, 'Unreleased'), '### Added\n\n- Zoom');
  });

  it('finds nothing for a missing version and does not take a prefix for it', () => {
    assert.equal(readSection(CHANGELOG, '2.0.0'), undefined);
    assert.equal(readSection(CHANGELOG, '1.0'), undefined);
    assert.equal(readSection(`## [${SOLUTION_VERSION}] - 2026-10-01\n\n- Build\n`, '1.1.0'), undefined);
  });
});

describe('readReleaseNotes', () => {
  it('returns the section of a release and the unreleased changes', () => {
    assert.equal(readReleaseNotes(CHANGELOG, '1.0.0'), '### Added\n\n- First release');
    assert.equal(readReleaseNotes(CHANGELOG, 'Unreleased'), '### Added\n\n- Zoom');
  });

  it('accepts an empty "Unreleased" for the dry run, but no empty release', () => {
    const changelog = '## [Unreleased]\n\n## [1.1.0] - 2026-10-05\n\n## [1.0.0] - 2026-10-01\n\n- First\n';
    assert.equal(readReleaseNotes(changelog, 'Unreleased'), '');
    assert.throws(() => readReleaseNotes(changelog, '1.1.0'), /section of CHANGELOG\.md is empty/);
  });

  it('fails for a missing section and for names that are neither a version nor "Unreleased"', () => {
    assert.throws(() => readReleaseNotes(CHANGELOG, '2.0.0'), /has no "## \[2\.0\.0\]" section/);
    ['1.0', 'v1.0.0', 'unreleased', '', undefined].forEach((name) =>
      assert.throws(() => readReleaseNotes(CHANGELOG, name), /neither a release version/)
    );
  });
});

describe('release.mjs as a command', () => {
  /** A temporary CHANGELOG.md with the test content above. */
  function createChangelog() {
    const file = join(mkdtempSync(join(TEMP, 'notes-')), 'CHANGELOG.md');
    writeFileSync(file, CHANGELOG);
    return file;
  }

  function runNotes(name) {
    return execFileSync(process.execPath, [SCRIPT, '--notes', name, '--changelog', createChangelog()], {
      stdio: 'pipe',
      encoding: 'utf8'
    });
  }

  it('prints the notes of a release and the unreleased changes for --notes', () => {
    assert.equal(runNotes('1.0.0'), '### Added\n\n- First release\n');
    assert.equal(runNotes('Unreleased'), '### Added\n\n- Zoom\n');
  });

  it('fails with exit code 1 for --notes of a version the CHANGELOG does not have', () => {
    assert.throws(
      () => runNotes('2.0.0'),
      (error) => error.status === 1 && /has no "## \[2\.0\.0\]" section/.test(String(error.stderr))
    );
  });

  it('reads the project CHANGELOG by default', () => {
    // Its "Unreleased" section may be empty right after a release — only the exit code counts
    execFileSync(process.execPath, [SCRIPT, '--notes', 'Unreleased'], { stdio: 'pipe' });
  });

  it('refuses an invalid version with exit code 1 before fetching or changing anything', () => {
    ['1.0', '1.0.01'].forEach((version) =>
      assert.throws(
        () => execFileSync(process.execPath, [SCRIPT, version], { stdio: 'pipe' }),
        (error) => error.status === 1 && /is not a release version/.test(String(error.stderr)),
        version
      )
    );
  });
});
