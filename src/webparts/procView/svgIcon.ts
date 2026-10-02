/**
 * The web part's own icons: small inline SVGs in the current text colour, so they follow the
 * section theme without an icon font (CODING-STANDARDS §13). Decorative only — every button or
 * link that shows one carries its own accessible name.
 */

/** Namespace for `createElementNS`. */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Icons are drawn on a 16 × 16 grid; this is also their default display size. */
const ICON_GRID = 16;
const STROKE_WIDTH = '1.5';

/** The names of the web part's line icons. */
export type IconName = 'zoomIn' | 'zoomOut' | 'reset' | 'fullScreen' | 'close' | 'externalLink';

/** Each line icon: its stroke path on the 16 × 16 grid and whether the line ends are round. */
const ICONS: Record<IconName, { path: string; hasRoundCaps: boolean }> = {
  // Plus, minus and "fit" (four corners)
  zoomIn: { path: 'M3 8h10M8 3v10', hasRoundCaps: true },
  zoomOut: { path: 'M3 8h10', hasRoundCaps: true },
  reset: { path: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4', hasRoundCaps: true },
  // Two arrows pointing outwards
  fullScreen: { path: 'M9 7l5-5M10 2h4v4M7 9l-5 5M2 10v4h4', hasRoundCaps: true },
  // An X
  close: { path: 'M3 3l10 10M13 3L3 13', hasRoundCaps: true },
  // An arrow out of a box
  externalLink: { path: 'M9 2h5v5M14 2 7 9M12 9v5H2V4h5', hasRoundCaps: false }
};

/**
 * An empty icon canvas on the 16 × 16 grid, shown at `size` pixels — hidden from screen
 * readers and kept out of the keyboard focus (`focusable` for older browsers).
 */
export function createIconCanvas(doc: Document, size: number = ICON_GRID): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${ICON_GRID} ${ICON_GRID}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

/** A line icon from the table above, shown at `size` pixels. */
export function createIcon(doc: Document, name: IconName, size: number = ICON_GRID): SVGElement {
  const icon = ICONS[name];
  const svg = createIconCanvas(doc, size);
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', icon.path);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', STROKE_WIDTH);
  if (icon.hasRoundCaps) {
    path.setAttribute('stroke-linecap', 'round');
  }
  svg.appendChild(path);
  return svg;
}
