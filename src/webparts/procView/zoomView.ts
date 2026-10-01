import {
  INITIAL_STATE,
  PAN_STEP,
  ZOOM_STEP,
  canZoom,
  clamp,
  isZoomed,
  maxScale,
  pan,
  pinch,
  toTransform,
  zoomBy
} from './zoom';
import type { IPoint, IZoomGeometry, IZoomState } from './zoom';

export interface IZoomLabels {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  /** Accessible name of the zoomable area, e.g. how to zoom and move with the keyboard. */
  viewport: string;
}

/**
 * The stylesheet owns the gesture handling via these classes: `zoomable` gets
 * `touch-action: pan-x pan-y` (swipes scroll the page, pinch reaches the diagram, page
 * pinch-zoom does not), `zoomed` gets `touch-action: none` (all gestures go to the diagram).
 */
export interface IZoomClassNames {
  /** On the viewport while zooming is offered. */
  zoomable: string;
  /** On the viewport while zoomed in. */
  zoomed: string;
  controls: string;
  button: string;
}

export interface IZoomViewProps {
  /** Clips the image, receives the gestures and hosts the controls (the diagram frame). */
  viewport: HTMLElement;
  image: HTMLImageElement;
  labels: IZoomLabels;
  classNames: IZoomClassNames;
  /** Where the controls go, e.g. a control bar shared with other buttons; default the viewport. */
  host?: HTMLElement;
  /** Current geometry; by default the image element's box and its natural size. */
  measure?: () => IZoomGeometry;
}

export interface IZoomController {
  state(): IZoomState;
  /** Re-reads the geometry, e.g. after the image has loaded or the column changed. */
  update(): void;
  reset(): void;
  dispose(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Wheel delta per factor e (Ctrl/Cmd + wheel): about one zoom step per wheel notch. */
const WHEEL_SENSITIVITY = 0.0015;
/** Pixels per wheel "line" when the browser reports lines instead of pixels. */
const WHEEL_LINE = 16;
const EPSILON = 0.001;

type IconName = 'zoomIn' | 'zoomOut' | 'reset';

/** Stroke paths of the 16 × 16 control icons: plus, minus and "fit" (four corners). */
const ICON_PATHS: Record<IconName, string> = {
  zoomIn: 'M3 8h10M8 3v10',
  zoomOut: 'M3 8h10',
  reset: 'M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4'
};

function icon(doc: Document, name: IconName): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

function distance(a: IPoint, b: IPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: IPoint, b: IPoint): IPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

interface IPinchStart {
  state: IZoomState;
  mid: IPoint;
  distance: number;
}

/**
 * Adds zoom and pan to a diagram: controls (−, +, fit) in the viewport, Ctrl/Cmd + wheel,
 * one-finger/mouse drag while zoomed, two-finger pinch, and keys (+, −, 0, arrows) on the
 * focusable viewport. Plain wheel and one-finger swipes at the configured size keep scrolling
 * the page. The image keeps its element size; only a CSS transform changes (zoom.ts).
 */
export function attachZoom(doc: Document, props: IZoomViewProps): IZoomController {
  const { viewport, image, labels, classNames } = props;
  const measure =
    props.measure ??
    ((): IZoomGeometry => ({
      viewport: { width: image.clientWidth, height: image.clientHeight },
      natural: { width: image.naturalWidth, height: image.naturalHeight }
    }));

  let state: IZoomState = INITIAL_STATE;
  const pointers = new Map<number, IPoint>();
  let lastPan: IPoint | undefined;
  let pinchStart: IPinchStart | undefined;

  const controls = doc.createElement('div');
  controls.className = classNames.controls;
  const button = (name: IconName, label: string, action: () => void): HTMLButtonElement => {
    const element = doc.createElement('button');
    element.type = 'button';
    element.className = classNames.button;
    element.setAttribute('aria-label', label);
    element.title = label;
    element.appendChild(icon(doc, name));
    element.addEventListener('click', action);
    controls.appendChild(element);
    return element;
  };
  const zoomOutButton = button('zoomOut', labels.zoomOut, () => set(zoomBy(state, measure(), 1 / ZOOM_STEP)));
  const zoomInButton = button('zoomIn', labels.zoomIn, () => set(zoomBy(state, measure(), ZOOM_STEP)));
  const resetButton = button('reset', labels.reset, () => set(INITIAL_STATE));
  (props.host ?? viewport).appendChild(controls);

  image.style.setProperty('transform-origin', '0 0');

  function render(): void {
    const geometry = measure();
    const zoomable = canZoom(geometry);
    const zoomed = isZoomed(state);
    image.style.setProperty('transform', toTransform(state));
    viewport.classList.toggle(classNames.zoomable, zoomable);
    // Gestures belong to the diagram only while zoomed (touch-action via these classes)
    viewport.classList.toggle(classNames.zoomed, zoomed);
    controls.hidden = !zoomable;
    zoomOutButton.disabled = !zoomed;
    resetButton.disabled = !zoomed;
    zoomInButton.disabled = state.scale >= maxScale(geometry) - EPSILON;
    if (zoomable) {
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'group');
      viewport.setAttribute('aria-label', labels.viewport);
    } else {
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-label');
    }
  }

  function set(next: IZoomState): void {
    state = clamp(next, measure());
    render();
  }

  /** Viewport coordinates of a client point. */
  function local(clientX: number, clientY: number): IPoint {
    const rect = viewport.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  const onWheel = (event: WheelEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || !canZoom(measure())) {
      return;
    }
    event.preventDefault();
    const delta = event.deltaMode === 1 ? event.deltaY * WHEEL_LINE : event.deltaY;
    set(zoomBy(state, measure(), Math.exp(-delta * WHEEL_SENSITIVITY), local(event.clientX, event.clientY)));
  };

  /** Clicks on the controls or on links (the hub overlay) are not gestures. */
  const isControl = (target: EventTarget | null): boolean =>
    target instanceof Element && target.closest('button, a') !== null;

  const startPinch = (): void => {
    const [a, b] = Array.from(pointers.values());
    pinchStart = { state, mid: midpoint(a, b), distance: distance(a, b) };
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (isControl(event.target) || !canZoom(measure()) || pointers.size >= 2) {
      return;
    }
    const point = local(event.clientX, event.clientY);
    pointers.set(event.pointerId, point);
    if (pointers.size === 2) {
      lastPan = undefined;
      startPinch();
    } else if (isZoomed(state)) {
      lastPan = point;
    }
    if (pointers.size === 2 || isZoomed(state)) {
      event.preventDefault();
      try {
        viewport.setPointerCapture?.(event.pointerId);
      } catch {
        // Capture is a convenience (drags leaving the frame); without it gestures still work
      }
    }
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!pointers.has(event.pointerId)) {
      return;
    }
    const point = local(event.clientX, event.clientY);
    pointers.set(event.pointerId, point);
    if (pointers.size >= 2 && pinchStart) {
      const [a, b] = Array.from(pointers.values());
      event.preventDefault();
      set(pinch(pinchStart.state, measure(), pinchStart.mid, pinchStart.distance, midpoint(a, b), distance(a, b)));
    } else if (lastPan) {
      event.preventDefault();
      set(pan(state, measure(), point.x - lastPan.x, point.y - lastPan.y));
      lastPan = point;
    }
  };

