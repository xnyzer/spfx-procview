import { SVG_NS, createIcon, createIconCanvas } from './svgIcon';
import type { IconName } from './svgIcon';

const NAMES: IconName[] = ['zoomIn', 'zoomOut', 'reset', 'fullScreen', 'close', 'externalLink'];

describe('createIconCanvas', () => {
  it('draws on the 16 × 16 grid at the requested size, hidden from screen readers and focus', () => {
    const svg = createIconCanvas(document, 12);
    expect(svg.namespaceURI).toBe(SVG_NS);
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(svg.getAttribute('width')).toBe('12');
    expect(svg.getAttribute('height')).toBe('12');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
  });

  it('is 16 pixels by default', () => {
    expect(createIconCanvas(document).getAttribute('width')).toBe('16');
  });
});

describe('createIcon', () => {
  it.each(NAMES.map((name) => [name]))('draws %s as one stroked path in the text colour', (name) => {
    const path = createIcon(document, name).querySelector('path');
    expect(path?.getAttribute('d')).toMatch(/^M/);
    expect(path?.getAttribute('fill')).toBe('none');
    expect(path?.getAttribute('stroke')).toBe('currentColor');
    expect(path?.getAttribute('stroke-width')).toBe('1.5');
  });

  it('keeps square line ends only for the external-link icon (as before the shared helper)', () => {
    expect(createIcon(document, 'externalLink').querySelector('path')?.hasAttribute('stroke-linecap')).toBe(false);
    expect(createIcon(document, 'close').querySelector('path')?.getAttribute('stroke-linecap')).toBe('round');
  });
});
