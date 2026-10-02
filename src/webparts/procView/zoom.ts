/**
 * Zoom and pan maths for the diagram — pure functions, no DOM.
 *
 * The image element keeps its configured size (the viewport). Zooming applies
 * `transform: translate(x, y) scale(scale)` with `transform-origin: 0 0`, so `scale` is
 * relative to the displayed size: 1 = as configured, the maximum = the image's natural size
 * (the PNG is sharp up to 100 %). With `object-fit: contain` the painted image can be smaller
 * than its element box, so all limits follow the painted content, not the box.
 */

/** A width and height in CSS pixels. */
export interface ISize {
  width: number;
  height: number;
}

/** A point in viewport coordinates (CSS pixels from the viewport's top-left corner). */
export interface IPoint {
  x: number;
  y: number;
}

/** Viewport (the image element's box) and the image's natural size, both in CSS pixels. */
export interface IZoomGeometry {
  viewport: ISize;
  natural: ISize;
}

/**
 * Zoom state: `scale` relative to the configured size, `x`/`y` the translation in viewport
 * pixels — applied before the scale (`transform-origin: 0 0`).
 */
export interface IZoomState {
  scale: number;
  x: number;
  y: number;
}

/** A zoom target: the scale to reach and the viewport point that stays on the same image spot. */
export interface IZoomTarget {
  scale: number;
  focal: IPoint;
}

/** A two-finger pinch: midpoint and finger distance at the start and now. */
export interface IPinch {
  startMid: IPoint;
  startDistance: number;
  mid: IPoint;
  distance: number;
}

/** Factor per button press or key stroke. */
export const ZOOM_STEP = 1.25;
/** Share of the viewport moved per arrow key stroke. */
export const PAN_STEP = 0.1;
/** Scales closer than this count as equal — "zoomed in", "at the maximum". */
export const ZOOM_EPSILON = 0.001;
/** Below this headroom, zooming is not worth offering. */
const MIN_HEADROOM = 1.05;

/** The configured size, not zoomed and not moved. */
export const INITIAL_STATE: IZoomState = { scale: 1, x: 0, y: 0 };

interface IPaintedArea {
  /** Offset of the painted image inside the viewport at scale 1. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** One axis for clamping: where the painted image starts, how long it is, the viewport length. */
interface IAxis {
  start: number;
  length: number;
  viewport: number;
}

/** The painted image at scale 1: the natural size fitted into the viewport, centred. */
function getPaintedArea(geometry: IZoomGeometry): IPaintedArea | undefined {
  const { viewport, natural } = geometry;
  // `!(x > 0)` also rejects NaN, which `x <= 0` would let through
  if (!(viewport.width > 0) || !(viewport.height > 0) || !(natural.width > 0) || !(natural.height > 0)) {
    return undefined;
  }
  const fit = Math.min(viewport.width / natural.width, viewport.height / natural.height);
  const width = natural.width * fit;
  const height = natural.height * fit;
  return { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height };
}

/** Largest scale: the image at its natural size (never below 1). */
export function computeMaxScale(geometry: IZoomGeometry): number {
  const painted = getPaintedArea(geometry);
  return painted ? Math.max(1, geometry.natural.width / painted.width) : 1;
}

/** Whether zooming makes sense — the image is shown noticeably smaller than its natural size. */
export function canZoom(geometry: IZoomGeometry): boolean {
  return computeMaxScale(geometry) >= MIN_HEADROOM;
}

function clampAxis(offset: number, scale: number, axis: IAxis): number {
  const scaled = axis.length * scale;
  if (scaled <= axis.viewport) {
    // Smaller than the viewport on this axis: keep it centred
    return (axis.viewport - scaled) / 2 - axis.start * scale;
  }
  // Larger: the painted image must cover the viewport, no empty margin may appear
  const min = axis.viewport - (axis.start + axis.length) * scale;
  // `0 -` instead of a unary minus: no negative zero in the state
  const max = 0 - axis.start * scale;
  return Math.min(Math.max(Number.isFinite(offset) ? offset : max, min), max);
}

/**
 * Brings scale and offset into range: 1 … natural size, the image never leaves the viewport.
 * A scale or offset that is not a finite number falls back to the configured size and the
 * top-left corner, so a broken input can never leave the state at NaN. Below the zoom headroom
 * (`canZoom`) it is always the configured size — e.g. when the frame grew while zoomed.
 */
export function clamp(state: IZoomState, geometry: IZoomGeometry): IZoomState {
  const painted = getPaintedArea(geometry);
  if (!painted || !canZoom(geometry)) {
    return INITIAL_STATE;
  }
  const scale = Math.min(Math.max(Number.isFinite(state.scale) ? state.scale : 1, 1), computeMaxScale(geometry));
  return {
    scale,
    x: clampAxis(state.x, scale, { start: painted.left, length: painted.width, viewport: geometry.viewport.width }),
    y: clampAxis(state.y, scale, { start: painted.top, length: painted.height, viewport: geometry.viewport.height })
  };
}

/** Zooms to `target.scale`, keeping the viewport point `target.focal` on the same image spot. */
export function zoomTo(state: IZoomState, geometry: IZoomGeometry, target: IZoomTarget): IZoomState {
  if (!Number.isFinite(target.scale)) {
    return clamp(state, geometry);
  }
  const scale = Math.min(Math.max(target.scale, 1), computeMaxScale(geometry));
  const ratio = scale / state.scale;
  const { focal } = target;
  return clamp({ scale, x: focal.x - (focal.x - state.x) * ratio, y: focal.y - (focal.y - state.y) * ratio }, geometry);
}

/** Zooms by `factor` (> 1 in, < 1 out) around `focal`, by default the viewport centre. */
export function zoomBy(state: IZoomState, geometry: IZoomGeometry, by: { factor: number; focal?: IPoint }): IZoomState {
  const focal = by.focal ?? { x: geometry.viewport.width / 2, y: geometry.viewport.height / 2 };
  return zoomTo(state, geometry, { scale: state.scale * by.factor, focal });
}

/** Moves the image by `delta` viewport pixels, within the limits; a broken delta moves nothing. */
export function pan(state: IZoomState, geometry: IZoomGeometry, delta: IPoint): IZoomState {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
    return clamp(state, geometry);
  }
  return clamp({ scale: state.scale, x: state.x + delta.x, y: state.y + delta.y }, geometry);
}

/**
 * Two-finger pinch relative to where it started: zooms by the change of finger distance around
 * the starting midpoint, then follows the midpoint's movement.
 */
export function pinch(start: IZoomState, geometry: IZoomGeometry, gesture: IPinch): IZoomState {
  if (!(gesture.startDistance > 0)) {
    return clamp(start, geometry);
  }
  const zoomed = zoomTo(start, geometry, {
    scale: start.scale * (gesture.distance / gesture.startDistance),
    focal: gesture.startMid
  });
  return pan(zoomed, geometry, { x: gesture.mid.x - gesture.startMid.x, y: gesture.mid.y - gesture.startMid.y });
}

/** Whether the image is zoomed in (any noticeable amount). */
export function isZoomed(state: IZoomState): boolean {
  return state.scale > 1 + ZOOM_EPSILON;
}

/** CSS transform for the image (with `transform-origin: 0 0`). */
export function toTransform(state: IZoomState): string {
  return isZoomed(state) ? `translate(${state.x}px, ${state.y}px) scale(${state.scale})` : '';
}
