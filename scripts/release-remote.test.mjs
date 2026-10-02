// Tests for the remote checks of release.mjs (audit M18) — Node's built-in test runner, no
// dependency (`just check`). They run git on throwaway repositories in a temporary folder: a bare
// repository stands in for GitHub, so nothing touches the network or this repository.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { fetchRemote, includesRemoteBranch, readTags } from './release.mjs';

const NOREPLY = '12345678+octocat@users.noreply.github.com';
/** One temporary folder for all repositories of these tests, removed when they are done. */
const TEMP = mkdtempSync(join(tmpdir(), 'release-remote-'));

after(() => rmSync(TEMP, { recursive: true, force: true }));

/** Runs git in `cwd` with its own identity and no signing — independent of the user's git setup. */
function runGit(cwd, ...args) {
  const identity = ['-c', 'user.name=Test', '-c', `user.email=${NOREPLY}`, '-c', 'commit.gpgsign=false'];
  return execFileSync('git', [...identity, '-c', 'tag.gpgsign=false', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe'
  });
}

function commit(cwd, message) {
  runGit(cwd, 'commit', '--quiet', '--allow-empty', '-m', message);
}

/**
 * A bare repository standing in for GitHub with one commit on main, a clone that stands for
 * merges on GitHub (`github`), and the clone a release is cut from (`local`).
 */
function createRepositories() {
  const folder = mkdtempSync(join(TEMP, 'git-'));
  const remote = join(folder, 'remote.git');
  const github = join(folder, 'github');
  const local = join(folder, 'local');
  runGit(folder, 'init', '--quiet', '--bare', '--initial-branch=main', remote);
  runGit(folder, 'clone', '--quiet', remote, github);
  commit(github, 'first');
  runGit(github, 'push', '--quiet', 'origin', 'HEAD:main');
  runGit(folder, 'clone', '--quiet', remote, local);
  return { folder, github, local };
}

/** A commit on GitHub's main that the local clone has not pulled — e.g. a merged pull request. */
function mergeOnGitHub(github) {
  commit(github, 'merged on GitHub');
  runGit(github, 'push', '--quiet', 'origin', 'HEAD:main');
}

describe('includesRemoteBranch after fetchRemote', () => {
  it('accepts a main that is ahead of origin/main', () => {
    const { local } = createRepositories();
    commit(local, 'not pushed yet');
    assert.equal(fetchRemote(local), undefined);
    assert.equal(includesRemoteBranch(local), true);
  });

  it('refuses a main that is behind origin/main', () => {
    const { github, local } = createRepositories();
    mergeOnGitHub(github);
    assert.equal(fetchRemote(local), undefined);
    assert.equal(includesRemoteBranch(local), false);
  });

  it('refuses a main that has diverged from origin/main', () => {
    const { github, local } = createRepositories();
    mergeOnGitHub(github);
    commit(local, 'release commit on a stale main');
    assert.equal(fetchRemote(local), undefined);
    assert.equal(includesRemoteBranch(local), false);
  });
});

describe('fetchRemote', () => {
  it('brings a tag that exists only on GitHub into readTags', () => {
    const { github, local } = createRepositories();
    runGit(github, 'tag', '-a', 'v1.0.0', '-m', 'Release 1.0.0');
    runGit(github, 'push', '--quiet', 'origin', 'v1.0.0');
    assert.deepEqual(readTags(local), []);
    assert.equal(fetchRemote(local), undefined);
    assert.deepEqual(readTags(local), ['v1.0.0']);
  });

  it('says why the remote cannot be fetched', () => {
    const { folder, local } = createRepositories();
    runGit(local, 'remote', 'set-url', 'origin', join(folder, 'missing.git'));
    const reason = fetchRemote(local);
    assert.equal(typeof reason, 'string');
    assert.match(reason, /missing\.git/);
  });
});
