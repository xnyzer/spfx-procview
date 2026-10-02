/**
 * Test support for the zoom view tests (zoomView.test.ts, zoomViewLifecycle.test.ts): geometries,
 * a fixture with a viewport and an image, and the pointer, wheel and key events jsdom lacks.
 */
import { attachZoom } from './zoomView';
import type { IZoomController } from './zoomView';
import type { IZoomGeometry } from './zoom';

/** Diagram shown at a quarter of its natural size: zoomable up to 4×. */
export const ZOOMABLE: IZoomGeometry = {
  viewport: { width: 500, height: 250 },
  natural: { width: 2000, height: 1000 }
};
/** Diagram already shown at natural size: nothing to zoom. */
export const FULL_SIZE: IZoomGeometry = { viewport: { width: 500, height: 250 }, natural: { width: 500, height: 250 } };

/** Plain class names — the stylesheet is not loaded in these tests. */
export const CLASS_NAMES = { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'controls', button: 'button' };
/** The accessible names of the controls and the zoomable area. */
export const LABELS = { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit', viewport: 'Diagram, zoomable' };

/** A viewport with an image and the zoom attached to it; `setGeometry` changes what it measures. */
export interface IFixture {
  viewport: HTMLElement;
  image: HTMLImageElement;
  zoom: IZoomController;
  buttons: () => Record<'zoomIn' | 'zoomOut' | 'reset', HTMLButtonElement>;
  setGeometry: (geometry: IZoomGeometry) => void;
}

let fixture: IFixture | undefined;

/** Attaches the zoom to a new viewport in the document; `disposeFixture` takes it down again. */
export function setup(initial: IZoomGeometry = ZOOMABLE): IFixture {
  let geometry = initial;
  const viewport = document.createElement('div');
  const image = document.createElement('img');
  viewport.appendChild(image);
  document.body.appendChild(viewport);
  const zoom = attachZoom(document, {
    viewport,
    image,
    labels: LABELS,
    classNames: CLASS_NAMES,
    measure: () => geometry
  });
  const buttons = (): Record<'zoomIn' | 'zoomOut' | 'reset', HTMLButtonElement> => {
    const byLabel = (label: string): HTMLButtonElement =>
      viewport.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    return { zoomIn: byLabel('Zoom in'), zoomOut: byLabel('Zoom out'), reset: byLabel('Fit') };
  };
  fixture = { viewport, image, zoom, buttons, setGeometry: (next) => (geometry = next) };
  return fixture;
}

/** Takes the last fixture down — call it in `afterEach`. */
export function disposeFixture(): void {
  fixture?.zoom.dispose();
  fixture?.viewport.remove();
  fixture = undefined;
}

/** What a pointer event in these tests carries. */
export interface IPointerInit {
  id: number;
  x: number;
  y: number;
  /** `mouse`, `touch` or `pen`; empty like a synthetic event by default. */
  pointerType?: string;
  button?: number;
  buttons?: number;
}

/** jsdom has no PointerEvent constructor everywhere — a MouseEvent with the pointer fields will do. */
export function pointer(target: Element, type: string, init: IPointerInit): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: init.x,
    clientY: init.y,
    button: init.button ?? 0,
    buttons: init.buttons ?? 0
  });
  Object.defineProperty(event, 'pointerId', { value: init.id });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? '' });
  target.dispatchEvent(event);
  return event;
}

/** Dispatches a cancelable wheel event over the middle of the viewport. */
export function wheel(target: Element, deltaY: number, ctrlKey: boolean): WheelEvent {
  const event = new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaY,
    ctrlKey,
    clientX: 250,
    clientY: 125
  });
  target.dispatchEvent(event);
  return event;
}

/** Dispatches a cancelable `keydown`. */
export function key(target: Element, keyName: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: keyName, ...init });
  target.dispatchEvent(event);
  return event;
}
