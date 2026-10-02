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

interface IPointerInit {
  id: number;
  x: number;
  y: number;
  /** `mouse`, `touch` or `pen`; empty like a synthetic event by default. */
  pointerType?: string;
  button?: number;
  buttons?: number;
}

/** jsdom has no PointerEvent constructor everywhere — a MouseEvent with the pointer fields will do. */
function pointer(target: Element, type: string, init: IPointerInit): Event {
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
    expect(zoomIn.getAttribute('aria-disabled')).toBe('false');
    expect(zoomOut.getAttribute('aria-disabled')).toBe('true');
    expect(reset.getAttribute('aria-disabled')).toBe('true');
    // Unavailable, not disabled: they stay focusable
    expect(zoomOut.disabled).toBe(false);
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

  it('marks "zoom in" unavailable at the natural size', () => {
    const { zoom, buttons } = setup();
    for (let i = 0; i < 20; i++) {
      buttons().zoomIn.click();
    }
    expect(zoom.state().scale).toBe(4);
    expect(buttons().zoomIn.getAttribute('aria-disabled')).toBe('true');
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
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100 });
    pointer(image, 'pointermove', { id: 1, x: 180, y: 90 });
    pointer(image, 'pointerup', { id: 1, x: 180, y: 90 });
    expect(zoom.state().x).toBeCloseTo(before.x - 20);
    expect(zoom.state().y).toBeCloseTo(before.y - 10);
  });

  it('does not take over a one-finger swipe at the configured size (page keeps scrolling)', () => {
    const { image, zoom } = setup();
    const down = pointer(image, 'pointerdown', { id: 1, x: 200, y: 100 });
    pointer(image, 'pointermove', { id: 1, x: 150, y: 50 });
    expect(down.defaultPrevented).toBe(false);
    expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('zooms with a two-finger pinch', () => {
    const { image, zoom } = setup();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 125 });
    pointer(image, 'pointerdown', { id: 2, x: 300, y: 125 });
    pointer(image, 'pointermove', { id: 2, x: 400, y: 125 });
    expect(zoom.state().scale).toBeCloseTo(2);
    pointer(image, 'pointerup', { id: 2, x: 400, y: 125 });
    pointer(image, 'pointerup', { id: 1, x: 200, y: 125 });
    expect(zoom.state().scale).toBeCloseTo(2);
  });

  it('keeps panning with the remaining finger after a pinch', () => {
    const { image, zoom } = setup();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 125 });
    pointer(image, 'pointerdown', { id: 2, x: 300, y: 125 });
    pointer(image, 'pointermove', { id: 2, x: 400, y: 125 });
    pointer(image, 'pointerup', { id: 2, x: 400, y: 125 });
    const before = zoom.state().x;
    pointer(image, 'pointermove', { id: 1, x: 190, y: 125 });
    expect(zoom.state().x).toBeCloseTo(before - 10);
  });

  it('treats presses on the controls and on links as clicks, not drags', () => {
    const { viewport, zoom, buttons } = setup();
    key(viewport, '+');
    const link = document.createElement('a');
    viewport.appendChild(link);
    const before = zoom.state();
    pointer(buttons().zoomOut, 'pointerdown', { id: 1, x: 480, y: 10 });
    pointer(buttons().zoomOut, 'pointermove', { id: 1, x: 400, y: 10 });
    pointer(link, 'pointerdown', { id: 2, x: 480, y: 240 });
    pointer(link, 'pointermove', { id: 2, x: 400, y: 240 });
    expect(zoom.state()).toEqual(before);
  });
});