  const onPointerEnd = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) {
      return;
    }
    pinchStart = undefined;
    // One finger left after a pinch: keep panning from where it is now
    const remaining = Array.from(pointers.values())[0];
    lastPan = remaining && isZoomed(state) ? remaining : undefined;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || !canZoom(measure())) {
      return;
    }
    const geometry = measure();
    const stepX = geometry.viewport.width * PAN_STEP;
    const stepY = geometry.viewport.height * PAN_STEP;
    // Arrow keys move the view, so the image moves the opposite way
    const actions: Record<string, () => IZoomState> = {
      '+': () => zoomBy(state, geometry, ZOOM_STEP),
      '=': () => zoomBy(state, geometry, ZOOM_STEP),
      '-': () => zoomBy(state, geometry, 1 / ZOOM_STEP),
      '0': () => INITIAL_STATE,
      ArrowLeft: () => pan(state, geometry, stepX, 0),
      ArrowRight: () => pan(state, geometry, -stepX, 0),
      ArrowUp: () => pan(state, geometry, 0, stepY),
      ArrowDown: () => pan(state, geometry, 0, -stepY)
    };
    const action = actions[event.key];
    const isArrow = event.key.indexOf('Arrow') === 0;
    // Arrows only act while zoomed — otherwise they keep scrolling the page
    if (!action || (isArrow && !isZoomed(state))) {
      return;
    }
    event.preventDefault();
    set(action());
  };

  const onLoad = (): void => set(state);

  viewport.addEventListener('wheel', onWheel, { passive: false });
  viewport.addEventListener('pointerdown', onPointerDown);
  viewport.addEventListener('pointermove', onPointerMove);
  viewport.addEventListener('pointerup', onPointerEnd);
  viewport.addEventListener('pointercancel', onPointerEnd);
  viewport.addEventListener('keydown', onKeyDown);
  image.addEventListener('load', onLoad);

  // A changed column width (window resize, tablet rotation) changes the limits
  const view = doc.defaultView;
  const resizeObserver =
    view && typeof view.ResizeObserver === 'function' ? new view.ResizeObserver(() => set(state)) : undefined;
  const onResize = (): void => set(state);
  if (resizeObserver) {
    resizeObserver.observe(viewport);
  } else {
    view?.addEventListener('resize', onResize);
  }

  render();

  return {
    state: () => state,
    update: () => set(state),
    reset: () => set(INITIAL_STATE),
    dispose: () => {
      viewport.removeEventListener('wheel', onWheel);
      viewport.removeEventListener('pointerdown', onPointerDown);
      viewport.removeEventListener('pointermove', onPointerMove);
      viewport.removeEventListener('pointerup', onPointerEnd);
      viewport.removeEventListener('pointercancel', onPointerEnd);
      viewport.removeEventListener('keydown', onKeyDown);
      image.removeEventListener('load', onLoad);
      resizeObserver?.disconnect();
      view?.removeEventListener('resize', onResize);
      controls.remove();
      state = INITIAL_STATE;
      image.style.removeProperty('transform');
      image.style.removeProperty('transform-origin');
      viewport.classList.remove(classNames.zoomable, classNames.zoomed);
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-label');
    }
  };
}
