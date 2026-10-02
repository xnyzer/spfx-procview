import type { CssDeclarations } from './sizing';
import { SVG_NS } from './svgIcon';
import type { ISize } from './zoom';

/** Default colour behind the diagram — the Signavio PNG is drawn for white paper. */
export const DEFAULT_BACKGROUND = '#ffffff';

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Background colour from untrusted property data — anything but `#rrggbb` counts as white. */
export function parseBackgroundColor(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR.test(text) ? text.toLowerCase() : DEFAULT_BACKGROUND;
}

/**
 * CSS declarations that put `color` exactly behind the painted image, even when the image box is
 * larger (`object-fit: contain` letterbox with a fixed height): the background is a single-colour
 * SVG with the image's natural size, so `background-size: contain` fits it exactly like the
 * image. It needs no resize handling and moves with a zoom transform. Empty without a valid colour
 * or size — the image then stays transparent.
 */
export function backgroundStyles(color: string, natural: ISize): CssDeclarations {
  if (!HEX_COLOR.test(color) || !(natural.width > 0) || !(natural.height > 0)) {
    return {};
  }
  const { width, height } = natural;
  const svg =
    `<svg xmlns='${SVG_NS}' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'>` +
    `<rect width='${width}' height='${height}' fill='${color}'/></svg>`;
  return {
    // encodeURIComponent leaves ' unencoded; encode it too, so nothing can end the url()
    'background-image': `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`,
    'background-size': 'contain',
    'background-position': 'center',
    'background-repeat': 'no-repeat'
  };
}
