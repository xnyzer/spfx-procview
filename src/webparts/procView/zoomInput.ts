/**
 * What the zoom view reads from input events and writes on its controls (zoomView.ts): pointer
 * kinds and buttons, wheel units, clicks on controls, available controls. DOM only, no state.
 */

/** Pixels per wheel "line" when the browser reports lines instead of pixels. */
const WHEEL_LINE = 16;
/** `WheelEvent.deltaMode` values: lines, pages (else pixels). */
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

/** Mouse button that pans — the primary one; the others open menus or autoscroll. */
export const PRIMARY_BUTTON = 0;

/** Presses on the controls or on links (the hub overlay) are clicks, not gestures. */
export function isOnControl(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && target.closest('button, a') !== null;
}

/**
 * Marks a control as available or not with `aria-disabled` — unlike `disabled`, the button keeps
 * the keyboard focus when it becomes unavailable (e.g. "fit" right after fitting). Writes only on
 * change.
 */
export function setAvailable(button: HTMLButtonElement, isAvailable: boolean): void {
  const value = String(!isAvailable);
  if (button.getAttribute('aria-disabled') !== value) {
    button.setAttribute('aria-disabled', value);
  }
}

/** Whether a control is available — see `setAvailable`. */
export function isButtonAvailable(button: HTMLButtonElement): boolean {
  return button.getAttribute('aria-disabled') !== 'true';
}

/**
 * Mice and pens — unlike touch points they hover (they move with no button pressed) and have
 * buttons other than the primary one, so their `button`/`buttons` tell a pan from anything else.
 */
export function isMouseOrPen(event: PointerEvent): boolean {
  return event.pointerType === 'mouse' || event.pointerType === 'pen';
}

/** Wheel movement in pixels, whatever unit the browser reports. */
export function measureWheelPixels(event: WheelEvent, pageHeight: number): number {
  switch (event.deltaMode) {
    case DOM_DELTA_LINE:
      return event.deltaY * WHEEL_LINE;
    case DOM_DELTA_PAGE:
      return event.deltaY * pageHeight;
    default:
      return event.deltaY;
  }
}
