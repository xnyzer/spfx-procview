/**
 * Injection robustness end to end: hostile values in every setting at once take the web part's
 * own path — `readSettings` (settings.ts) into the real renderers — and the resulting DOM must
 * not contain anything active. jsdom stores CSS it would reject in a browser, so the stored
 * styles are checked against an allow-list instead of relying on the CSS parser.
 */

import { parseDiagramLink } from '../../providers/registry';
import { SIGNAVIO_HOSTS } from '../../providers/signavio';
import { renderAboutField, REPOSITORY_URL } from './aboutField';
import { renderAlignmentButtons } from './alignmentField';
import { parseBackgroundColor } from './background';
import { renderColorField } from './colorField';
import { openLightbox } from './lightbox';
import type { ILightbox } from './lightbox';
import { outcomeFor, resolveMessage, resolveState } from './messages';
import { renderDiagram } from './renderDiagram';
import type { IDiagramView } from './renderDiagram';
import { renderMessage } from './renderMessage';
import { readAlign, readSettings } from './settings';
import type { IProcViewWebPartProps, ISettings, UntrustedProps } from './settings';
import type { IZoomController } from './zoomView';

// --- Hostile values ---------------------------------------------------------------------

// Placeholders only — real model ids and keys never enter the repository.
const MODEL = '0123456789abcdef0123456789abcdef';
const KEY = 'ab12'.repeat(16);
const IMAGE_LINK = `https://editor.signavio.com/p/model/${MODEL}/png?inline&authkey=${KEY}`;
// Assembled so the linter's no-script-url rule does not flag the hostile test input
const SCRIPT_URL = ['java', 'script:alert(1)'].join('');
const MARKUP = `"'><img src=x onerror=alert(1)><script>alert(1)</script>`;

/** Values every setting gets in turn: markup, script URLs, CSS breakouts, Unicode tricks, wrong types. */
const HOSTILE_VALUES: unknown[] = [
  MARKUP,
  SCRIPT_URL,
  `${IMAGE_LINK}"><img src=x onerror=alert(1)>`,
  '\'"`',
  'red;background:url(https://example.com/x)',
  '800;background-image:url(https://example.com/x)',
  '#ffffff;background:url(https://example.com/x)',
  '}*{display:none}/*',
  'expression(alert(1))',
  '</style><style>*{background:url(https://example.com/x)}</style>',
  '\u202eevil\u202c',
  '\u0000\u200b\ufeff',
  '__proto__',
  'true',
  'false',
  { toString: (): string => MARKUP },
  [MARKUP],
  42,
  NaN,
  null,
  true
];

const PROPERTY_NAMES: (keyof IProcViewWebPartProps)[] = [
  'imageLink',
  'width',
  'height',
  'diagramAlign',
  'altText',
  'caption',
  'captionAlign',
  'showHubLink',
  'hubLinkText',
  'hubLinkAlign',
  'hubLinkPosition',
  'offerZoom',
  'offerFullScreen',
  'showBackground',
  'backgroundColor'
];

/** Every setting set to `value`; the image link stays valid unless `withLink` is false. */
function propsWith(value: unknown, withLink: boolean = true): UntrustedProps {
  const props: Record<string, unknown> = {};
  PROPERTY_NAMES.forEach((name) => (props[name] = value));
  if (withLink) {
    props.imageLink = IMAGE_LINK;
  }
  return props;
}

// Texts from `loc/` are not under attack here — every key reads as its own name
const STRINGS = new Proxy({}, { get: (_target, key) => String(key) }) as unknown as IProcViewWebPartStrings;

// --- What the DOM may contain -----------------------------------------------------------

const ALLOWED_TAGS = [
  'section',
  'figure',
  'figcaption',
  'div',
  'p',
  'ul',
  'li',
  'span',
  'a',
  'img',
  'button',
  'svg',
  'path',
  'rect',
  'dialog',
  'label',
  'input'
];

