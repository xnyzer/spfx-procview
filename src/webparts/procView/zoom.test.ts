import { INITIAL_STATE, canZoom, clamp, isZoomed, maxScale, pan, pinch, toTransform, zoomBy, zoomTo } from './zoom';
import type { IPinch, IPoint, IZoomGeometry, IZoomState } from './zoom';

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
    expect(zoomBy(INITIAL_STATE, FILL, { factor: 2 })).toEqual({ scale: 2, x: -250, y: -125 });
  });

  it('keeps the image spot under the focal point', () => {
    const focal = { x: 100, y: 50 };
    const before: IZoomState = { scale: 2, x: -200, y: -100 };
    const after = zoomTo(before, FILL, { scale: 3, focal });
    expect((focal.x - after.x) / after.scale).toBeCloseTo((focal.x - before.x) / before.scale);
    expect((focal.y - after.y) / after.scale).toBeCloseTo((focal.y - before.y) / before.scale);
  });

  it('stops at the natural size and at the configured size', () => {
    expect(zoomBy(INITIAL_STATE, FILL, { factor: 10 }).scale).toBe(4);
    expect(zoomBy({ scale: 2, x: -250, y: -125 }, FILL, { factor: 0.1 })).toEqual(INITIAL_STATE);
  });

  it('does not zoom a diagram that is already shown at natural size', () => {
    expect(zoomBy(INITIAL_STATE, SMALL, { factor: 2 })).toEqual(INITIAL_STATE);
  });
});

describe('pan / clamp', () => {
  const zoomed: IZoomState = { scale: 2, x: -250, y: -125 };

  it('moves within the limits — no empty margin ever appears', () => {
    expect(pan(zoomed, FILL, { x: 100, y: 50 })).toEqual({ scale: 2, x: -150, y: -75 });
    expect(pan(zoomed, FILL, { x: 1000, y: 1000 })).toEqual({ scale: 2, x: 0, y: 0 });
    expect(pan(zoomed, FILL, { x: -1000, y: -1000 })).toEqual({ scale: 2, x: -500, y: -250 });
  });

  it('cannot move the image at the configured size', () => {
    expect(pan(INITIAL_STATE, FILL, { x: 100, y: 100 })).toEqual(INITIAL_STATE);
  });

  it('follows the painted image, not the letterboxed box (object-fit: contain)', () => {
    // At 2× the painted height (500) equals the box: centred, no vertical movement
    const twice = zoomBy(INITIAL_STATE, CONTAIN, { factor: 2 });
    expect(twice.y).toBe(-250);
    expect(pan(twice, CONTAIN, { x: 0, y: 300 }).y).toBe(-250);
    // At 4× it is taller than the box: it may move, but its edges never come into view
    const four = zoomBy(INITIAL_STATE, CONTAIN, { factor: 4 });
    expect(pan(four, CONTAIN, { x: 0, y: 10000 }).y).toBe(-500);
    expect(pan(four, CONTAIN, { x: 0, y: -10000 }).y).toBe(-1000);
  });

  it('re-clamps when the viewport changes, e.g. a wider column', () => {
    const wider: IZoomGeometry = { viewport: { width: 1000, height: 500 }, natural: FILL.natural };
    expect(clamp({ scale: 4, x: -1500, y: -750 }, wider)).toEqual({ scale: 2, x: -1000, y: -500 });
  });
});

describe('pinch', () => {
  const centre = { x: 250, y: 125 };

  /** A pinch that started at the centre with `startDistance` between the fingers. */
  function gesture(startDistance: number, mid: IPoint, distance: number): IPinch {
    return { startMid: centre, startDistance, mid, distance };
  }

  it('zooms by the change of finger distance around the starting midpoint', () => {
    expect(pinch(INITIAL_STATE, FILL, gesture(100, centre, 200))).toEqual({ scale: 2, x: -250, y: -125 });
  });

  it('follows the midpoint while pinching', () => {
    expect(pinch(INITIAL_STATE, FILL, gesture(100, { x: 300, y: 125 }, 200))).toEqual({
      scale: 2,
      x: -200,
      y: -125
    });
  });

  it('ignores a degenerate start distance', () => {
    expect(pinch({ scale: 2, x: -250, y: -125 }, FILL, gesture(0, centre, 100))).toEqual({
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

describe('broken input never leaves the state at NaN', () => {
  it('falls back to the configured size for a scale or offset that is not a number', () => {
    expect(clamp({ scale: NaN, x: 0, y: 0 }, FILL)).toEqual(INITIAL_STATE);
    expect(clamp({ scale: 2, x: NaN, y: Infinity }, FILL)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('keeps the state for a zoom factor that is not a number', () => {
    const zoomed: IZoomState = { scale: 2, x: -250, y: -125 };
    expect(zoomBy(zoomed, FILL, { factor: NaN })).toEqual(zoomed);
    expect(zoomTo(zoomed, FILL, { scale: Infinity, focal: { x: 0, y: 0 } })).toEqual(zoomed);
  });

  it('ignores a movement or a pinch that is not a number', () => {
    const zoomed: IZoomState = { scale: 2, x: -250, y: -125 };
    expect(pan(zoomed, FILL, { x: NaN, y: 0 })).toEqual(zoomed);
    const centre = { x: 250, y: 125 };
    expect(pinch(zoomed, FILL, { startMid: centre, startDistance: NaN, mid: centre, distance: 100 })).toEqual(zoomed);
  });

  it('treats a geometry with NaN as not zoomable', () => {
    expect(canZoom({ viewport: { width: NaN, height: 250 }, natural: FILL.natural })).toBe(false);
    expect(clamp({ scale: 2, x: 0, y: 0 }, { viewport: FILL.viewport, natural: { width: NaN, height: 1000 } })).toEqual(
      INITIAL_STATE
    );
  });
});
