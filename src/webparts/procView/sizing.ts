/**
 * Display size of the diagram: parsing the width/height settings and turning them into
 * CSS for the `<img>`. Pure functions — no DOM, no SharePoint.
 */

import { format } from './messages';

/** Upper bound for pixel values — guards against typos such as 20000. */
export const MAX_PX = 10000;

/** A width or height: automatic, pixels or (width only) percent of the column. */
export type Dimension = { kind: 'auto' } | { kind: 'px'; value: number } | { kind: 'percent'; value: number };

/** Why a width/height setting was rejected. */
export type DimensionError = 'invalid' | 'tooLarge' | 'percentNotAllowed' | 'percentOutOfRange';

/** Result of `parseDimension`: the dimension or the reason it was rejected. */
export type DimensionResult = { ok: true; dimension: Dimension } | { ok: false; error: DimensionError };

/** Which setting a dimension belongs to — the height allows no percent. */
export type DimensionField = 'width' | 'height';

const AUTO: Dimension = { kind: 'auto' };
const PIXELS = /^\d+$/;
const PERCENT = /^(\d+)\s*%$/;

/**
 * Parses a width/height setting. Empty or `auto` → automatic; a whole number → pixels
 * (1–MAX_PX); `NN%` → percent of the column (1–100), accepted only where `allowPercent`
 * is set — a percentage height has no reference, the column has no fixed height.
 * Anything that is not a string (untrusted property data) counts as automatic.
 */
export function parseDimension(input: unknown, allowPercent: boolean): DimensionResult {
  const value = typeof input === 'string' ? input.trim() : '';
  if (value === '' || value.toLowerCase() === 'auto') {
    return { ok: true, dimension: AUTO };
  }

  if (PIXELS.test(value)) {
    const px = parseInt(value, 10);
    if (px < 1) {
      return { ok: false, error: 'invalid' };
    }
    if (px > MAX_PX) {
      return { ok: false, error: 'tooLarge' };
    }
    return { ok: true, dimension: { kind: 'px', value: px } };
  }

  const percent = PERCENT.exec(value);
  if (percent) {
    if (!allowPercent) {
      return { ok: false, error: 'percentNotAllowed' };
    }
    const pct = parseInt(percent[1], 10);
    if (pct < 1 || pct > 100) {
      return { ok: false, error: 'percentOutOfRange' };
    }
    return { ok: true, dimension: { kind: 'percent', value: pct } };
  }

  return { ok: false, error: 'invalid' };
}

/** CSS property → value, as used by `style.setProperty`. */
export type CssDeclarations = Record<string, string>;

/** Compile-time guard: a new variant that is not handled fails the build here. */
function assertNever(value: never): never {
  throw new Error(`unhandled value ${String(value)}`);
}

function toCss(dimension: Dimension): string {
  switch (dimension.kind) {
    case 'px':
      return `${dimension.value}px`;
    case 'percent':
      return `${dimension.value}%`;
    case 'auto':
      return 'auto';
    default:
      return assertNever(dimension);
  }
}

/** Styles for the frame around the image and for the image itself. */
export interface IDiagramStyles {
  frame: CssDeclarations;
  image: CssDeclarations;
}

/**
 * Sizing rules: the diagram never grows wider than its column (`max-width: 100%`); with one
 * value set, the other follows the aspect ratio; whenever the height is fixed, the image
 * is fitted into its box (`object-fit: contain`) so a width capped by the column can never
 * distort it.
 *
 * The frame hugs the image (`width: fit-content`) so an overlay can sit at the image's
 * corner. A percentage width therefore goes on the frame (it resolves against the column)
 * and the image fills it — a percentage on an image inside a shrink-to-fit frame would be
 * circular. Pixel and automatic widths stay on the image.
 */
export function diagramStyles(width: Dimension, height: Dimension): IDiagramStyles {
  return {
    frame: {
      width: width.kind === 'percent' ? `${width.value}%` : 'fit-content',
      'max-width': '100%'
    },
    image: {
      width: width.kind === 'percent' ? '100%' : toCss(width),
      height: toCss(height),
      'max-width': '100%',
      'object-fit': height.kind === 'auto' ? 'fill' : 'contain'
    }
  };
}

/** `loc/` string key for a dimension error — width and height get field-specific hints. */
export function dimensionErrorKey(error: DimensionError, field: DimensionField): keyof IProcViewWebPartStrings {
  switch (error) {
    case 'tooLarge':
      return 'DimensionErrorTooLarge';
    case 'percentOutOfRange':
      return 'DimensionErrorPercentOutOfRange';
    case 'percentNotAllowed':
      return 'DimensionErrorPercentHeight';
    case 'invalid':
      return field === 'width' ? 'DimensionErrorInvalidWidth' : 'DimensionErrorInvalidHeight';
    default:
      return assertNever(error);
  }
}

/**
 * The pane's error text for a width/height. The "too large" text names the upper bound, filled in
 * from `MAX_PX` in the reader's number format (e.g. 10,000 or 10.000).
 */
export function dimensionErrorText(
  error: DimensionError,
  field: DimensionField,
  strings: IProcViewWebPartStrings
): string {
  return format(strings[dimensionErrorKey(error, field)], [MAX_PX.toLocaleString()]);
}