const ALLOWED_ATTRIBUTES = [
  'class',
  'style',
  'src',
  'alt',
  'href',
  'target',
  'rel',
  'referrerpolicy',
  'loading',
  'decoding',
  'type',
  'role',
  'title',
  'tabindex',
  'id',
  'for',
  'value',
  'open',
  'hidden',
  'disabled',
  'viewbox',
  'width',
  'height',
  'focusable',
  'd',
  'x',
  'y',
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap'
];

/** An https URL on an allow-listed Signavio host, below `/p/`. */
function isSignavioUrl(value: string): boolean {
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    url.username === '' &&
    url.port === '' &&
    SIGNAVIO_HOSTS.indexOf(url.hostname) >= 0 &&
    url.pathname.indexOf('/p/') === 0
  );
}

const SIZE = /^(\d+px|\d+%|auto|fit-content)$/;

/** Allowed inline style properties and the shape of their values. */
const STYLE_VALUES: Record<string, RegExp> = {
  width: SIZE,
  height: SIZE,
  'max-width': /^100%$/,
  'margin-left': /^(0(px)?|auto)$/,
  'margin-right': /^(0(px)?|auto)$/,
  'object-fit': /^(fill|contain)$/,
  'text-align': /^(left|center|right)$/,
  'background-image': /^url\("data:image\/svg\+xml,[^"'()\s\\]*"\)$/,
  'background-size': /^contain$/,
  'background-position': /^center$/,
  'background-repeat': /^no-repeat$/,
  'transform-origin': /^0 0$/,
  transform: /^(translate\(-?[\d.e-]+px, -?[\d.e-]+px\) scale\([\d.e-]+\))?$/
};

/** The background SVG may only be a single `rect` with a hex colour. */
function expectInertBackground(value: string): void {
  const svg = decodeURIComponent(value.slice('url("data:image/svg+xml,'.length, -'")'.length));
  const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const elements = [parsed, ...Array.from(parsed.querySelectorAll('*'))];
  expect(elements.map((element) => element.localName)).toEqual(['svg', 'rect']);
  elements.forEach((element) =>
    Array.from(element.attributes).forEach((attribute) =>
      expect(['xmlns', 'width', 'height', 'viewBox', 'fill']).toContain(attribute.name)
    )
  );
  expect(parsed.querySelector('rect')?.getAttribute('fill')).toMatch(/^#[0-9a-f]{6}$/);
}

function expectInertStyle(element: Element): void {
  const style = (element as HTMLElement).style;
  if (!style) {
    return;
  }
  for (let index = 0; index < style.length; index++) {
    const property = style.item(index);
    const value = style.getPropertyValue(property);
    expect({ property, allowed: property in STYLE_VALUES }).toEqual({ property, allowed: true });
    expect(value).toMatch(STYLE_VALUES[property]);
    if (property === 'background-image') {
      expectInertBackground(value);
    }
  }
}

function expectInertAttributes(element: Element): void {
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    expect(name.indexOf('on')).not.toBe(0);
    expect(name.indexOf('aria-') === 0 || ALLOWED_ATTRIBUTES.indexOf(name) >= 0 ? name : `unexpected ${name}`).toBe(
      name
    );
    if (name === 'src' || name === 'href') {
      expect(attribute.value === REPOSITORY_URL || isSignavioUrl(attribute.value) ? 'safe' : attribute.value).toBe(
        'safe'
      );
    }
  });
}

/** Nothing in `root` is active: known elements and attributes only, safe URLs and styles. */
function expectInert(root: Element): void {
  [root, ...Array.from(root.querySelectorAll('*'))].forEach((element) => {
    expect(ALLOWED_TAGS).toContain(element.localName);
    expectInertAttributes(element);
    expectInertStyle(element);
  });
}

/** jsdom loads nothing: give every image a natural size and fire `load` (adds the background). */
function loadImages(root: Element): void {
  Array.from(root.querySelectorAll('img')).forEach((image) => {
    Object.defineProperty(image, 'naturalWidth', { value: 720, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 457, configurable: true });
    image.dispatchEvent(new Event('load'));
  });
}

// --- The web part's path ----------------------------------------------------------------

/** Zoom controllers and the full-screen view of the current test — cleaned up after it. */
let zooms: IZoomController[] = [];
let lightbox: ILightbox | undefined;

