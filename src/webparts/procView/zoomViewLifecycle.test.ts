/**
 * The zoom view over time: dispose, the focus when controls become unavailable or disappear, and
 * a frame that grows or shrinks. Gestures are in zoomView.test.ts.
 */
import { installResizeObserverStandIn } from './spfxTestDoubles';
import { FULL_SIZE, disposeFixture, key, pointer, setup, wheel } from './zoomTestSupport';
import type { IZoomGeometry } from './zoom';

/** The column widened: the image now shows at 98 % of its natural size — too close to zoom. */
const NEARLY_FULL_SIZE: IZoomGeometry = {
  viewport: { width: 1960, height: 980 },
  natural: { width: 2000, height: 1000 }
};

afterEach(disposeFixture);

// --- Dispose ----------------------------------------------------------------------------

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

describe('attachZoom — dispose during a gesture (audit L41, L54)', () => {
  it('ignores the rest of the gesture and every later wheel, and tolerates a second dispose', () => {
    const { viewport, image, zoom } = setup();
    key(viewport, '+');
    pointer(image, 'pointerdown', { id: 1, x: 200, y: 100, pointerType: 'mouse', buttons: 1 });
    zoom.dispose();
    const move = pointer(image, 'pointermove', { id: 1, x: 100, y: 50, pointerType: 'mouse', buttons: 1 });
    // A listener left behind would take the move and Ctrl + wheel over — and zoom a disposed view
    expect(move.defaultPrevented).toBe(false);
    expect(wheel(viewport, -100, true).defaultPrevented).toBe(false);
    expect(image.style.transform).toBe('');
    expect(() => zoom.dispose()).not.toThrow();
    expect(viewport.querySelector('button')).toBeNull();
  });
});

// --- Focus ------------------------------------------------------------------------------

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

describe('attachZoom — the focus when the controls disappear (audit L26, L58)', () => {
  /** A zoom button has the focus when the controls disappear (the frame grew). */
  function loseControlsUnderFocus(): ReturnType<typeof setup> {
    const fixture = setup();
    fixture.image.alt = 'Order process';
    fixture.buttons().zoomIn.focus();
    fixture.setGeometry(FULL_SIZE);
    fixture.image.dispatchEvent(new Event('load'));
    return fixture;
  }

  it('keeps the focus in the frame, named after the image, until the focus moves on', () => {
    const { viewport } = loseControlsUnderFocus();
    expect(document.activeElement).toBe(viewport);
    expect(viewport.getAttribute('tabindex')).toBe('-1');
    // A named group — not the zoom instructions, which no longer apply
    expect(viewport.getAttribute('role')).toBe('group');
    expect(viewport.getAttribute('aria-label')).toBe('Order process');
    viewport.blur();
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    expect(viewport.hasAttribute('role')).toBe(false);
    expect(viewport.hasAttribute('aria-label')).toBe(false);
  });

  it('stays focusable when only the window loses the focus (Alt+Tab)', () => {
    const { viewport } = loseControlsUnderFocus();
    // The window's blur: the frame gets a blur event but stays the active element
    viewport.dispatchEvent(new FocusEvent('blur'));
    expect(document.activeElement).toBe(viewport);
    expect(viewport.getAttribute('tabindex')).toBe('-1');
    expect(viewport.getAttribute('aria-label')).toBe('Order process');
    viewport.blur();
    expect(viewport.hasAttribute('tabindex')).toBe(false);
  });

  it('leaves a focus elsewhere where it is', () => {
    const { viewport, image, setGeometry } = setup();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    setGeometry(FULL_SIZE);
    image.dispatchEvent(new Event('load'));
    expect(document.activeElement).toBe(outside);
    expect(viewport.hasAttribute('role')).toBe(false);
    outside.remove();
  });
});

// --- Resize -----------------------------------------------------------------------------

describe('attachZoom — a resize below the zoom headroom (audit M14)', () => {
  it('goes back to the configured size when the frame grows close to the natural size', () => {
    const { viewport, image, zoom, setGeometry } = setup();
    for (let press = 0; press < 10; press++) {
      key(viewport, '+');
    }
    expect(zoom.state().scale).toBe(4);
    setGeometry(NEARLY_FULL_SIZE);
    image.dispatchEvent(new Event('load'));
    expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
    expect(image.style.transform).toBe('');
    expect(viewport.classList.contains('zoomed')).toBe(false);
  });
});

describe('attachZoom — the frame observed for size changes (audit L54)', () => {
  let resizeObservers: ReturnType<typeof installResizeObserverStandIn>;

  beforeEach(() => {
    resizeObservers = installResizeObserverStandIn();
  });

  afterEach(() => resizeObservers.restore());

  it('observes the frame, follows its size and lets go of it on dispose', () => {
    const { viewport, zoom, setGeometry } = setup();
    const { observers } = resizeObservers;
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([viewport]);
    for (let press = 0; press < 10; press++) {
      key(viewport, '+');
    }
    expect(zoom.state().scale).toBe(4);
    // M14's real trigger: the browser reports the grown frame — no image load involved
    setGeometry(NEARLY_FULL_SIZE);
    observers[0].report();
    expect(zoom.state()).toEqual({ scale: 1, x: 0, y: 0 });
    expect(observers[0].isDisconnected).toBe(false);
    zoom.dispose();
    expect(observers[0].isDisconnected).toBe(true);
  });
});
