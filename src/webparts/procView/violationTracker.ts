/**
 * Watches the browser's Content Security Policy violations for images, so a failed image
 * load can be told apart: "blocked by a policy" versus any other failure (the `<img>`
 * error event itself carries no reason).
 */
export interface IViolationTracker {
  /** Whether a policy violation was reported for this image URL. */
  isBlocked(imageUrl: string): boolean;
  /** Removes the event listener. */
  dispose(): void;
}

/** Directives that can block images — `img-src` directly or `default-src` as fallback. */
const IMAGE_DIRECTIVES = ['img-src', 'default-src'];

interface IViolationFields {
  blockedURI?: unknown;
  effectiveDirective?: unknown;
  violatedDirective?: unknown;
}

/**
 * Browsers report either the full blocked URL or, for cross-origin requests, only its
 * origin — so a report matches the image URL itself or any URL it starts with.
 */
function matches(imageUrl: string, blocked: string): boolean {
  if (blocked === '') {
    return false;
  }
  return imageUrl === blocked || imageUrl.indexOf(blocked.replace(/\/$/, '') + '/') === 0;
}

/**
 * @param onViolation Called after an image violation was recorded — violations are
 *   reported asynchronously and may arrive after the image's `error` event.
 */
export function trackImageViolations(target: EventTarget, onViolation?: () => void): IViolationTracker {
  const blockedUris: string[] = [];

  const listener = (event: Event): void => {
    const fields = event as unknown as IViolationFields;
    const directive = String(fields.effectiveDirective ?? fields.violatedDirective ?? '');
    const isImageDirective = IMAGE_DIRECTIVES.some((name) => directive === name || directive.indexOf(`${name} `) === 0);
    if (isImageDirective && typeof fields.blockedURI === 'string') {
      blockedUris.push(fields.blockedURI);
      onViolation?.();
    }
  };

  target.addEventListener('securitypolicyviolation', listener);
  return {
    isBlocked: (imageUrl: string) => blockedUris.some((blocked) => matches(imageUrl, blocked)),
    dispose: () => target.removeEventListener('securitypolicyviolation', listener)
  };
}
