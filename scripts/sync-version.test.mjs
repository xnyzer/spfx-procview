// Tests for sync-version.mjs — Node's built-in test runner, no dependency (`just check`).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findMismatches,
  listSolutionVersions,
  setSolutionVersions,
  syncVersion,
  toSolutionVersion
} from './sync-version.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'sync-version.mjs');
const PROJECT_SOLUTION = join(dirname(SCRIPT), '..', 'config', 'package-solution.json');
/** One temporary folder for all files of these tests, removed when they are done. */
const TEMP = mkdtempSync(join(tmpdir(), 'sync-version-'));

after(() => rmSync(TEMP, { recursive: true, force: true }));

/**
 * A four-part solution version: the release plus a build part, e.g. 1.2.3 with build 0. Built from
 * its parts — written out, privacy-lint takes four-part numbers for IP addresses.
 */
function solutionVersionOf(release, build = 0) {
  return `${release}.${build}`;
}

/** A package-solution.json as the project has it: a solution with one feature. */
function createSolution(solutionVersion, featureVersion) {
  return {
    solution: {
      name: 'demo',
      version: solutionVersion,
      features: [{ title: 'Feature', id: 'f1', version: featureVersion }]
    },
    paths: { zippedPackage: 'solution/demo.sppkg' }
  };
}

/** Temporary package.json and package-solution.json with the given versions. */
function createFiles(packageVersion, solutionVersion, featureVersion) {
  const folder = mkdtempSync(join(TEMP, 'case-'));
  const packageFile = join(folder, 'package.json');
  const solutionFile = join(folder, 'package-solution.json');
  writeFileSync(packageFile, JSON.stringify({ name: 'demo', version: packageVersion }));
  writeFileSync(solutionFile, `${JSON.stringify(createSolution(solutionVersion, featureVersion), null, 2)}\n`);
  return { packageFile, solutionFile };
}

describe('toSolutionVersion', () => {
  it('adds the build part SharePoint expects', () => {
    assert.deepEqual(toSolutionVersion('1.0.0').split('.'), ['1', '0', '0', '0']);
    assert.deepEqual(toSolutionVersion('2.10.3').split('.'), ['2', '10', '3', '0']);
  });

  it('rejects anything that is not x.y.z', () => {
    ['1.0', solutionVersionOf('1.0.0'), '1.0.0-beta.1', 'v1.0.0', '', undefined, 1].forEach((version) =>
      assert.throws(() => toSolutionVersion(version), /is not a release version/)
    );
  });

  it('rejects leading zeros, which npm would quietly drop', () => {
    ['01.0.0', '1.00.0', '1.0.01'].forEach((version) =>
      assert.throws(() => toSolutionVersion(version), /is not a release version/, version)
    );
    assert.deepEqual(toSolutionVersion('10.0.100').split('.'), ['10', '0', '100', '0']);
  });
});

describe('listSolutionVersions', () => {
  it('lists the solution and every feature', () => {
    const solution = createSolution(solutionVersionOf('1.0.0'), solutionVersionOf('1.0.0'));
    solution.solution.features.push({ id: 'f2', version: solutionVersionOf('0.9.0') });
    assert.deepEqual(listSolutionVersions(solution), [
      { where: 'solution.version', version: solutionVersionOf('1.0.0') },
      { where: 'solution.features[0].version', version: solutionVersionOf('1.0.0') },
      { where: 'solution.features[1].version', version: solutionVersionOf('0.9.0') }
    ]);
  });

  it('copes with a file without features or solution', () => {
    assert.deepEqual(listSolutionVersions({ solution: { version: solutionVersionOf('1.0.0') } }), [
      { where: 'solution.version', version: solutionVersionOf('1.0.0') }
    ]);
    assert.deepEqual(listSolutionVersions({}), [{ where: 'solution.version', version: undefined }]);
  });
});