const CLASS_NAMES: IDiagramView['classNames'] = {
  root: 'root',
  figure: 'figure',
  frame: 'frame',
  controlBar: 'controlBar',
  image: 'image',
  caption: 'caption',
  hubLink: 'hubLink',
  hubAnchor: 'hubAnchor',
  hubOverlay: 'hubOverlay',
  srOnly: 'srOnly'
};
const ZOOM_LABELS = { zoomIn: 'in', zoomOut: 'out', reset: 'reset', viewport: 'viewport' };
const ZOOM_CLASS_NAMES = { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'controls', button: 'button' };

/** Settings and diagram exactly as `ProcViewWebPart.render()` builds them for a valid link. */
function renderPage(props: UntrustedProps): { settings: ISettings; root: HTMLElement } {
  const result = parseDiagramLink(props.imageLink);
  if (!result.ok) {
    throw new Error(`expected a valid link, got ${result.error}`);
  }
  const settings = readSettings(props, result.link, STRINGS);
  const root = renderDiagram(document, {
    ...settings.diagram,
    link: result.link,
    zoom: settings.offerZoom
      ? { labels: ZOOM_LABELS, classNames: ZOOM_CLASS_NAMES, onAttach: (controller) => zooms.push(controller) }
      : undefined,
    fullScreen: settings.offerFullScreen
      ? { label: 'full screen', className: 'button', onOpen: () => undefined }
      : undefined,
    classNames: CLASS_NAMES
  });
  document.body.replaceChildren(root);
  loadImages(root);
  return { settings, root };
}

// jsdom does not implement modal dialogs completely — a minimal stand-in
const dialogPrototype = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
const originalDialog = { showModal: dialogPrototype.showModal, close: dialogPrototype.close };

beforeAll(() => {
  dialogPrototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  dialogPrototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  zooms.forEach((zoom) => zoom.dispose());
  zooms = [];
  lightbox?.close();
  lightbox = undefined;
  document.body.replaceChildren();
});

afterAll(() => {
  dialogPrototype.showModal = originalDialog.showModal;
  dialogPrototype.close = originalDialog.close;
});

// --- Tests ------------------------------------------------------------------------------

