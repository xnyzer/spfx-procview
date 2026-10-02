/**
 * Stored values the page cannot read (audit L55): SharePoint's property pane shows a stored toggle
 * or choice value before its own `checked:` default, so such values are normalised when the web
 * part is deserialised. Unit tests of `normalizeStoredSettings`, then pane and page side by side
 * on SharePoint stand-ins (spfxTestDoubles.ts).
 */
jest.mock('@microsoft/sp-core-library', () => jest.requireActual('./spfxTestDoubles').coreLibraryDouble);
jest.mock('@microsoft/sp-property-pane', () => jest.requireActual('./spfxTestDoubles').propertyPaneDouble);
jest.mock('@microsoft/sp-webpart-base', () => jest.requireActual('./spfxTestDoubles').webPartBaseDouble);
jest.mock('ProcViewWebPartStrings', () => jest.requireActual('./spfxTestDoubles').stringsDouble, { virtual: true });

import ProcViewWebPart from './ProcViewWebPart';
import { normalizeStoredSettings } from './settings';
import { disposeWebParts, findShownChoice, isToggleShownOn, loadImage, startWebPart } from './spfxTestDoubles';
import type { IFieldDouble, IWebPartHarness } from './spfxTestDoubles';

// Placeholders only — real model ids and keys never enter the repository.
const LINK = `https://editor.signavio.com/p/model/${'0123456789abcdef'.repeat(2)}/png?inline&authkey=${'ab12'.repeat(16)}`;

function findPaneField(webPart: IWebPartHarness, targetProperty: string): IFieldDouble | undefined {
  const groups = webPart.getPropertyPaneConfiguration().pages[0].groups as unknown as { groupFields: IFieldDouble[] }[];
  return groups
    .reduce<IFieldDouble[]>((all, group) => all.concat(group.groupFields), [])
    .find((field) => field.targetProperty === targetProperty);
}

/** The pane's switch for `property` as SharePoint shows it. */
function readPaneToggle(webPart: IWebPartHarness, property: string): boolean {
  return isToggleShownOn(findPaneField(webPart, property) as IFieldDouble, webPart.properties);
}

/** What the page shows — read from its DOM after the image has loaded. */
function readPage(webPart: IWebPartHarness): Record<string, boolean> {
  const root = webPart.domElement;
  const image = root.querySelector('img') as HTMLImageElement;
  loadImage(image);
  return {
    showHubLink: root.querySelector('a') !== null,
    offerZoom: root.querySelector('button[aria-label="ZoomIn"]') !== null,
    offerFullScreen: root.querySelector('button[aria-label="FullScreen"]') !== null,
    showBackground: image.style.getPropertyValue('background-size') === 'contain'
  };
}

function hasWidth(root: HTMLElement, width: string): boolean {
  return Array.from(root.querySelectorAll<HTMLElement>('*')).some((element) => element.style.width === width);
}

afterEach(() => {
  disposeWebParts();
  document.body.replaceChildren();
});

describe('normalizeStoredSettings', () => {
  it('turns toggles that are not booleans into what the page reads from them', () => {
    expect(normalizeStoredSettings({ showHubLink: 'true', offerZoom: 1 })).toEqual({
      showHubLink: false,
      offerZoom: false
    });
    expect(normalizeStoredSettings({ offerFullScreen: 'false', showBackground: 0 })).toEqual({
      offerFullScreen: true,
      showBackground: true
    });
    expect(normalizeStoredSettings({ showHubLink: {}, offerFullScreen: [] })).toEqual({
      showHubLink: false,
      offerFullScreen: true
    });
  });

  it('turns an unknown hub link position into below, the position the page uses', () => {
    ['<img src=x>', 'OVERLAY', 5, {}].forEach((hubLinkPosition) =>
      expect(normalizeStoredSettings({ hubLinkPosition })).toEqual({ hubLinkPosition: 'below' })
    );
  });

  it('removes texts that are not strings — the page reads them as empty', () => {
    expect(
      normalizeStoredSettings({
        imageLink: { url: LINK },
        width: 600,
        height: true,
        altText: 1,
        caption: [],
        hubLinkText: 2
      })
    ).toEqual({});
  });

  it('keeps missing, empty and readable values, alignments and the colour, and copies', () => {
    const readable = {
      imageLink: LINK,
      width: '600',
      height: '',
      altText: null,
      showHubLink: true,
      offerZoom: undefined,
      offerFullScreen: false,
      hubLinkPosition: 'overlay',
      diagramAlign: '<b>',
      backgroundColor: 'red; x: url(evil)'
    };
    const stored = { ...readable };
    expect(normalizeStoredSettings(stored)).toEqual(readable);
    expect(normalizeStoredSettings(stored)).not.toBe(stored);
    expect(normalizeStoredSettings({ hubLinkPosition: '' })).toEqual({ hubLinkPosition: '' });
  });

  it('does not change what it was given', () => {
    const stored = { showHubLink: 'true', width: 600 };
    normalizeStoredSettings(stored);
    expect(stored).toEqual({ showHubLink: 'true', width: 600 });
  });
});

describe('pane and page agree on stored values the page cannot read', () => {
  it.each([
    [{ showHubLink: 'true', offerZoom: 1, offerFullScreen: 'false', showBackground: 0 }],
    [{ showHubLink: 'false', offerZoom: 'false', offerFullScreen: 0, showBackground: '' }],
    [{ showHubLink: true, offerZoom: true, offerFullScreen: false, showBackground: false }]
  ])('toggles %p', async (stored) => {
    const webPart = await startWebPart(ProcViewWebPart, { imageLink: LINK, ...stored });
    const page = readPage(webPart);
    Object.keys(page).forEach((property) =>
      expect([property, readPaneToggle(webPart, property)]).toEqual([property, page[property]])
    );
  });

  it('an unknown hub link position: the pane selects below, where the page shows the link', async () => {
    const webPart = await startWebPart(ProcViewWebPart, {
      imageLink: LINK,
      showHubLink: true,
      hubLinkPosition: '<img src=x>'
    });
    const field = findPaneField(webPart, 'hubLinkPosition') as IFieldDouble;
    expect(findShownChoice(field, webPart.properties)).toBe('below');
    expect(findPaneField(webPart, 'hubLinkAlign')).toBeDefined();
    // Below the diagram: the link sits in its own paragraph after the figure, not on the image
    expect(webPart.domElement.querySelector('a')?.closest('figure')).toBeNull();
  });

  it('a width stored as a number: the pane field stays empty, the page sizes automatically', async () => {
    const webPart = await startWebPart(ProcViewWebPart, { imageLink: LINK, width: 600 });
    expect(webPart.properties.width).toBeUndefined();
    expect(hasWidth(webPart.domElement, '600px')).toBe(false);
    // The same width as text is used — the check above can see a width
    const text = await startWebPart(ProcViewWebPart, { imageLink: LINK, width: '600' });
    expect(hasWidth(text.domElement, '600px')).toBe(true);
  });
});
