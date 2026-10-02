// Tests for source-chars-check.mjs — Node's built-in test runner, no dependency (`just check`).
// The characters under test are built from code points: written raw they would fail the check
// itself, and they are invisible here.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { findForbiddenCharacters, formatCodePoint, listSourceFiles } from './source-chars-check.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'source-chars-check.mjs');
const NO_BREAK_SPACE = String.fromCodePoint(0xa0);
const BACKSLASH = String.fromCodePoint(0x5c);

/** A temporary folder with the given files (name → content). */
function createFolder(files) {
  const folder = mkdtempSync(join(tmpdir(), 'source-chars-'));
  Object.keys(files).forEach((name) => {
    mkdirSync(dirname(join(folder, name)), { recursive: true });
    writeFileSync(join(folder, name), files[name]);
  });
  return folder;
}

describe('findForbiddenCharacters', () => {
  it('finds no-break spaces, zero-width and direction characters with line and column', () => {
    const text = `const a = 'x${NO_BREAK_SPACE}y';\nconst b = '${String.fromCodePoint(0x200b, 0x202e)}';\n`;
    assert.deepEqual(findForbiddenCharacters(text), [
      { line: 1, column: 13, codePoint: 0xa0 },
      { line: 2, column: 12, codePoint: 0x200b },
      { line: 2, column: 13, codePoint: 0x202e }
    ]);
  });

  it('finds controls, the replacement character and supplementary characters', () => {
    const text = String.fromCodePoint(0x07, 0xfffd, 0xe0020, 0xfe0f);
    assert.deepEqual(
      findForbiddenCharacters(text).map(({ codePoint }) => codePoint),
      [0x07, 0xfffd, 0xe0020, 0xfe0f]
    );
  });

  it('accepts escapes, tabs, CRLF line ends and visible non-ASCII text', () => {
    const text = `'a${BACKSLASH}u00a0b'\r\n\t'Auftrag → Rechnung «Image» × 💻'.length\r\n`;
    assert.deepEqual(findForbiddenCharacters(text), []);
  });
});

describe('formatCodePoint', () => {
  it('writes code points the usual way', () => {
    assert.equal(formatCodePoint(0xa0), 'U+00A0');
    assert.equal(formatCodePoint(0xe0020), 'U+E0020');
  });
});

describe('listSourceFiles', () => {
  it('lists source files below a folder, sorted, and skips other files', () => {
    const folder = createFolder({ 'b.ts': '', 'a/c.mjs': '', 'image.png': '', 'tool.sh': '', 'd.scss': '' });
    assert.deepEqual(
      listSourceFiles(folder).map((file) => file.slice(folder.length + 1)),
      ['a/c.mjs', 'b.ts', 'd.scss']
    );
  });
});

describe('source-chars-check.mjs as a command', () => {
  it('fails with exit code 1 and names file, line, column and code point', () => {
    const folder = createFolder({ 'strings.js': `const x = 'a${NO_BREAK_SPACE}b';\n` });
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT, folder], { stdio: 'pipe' }),
      (error) => error.status === 1 && /strings\.js:1:13 raw U\+00A0/.test(String(error.stderr))
    );
  });

  it('passes a clean folder', () => {
    const folder = createFolder({ 'clean.ts': `export const text = 'a${BACKSLASH}u00a0b';\n` });
    assert.match(execFileSync(process.execPath, [SCRIPT, folder], { encoding: 'utf8' }), /No raw invisible characters/);
  });
});
