import {
  INITIAL_STATE,
  PAN_STEP,
  ZOOM_EPSILON,
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
import { createIcon } from './svgIcon';

/** Accessible names of the zoom controls and the zoomable area. */
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

/** What `attachZoom` works on. */
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

/** The attached zoom: its current state, and `dispose` to remove everything it added. */
export interface IZoomController {
  state(): IZoomState;
  dispose(): void;
}

/** Exponent per wheel pixel: the zoom factor is e^(−delta × this) — 100 px (one Chrome notch) ≈ 1.16×. */
const WHEEL_SENSITIVITY = 0.0015;
/** Pixels per wheel "line" when the browser reports lines instead of pixels. */
const WHEEL_LINE = 16;
/** `WheelEvent.deltaMode` values: lines, pages (else pixels). */
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
/** Mouse button that pans — the primary one; the others open menus or autoscroll. */
const PRIMARY_BUTTON = 0;

type ControlName = 'zoomIn' | 'zoomOut' | 'reset';

interface IPinchStart {
  state: IZoomState;
  mid: IPoint;
  distance: number;
}

function measureDistance(first: IPoint, second: IPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function findMidpoint(first: IPoint, second: IPoint): IPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

/** Presses on the controls or on links (the hub overlay) are clicks, not gestures. */
function isOnControl(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && target.closest('button, a') !== null;
}

/**
 * Marks a control as available or not with `aria-disabled` — unlike `disabled`, the button keeps
 * the keyboard focus when it becomes unavailable (e.g. "fit" right after fitting). Writes only on
 * change.
 */
function setAvailable(button: HTMLButtonElement, isAvailable: boolean): void {
  const value = String(!isAvailable);
  if (button.getAttribute('aria-disabled') !== value) {
    button.setAttribute('aria-disabled', value);
  }
}

function isAvailable(button: HTMLButtonElement): boolean {
  return button.getAttribute('aria-disabled') !== 'true';
}

/** Wheel movement in pixels, whatever unit the browser reports. */
function wheelPixels(event: WheelEvent, pageHeight: number): number {
  switch (event.deltaMode) {
    case DOM_DELTA_LINE:
      return event.deltaY * WHEEL_LINE;
    case DOM_DELTA_PAGE:
      return event.deltaY * pageHeight;
    default:
      return event.deltaY;
  }
}

/** Zoom and pan on one image; created by `attachZoom`, which describes the behaviour. */
class ZoomView {
  private _state: IZoomState = INITIAL_STATE;
  private readonly _pointers = new Map<number, IPoint>();
  private _lastPan: IPoint | undefined;
  private _pinchStart: IPinchStart | undefined;
  private readonly _controls: HTMLElement;
  private readonly _buttons: Record<ControlName, HTMLButtonElement>;
  private readonly _wasDraggable: boolean;
  private _isZoomable: boolean | undefined;
  private _resizeObserver: ResizeObserver | undefined;

  public constructor(
    private readonly _doc: Document,
    private readonly _props: IZoomViewProps
  ) {
    this._controls = _doc.createElement('div');
    this._controls.className = _props.classNames.controls;
    this._buttons = {
      zoomOut: this._createButton('zoomOut', _props.labels.zoomOut),
      zoomIn: this._createButton('zoomIn', _props.labels.zoomIn),
      reset: this._createButton('reset', _props.labels.reset)
    };
    (_props.host ?? _props.viewport).appendChild(this._controls);
    this._wasDraggable = _props.image.draggable;
    // The browser's own image drag would cancel panning after a few pixels
    _props.image.draggable = false;
    _props.image.style.setProperty('transform-origin', '0 0');
    this._addListeners();
    this._render(this._measure());
  }

  public get state(): IZoomState {
    return this._state;
  }

  public dispose(): void {
    const { viewport, image, classNames } = this._props;
    this._removeListeners();
    this._controls.remove();
    this._state = INITIAL_STATE;
    image.draggable = this._wasDraggable;
    image.style.removeProperty('transform');
    image.style.removeProperty('transform-origin');
    viewport.classList.remove(classNames.zoomable, classNames.zoomed);
    viewport.removeAttribute('tabindex');
    viewport.removeAttribute('role');
    viewport.removeAttribute('aria-label');
  }

  private _createButton(name: ControlName, label: string): HTMLButtonElement {
    const button = this._doc.createElement('button');
    button.type = 'button';
    button.className = this._props.classNames.button;
    button.setAttribute('aria-label', label);
    button.title = label;
    button.appendChild(createIcon(this._doc, name));
    button.addEventListener('click', () => this._onControl(name, button));
    this._controls.appendChild(button);
    return button;
  }

  private _measure(): IZoomGeometry {
    const { image, measure } = this._props;
    return measure
      ? measure()
      : {
          viewport: { width: image.clientWidth, height: image.clientHeight },
          natural: { width: image.naturalWidth, height: image.naturalHeight }
        };
  }

  private _set(next: IZoomState, geometry: IZoomGeometry): void {
    this._state = clamp(next, geometry);
    this._render(geometry);
  }

  /** Transform, classes and control states for the current state — attributes only on change. */
  private _render(geometry: IZoomGeometry): void {
    const { viewport, image, classNames } = this._props;
    const isZoomable = canZoom(geometry);
    const isZoomedIn = isZoomed(this._state);
    image.style.setProperty('transform', toTransform(this._state));
    // Gestures belong to the diagram only while zoomed (touch-action via these classes)
    viewport.classList.toggle(classNames.zoomed, isZoomedIn);
    setAvailable(this._buttons.zoomOut, isZoomedIn);
    setAvailable(this._buttons.reset, isZoomedIn);
    setAvailable(this._buttons.zoomIn, this._state.scale < maxScale(geometry) - ZOOM_EPSILON);
    if (isZoomable !== this._isZoomable) {
      this._isZoomable = isZoomable;
      this._renderZoomable(isZoomable);
    }
  }

  /** Offers zooming (classes, controls, a focusable labelled viewport) or takes it away. */
  private _renderZoomable(isZoomable: boolean): void {
    const { viewport, labels, classNames } = this._props;
    viewport.classList.toggle(classNames.zoomable, isZoomable);
    this._controls.hidden = !isZoomable;
    if (isZoomable) {
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'group');
      viewport.setAttribute('aria-label', labels.viewport);
    } else {
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-label');
    }
  }

  /** Viewport coordinates of a client point. */
  private _toViewportPoint(clientX: number, clientY: number): IPoint {
    const rect = this._props.viewport.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private _onControl(name: ControlName, button: HTMLButtonElement): void {
    if (!isAvailable(button)) {
      return;
    }
    const geometry = this._measure();
    if (name === 'reset') {
      this._set(INITIAL_STATE, geometry);
    } else {
      this._set(zoomBy(this._state, geometry, { factor: name === 'zoomIn' ? ZOOM_STEP : 1 / ZOOM_STEP }), geometry);
    }
  }

  private readonly _onWheel = (event: WheelEvent): void => {
    const geometry = this._measure();
    if (!(event.ctrlKey || event.metaKey) || !canZoom(geometry)) {
      return;
    }
    event.preventDefault();
    const factor = Math.exp(-wheelPixels(event, geometry.viewport.height) * WHEEL_SENSITIVITY);
    const focal = this._toViewportPoint(event.clientX, event.clientY);
    this._set(zoomBy(this._state, geometry, { factor, focal }), geometry);
  };

  private readonly _onPointerDown = (event: PointerEvent): void => {
    const isOtherMouseButton = event.pointerType === 'mouse' && event.button !== PRIMARY_BUTTON;
    if (isOtherMouseButton || isOnControl(event) || this._pointers.size >= 2 || !canZoom(this._measure())) {
      return;
    }
    const point = this._toViewportPoint(event.clientX, event.clientY);
    this._pointers.set(event.pointerId, point);
    if (this._pointers.size === 2) {
      const [first, second] = Array.from(this._pointers.values());
      this._lastPan = undefined;
      this._pinchStart = {
        state: this._state,
        mid: findMidpoint(first, second),
        distance: measureDistance(first, second)
      };
    } else if (isZoomed(this._state)) {
      this._lastPan = point;
    }
    if (this._pointers.size === 2 || isZoomed(this._state)) {
      event.preventDefault();
      // Keeps the gesture when the pointer leaves the frame (not every engine has it)
      this._props.viewport.setPointerCapture?.(event.pointerId);
    }
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (!this._pointers.has(event.pointerId)) {
      return;
    }
    // The button was released where we could not see it (e.g. over a context menu)
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      this._onPointerEnd(event);
      return;
    }
    const point = this._toViewportPoint(event.clientX, event.clientY);
    this._pointers.set(event.pointerId, point);
    const geometry = this._measure();
    if (this._pointers.size >= 2 && this._pinchStart) {
      const [first, second] = Array.from(this._pointers.values());
      event.preventDefault();
      const { state, mid, distance } = this._pinchStart;
      const gesture = {
        startMid: mid,
        startDistance: distance,
        mid: findMidpoint(first, second),
        distance: measureDistance(first, second)
      };
      this._set(pinch(state, geometry, gesture), geometry);
    } else if (this._lastPan) {
      event.preventDefault();
      this._set(pan(this._state, geometry, { x: point.x - this._lastPan.x, y: point.y - this._lastPan.y }), geometry);
      this._lastPan = point;
    }
  };

  private readonly _onPointerEnd = (event: PointerEvent): void => {
    if (!this._pointers.delete(event.pointerId)) {
      return;
    }
    this._pinchStart = undefined;
    // One finger left after a pinch: keep panning from where it is now
    const remaining = Array.from(this._pointers.values())[0];
    this._lastPan = remaining && isZoomed(this._state) ? remaining : undefined;
  };

  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    const geometry = this._measure();
    if (event.ctrlKey || event.metaKey || event.altKey || !canZoom(geometry)) {
      return;
    }
    const next = this._keyAction(event.key, geometry);
    if (next) {
      event.preventDefault();
      this._set(next, geometry);
    }
  };

  /**
   * The state a key leads to, or `undefined` for keys zoom does not handle. Arrows only act
   * while zoomed — otherwise they keep scrolling the page; they move the view, so the image
   * moves the opposite way. A `switch`, so key names such as `constructor` match nothing.
   */
  private _keyAction(key: string, geometry: IZoomGeometry): IZoomState | undefined {
    const step = { x: geometry.viewport.width * PAN_STEP, y: geometry.viewport.height * PAN_STEP };
    const canMove = isZoomed(this._state);
    switch (key) {
      case '+':
      case '=':
        return zoomBy(this._state, geometry, { factor: ZOOM_STEP });
      case '-':
        return zoomBy(this._state, geometry, { factor: 1 / ZOOM_STEP });
      case '0':
        return INITIAL_STATE;
      case 'ArrowLeft':
        return canMove ? pan(this._state, geometry, { x: step.x, y: 0 }) : undefined;
      case 'ArrowRight':
        return canMove ? pan(this._state, geometry, { x: -step.x, y: 0 }) : undefined;
      case 'ArrowUp':
        return canMove ? pan(this._state, geometry, { x: 0, y: step.y }) : undefined;
      case 'ArrowDown':
        return canMove ? pan(this._state, geometry, { x: 0, y: -step.y }) : undefined;
      default:
        return undefined;
    }
  }

  private readonly _onDragStart = (event: Event): void => event.preventDefault();

  /** The geometry may have changed: image loaded, column resized. */
  private readonly _onGeometryChange = (): void => {
    this._set(this._state, this._measure());
  };

  private _addListeners(): void {
    const { viewport, image } = this._props;
    viewport.addEventListener('wheel', this._onWheel, { passive: false });
    viewport.addEventListener('pointerdown', this._onPointerDown);
    viewport.addEventListener('pointermove', this._onPointerMove);
    viewport.addEventListener('pointerup', this._onPointerEnd);
    viewport.addEventListener('pointercancel', this._onPointerEnd);
    viewport.addEventListener('lostpointercapture', this._onPointerEnd);
    viewport.addEventListener('keydown', this._onKeyDown);
    viewport.addEventListener('dragstart', this._onDragStart);
    image.addEventListener('load', this._onGeometryChange);
    // A changed column width (window resize, tablet rotation) changes the limits
    const view = this._doc.defaultView;
    if (view && typeof view.ResizeObserver === 'function') {
      this._resizeObserver = new view.ResizeObserver(this._onGeometryChange);
      this._resizeObserver.observe(viewport);
    } else {
      view?.addEventListener('resize', this._onGeometryChange);
    }
  }

  private _removeListeners(): void {
    const { viewport, image } = this._props;
    viewport.removeEventListener('wheel', this._onWheel);
    viewport.removeEventListener('pointerdown', this._onPointerDown);
    viewport.removeEventListener('pointermove', this._onPointerMove);
    viewport.removeEventListener('pointerup', this._onPointerEnd);
    viewport.removeEventListener('pointercancel', this._onPointerEnd);
    viewport.removeEventListener('lostpointercapture', this._onPointerEnd);
    viewport.removeEventListener('keydown', this._onKeyDown);
    viewport.removeEventListener('dragstart', this._onDragStart);
    image.removeEventListener('load', this._onGeometryChange);
    this._resizeObserver?.disconnect();
    this._doc.defaultView?.removeEventListener('resize', this._onGeometryChange);
  }
}

/**
 * Adds zoom and pan to a diagram: controls (−, +, fit) in the host (by default the viewport),
 * Ctrl/Cmd + wheel, a drag with the primary mouse button or one finger while zoomed, two-finger
 * pinch, and keys (+, −, 0, arrows) on the focusable viewport. Plain wheel and one-finger swipes
 * at the configured size keep scrolling the page. The image keeps its element size; only a CSS
 * transform changes (zoom.ts).
 */
export function attachZoom(doc: Document, props: IZoomViewProps): IZoomController {
  const view = new ZoomView(doc, props);
  return { state: () => view.state, dispose: () => view.dispose() };
}
