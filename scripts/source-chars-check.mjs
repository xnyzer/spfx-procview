// Raw invisible and control characters in the source (CLAUDE.md "Invisible characters in
// source") — dependency-free. They cannot be seen in a review and slip in when files are written,
// so the source spells them as escapes instead.
//
//   node scripts/source-chars-check.mjs            check src/ and scripts/ (`just check`)
//   node scripts/source-chars-check.mjs <path>...  check these files or folders instead

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_PATHS = ['src', 'scripts'];
/** Text files that hold source; everything else (images, shell scripts) is skipped. */
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.scss', '.css']);

/**
 * Code points that draw nothing or steer the text: control characters (except tab and line
 * ends), spaces other than the plain one (no-break, narrow no-break, en/em, thin, hair, figure,
 * ideographic, Braille blank) and zero-width spaces, soft hyphen, joiners and marks, direction
 * controls, fillers, variation selectors, BOM, annotation and tag characters — and U+FFFD, the
 * trace of a character that broke while a file was written.
 */
export const FORBIDDEN_RANGES = [
  [0x0000, 0x0008],
  [0x000b, 0x000c],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x00a0, 0x00a0],
  [0x00ad, 0x00ad],
  [0x034f, 0x034f],
  [0x061c, 0x061c],
  [0x115f, 0x1160],
  [0x17b4, 0x17b5],
  [0x180b, 0x180f],
  [0x2000, 0x200f],
  [0x2028, 0x202f],
  [0x205f, 0x206f],
  [0x2800, 0x2800],
  [0x3000, 0x3000],
  [0x3164, 0x3164],
  [0xfe00, 0xfe0f],
  [0xfeff, 0xfeff],
  [0xffa0, 0xffa0],
  [0xfff9, 0xfffb],
  [0xfffd, 0xfffd],
  [0x1d173, 0x1d17a],
  [0xe0000, 0xe007f],
  [0xe0100, 0xe01ef]
];

function isForbidden(codePoint) {
  return FORBIDDEN_RANGES.some(([first, last]) => codePoint >= first && codePoint <= last);
}

/** Every forbidden character in `text` with its line and column (both from 1) and code point. */
export function findForbiddenCharacters(text) {
  const findings = [];
  text.split('\n').forEach((line, index) => {
    let column = 0;
    for (const character of line) {
      column += 1;
      const codePoint = character.codePointAt(0);
      if (isForbidden(codePoint)) {
        findings.push({ line: index + 1, column, codePoint });
      }
    }
  });
  return findings;
}

/** A code point in the usual notation, e.g. `U+00A0`. */
export function formatCodePoint(codePoint) {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

/** The source files below `path` (or `path` itself), sorted. */
export function listSourceFiles(path) {
  if (statSync(path).isDirectory()) {
    return readdirSync(path)
      .sort()
      .flatMap((name) => listSourceFiles(join(path, name)));
  }
  return SOURCE_EXTENSIONS.has(extname(path)) ? [path] : [];
}

function main() {
  const paths = process.argv.slice(2);
  const files = (paths.length > 0 ? paths : DEFAULT_PATHS.map((path) => join(ROOT, path))).flatMap(listSourceFiles);
  const problems = [];
  files.forEach((file) => {
    findForbiddenCharacters(readFileSync(file, 'utf8')).forEach(({ line, column, codePoint }) =>
      problems.push(
        `${relative(ROOT, file)}:${line}:${column} raw ${formatCodePoint(codePoint)} — write it as an escape`
      )
    );
  });
  if (problems.length > 0) {
    console.error(`Source character check failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`No raw invisible characters (${files.length} source files).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
