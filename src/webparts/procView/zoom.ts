/**
 * Zoom and pan maths for the diagram — pure functions, no DOM.
 *
 * The image element keeps its configured size (the viewport). Zooming applies
 * `transform: translate(x, y) scale(scale)` with `transform-origin: 0 0`, so `scale` is
 * relative to the displayed size: 1 = as configured, the maximum = the image's natural size
 * (the PNG is sharp up to 100 %). With `object-fit: contain` the painted image can be smaller
 * than its element box, so all limits follow the painted content, not the box.
 */

export interface ISize {
  width: number;
  height: number;
}

export interface IPoint {
  x: number;
  y: number;
}

/** Viewport (the image element's box) and the image's natural size, both in CSS pixels. */
export interface IZoomGeometry {
  viewport: ISize;
  natural: ISize;
}

export interface IZoomState {
  scale: number;
  x: number;
  y: number;
}

/** Factor per button press or key stroke. */
export const ZOOM_STEP = 1.25;
/** Share of the viewport moved per arrow key stroke. */
export const PAN_STEP = 0.1;
/** Below this headroom, zooming is not worth offering. */
const MIN_HEADROOM = 1.05;

export const INITIAL_STATE: IZoomState = { scale: 1, x: 0, y: 0 };

interface IContent {
  /** Offset of the painted image inside the viewport at scale 1. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The painted image at scale 1: the natural size fitted into the viewport, centred. */
function content(geometry: IZoomGeometry): IContent | undefined {
  const { viewport, natural } = geometry;
  if (viewport.width <= 0 || viewport.height <= 0 || natural.width <= 0 || natural.height <= 0) {
    return undefined;
  }
  const fit = Math.min(viewport.width / natural.width, viewport.height / natural.height);
  const width = natural.width * fit;
  const height = natural.height * fit;
  return { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height };
}

/** Largest scale: the image at its natural size (never below 1). */
export function maxScale(geometry: IZoomGeometry): number {
  const painted = content(geometry);
  return painted ? Math.max(1, geometry.natural.width / painted.width) : 1;
}

/** Whether zooming makes sense — the image is shown noticeably smaller than its natural size. */
export function canZoom(geometry: IZoomGeometry): boolean {
  return maxScale(geometry) >= MIN_HEADROOM;
}

function clampAxis(offset: number, scale: number, start: number, length: number, viewport: number): number {
  const scaled = length * scale;
  if (scaled <= viewport) {
    // Smaller than the viewport on this axis: keep it centred
    return (viewport - scaled) / 2 - start * scale;
  }
  // Larger: the painted image must cover the viewport, no empty margin may appear
  const min = viewport - (start + length) * scale;
  // `0 -` instead of a unary minus: no negative zero in the state
  const max = 0 - start * scale;
  return Math.min(Math.max(offset, min), max);
}

/** Brings scale and offset into range: 1 … natural size, the image never leaves the viewport. */
export function clamp(state: IZoomState, geometry: IZoomGeometry): IZoomState {
  const painted = content(geometry);
  if (!painted) {
    return INITIAL_STATE;
  }
  const scale = Math.min(Math.max(state.scale, 1), maxScale(geometry));
  return {
    scale,
    x: clampAxis(state.x, scale, painted.left, painted.width, geometry.viewport.width),
    y: clampAxis(state.y, scale, painted.top, painted.height, geometry.viewport.height)
  };
}

/** Zooms to `scale`, keeping the viewport point `focal` on the same image spot. */
export function zoomTo(state: IZoomState, geometry: IZoomGeometry, scale: number, focal: IPoint): IZoomState {
  const target = Math.min(Math.max(scale, 1), maxScale(geometry));
  const ratio = target / state.scale;
  return clamp(
    { scale: target, x: focal.x - (focal.x - state.x) * ratio, y: focal.y - (focal.y - state.y) * ratio },
    geometry
  );
}

/** Zooms by `factor` (> 1 in, < 1 out) around `focal`, by default the viewport centre. */
export function zoomBy(state: IZoomState, geometry: IZoomGeometry, factor: number, focal?: IPoint): IZoomState {
  const point = focal ?? { x: geometry.viewport.width / 2, y: geometry.viewport.height / 2 };
  return zoomTo(state, geometry, state.scale * factor, point);
}

/** Moves the image by (dx, dy) viewport pixels, within the limits. */
export function pan(state: IZoomState, geometry: IZoomGeometry, dx: number, dy: number): IZoomState {
  return clamp({ scale: state.scale, x: state.x + dx, y: state.y + dy }, geometry);
}

/**
 * Two-finger pinch relative to where it started: zooms by the change of finger distance around
 * the starting midpoint, then follows the midpoint's movement.
 */
export function pinch(
  start: IZoomState,
  geometry: IZoomGeometry,
  startMid: IPoint,
  startDistance: number,
  mid: IPoint,
  distance: number
): IZoomState {
  if (startDistance <= 0) {
    return clamp(start, geometry);
  }
  const zoomed = zoomTo(start, geometry, start.scale * (distance / startDistance), startMid);
  return pan(zoomed, geometry, mid.x - startMid.x, mid.y - startMid.y);
}

/** Whether the image is zoomed in (any noticeable amount). */
export function isZoomed(state: IZoomState): boolean {
  return state.scale > 1.001;
}

/** CSS transform for the image (with `transform-origin: 0 0`). */
export function toTransform(state: IZoomState): string {
  return isZoomed(state) ? `translate(${state.x}px, ${state.y}px) scale(${state.scale})` : '';
}
