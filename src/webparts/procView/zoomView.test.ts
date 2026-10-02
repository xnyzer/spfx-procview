/**
 * The zoom view's gestures: controls, wheel, keys, pointers, pens, the native image drag and the
 * host of the controls. Focus, resize and dispose are in zoomViewLifecycle.test.ts.
 */
import { attachZoom } from './zoomView';
import {
  CLASS_NAMES,
  FULL_SIZE,
  LABELS,
  ZOOMABLE,
  disposeFixture,
  key,
  pointer,
  setup,
  wheel
} from './zoomTestSupport';
import type { IFixture } from './zoomTestSupport';

afterEach(disposeFixture);

// --- Controls, wheel and keys -------------------------------------------------------------

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

// --- Pointers and the native drag ---------------------------------------------------------

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

describe('attachZoom — mouse buttons, lost pointers and native drag', () => {
  function setupZoomed(): IFixture {
    const zoomed = setup();
    key(zoomed.viewport, '+');
    key(zoomed.viewport, '+');
    return zoomed;
  }

  it('pans only with the primary mouse button (right and middle open menus or autoscroll)', () => {
    const { image, zoom } = setupZoomed();
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
    const { image, zoom } = setupZoomed();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100, pointerType: 'mouse', buttons: 1 });
    pointer(image, 'pointermove', { id: 1, x: 190, y: 100, pointerType: 'mouse', buttons: 1 });
    const afterDrag = zoom.state();
    // The pointerup went to a context menu — the next move has no button pressed
    pointer(image, 'pointermove', { id: 1, x: 100, y: 100, pointerType: 'mouse', buttons: 0 });
    pointer(image, 'pointermove', { id: 1, x: 50, y: 100, pointerType: 'mouse', buttons: 1 });
    expect(zoom.state()).toEqual(afterDrag);
  });

  it('ends the gesture when the pointer capture is lost', () => {
    const { viewport, image, zoom } = setupZoomed();
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100 });
    pointer(viewport, 'lostpointercapture', { id: 1, x: 200, y: 100 });
    const before = zoom.state();
    pointer(image, 'pointermove', { id: 1, x: 100, y: 100 });
    expect(zoom.state()).toEqual(before);
  });

  it('blocks the native image drag while zoomable and restores it afterwards', () => {
    const { image, zoom } = setup();
    expect(image.draggable).toBe(false);
    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    image.dispatchEvent(drag);
    expect(drag.defaultPrevented).toBe(true);
    zoom.dispose();
    expect(image.draggable).toBe(true);
  });
});

describe('attachZoom — pens (audit L35)', () => {
  function setupZoomed(): IFixture {
    const zoomed = setup();
    key(zoomed.viewport, '+');
    key(zoomed.viewport, '+');
    return zoomed;
  }

  it('does not pan with the barrel button of a pen', () => {
    const { image, zoom } = setupZoomed();
    const before = zoom.state();
    pointer(image, 'pointerdown', { id: 7, x: 200, y: 100, pointerType: 'pen', button: 2, buttons: 2 });
    pointer(image, 'pointermove', { id: 7, x: 150, y: 50, pointerType: 'pen', buttons: 2 });
    expect(zoom.state()).toEqual(before);
  });

  it('ends the drag of a pen lifted where the frame could not see it', () => {
    const { image, zoom } = setupZoomed();
    pointer(image, 'pointerdown', { id: 8, x: 200, y: 100, pointerType: 'pen', buttons: 1 });
    pointer(image, 'pointermove', { id: 8, x: 190, y: 100, pointerType: 'pen', buttons: 1 });
    const afterDrag = zoom.state();
    // The pen hovers again (no button pressed) — its pointerup never reached the frame
    pointer(image, 'pointermove', { id: 8, x: 100, y: 100, pointerType: 'pen', buttons: 0 });
    pointer(image, 'pointermove', { id: 8, x: 50, y: 100, pointerType: 'pen', buttons: 1 });
    expect(zoom.state()).toEqual(afterDrag);
  });
});

describe('attachZoom — mouse and pen pointers at the configured size (audit L59)', () => {
  it('leaves a mouse press alone, so a mouse released outside cannot spoil a later pinch', () => {
    const { image, zoom } = setup();
    // Pressed at the configured size and released outside the frame: no pointerup reaches it
    const press = pointer(image, 'pointerdown', { id: 1, x: 10, y: 10, pointerType: 'mouse', buttons: 1 });
    expect(press.defaultPrevented).toBe(false);
    pointer(image, 'pointerdown', { id: 2, x: 200, y: 125, pointerType: 'touch' });
    pointer(image, 'pointerdown', { id: 3, x: 300, y: 125, pointerType: 'touch' });
    pointer(image, 'pointermove', { id: 3, x: 400, y: 125, pointerType: 'touch' });
    expect(zoom.state().scale).toBeCloseTo(2);
  });
});

describe('attachZoom — native drag only for the zoomable image (audit L34)', () => {
  function startDrag(target: Element): Event {
    const drag = new Event('dragstart', { bubbles: true, cancelable: true });
    target.dispatchEvent(drag);
    return drag;
  }

  it('lets links in the frame be dragged', () => {
    const { viewport } = setup();
    const link = document.createElement('a');
    link.href = 'https://example.com/';
    viewport.appendChild(link);
    expect(startDrag(link).defaultPrevented).toBe(false);
  });

  it('leaves the image draggable while there is nothing to zoom', () => {
    const { image } = setup(FULL_SIZE);
    expect(image.draggable).toBe(true);
    expect(startDrag(image).defaultPrevented).toBe(false);
  });
});

// --- Host of the controls -----------------------------------------------------------------

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
