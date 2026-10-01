import { DEFAULT_BACKGROUND, backgroundStyles, parseBackgroundColor } from './background';

describe('parseBackgroundColor', () => {
  it('accepts #rrggbb and normalises it', () => {
    expect(parseBackgroundColor('#FFEECC')).toBe('#ffeecc');
    expect(parseBackgroundColor(' #0e5a73 ')).toBe('#0e5a73');
  });

  it('falls back to white for anything else — property data is untrusted', () => {
    expect(DEFAULT_BACKGROUND).toBe('#ffffff');
    ['', '#fff', 'red', '#12345g', 'url(x)', '#123456;color:red', undefined, null, 42, { color: '#000000' }].forEach(
      (value) => expect(parseBackgroundColor(value)).toBe(DEFAULT_BACKGROUND)
    );
  });
});

describe('backgroundStyles', () => {
  it('fits a single-colour SVG with the image proportions like the image itself', () => {
    const styles = backgroundStyles('#ffffff', { width: 2000, height: 1000 });
    expect(styles['background-size']).toBe('contain');
    expect(styles['background-position']).toBe('center');
    expect(styles['background-repeat']).toBe('no-repeat');
    const svg = decodeURIComponent(
      (styles['background-image'] as string).replace(/^url\("data:image\/svg\+xml,/, '').replace(/"\)$/, '')
    );
    expect(svg).toContain("width='2000' height='1000' viewBox='0 0 2000 1000'");
    expect(svg).toContain("fill='#ffffff'");
  });

  it('keeps the data URI free of characters that could end the CSS url()', () => {
    const image = backgroundStyles('#0e5a73', { width: 720, height: 457 })['background-image'] as string;
    const inner = image.slice('url("'.length, -'")'.length);
    expect(inner).not.toMatch(/["'()\s]/);
  });

  it('returns nothing without a valid colour or a known image size', () => {
    expect(backgroundStyles('red', { width: 100, height: 100 })).toEqual({});
    expect(backgroundStyles("#fff' onload='x", { width: 100, height: 100 })).toEqual({});
    expect(backgroundStyles('#ffffff', { width: 0, height: 0 })).toEqual({});
    expect(backgroundStyles('#ffffff', { width: NaN, height: 10 })).toEqual({});
  });
});
