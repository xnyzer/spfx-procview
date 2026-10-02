import { trackImageViolations } from './violationTracker';

const IMAGE_URL = `https://editor.signavio.com/p/model/0123456789abcdef0123456789abcdef/png?inline&authkey=${'ab12'.repeat(16)}`;

/** jsdom has no SecurityPolicyViolationEvent — a plain event with the same fields. */
function violation(blockedURI: string, effectiveDirective: string): Event {
  const event = new Event('securitypolicyviolation');
  Object.defineProperty(event, 'blockedURI', { value: blockedURI });
  Object.defineProperty(event, 'effectiveDirective', { value: effectiveDirective });
  return event;
}

describe('trackImageViolations', () => {
  it('is not blocked without violations', () => {
    const tracker = trackImageViolations(document);
    expect(tracker.isBlocked(IMAGE_URL)).toBe(false);
    tracker.dispose();
  });

  it('recognises an img-src violation for the full image URL', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation(IMAGE_URL, 'img-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(true);
    tracker.dispose();
  });

  it('recognises a report that only names the origin (cross-origin reporting)', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation('https://editor.signavio.com', 'img-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(true);
    tracker.dispose();
  });

  it('falls back to violatedDirective with its source list (older browsers)', () => {
    const tracker = trackImageViolations(document);
    const event = new Event('securitypolicyviolation');
    Object.defineProperty(event, 'blockedURI', { value: IMAGE_URL });
    Object.defineProperty(event, 'violatedDirective', { value: "img-src 'self' https://*.sharepoint.com" });
    document.dispatchEvent(event);
    expect(tracker.isBlocked(IMAGE_URL)).toBe(true);
    tracker.dispose();
  });

  it('ignores a violatedDirective that only starts like an image directive', () => {
    const tracker = trackImageViolations(document);
    const event = new Event('securitypolicyviolation');
    Object.defineProperty(event, 'blockedURI', { value: IMAGE_URL });
    Object.defineProperty(event, 'violatedDirective', { value: "img-src-elem 'self'" });
    document.dispatchEvent(event);
    expect(tracker.isBlocked(IMAGE_URL)).toBe(false);
    tracker.dispose();
  });

  it('recognises an origin reported with a trailing slash', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation('https://editor.signavio.com/', 'img-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(true);
    tracker.dispose();
  });

  it('recognises default-src as fallback directive', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation(IMAGE_URL, 'default-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(true);
    tracker.dispose();
  });

  it('ignores violations of other directives', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation(IMAGE_URL, 'script-src'));
    document.dispatchEvent(violation(IMAGE_URL, 'frame-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(false);
    tracker.dispose();
  });

  it('ignores violations for other URLs and lookalike origins', () => {
    const tracker = trackImageViolations(document);
    document.dispatchEvent(violation('https://example.com/image.png', 'img-src'));
    document.dispatchEvent(violation('https://editor.signavio.co', 'img-src'));
    document.dispatchEvent(violation('', 'img-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(false);
    tracker.dispose();
  });

  it('calls back after recording an image violation, not for other directives', () => {
    const onViolation = jest.fn();
    const tracker = trackImageViolations(document, onViolation);
    document.dispatchEvent(violation(IMAGE_URL, 'script-src'));
    expect(onViolation).not.toHaveBeenCalled();
    document.dispatchEvent(violation(IMAGE_URL, 'img-src'));
    expect(onViolation).toHaveBeenCalledTimes(1);
    tracker.dispose();
  });

  it('stops listening after dispose', () => {
    const tracker = trackImageViolations(document);
    tracker.dispose();
    document.dispatchEvent(violation(IMAGE_URL, 'img-src'));
    expect(tracker.isBlocked(IMAGE_URL)).toBe(false);
  });
});
