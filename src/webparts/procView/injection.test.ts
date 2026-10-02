/**
 * Injection robustness end to end: hostile values in every setting at once go through the real
 * web part and property pane (on SharePoint stand-ins, spfxTestDoubles.ts), and the resulting DOM
 * must not contain anything active. jsdom stores CSS it would reject in a browser, so the stored
 * styles are checked against an allow-list instead of relying on the CSS parser.
 */
jest.mock('@microsoft/sp-core-library', () => jest.requireActual('./spfxTestDoubles').coreLibraryDouble);
jest.mock('@microsoft/sp-property-pane', () => jest.requireActual('./spfxTestDoubles').propertyPaneDouble);
jest.mock('@microsoft/sp-webpart-base', () => jest.requireActual('./spfxTestDoubles').webPartBaseDouble);
jest.mock('ProcViewWebPartStrings', () => jest.requireActual('./spfxTestDoubles').stringsDouble, { virtual: true });

import { SIGNAVIO_HOSTS } from '../../providers/signavio';
import ProcViewWebPart from './ProcViewWebPart';
import { REPOSITORY_URL } from './aboutField';
import type { IProcViewWebPartProps } from './settings';
import { DISPLAY_MODE, disposeWebParts, installDialogStandIn, loadImage, startWebPart } from './spfxTestDoubles';
import type { IFieldDouble, IWebPartHarness } from './spfxTestDoubles';

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
function propsWith(value: unknown, withLink: boolean = true): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  PROPERTY_NAMES.forEach((name) => (props[name] = value));
  if (withLink) {
    props.imageLink = IMAGE_LINK;
  }
  return props;
}

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
  'draggable',
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
  Array.from(root.querySelectorAll('img')).forEach((image) => loadImage(image));
}

// --- The web part's path ----------------------------------------------------------------

let restoreDialog: () => void = () => undefined;

beforeAll(() => {
  restoreDialog = installDialogStandIn();
});

afterEach(() => {
  disposeWebParts();
  document.body.replaceChildren();
});

afterAll(() => restoreDialog());

/** The real web part with these settings, rendered and with its image loaded. */
async function renderWebPart(
  props: Record<string, unknown>,
  displayMode: number = DISPLAY_MODE.Edit
): Promise<IWebPartHarness> {
  const webPart = await startWebPart(ProcViewWebPart, props, { displayMode });
  loadImages(webPart.domElement);
  return webPart;
}

async function renderPage(props: Record<string, unknown>): Promise<HTMLElement> {
  return (await renderWebPart(props)).domElement;
}

/** Every custom field of the web part's property pane, rendered the way SharePoint does it. */
function renderCustomFields(webPart: IWebPartHarness): HTMLElement[] {
  const groups = webPart.getPropertyPaneConfiguration().pages[0].groups as unknown as { groupFields: IFieldDouble[] }[];
  return groups
    .reduce<IFieldDouble[]>((all, group) => all.concat(group.groupFields), [])
    .filter((field) => field.type === 'Custom')
    .map((field) => {
      const element = document.createElement('div');
      const onRender = field.properties.onRender as (
        element: HTMLElement,
        context: unknown,
        onChange: () => void
      ) => void;
      onRender(element, undefined, () => undefined);
      return element;
    });
}

// --- Tests ------------------------------------------------------------------------------

describe('injection — every setting hostile at once', () => {
  it.each(HOSTILE_VALUES.map((value) => [value]))('page: nothing active for %p', async (value) => {
    const root = await renderPage(propsWith(value));
    expectInert(root);
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(root.querySelector('img')?.getAttribute('src')).toBe(IMAGE_LINK);
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))(
    'page with zoom and hub link: nothing active for %p',
    async (value) => {
      const root = await renderPage({ ...propsWith(value), offerZoom: true, showHubLink: true });
      expectInert(root);
      expect(root.querySelector('a')?.getAttribute('href')).toBe(
        `https://editor.signavio.com/p/portal#/model/${MODEL}`
      );
    }
  );

  it.each(HOSTILE_VALUES.map((value) => [value]))('full screen: nothing active for %p', async (value) => {
    const root = await renderPage(propsWith(value));
    root.querySelector<HTMLButtonElement>('button[aria-label="FullScreen"]')?.click();
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    loadImages(dialog);
    expectInert(dialog);
    expect(dialog.querySelectorAll('img')).toHaveLength(1);
  });

  it.each(HOSTILE_VALUES.map((value) => [value]))(
    'messages without a valid link: nothing active for %p',
    async (value) => {
      for (const displayMode of [DISPLAY_MODE.Edit, DISPLAY_MODE.Read]) {
        const root = (await renderWebPart(propsWith(value, false), displayMode)).domElement;
        expectInert(root);
        expect(root.querySelectorAll('img').length).toBeLessThanOrEqual(1);
      }
    }
  );

  it.each(HOSTILE_VALUES.map((value) => [value]))(
    'load-error message with hub link for readers: nothing active for %p',
    async (value) => {
      const webPart = await startWebPart(
        ProcViewWebPart,
        { ...propsWith(value), showHubLink: true },
        { displayMode: DISPLAY_MODE.Read }
      );
      webPart.domElement.querySelector('img')?.dispatchEvent(new Event('error'));
      expectInert(webPart.domElement);
      expect(webPart.domElement.querySelector('img')).toBeNull();
      expect(webPart.domElement.querySelector('a')).not.toBeNull();
    }
  );

  it.each(HOSTILE_VALUES.map((value) => [value]))('property pane fields: nothing active for %p', async (value) => {
    const fields = renderCustomFields(await renderWebPart(propsWith(value)));
    fields.forEach(expectInert);
    // jsdom turns an invalid colour input into #000000 — white proves the value was checked first
    const colours = fields.map((field) => field.querySelector('input')).filter((input) => input !== null);
    expect(colours.map((input) => input?.value)).toEqual(['#ffffff']);
  });
});

describe('injection — hostile texts stay visible as text', () => {
  it('shows markup in caption, alt text and link text literally', async () => {
    const root = await renderPage({
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

  it('drops direction overrides and falls back for invisible-only texts', async () => {
    const root = await renderPage({
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

  it('never takes the image or hub URL from anything but the validated link', async () => {
    const root = await renderPage({
      imageLink: `${IMAGE_LINK}&x="><img src=x onerror=alert(1)>#${SCRIPT_URL}`,
      showHubLink: true,
      hubLinkText: SCRIPT_URL
    });
    expect(root.querySelector('img')?.getAttribute('src')).toBe(IMAGE_LINK);
    expect(root.querySelector('a')?.getAttribute('href')).toBe(`https://editor.signavio.com/p/portal#/model/${MODEL}`);
  });
});
