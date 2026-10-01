import { INITIAL_STATE, canZoom, clamp, isZoomed, maxScale, pan, pinch, toTransform, zoomBy, zoomTo } from './zoom';
import type { IZoomGeometry, IZoomState } from './zoom';

/** Image element shows the diagram at a quarter of its natural size, no letterbox. */
const FILL: IZoomGeometry = { viewport: { width: 500, height: 250 }, natural: { width: 2000, height: 1000 } };
/** Fixed square box with `object-fit: contain`: painted 500 × 250, 125 px empty above and below. */
const CONTAIN: IZoomGeometry = { viewport: { width: 500, height: 500 }, natural: { width: 2000, height: 1000 } };
/** Diagram shown larger than its natural size — nothing to zoom. */
const SMALL: IZoomGeometry = { viewport: { width: 500, height: 250 }, natural: { width: 400, height: 200 } };

describe('maxScale / canZoom', () => {
  it('allows zooming up to the natural size', () => {
    expect(maxScale(FILL)).toBe(4);
    expect(maxScale(CONTAIN)).toBe(4);
    expect(canZoom(FILL)).toBe(true);
  });

  it('offers no zoom when the diagram is already shown at or above its natural size', () => {
    expect(maxScale(SMALL)).toBe(1);
    expect(canZoom(SMALL)).toBe(false);
    expect(canZoom({ viewport: { width: 500, height: 250 }, natural: { width: 510, height: 255 } })).toBe(false);
  });

  it('treats an unloaded image or a hidden viewport as not zoomable', () => {
    expect(canZoom({ viewport: { width: 500, height: 250 }, natural: { width: 0, height: 0 } })).toBe(false);
    expect(canZoom({ viewport: { width: 0, height: 0 }, natural: { width: 2000, height: 1000 } })).toBe(false);
    expect(clamp({ scale: 3, x: -10, y: -10 }, { viewport: { width: 0, height: 0 }, natural: FILL.natural })).toEqual(
      INITIAL_STATE
    );
  });
});

describe('zoomBy / zoomTo', () => {
  it('zooms around the viewport centre by default', () => {
    expect(zoomBy(INITIAL_STATE, FILL, 2)).toEqual({ scale: 2, x: -250, y: -125 });
  });

  it('keeps the image spot under the focal point', () => {
    const focal = { x: 100, y: 50 };
    const before: IZoomState = { scale: 2, x: -200, y: -100 };
    const after = zoomTo(before, FILL, 3, focal);
    expect((focal.x - after.x) / after.scale).toBeCloseTo((focal.x - before.x) / before.scale);
    expect((focal.y - after.y) / after.scale).toBeCloseTo((focal.y - before.y) / before.scale);
  });

  it('stops at the natural size and at the configured size', () => {
    expect(zoomBy(INITIAL_STATE, FILL, 10).scale).toBe(4);
    expect(zoomBy({ scale: 2, x: -250, y: -125 }, FILL, 0.1)).toEqual(INITIAL_STATE);
  });

  it('does not zoom a diagram that is already shown at natural size', () => {
    expect(zoomBy(INITIAL_STATE, SMALL, 2)).toEqual(INITIAL_STATE);
  });
});

describe('pan / clamp', () => {
  const zoomed: IZoomState = { scale: 2, x: -250, y: -125 };

  it('moves within the limits — no empty margin ever appears', () => {
    expect(pan(zoomed, FILL, 100, 50)).toEqual({ scale: 2, x: -150, y: -75 });
    expect(pan(zoomed, FILL, 1000, 1000)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(pan(zoomed, FILL, -1000, -1000)).toEqual({ scale: 2, x: -500, y: -250 });
  });

  it('cannot move the image at the configured size', () => {
    expect(pan(INITIAL_STATE, FILL, 100, 100)).toEqual(INITIAL_STATE);
  });

  it('follows the painted image, not the letterboxed box (object-fit: contain)', () => {
    // At 2× the painted height (500) equals the box: centred, no vertical movement
    const twice = zoomBy(INITIAL_STATE, CONTAIN, 2);
    expect(twice.y).toBe(-250);
    expect(pan(twice, CONTAIN, 0, 300).y).toBe(-250);
    // At 4× it is taller than the box: it may move, but its edges never come into view
    const four = zoomBy(INITIAL_STATE, CONTAIN, 4);
    expect(pan(four, CONTAIN, 0, 10000).y).toBe(-500);
    expect(pan(four, CONTAIN, 0, -10000).y).toBe(-1000);
  });

  it('re-clamps when the viewport changes, e.g. a wider column', () => {
    const wider: IZoomGeometry = { viewport: { width: 1000, height: 500 }, natural: FILL.natural };
    expect(clamp({ scale: 4, x: -1500, y: -750 }, wider)).toEqual({ scale: 2, x: -1000, y: -500 });
  });
});

describe('pinch', () => {
  const centre = { x: 250, y: 125 };

  it('zooms by the change of finger distance around the starting midpoint', () => {
    expect(pinch(INITIAL_STATE, FILL, centre, 100, centre, 200)).toEqual({ scale: 2, x: -250, y: -125 });
  });

  it('follows the midpoint while pinching', () => {
    expect(pinch(INITIAL_STATE, FILL, centre, 100, { x: 300, y: 125 }, 200)).toEqual({
      scale: 2,
      x: -200,
      y: -125
    });
  });

  it('ignores a degenerate start distance', () => {
    expect(pinch({ scale: 2, x: -250, y: -125 }, FILL, centre, 0, centre, 100)).toEqual({
      scale: 2,
      x: -250,
      y: -125
    });
  });
});

describe('isZoomed / toTransform', () => {
  it('describes the zoomed image as a CSS transform', () => {
    expect(toTransform({ scale: 2, x: -250, y: -125 })).toBe('translate(-250px, -125px) scale(2)');
    expect(isZoomed({ scale: 2, x: 0, y: 0 })).toBe(true);
  });

  it('removes the transform at the configured size', () => {
    expect(toTransform(INITIAL_STATE)).toBe('');
    expect(isZoomed(INITIAL_STATE)).toBe(false);
  });
});