describe('attachZoom — host', () => {
  it('puts the controls into the given host, e.g. a shared control bar', () => {
    const viewport = document.createElement('div');
    const host = document.createElement('div');
    viewport.appendChild(host);
    const image = document.createElement('img');
    viewport.appendChild(image);
    const zoom = attachZoom(document, {
      viewport,
      image,
      labels: LABELS,
      classNames: CLASS_NAMES,
      host,
      measure: () => ZOOMABLE
    });
    expect(host.querySelector('.controls')).not.toBeNull();
    expect(host.firstElementChild?.className).toBe('controls');
    zoom.dispose();
    expect(host.querySelector('.controls')).toBeNull();
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

describe('attachZoom — focus and unavailable controls', () => {
  it('keeps the focus on "fit" when fitting makes it unavailable', () => {
    const { buttons } = setup();
    buttons().zoomIn.click();
    const reset = buttons().reset;
    reset.focus();
    reset.click();
    expect(reset.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(reset);
  });

  it('does nothing when an unavailable control is pressed', () => {
    const { zoom, buttons } = setup();
    buttons().zoomOut.click();
    buttons().reset.click();
    expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('writes the viewport attributes only when zooming becomes possible or impossible', () => {
    const { viewport, buttons } = setup();
    const setAttribute = jest.spyOn(viewport, 'setAttribute');
    buttons().zoomIn.click();
    buttons().zoomIn.click();
    expect(setAttribute).not.toHaveBeenCalled();
  });
});

describe('attachZoom — mouse buttons, lost pointers and native drag', () => {
  function zoomedFixture(): IFixture {
    const zoomed = setup();
    key(zoomed.viewport, '+');
    key(zoomed.viewport, '+');
    return zoomed;
  }

  it('pans only with the primary mouse button (right and middle open menus or autoscroll)', () => {
    const { image, zoom } = zoomedFixture();
    const before = zoom.state();
    // [button, buttons bit]: middle (1 → 4) and right (2 → 2)
    [
      [1, 4],
      [2, 2]
    ].forEach(([button, buttons]) => {
      pointer(image, 'pointerdown', { id: 1, x: 200, y: 100, pointerType: 'mouse', button, buttons });
      pointer(image, 'pointermove', { id: 1, x: 150, y: 50, pointerType: 'mouse', buttons });
      pointer(image, 'pointerup', { id: 1, x: 150, y: 50, pointerType: 'mouse' });
    });
    expect(zoom.state()).toEqual(before);
  });

  it('ends the drag when the mouse button turns out to be released (lost pointerup)', () => {
    const { image, zoom } = zoomedFixture();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100, pointerType: 'mouse', buttons: 1 });
    pointer(image, 'pointermove', { id: 1, x: 190, y: 100, pointerType: 'mouse', buttons: 1 });
    const afterDrag = zoom.state();
    // The pointerup went to a context menu — the next move has no button pressed
    pointer(image, 'pointermove', { id: 1, x: 100, y: 100, pointerType: 'mouse', buttons: 0 });
    pointer(image, 'pointermove', { id: 1, x: 50, y: 100, pointerType: 'mouse', buttons: 1 });
    expect(zoom.state()).toEqual(afterDrag);
  });

  it('ends the gesture when the pointer capture is lost', () => {
    const { viewport, image, zoom } = zoomedFixture();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100 });
    pointer(viewport, 'lostpointercapture', { id: 1, x: 200, y: 100 });
    const before = zoom.state();
    pointer(image, 'pointermove', { id: 1, x: 100, y: 100 });
    expect(zoom.state()).toEqual(before);
  });

  it('blocks the native image drag while attached and restores it afterwards', () => {
    const { image, zoom } = setup();
    expect(image.draggable).toBe(false);
    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    image.dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
    zoom.dispose();
    expect(image.draggable).toBe(true);
  });
});

describe('attachZoom — wheel units and unexpected keys', () => {
  function wheelIn(target: Element, deltaMode: number, deltaY: number): void {
    target.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaMode, deltaY })
    );
  }

  it('zooms for wheel lines and pages, not only for pixels', () => {
    const lines = setup();
    wheelIn(lines.viewport, 1, -3);
    expect(lines.zoom.state().scale).toBeGreaterThan(1.05);
    lines.zoom.dispose();
    lines.viewport.remove();

    const pages = setup();
    wheelIn(pages.viewport, 2, -1);
    expect(pages.zoom.state().scale).toBeGreaterThan(1.3);
  });

  it.each([['constructor'], ['toString'], ['__proto__'], ['valueOf'], ['Enter']])(
    'ignores the key %p without an error',
    (keyName) => {
      const { viewport, zoom } = setup();
      expect(() => key(viewport, keyName)).not.toThrow();
      expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
    }
  );
});