describe('injection — every setting hostile at once', () => {
  it.each(HOSTILE_VALUES.map((value) => [value]))('page: nothing active for %p', (value) => {
    const { root } = renderPage(propsWith(value));
    expectInert(root);
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(root.querySelector('img')?.getAttribute('src')).toBe(IMAGE_LINK);
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))('page with zoom and hub link: nothing active for %p', (value) => {
    const { root } = renderPage({ ...propsWith(value), offerZoom: true, showHubLink: true });
    expectInert(root);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(`https://editor.signavio.com/p/portal#/model/${MODEL}`);
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))('full screen: nothing active for %p', (value) => {
    const { settings } = renderPage(propsWith(value));
    lightbox = openLightbox(document, {
      imageUrl: IMAGE_LINK,
      altText: settings.diagram.altText,
      background: settings.diagram.background,
      labels: { close: 'close', zoom: ZOOM_LABELS },
      classNames: { dialog: 'dialog', frame: 'frame', image: 'image', close: 'close', zoom: ZOOM_CLASS_NAMES }
    });
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    loadImages(dialog);
    expectInert(dialog);
    expect(dialog.querySelectorAll('img')).toHaveLength(1);
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))('messages: nothing active for %p', (value) => {
    const props = propsWith(value, false);
    const result = parseDiagramLink(props.imageLink);
    const settings = readSettings(props, result.ok ? result.link : undefined, STRINGS);
    [true, false].forEach((editMode) => {
      const outcome = outcomeFor(resolveState(result, undefined), editMode);
      if (outcome.kind !== 'message') {
        return;
      }
      const root = renderMessage(document, {
        texts: resolveMessage(outcome.message, STRINGS),
        configureLabel: 'Configure',
        onConfigure: () => undefined,
        hubLink: settings.diagram.hubLink,
        classNames: {
          ...CLASS_NAMES,
          message: 'm',
          info: 'i',
          error: 'e',
          title: 't',
          body: 'b',
          details: 'd',
          configure: 'c'
        }
      });
      expectInert(root);
      expect(root.querySelector('img')).toBeNull();
    });
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))(
    'load-error message with hub link: nothing active for %p',
    (value) => {
      const props = { ...propsWith(value), showHubLink: true };
      const result = parseDiagramLink(props.imageLink);
      const settings = readSettings(props, result.ok ? result.link : undefined, STRINGS);
      const outcome = outcomeFor(resolveState(result, { imageUrl: IMAGE_LINK, cause: 'blocked' }), false);
      if (outcome.kind !== 'message') {
        throw new Error('expected a message');
      }
      const root = renderMessage(document, {
        texts: resolveMessage(outcome.message, STRINGS),
        configureLabel: 'Configure',
        hubLink: settings.diagram.hubLink,
        classNames: {
          ...CLASS_NAMES,
          message: 'm',
          info: 'i',
          error: 'e',
          title: 't',
          body: 'b',
          details: 'd',
          configure: 'c'
        }
      });
      expectInert(root);
      expect(root.querySelector('a')).not.toBeNull();
    }
  );

  it.each(HOSTILE_VALUES.map((value) => [value]))('property pane fields: nothing active for %p', (value) => {
    const props = propsWith(value);
    const alignment = renderAlignmentButtons(document, {
      labelText: 'Alignment',
      options: [
        { key: 'left', text: 'left' },
        { key: 'center', text: 'center' },
        { key: 'right', text: 'right' }
      ],
      selected: readAlign(props, 'captionAlign'),
      idPrefix: 'wp1-captionAlign',
      classNames: { root: 'r', label: 'l', group: 'g', button: 'b', selected: 's' },
      onChange: () => undefined
    });
    const color = renderColorField(document, {
      labelText: 'Colour',
      value: parseBackgroundColor(props.backgroundColor),
      idPrefix: 'wp1-backgroundColor',
      classNames: { root: 'r', label: 'l', input: 'i' },
      onChange: () => undefined
    });
    const about = renderAboutField(document, {
      linkText: 'Repository',
      newTabHint: '(new tab)',
      classNames: { root: 'r', anchor: 'a', srOnly: 's' }
    });
    [alignment, color, about].forEach(expectInert);
    expect(color.querySelector('input')?.value).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('injection — hostile texts stay visible as text', () => {
  it('shows markup in caption, alt text and link text literally', () => {
    const { root } = renderPage({
      imageLink: IMAGE_LINK,
      caption: MARKUP,
      altText: MARKUP,
      showHubLink: true,
      hubLinkText: MARKUP
    });
    expect(root.querySelector('figcaption')?.textContent).toBe(MARKUP);
    expect(root.querySelector('img')?.getAttribute('alt')).toBe(MARKUP);
    expect(root.querySelector('a')?.firstChild?.textContent).toBe(MARKUP);
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(root.querySelector('script')).toBeNull();
  });

  it('drops direction overrides and falls back for invisible-only texts', () => {
    const { root } = renderPage({
      imageLink: IMAGE_LINK,
      caption: '\u202eevil\u202c',
      altText: '\u200b',
      showHubLink: true,
      hubLinkText: '\ufeff\u2060'
    });
    expect(root.querySelector('figcaption')?.textContent).toBe('evil');
    expect(root.querySelector('img')?.getAttribute('alt')).toBe('DefaultAltText');
    expect(root.querySelector('a')?.firstChild?.textContent).toBe('HubLinkDefaultText');
  });

  it('never takes the image or hub URL from anything but the validated link', () => {
    const { root } = renderPage({
      imageLink: `${IMAGE_LINK}&x="><img src=x onerror=alert(1)>#${SCRIPT_URL}`,
      showHubLink: true,
      hubLinkText: SCRIPT_URL
    });
    expect(root.querySelector('img')?.getAttribute('src')).toBe(IMAGE_LINK);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(`https://editor.signavio.com/p/portal#/model/${MODEL}`);
  });
});
