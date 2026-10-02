// Generates the two Microsoft Teams app icons in teams/ from one motif definition —
// dependency-free (Node built-ins only), so the icons are reproducible on any machine.
//
//   node scripts/teams-icons.mjs          write teams/<web part id>_color.png and _outline.png
//   node scripts/teams-icons.mjs --check  fail if the files differ from what the script draws
//
// Teams requirements (Microsoft Learn, "Design app icon for Teams Store"): colour icon
// 192 × 192, full-bleed square with a flat background, no rounded corners or border, motif
// in the centre (safe area 120 × 120 for square logos — see colorIcon); outline icon 32 × 32,
// white on transparent. SPFx packages the files only under the names
// <web part id>_color.png / _outline.png.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'src/webparts/procView/ProcViewWebPart.manifest.json');

/** Petrol blue background of the colour icon (white motif: contrast well above 4.5:1). */
const BACKGROUND = [0x0e, 0x5a, 0x73];
/** Subsamples per pixel axis for anti-aliasing (8 × 8 = 64 samples per pixel). */
const SUPERSAMPLING = 8;

// Motif in abstract units around (0, 0): a left-to-right flow — start circle → task box →
// decision diamond, connected by lines. 28.5 units wide.
const CIRCLE = { cx: -11.25, r: 3 };
const BOX = { x0: -4.75, x1: 3.25, halfHeight: 3.5, radius: 1.2 };
const DIAMOND = { cx: 10.5, d: 3.75 };

/** Colour icon: pixels per motif unit and line width in pixels, for 192 px (scaled with the size). */
const COLOR_SCALE_AT_192 = 5.1;
const COLOR_STROKE_AT_192 = 4.5;
/** Outline icon (32 px): pixels per motif unit — the motif fills the width — and line width in pixels. */
const OUTLINE_SCALE = 0.98;
const OUTLINE_STROKE = 2;

/** Signed distance from `point` to a rounded rectangle centred at the origin. */
function roundedBox(point, { halfWidth, halfHeight, radius }) {
  const qx = Math.abs(point.x) - halfWidth + radius;
  const qy = Math.abs(point.y) - halfHeight + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

/** Distance from `point` to the axis-aligned segment from `from` to `to`. */
function segment(point, from, to) {
  const cx = Math.min(Math.max(point.x, Math.min(from.x, to.x)), Math.max(from.x, to.x));
  const cy = Math.min(Math.max(point.y, Math.min(from.y, to.y)), Math.max(from.y, to.y));
  return Math.hypot(point.x - cx, point.y - cy);
}

/** Whether a point (in motif units) lies on one of the motif's lines of the given width. */
function onMotif(x, y, stroke) {
  const circle = Math.abs(Math.hypot(x - CIRCLE.cx, y) - CIRCLE.r);
  const boxCenter = (BOX.x0 + BOX.x1) / 2;
  const box = Math.abs(
    roundedBox(
      { x: x - boxCenter, y },
      { halfWidth: (BOX.x1 - BOX.x0) / 2, halfHeight: BOX.halfHeight, radius: BOX.radius }
    )
  );
  // A diamond is a square rotated by 45°: rotate the point, then measure against the square
  const rotated = { x: (x - DIAMOND.cx + y) / Math.SQRT2, y: (x - DIAMOND.cx - y) / Math.SQRT2 };
  const halfSide = DIAMOND.d / Math.SQRT2;
  const diamond = Math.abs(roundedBox(rotated, { halfWidth: halfSide, halfHeight: halfSide, radius: 0 }));
  const point = { x, y };
  const link1 = segment(point, { x: CIRCLE.cx + CIRCLE.r, y: 0 }, { x: BOX.x0, y: 0 });
  const link2 = segment(point, { x: BOX.x1, y: 0 }, { x: DIAMOND.cx - DIAMOND.d, y: 0 });
  return Math.min(circle, box, diamond, link1, link2) <= stroke / 2;
}

/**
 * Coverage (0–1) of the motif for every pixel of a size × size image; `scale` is pixels per
 * motif unit, `strokePx` the line width in pixels.
 */
function coverage(size, scale, strokePx) {
  const stroke = strokePx / scale;
  const result = new Float64Array(size * size);
  const step = 1 / SUPERSAMPLING;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLING; sy++) {
        for (let sx = 0; sx < SUPERSAMPLING; sx++) {
          const x = (px + (sx + 0.5) * step - size / 2) / scale;
          const y = (py + (sy + 0.5) * step - size / 2) / scale;
          if (onMotif(x, y, stroke)) {
            hits++;
          }
        }
      }
      result[py * size + px] = hits / (SUPERSAMPLING * SUPERSAMPLING);
    }
  }
  return result;
}

/**
 * RGBA pixels: white motif on the flat background, fully opaque. The motif is about 150 px
 * wide — wider than Microsoft's 120 px safe area, which targets square logos: this flat band
 * stays far from the rounded corners, and even a circular mask (radius 96 px) keeps more than
 * 15 px of margin (owner decision).
 */
function colorIcon(size = 192) {
  const cover = coverage(size, (COLOR_SCALE_AT_192 * size) / 192, (COLOR_STROKE_AT_192 * size) / 192);
  const rgba = Buffer.alloc(size * size * 4);
  cover.forEach((c, i) => {
    BACKGROUND.forEach((channel, k) => {
      rgba[i * 4 + k] = Math.round(channel + (255 - channel) * c);
    });
    rgba[i * 4 + 3] = 255;
  });
  return { size, rgba };
}

/** RGBA pixels: white motif with 2 px lines, transparency everywhere else. */
function outlineIcon() {
  const size = 32;
  const cover = coverage(size, OUTLINE_SCALE, OUTLINE_STROKE);
  const rgba = Buffer.alloc(size * size * 4);
  cover.forEach((c, i) => {
    rgba.fill(255, i * 4, i * 4 + 3);
    rgba[i * 4 + 3] = Math.round(255 * c);
  });
  return { size, rgba };
}

function chunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** Minimal PNG encoder: 8-bit RGBA, no filtering. */
function png({ size, rgba }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // bit depth 8, colour type RGBA, default compression/filter/interlace
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/** Teams rule: the outline icon contains only white, with any transparency. */
function assertWhiteOnly({ rgba }) {
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i] !== 255 || rgba[i + 1] !== 255 || rgba[i + 2] !== 255) {
      throw new Error('Outline icon must be white on transparent');
    }
  }
}

const id = /"id"\s*:\s*"([0-9a-f-]{36})"/.exec(readFileSync(MANIFEST, 'utf8'))?.[1];
if (!id) {
  throw new Error(`No web part id found in ${MANIFEST}`);
}

const outline = outlineIcon();
assertWhiteOnly(outline);
const files = [
  [join(ROOT, 'teams', `${id}_color.png`), png(colorIcon())],
  [join(ROOT, 'teams', `${id}_outline.png`), png(outline)]
];

if (process.argv.includes('--check')) {
  const stale = files.filter(([path, data]) => !readFileSync(path).equals(data));
  if (stale.length > 0) {
    throw new Error(`Out of date — run "just icons": ${stale.map(([path]) => path).join(', ')}`);
  }
  console.log('Teams icons are up to date.');
} else {
  files.forEach(([path, data]) => writeFileSync(path, data));
  console.log(`Wrote ${files.map(([path]) => path).join(', ')}`);
}
