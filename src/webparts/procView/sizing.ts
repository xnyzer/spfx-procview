/**
 * Display size of the diagram: parsing the width/height settings and turning them into
 * CSS for the `<img>`. Pure functions — no DOM, no SharePoint.
 */

/** Upper bound for pixel values — guards against typos such as 20000. */
export const MAX_PX = 10000;

export type Dimension = { kind: 'auto' } | { kind: 'px'; value: number } | { kind: 'percent'; value: number };

export type DimensionError = 'invalid' | 'tooLarge' | 'percentNotAllowed' | 'percentOutOfRange';

export type DimensionResult = { ok: true; dimension: Dimension } | { ok: false; error: DimensionError };

export type DimensionField = 'width' | 'height';

const AUTO: Dimension = { kind: 'auto' };
const PIXELS = /^\d+$/;
const PERCENT = /^(\d+)\s*%$/;

/**
 * Parses a width/height setting. Empty or `auto` → automatic; a whole number → pixels
 * (1–MAX_PX); `NN%` → percent of the column (1–100), accepted only where `allowPercent`
 * is set — a percentage height has no reference, the column has no fixed height.
 */
export function parseDimension(input: string | undefined, allowPercent: boolean): DimensionResult {
  const value = (input ?? '').trim();
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

/** CSS for the diagram image; property names as used by `style.setProperty`. */
export interface IImageStyle {
  width: string;
  height: string;
  'max-width': string;
  'object-fit': string;
}

function toCss(dimension: Dimension): string {
  switch (dimension.kind) {
    case 'px':
      return `${dimension.value}px`;
    case 'percent':
      return `${dimension.value}%`;
    default:
      return 'auto';
  }
}

/**
 * Sizing rules: the image never grows wider than its column (`max-width: 100%`); with one
 * value set, the other follows the aspect ratio; whenever the height is fixed, the image
 * is fitted into its box (`object-fit: contain`) so a width capped by the column can never
 * distort it.
 */
export function imageStyle(width: Dimension, height: Dimension): IImageStyle {
  return {
    width: toCss(width),
    height: toCss(height),
    'max-width': '100%',
    'object-fit': height.kind === 'auto' ? 'fill' : 'contain'
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
    default:
      return field === 'width' ? 'DimensionErrorInvalidWidth' : 'DimensionErrorInvalidHeight';
  }
}
