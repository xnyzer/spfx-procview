// Tests for release.mjs — Node's built-in test runner, no dependency (`just check`). The full
// recipe (`just release`: npm, sync, check, commit, tag) is tried in a scratch copy, not here.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  RELEASE_BRANCH,
  compareVersions,
  findLatestRelease,
  findReleaseProblems,
  formatDate,
  isNoreplyEmail,
  moveUnreleased,
  readUnreleased
} from './release.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'release.mjs');
const NOREPLY = '12345678+octocat@users.noreply.github.com';
/** A four-part solution version (x.y.z.0), built from its parts — written out, privacy-lint takes it for an IP address. */
const SOLUTION_VERSION = ['1', '1', '0', '0'].join('.');

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
    assert.equal(findLatestRelease(['v1.0.0', 'v1.10.0', 'v1.9.2', 'v2.0.0-beta.1', 'demo', '1.20.0']), '1.10.0');
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
    ['1.1', SOLUTION_VERSION, '1.1.0-beta.1', 'v1.1.0', '', undefined].forEach((version) =>
      assert.match(findReleaseProblems(createState({ version })).join('\n'), /is not a release version/)
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

describe('release.mjs as a command', () => {
  it('refuses an invalid version with exit code 1 before changing anything', () => {
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, '1.0'], { stdio: 'pipe' }),
      (error) => error.status === 1 && /"1\.0" is not a release version/.test(String(error.stderr))
    );
  });
});
