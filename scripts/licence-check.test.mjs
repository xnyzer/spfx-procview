// Tests for licence-check.mjs — Node's built-in test runner, no dependency (`just check`).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { BUNDLED, findProblems, isPermissive, licenceOf, licenceProblem } from './licence-check.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'licence-check.mjs');

/** Notices that name every bundled package at version 1.0.0. */
const NOTICES = BUNDLED.map(({ name }) => `## ${name} 1.0.0\n`).join('\n');
const BUNDLED_PACKAGES = BUNDLED.map(({ name, location }) => ({ name, version: '1.0.0', license: 'MIT', location }));

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

describe('findProblems', () => {
  it('passes a clean tree with matching notices', () => {
    assert.deepEqual(findProblems([...BUNDLED_PACKAGES, { name: 'a', version: '1.0.0', license: 'MIT' }], NOTICES), []);
  });

  it('reports a GPL-only package once, however often it is installed', () => {
    const gpl = { name: 'copyleft', version: '2.0.0', license: 'GPL-3.0-only' };
    assert.deepEqual(
      findProblems([...BUNDLED_PACKAGES, gpl, { ...gpl, location: 'node_modules/x/copyleft' }], NOTICES),
      ['copyleft@2.0.0 is not permissive (GPL-3.0-only)']
    );
  });

  it('reports notices that no longer match the bundled version', () => {
    const newer = BUNDLED_PACKAGES.map((pkg, index) => (index === 0 ? { ...pkg, version: '1.1.0' } : pkg));
    assert.deepEqual(findProblems(newer, NOTICES), [
      `THIRD-PARTY-NOTICES.md has no section "## ${BUNDLED[0].name} 1.1.0"`
    ]);
  });

  it('reports a bundled package that moved', () => {
    const problems = findProblems(BUNDLED_PACKAGES.slice(1), NOTICES);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /not found/);
  });
});

describe('licence-check.mjs as a command', () => {
  it('fails with exit code 1 on a GPL/AGPL-only package', () => {
    const input = join(mkdtempSync(join(tmpdir(), 'licence-check-')), 'packages.json');
    writeFileSync(input, JSON.stringify([{ name: 'copyleft', version: '1.0.0', license: 'AGPL-3.0-only' }]));
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, '--input', input], { stdio: 'pipe' }),
      (error) => error.status === 1 && /copyleft@1\.0\.0 is not permissive/.test(String(error.stderr))
    );
  });
});
