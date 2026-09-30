import { diagramStyles, dimensionErrorKey, MAX_PX, parseDimension } from './sizing';
import type { Dimension, DimensionResult } from './sizing';

const auto: Dimension = { kind: 'auto' };
const px = (value: number): Dimension => ({ kind: 'px', value });
const pct = (value: number): Dimension => ({ kind: 'percent', value });

function errorOf(result: DimensionResult): string | undefined {
  return result.ok ? undefined : result.error;
}

describe('parseDimension — accepted input', () => {
  it.each([[undefined], [''], ['   '], ['auto'], ['AUTO'], [' Auto ']])('reads %p as automatic', (input) => {
    expect(parseDimension(input, true)).toEqual({ ok: true, dimension: auto });
  });

  it('reads whole numbers as pixels', () => {
    expect(parseDimension('800', false)).toEqual({ ok: true, dimension: px(800) });
    expect(parseDimension(' 1 ', false)).toEqual({ ok: true, dimension: px(1) });
    expect(parseDimension(String(MAX_PX), false)).toEqual({ ok: true, dimension: px(MAX_PX) });
  });

  it('reads NN% as percent of the column where percent is allowed', () => {
    expect(parseDimension('50%', true)).toEqual({ ok: true, dimension: pct(50) });
    expect(parseDimension('100 %', true)).toEqual({ ok: true, dimension: pct(100) });
    expect(parseDimension('1%', true)).toEqual({ ok: true, dimension: pct(1) });
  });
});

describe('parseDimension — untrusted property data', () => {
  it.each([[null], [800], [true], [{}], [['800']]])('reads the non-string %p as automatic', (input) => {
    expect(parseDimension(input, true)).toEqual({ ok: true, dimension: auto });
  });
});

describe('parseDimension — rejected input', () => {
  it.each([['0'], ['-5'], ['12.5'], ['12,5'], ['12px'], ['abc'], ['1e3'], ['50 %%'], ['%50']])(
    'rejects %p as invalid',
    (input) => {
      expect(errorOf(parseDimension(input, true))).toBe('invalid');
    }
  );

  it('rejects pixel values above the upper bound', () => {
    expect(errorOf(parseDimension(String(MAX_PX + 1), false))).toBe('tooLarge');
    expect(errorOf(parseDimension('20000', true))).toBe('tooLarge');
  });

  it('rejects percentages outside 1–100', () => {
    expect(errorOf(parseDimension('0%', true))).toBe('percentOutOfRange');
    expect(errorOf(parseDimension('101%', true))).toBe('percentOutOfRange');
  });

  it('rejects a percentage where it is not allowed (height)', () => {
    expect(errorOf(parseDimension('50%', false))).toBe('percentNotAllowed');
  });
});

describe('diagramStyles', () => {
  it.each<[string, Dimension, Dimension, Record<string, string>, Record<string, string>]>([
    ['auto / auto', auto, auto, { width: 'fit-content' }, { width: 'auto', height: 'auto', 'object-fit': 'fill' }],
    ['px / auto', px(800), auto, { width: 'fit-content' }, { width: '800px', height: 'auto', 'object-fit': 'fill' }],
    ['% / auto', pct(50), auto, { width: '50%' }, { width: '100%', height: 'auto', 'object-fit': 'fill' }],
    ['auto / px', auto, px(600), { width: 'fit-content' }, { width: 'auto', height: '600px', 'object-fit': 'contain' }],
    [
      'px / px',
      px(800),
      px(600),
      { width: 'fit-content' },
      { width: '800px', height: '600px', 'object-fit': 'contain' }
    ],
    ['% / px', pct(50), px(600), { width: '50%' }, { width: '100%', height: '600px', 'object-fit': 'contain' }]
  ])('%s', (_label, width, height, frame, image) => {
    expect(diagramStyles(width, height)).toEqual({
      frame: { ...frame, 'max-width': '100%' },
      image: { ...image, 'max-width': '100%' }
    });
  });

  it('never puts a percentage on the image except 100% of its frame', () => {
    const { image } = diagramStyles(pct(30), auto);
    expect(image.width).toBe('100%');
  });
});

describe('dimensionErrorKey', () => {
  it('gives width and height their own hint for invalid input', () => {
    expect(dimensionErrorKey('invalid', 'width')).toBe('DimensionErrorInvalidWidth');
    expect(dimensionErrorKey('invalid', 'height')).toBe('DimensionErrorInvalidHeight');
  });

  it('maps the remaining errors', () => {
    expect(dimensionErrorKey('tooLarge', 'width')).toBe('DimensionErrorTooLarge');
    expect(dimensionErrorKey('percentOutOfRange', 'width')).toBe('DimensionErrorPercentOutOfRange');
    expect(dimensionErrorKey('percentNotAllowed', 'height')).toBe('DimensionErrorPercentHeight');
  });
});
