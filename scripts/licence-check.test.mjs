// Tests for licence-check.mjs — Node's built-in test runner, no dependency (`just check`).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  findBundledLocations,
  findProblems,
  isPermissive,
  licenceOf,
  licenceProblem,
  parseNoticeSections,
  readBundledLocations
} from './licence-check.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'licence-check.mjs');
/** One temporary folder for all files of these tests, removed when they are done. */
const TEMP = mkdtempSync(join(tmpdir(), 'licence-check-'));

after(() => rmSync(TEMP, { recursive: true, force: true }));

const TSLIB = { name: 'tslib', version: '1.0.0', license: '0BSD', location: 'node_modules/tslib' };
const STYLES = {
  name: '@microsoft/load-themed-styles',
  version: '1.0.0',
  license: 'MIT',
  location: 'node_modules/@microsoft/sp-css-loader/node_modules/@microsoft/load-themed-styles'
};
const BUNDLED_PACKAGES = [TSLIB, STYLES];
/** The package folders of the bundled code, as `findBundledLocations` reads them from a source map. */
const BUNDLED = BUNDLED_PACKAGES.map((pkg) => pkg.location);
/** Notices that name every bundled package at version 1.0.0. */
const NOTICES = BUNDLED_PACKAGES.map(({ name }) => `## ${name} 1.0.0\n`).join('\n');

/** A temporary dist folder with the given source maps (file name → sources). */
function createDist(maps) {
  const dist = join(mkdtempSync(join(TEMP, 'case-')), 'dist');
  mkdirSync(dist);
  Object.keys(maps).forEach((name) =>
    writeFileSync(join(dist, name), JSON.stringify({ version: 3, sources: maps[name] }))
  );
  return dist;
}

describe('isPermissive', () => {
  it('accepts permissive licences and expressions with a permissive way out', () => {
    ['MIT', '0BSD', 'Apache-2.0', '(MIT OR GPL-3.0-or-later)', '(BSD-3-Clause OR GPL-2.0)', 'MIT/X11'].forEach(
      (expression) => assert.equal(isPermissive(expression), true, expression)
    );
    ['(Apache-2.0 AND BSD-3-Clause)', '(MIT AND Zlib)', 'Apache-2.0 WITH LLVM-exception'].forEach((expression) =>
      assert.equal(isPermissive(expression), true, expression)
    );
  });

  it('rejects copyleft and unknown licences', () => {
    [
      'GPL-3.0-only',
      'GPL-2.0',
      'AGPL-3.0-or-later',
      'LGPL-2.1-only',
      'MPL-2.0',
      'SSPL-1.0',
      '(MIT AND GPL-2.0)',
      'GPL-2.0 WITH Classpath-exception-2.0',
      'UNLICENSED'
    ].forEach((expression) => assert.equal(isPermissive(expression), false, expression));
  });

  it('throws on expressions it cannot parse', () => {
    ['(MIT', 'MIT OR', 'OR MIT', '(MIT))'].forEach((expression) => assert.throws(() => isPermissive(expression)));
  });
});

