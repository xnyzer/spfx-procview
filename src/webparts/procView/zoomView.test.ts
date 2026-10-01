import { attachZoom } from './zoomView';
import type { IZoomController } from './zoomView';
import type { IZoomGeometry } from './zoom';

/** Diagram shown at a quarter of its natural size: zoomable up to 4×. */
const ZOOMABLE: IZoomGeometry = { viewport: { width: 500, height: 250 }, natural: { width: 2000, height: 1000 } };
/** Diagram already shown at natural size: nothing to zoom. */
const FULL_SIZE: IZoomGeometry = { viewport: { width: 500, height: 250 }, natural: { width: 500, height: 250 } };

const CLASS_NAMES = { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'controls', button: 'button' };
const LABELS = { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit', viewport: 'Diagram, zoomable' };

interface IFixture {
  viewport: HTMLElement;
  image: HTMLImageElement;
  zoom: IZoomController;
  buttons: () => Record<'zoomIn' | 'zoomOut' | 'reset', HTMLButtonElement>;
  setGeometry: (geometry: IZoomGeometry) => void;
}

let fixture: IFixture | undefined;

function setup(initial: IZoomGeometry = ZOOMABLE): IFixture {
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

afterEach(() => {
  fixture?.zoom.dispose();
  fixture?.viewport.remove();
  fixture = undefined;
});

/** jsdom has no PointerEvent constructor everywhere — a MouseEvent with a pointerId will do. */
function pointer(target: Element, type: string, pointerId: number, clientX: number, clientY: number): Event {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
  Object.defineProperty(event, 'pointerId', { value: pointerId });
  target.dispatchEvent(event);
  return event;
}

function wheel(target: Element, deltaY: number, ctrlKey: boolean): WheelEvent {
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

function key(target: Element, keyName: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: keyName, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('attachZoom — controls', () => {
  it('adds labelled buttons; at the configured size only "zoom in" is active', () => {
    const { viewport, buttons } = setup();
    const { zoomIn, zoomOut, reset } = buttons();
    expect(viewport.querySelectorAll('button')).toHaveLength(3);
    expect(zoomIn.title).toBe('Zoom in');
    expect(zoomIn.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(zoomIn.disabled).toBe(false);
    expect(zoomOut.disabled).toBe(true);
    expect(reset.disabled).toBe(true);
    expect(viewport.classList.contains('zoomable')).toBe(true);
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.getAttribute('aria-label')).toBe('Diagram, zoomable');
  });

  it('zooms in and back to the configured size', () => {
    const { viewport, image, zoom, buttons } = setup();
    buttons().zoomIn.click();
    expect(zoom.state().scale).toBeCloseTo(1.25);
    expect(image.style.transform).toContain('scale(1.25)');
    expect(image.style.transformOrigin).toBe('0 0');
    expect(viewport.classList.contains('zoomed')).toBe(true);

    buttons().reset.click();
    expect(zoom.state().scale).toBe(1);
    expect(image.style.transform).toBe('');
    expect(viewport.classList.contains('zoomed')).toBe(false);
  });

  it('disables "zoom in" at the natural size', () => {
    const { zoom, buttons } = setup();
    for (let i = 0; i < 20; i++) {
      buttons().zoomIn.click();
    }
    expect(zoom.state().scale).toBe(4);
    expect(buttons().zoomIn.disabled).toBe(true);
  });

  it('hides the controls when there is nothing to zoom — and shows them once the image has loaded', () => {
    const { viewport, image, setGeometry } = setup(FULL_SIZE);
    const controls = viewport.querySelector('.controls') as HTMLElement;
    expect(controls.hidden).toBe(true);
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    expect(viewport.classList.contains('zoomable')).toBe(false);
    expect(wheel(viewport, -100, true).defaultPrevented).toBe(false);

    setGeometry(ZOOMABLE);
    image.dispatchEvent(new Event('load'));
    expect(controls.hidden).toBe(false);
    expect(viewport.tabIndex).toBe(0);
  });
});

describe('attachZoom — wheel and keyboard', () => {
  it('zooms with Ctrl + wheel and leaves the plain wheel to the page', () => {
    const { viewport, zoom } = setup();
    const plain = wheel(viewport, -100, false);
    expect(plain.defaultPrevented).toBe(false);
    expect(zoom.state().scale).toBe(1);

    const withCtrl = wheel(viewport, -100, true);
    expect(withCtrl.defaultPrevented).toBe(true);
    expect(zoom.state().scale).toBeGreaterThan(1);
  });

  it('zooms with + and −, resets with 0', () => {
    const { viewport, zoom } = setup();
    key(viewport, '+');
    key(viewport, '+');
    expect(zoom.state().scale).toBeCloseTo(1.5625);
    key(viewport, '-');
    expect(zoom.state().scale).toBeCloseTo(1.25);
    key(viewport, '0');
    expect(zoom.state().scale).toBe(1);
  });

  it('moves with the arrow keys only while zoomed', () => {
    const { viewport, zoom } = setup();
    const notZoomed = key(viewport, 'ArrowRight');
    expect(notZoomed.defaultPrevented).toBe(false);

    key(viewport, '+');
    const before = zoom.state().x;
    const moved = key(viewport, 'ArrowRight');
    expect(moved.defaultPrevented).toBe(true);
    expect(zoom.state().x).toBeLessThan(before);
  });

  it('leaves browser shortcuts alone (Ctrl/Cmd + key)', () => {
    const { viewport, zoom } = setup();
    const event = key(viewport, '+', { ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(zoom.state().scale).toBe(1);
  });
});

describe('attachZoom — pointer gestures', () => {
  it('drags the zoomed image', () => {
    const { viewport, image, zoom } = setup();
    key(viewport, '+');
    key(viewport, '+');
    const before = zoom.state();
    pointer(image, 'pointerdown', 1, 200, 100);
    pointer(image, 'pointermove', 1, 180, 90);
    pointer(image, 'pointerup', 1, 180, 90);
    expect(zoom.state().x).toBeCloseTo(before.x - 20);
    expect(zoom.state().y).toBeCloseTo(before.y - 10);
  });

  it('does not take over a one-finger swipe at the configured size (page keeps scrolling)', () => {
    const { image, zoom } = setup();
    const down = pointer(image, 'pointerdown', 1, 200, 100);
    pointer(image, 'pointermove', 1, 150, 50);
    expect(down.defaultPrevented).toBe(false);
    expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('zooms with a two-finger pinch', () => {
    const { image, zoom } = setup();
    pointer(image, 'pointerdown', 1, 200, 125);
    pointer(image, 'pointerdown', 2, 300, 125);
    pointer(image, 'pointermove', 2, 400, 125);
    expect(zoom.state().scale).toBeCloseTo(2);
    pointer(image, 'pointerup', 2, 400, 125);
    pointer(image, 'pointerup', 1, 200, 125);
    expect(zoom.state().scale).toBeCloseTo(2);
  });

  it('keeps panning with the remaining finger after a pinch', () => {
    const { image, zoom } = setup();
    pointer(image, 'pointerdown', 1, 200, 125);
    pointer(image, 'pointerdown', 2, 300, 125);
    pointer(image, 'pointermove', 2, 400, 125);
    pointer(image, 'pointerup', 2, 400, 125);
    const before = zoom.state().x;
    pointer(image, 'pointermove', 1, 190, 125);
    expect(zoom.state().x).toBeCloseTo(before - 10);
  });

  it('treats presses on the controls and on links as clicks, not drags', () => {
    const { viewport, zoom, buttons } = setup();
    key(viewport, '+');
    const link = document.createElement('a');
    viewport.appendChild(link);
    const before = zoom.state();
    pointer(buttons().zoomOut, 'pointerdown', 1, 480, 10);
    pointer(buttons().zoomOut, 'pointermove', 1, 400, 10);
    pointer(link, 'pointerdown', 2, 480, 240);
    pointer(link, 'pointermove', 2, 400, 240);
    expect(zoom.state()).toEqual(before);
  });
});

describe('attachZoom — dispose', () => {
  it('removes controls, listeners and the transform', () => {
    const { viewport, image, zoom } = setup();
    key(viewport, '+');
    zoom.dispose();
    expect(viewport.querySelector('.controls')).toBeNull();
    expect(image.style.transform).toBe('');
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    expect(viewport.classList.contains('zoomable')).toBe(false);
    key(viewport, '+');
    expect(zoom.state().scale).toBe(1);
  });
});