describe('findMismatches', () => {
  it('accepts matching versions', () => {
    assert.deepEqual(
      findMismatches('1.2.3', createSolution(solutionVersionOf('1.2.3'), solutionVersionOf('1.2.3'))),
      []
    );
  });

  it('names the solution and the feature that differ', () => {
    assert.deepEqual(
      findMismatches('1.2.3', createSolution(solutionVersionOf('1.2.2'), solutionVersionOf('1.2.3', 1))),
      [
        `solution.version is "${solutionVersionOf('1.2.2')}", expected "${solutionVersionOf('1.2.3')}"`,
        `solution.features[0].version is "${solutionVersionOf('1.2.3', 1)}", expected "${solutionVersionOf('1.2.3')}"`
      ]
    );
  });

  it('reports a missing version', () => {
    assert.deepEqual(findMismatches('1.0.0', { solution: {} }), [
      `solution.version is undefined, expected "${solutionVersionOf('1.0.0')}"`
    ]);
  });
});

describe('setSolutionVersions', () => {
  it('sets the solution and every feature, keeping everything else', () => {
    const text = `${JSON.stringify(createSolution(solutionVersionOf('1.0.0'), solutionVersionOf('1.0.0')), null, 2)}\n`;
    const result = JSON.parse(setSolutionVersions(text, '1.4.0'));
    assert.deepEqual(result, createSolution(solutionVersionOf('1.4.0'), solutionVersionOf('1.4.0')));
  });

  it('writes the project file back unchanged when its version is set again', () => {
    const text = readFileSync(PROJECT_SOLUTION, 'utf8');
    const version = JSON.parse(text).solution.version.split('.').slice(0, 3).join('.');
    assert.equal(setSolutionVersions(text, version), text);
  });

  it('rejects an invalid version and a file without solution', () => {
    assert.throws(() => setSolutionVersions('{"solution":{}}', '1.0'), /is not a release version/);
    assert.throws(() => setSolutionVersions('{}', '1.0.0'), /has no "solution"/);
  });
});

describe('syncVersion', () => {
  it('writes package.json’s version and reports whether something changed', () => {
    const { packageFile, solutionFile } = createFiles('2.0.0', solutionVersionOf('1.0.0'), solutionVersionOf('1.0.0'));
    assert.equal(syncVersion(packageFile, solutionFile), true);
    assert.deepEqual(findMismatches('2.0.0', JSON.parse(readFileSync(solutionFile, 'utf8'))), []);
    assert.equal(syncVersion(packageFile, solutionFile), false);
  });
});

describe('sync-version.mjs as a command', () => {
  function run(args) {
    return execFileSync(process.execPath, [SCRIPT, ...args], { stdio: 'pipe', encoding: 'utf8' });
  }

  it('--check fails with exit code 1 when package-solution.json differs', () => {
    const { packageFile, solutionFile } = createFiles('1.1.0', solutionVersionOf('1.0.0'), solutionVersionOf('1.1.0'));
    assert.throws(
      () => run(['--check', '--package', packageFile, '--solution', solutionFile]),
      (error) =>
        error.status === 1 && /solution\.version is "1\.0\.0\.0", expected "1\.1\.0\.0"/.test(String(error.stderr))
    );
  });

  it('--check passes after a sync', () => {
    const { packageFile, solutionFile } = createFiles('1.1.0', solutionVersionOf('1.0.0'), solutionVersionOf('1.0.0'));
    run(['--package', packageFile, '--solution', solutionFile]);
    assert.match(run(['--check', '--package', packageFile, '--solution', solutionFile]), /1\.1\.0 is the same/);
  });

  it('fails with a message on an invalid version in package.json', () => {
    const { packageFile, solutionFile } = createFiles(
      '1.0.0-beta.1',
      solutionVersionOf('1.0.0'),
      solutionVersionOf('1.0.0')
    );
    assert.throws(
      () => run(['--package', packageFile, '--solution', solutionFile]),
      (error) => error.status === 1 && /is not a release version/.test(String(error.stderr))
    );
  });
});