describe('licenceOf', () => {
  it('reads the licence field in its old and new shapes', () => {
    assert.equal(licenceOf({ license: 'MIT' }), 'MIT');
    assert.equal(licenceOf({ license: { type: 'ISC' } }), 'ISC');
    assert.equal(licenceOf({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
    assert.equal(licenceOf({}), undefined);
    assert.equal(licenceOf({ license: ' ' }), undefined);
  });
});

describe('licenceProblem', () => {
  it('accepts the SPFx licence terms for Microsoft packages only (ADR-0001)', () => {
    const spfx = 'https://aka.ms/spfx/license';
    assert.equal(licenceProblem({ name: '@microsoft/sp-core-library', license: spfx }), undefined);
    assert.match(licenceProblem({ name: 'some-package', license: spfx }), /SPFx licence terms/);
  });

  it('reports a custom licence text reference as a problem', () => {
    assert.match(licenceProblem({ name: 'custom', license: 'SEE LICENSE IN LICENSE.txt' }), /cannot parse/);
  });

  it('accepts a missing licence only for the registered exception', () => {
    assert.equal(licenceProblem({ name: '@microsoft/microsoft-graph-client' }), undefined);
    assert.equal(licenceProblem({ name: 'left-pad' }), 'declares no licence');
  });
});

describe('findBundledLocations', () => {
  it('finds plain, scoped and nested packages once and ignores own code', () => {
    const sourceMap = {
      sources: [
        'webpack:///.././node_modules/tslib/tslib.es6.js',
        'webpack:///.././node_modules/tslib/modules/index.js',
        'webpack:///.././node_modules/@microsoft/sp-css-loader/node_modules/@microsoft/load-themed-styles/lib-es6/index.js',
        'webpack:///.././src/webparts/procView/settings.ts',
        'webpack:///.././lib/webparts/procView/ProcViewWebPart.module.scss.css',
        'webpack:///webpack/runtime/define property getters'
      ]
    };
    assert.deepEqual(findBundledLocations(sourceMap), BUNDLED);
  });

  it('finds nothing in a map without sources', () => {
    assert.deepEqual(findBundledLocations({}), []);
  });
});

describe('readBundledLocations', () => {
  it('reads every source map in the folder', () => {
    const dist = createDist({
      'a.js.map': ['webpack:///.././node_modules/tslib/tslib.es6.js'],
      'b.js.map': ['webpack:///.././node_modules/tslib/tslib.es6.js', 'webpack:///.././node_modules/x/index.js'],
      'strings.js': ['webpack:///.././node_modules/not-a-map/index.js']
    });
    assert.deepEqual(readBundledLocations(dist), ['node_modules/tslib', 'node_modules/x']);
  });

  it('gives undefined when there is no source map — the build has not run', () => {
    assert.equal(readBundledLocations(createDist({})), undefined);
    assert.equal(readBundledLocations(join(TEMP, 'missing-folder')), undefined);
  });
});

describe('parseNoticeSections', () => {
  it('reads the name and version of every section', () => {
    assert.deepEqual(parseNoticeSections(`# Third-party notices\n\n${NOTICES}\n### Not a section\n`), [
      { name: 'tslib', version: '1.0.0' },
      { name: '@microsoft/load-themed-styles', version: '1.0.0' }
    ]);
  });
});

describe('findProblems', () => {
  it('passes a clean tree with matching notices', () => {
    const packages = [...BUNDLED_PACKAGES, { name: 'a', version: '1.0.0', license: 'MIT' }];
    assert.deepEqual(findProblems(packages, NOTICES, BUNDLED), []);
  });

  it('reports a GPL-only package once, however often it is installed', () => {
    const gpl = { name: 'copyleft', version: '2.0.0', license: 'GPL-3.0-only' };
    assert.deepEqual(
      findProblems([...BUNDLED_PACKAGES, gpl, { ...gpl, location: 'node_modules/x/copyleft' }], NOTICES, BUNDLED),
      ['copyleft@2.0.0 is not permissive (GPL-3.0-only)']
    );
  });

  it('reports bundled code whose version has no section, and the outdated section', () => {
    const newer = [{ ...TSLIB, version: '1.1.0' }, STYLES];
    assert.deepEqual(findProblems(newer, NOTICES, BUNDLED), [
      'THIRD-PARTY-NOTICES.md has no section "## tslib 1.1.0" for code in the bundle',
      'THIRD-PARTY-NOTICES.md lists tslib 1.0.0, which is not in the bundle'
    ]);
  });

  it('reports a section for a package that is no longer in the bundle', () => {
    assert.deepEqual(findProblems(BUNDLED_PACKAGES, NOTICES, [TSLIB.location]), [
      'THIRD-PARTY-NOTICES.md lists @microsoft/load-themed-styles 1.0.0, which is not in the bundle'
    ]);
  });

  it('reports bundled code that comes from no installed package', () => {
    assert.deepEqual(findProblems(BUNDLED_PACKAGES, NOTICES, [...BUNDLED, 'node_modules/ghost']), [
      'the bundle contains code from node_modules/ghost, which is no installed package'
    ]);
  });
});

describe('licence-check.mjs as a command', () => {
  it('fails with exit code 1 on a GPL/AGPL-only package', () => {
    const input = join(mkdtempSync(join(TEMP, 'case-')), 'packages.json');
    writeFileSync(input, JSON.stringify([{ name: 'copyleft', version: '1.0.0', license: 'AGPL-3.0-only' }]));
    const dist = createDist({ 'bundle.js.map': [] });
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, '--input', input, '--dist', dist], { stdio: 'pipe' }),
      (error) => error.status === 1 && /copyleft@1\.0\.0 is not permissive/.test(String(error.stderr))
    );
  });

  it('fails without a source map and asks for a build first', () => {
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, '--dist', createDist({})], { stdio: 'pipe' }),
      (error) => error.status === 1 && /just test/.test(String(error.stderr))
    );
  });
});
