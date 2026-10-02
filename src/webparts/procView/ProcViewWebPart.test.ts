/**
 * The web part on SharePoint stand-ins (spfxTestDoubles.ts): how settings, image events, dispose,
 * full screen, the themes and the property pane are wired. The modules it builds on have their
 * own tests; hostile settings end to end are in injection.test.ts.
 */
jest.mock('@microsoft/sp-core-library', () => jest.requireActual('./spfxTestDoubles').coreLibraryDouble);
jest.mock('@microsoft/sp-property-pane', () => jest.requireActual('./spfxTestDoubles').propertyPaneDouble);
jest.mock('@microsoft/sp-webpart-base', () => jest.requireActual('./spfxTestDoubles').webPartBaseDouble);
jest.mock('ProcViewWebPartStrings', () => jest.requireActual('./spfxTestDoubles').stringsDouble, { virtual: true });

import ProcViewWebPart from './ProcViewWebPart';
import {
  DISPLAY_MODE,
  coreLibraryDouble,
  disposeWebParts,
  installDialogStandIn,
  loadImage,
  reportImageViolation,
  startWebPart
} from './spfxTestDoubles';
import type { IFieldDouble, IStartOptions, IWebPartHarness } from './spfxTestDoubles';
import type { ITeamsJs } from './teamsTheme';

// Placeholders only — real model ids and keys never enter the repository.
const KEY = 'ab12'.repeat(16);
const LINK_A = `https://editor.signavio.com/p/model/${'0123456789abcdef'.repeat(2)}/png?inline&authkey=${KEY}`;
const LINK_B = `https://editor.signavio.com/p/model/${'fedcba9876543210'.repeat(2)}/png?inline&authkey=${KEY}`;
const SIGNAVIO_ORIGIN = 'https://editor.signavio.com';

function start(properties: Record<string, unknown>, options?: IStartOptions): Promise<IWebPartHarness> {
  return startWebPart(ProcViewWebPart, properties, options);
}

function findImage(webPart: IWebPartHarness): HTMLImageElement | undefined {
  return webPart.domElement.querySelector('img') ?? undefined;
}

function failImage(image: HTMLImageElement | undefined): void {
  image?.dispatchEvent(new Event('error'));
}

function collectPaneFields(webPart: IWebPartHarness): IFieldDouble[] {
  const groups = webPart.getPropertyPaneConfiguration().pages[0].groups as unknown as { groupFields: IFieldDouble[] }[];
  return groups.reduce<IFieldDouble[]>((all, group) => all.concat(group.groupFields), []);
}

function readNaturalSizeText(webPart: IWebPartHarness): string {
  const info = collectPaneFields(webPart).find((field) => field.targetProperty === 'naturalSizeInfo');
  return String(info?.properties.text);
}

function findFullScreenButton(webPart: IWebPartHarness): HTMLButtonElement | undefined {
  return webPart.domElement.querySelector<HTMLButtonElement>('button[aria-label="FullScreen"]') ?? undefined;
}

/** Lets pending promise callbacks (TeamsJS `getContext`) run. */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** TeamsJS stand-in: reports `theme` from `getContext`; `change` plays a theme switch in Teams. */
function createFakeTeams(getContext: () => Promise<{ app: { theme: string } }>): {
  teamsJs: ITeamsJs;
  change: (theme: string) => void;
} {
  let onChange: (theme: string) => void = () => undefined;
  return {
    teamsJs: {
      app: {
        getContext,
        registerOnThemeChangeHandler: (handler) => {
          onChange = handler;
        }
      }
    },
    change: (theme) => onChange(theme)
  };
}

let restoreDialog: () => void = () => undefined;

beforeAll(() => {
  restoreDialog = installDialogStandIn();
});

afterEach(() => {
  disposeWebParts();
  document.body.replaceChildren();
});

afterAll(() => restoreDialog());

// --- States -----------------------------------------------------------------------------

describe('ProcViewWebPart — states', () => {
  it('shows the diagram for a valid link', async () => {
    const webPart = await start({ imageLink: LINK_A });
    expect(findImage(webPart)?.getAttribute('src')).toBe(LINK_A);
    expect(findImage(webPart)?.alt).toBe('DefaultAltText');
  });

  it('guides editors without a link and shows readers nothing', async () => {
    const editor = await start({});
    expect(editor.domElement.textContent).toContain('MessageNoLinkTitle');
    const reader = await start({}, { displayMode: DISPLAY_MODE.Read });
    expect(reader.domElement.childNodes).toHaveLength(0);
  });

  it('opens the property pane from the Configure button', async () => {
    const webPart = await start({});
    webPart.domElement.querySelector('button')?.click();
    expect(webPart.context.propertyPane.open).toHaveBeenCalledTimes(1);
  });

  it('renders again for the other display mode', async () => {
    const webPart = await start({ imageLink: 'https://example.com/diagram.png' });
    expect(webPart.domElement.textContent).toContain('MessageInvalidLinkTitle');
    webPart.displayMode = DISPLAY_MODE.Read;
    webPart.onDisplayModeChanged();
    expect(webPart.domElement.textContent).toBe('MessageUnavailableReader');
  });
});

// --- Image events -----------------------------------------------------------------------

describe('ProcViewWebPart — image events of replaced diagrams (audit M4)', () => {
  it('ignores a late error of a replaced image', async () => {
    const webPart = await start({ imageLink: LINK_A });
    const replaced = findImage(webPart);
    webPart.render();
    const current = findImage(webPart);
    failImage(replaced);
    expect(findImage(webPart)).toBe(current);
    expect(webPart.domElement.textContent).not.toContain('MessageLoadFailedTitle');
  });

  it('ignores a late load of a replaced image for the maximum size', async () => {
    const webPart = await start({ imageLink: LINK_A });
    const replaced = findImage(webPart) as HTMLImageElement;
    webPart.render();
    loadImage(findImage(webPart) as HTMLImageElement, { width: 720, height: 457 });
    loadImage(replaced, { width: 100, height: 100 });
    expect(readNaturalSizeText(webPart)).toBe('NaturalSizeKnown 720 x 457');
  });

  it('refreshes an open pane once when the maximum size becomes known', async () => {
    const webPart = await start({ imageLink: LINK_A });
    webPart.context.propertyPane.isPropertyPaneOpen.mockReturnValue(true);
    loadImage(findImage(webPart) as HTMLImageElement);
    webPart.render();
    loadImage(findImage(webPart) as HTMLImageElement);
    expect(webPart.context.propertyPane.refresh).toHaveBeenCalledTimes(1);
  });
});

// --- Dispose ----------------------------------------------------------------------------

describe('ProcViewWebPart — after dispose (audit M5)', () => {
  it('renders nothing any more, also for late image errors', async () => {
    const webPart = await start({ imageLink: LINK_A });
    const image = findImage(webPart);
    webPart.onDispose();
    failImage(image);
    webPart.properties.imageLink = LINK_B;
    webPart.render();
    expect(findImage(webPart)).toBe(image);
  });

  it('ignores policy violations', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    webPart.onDispose();
    reportImageViolation(SIGNAVIO_ORIGIN);
    expect(webPart.domElement.textContent).toContain('MessageLoadFailedTitle');
  });

  it('ignores Teams theme changes', async () => {
    const teams = createFakeTeams(() => Promise.resolve({ app: { theme: 'default' } }));
    const webPart = await start({ imageLink: LINK_A }, { teamsJs: teams.teamsJs });
    await flushPromises();
    webPart.onDispose();
    teams.change('dark');
    expect(webPart.domElement.style.getPropertyValue('--bodyBackground')).toBe('');
  });
});

// --- Load errors ------------------------------------------------------------------------

describe('ProcViewWebPart — load errors', () => {
  it('explains a failed image to editors', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    expect(webPart.domElement.textContent).toContain('MessageLoadFailedTitle');
    expect(findImage(webPart)).toBeUndefined();
  });

  it('keeps the error while the same link stays entered', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    webPart.properties.caption = 'Order process';
    webPart.render();
    expect(webPart.domElement.textContent).toContain('MessageLoadFailedTitle');
  });

  it('tells a blocked image from other failures, also when the violation comes later', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    reportImageViolation(SIGNAVIO_ORIGIN);
    expect(webPart.domElement.textContent).toContain('MessageBlockedTitle editor.signavio.com');
  });

  it('loads again after another link and back — the error belongs to the link entered (decision L32)', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    webPart.properties.imageLink = LINK_B;
    webPart.render();
    webPart.properties.imageLink = LINK_A;
    webPart.render();
    expect(findImage(webPart)?.getAttribute('src')).toBe(LINK_A);
  });

  it('does not rebuild another link’s diagram for a late policy violation (audit L29)', async () => {
    const webPart = await start({ imageLink: LINK_A });
    failImage(findImage(webPart));
    webPart.properties.imageLink = LINK_B;
    webPart.render();
    const current = findImage(webPart);
    reportImageViolation(SIGNAVIO_ORIGIN);
    expect(findImage(webPart)).toBe(current);
  });
});

// --- Full screen ------------------------------------------------------------------------

describe('ProcViewWebPart — full screen', () => {
  it('opens the view with the checked settings, not the stored values', async () => {
    const webPart = await start({ imageLink: LINK_A, altText: '\u202eevil\u202c', showBackground: false });
    findFullScreenButton(webPart)?.click();
    const image = document.querySelector('dialog img') as HTMLImageElement;
    expect(image.alt).toBe('evil');
    loadImage(image);
    expect(image.style.getPropertyValue('background-image')).toBe('');
  });

  it('gives the focus to the current full-screen button after a re-render while open', async () => {
    const webPart = await start({ imageLink: LINK_A });
    findFullScreenButton(webPart)?.click();
    webPart.render();
    const current = findFullScreenButton(webPart);
    document.querySelector('dialog')?.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(document.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(current);
  });

  it('logs a dialog the browser refuses instead of letting the error escape (audit L61)', async () => {
    const webPart = await start({ imageLink: LINK_A });
    const prototype = HTMLDialogElement.prototype as unknown as { showModal: () => void };
    const standIn = prototype.showModal;
    prototype.showModal = () => {
      throw new Error('InvalidStateError');
    };
    // jsdom reports an error thrown in a listener on the window instead of throwing it from click()
    const uncaught: unknown[] = [];
    const onError = (event: ErrorEvent): void => {
      uncaught.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    coreLibraryDouble.Log.error.mockClear();
    try {
      findFullScreenButton(webPart)?.click();
    } finally {
      prototype.showModal = standIn;
      window.removeEventListener('error', onError);
    }
    expect(uncaught).toEqual([]);
    expect(coreLibraryDouble.Log.error).toHaveBeenCalledTimes(1);
    expect(document.querySelector('dialog')).toBeNull();
    // The page stays usable: the next attempt opens the view
    findFullScreenButton(webPart)?.click();
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(true);
  });

  it('closes an open view on dispose', async () => {
    const webPart = await start({ imageLink: LINK_A });
    findFullScreenButton(webPart)?.click();
    webPart.onDispose();
    expect(document.querySelector('dialog')).toBeNull();
  });
});

// --- Themes -----------------------------------------------------------------------------

describe('ProcViewWebPart — themes', () => {
  it('applies the section theme SharePoint passes as variables', async () => {
    const webPart = await start({ imageLink: LINK_A });
    webPart.onThemeChanged({ semanticColors: { bodyText: '#123456' } });
    expect(webPart.domElement.style.getPropertyValue('--bodyText')).toBe('#123456');
  });

  it('follows the Teams theme in a Teams tab', async () => {
    const teams = createFakeTeams(() => Promise.resolve({ app: { theme: 'dark' } }));
    const webPart = await start({ imageLink: LINK_A }, { teamsJs: teams.teamsJs });
    await flushPromises();
    expect(webPart.domElement.style.getPropertyValue('--bodyBackground')).toBe('#292929');
    teams.change('default');
    expect(webPart.domElement.style.getPropertyValue('--bodyBackground')).toBe('');
  });

  it('logs when Teams cannot report its theme and keeps the SharePoint colours', async () => {
    const teams = createFakeTeams(() => Promise.reject(new Error('not in Teams')));
    const webPart = await start({ imageLink: LINK_A }, { teamsJs: teams.teamsJs });
    await flushPromises();
    expect(coreLibraryDouble.Log.warn).toHaveBeenCalledTimes(1);
    expect(webPart.domElement.style.getPropertyValue('--bodyBackground')).toBe('');
  });
});

// --- Property pane ----------------------------------------------------------------------

describe('ProcViewWebPart — property pane', () => {
  it('keys its custom fields per web part instance (audit L25)', async () => {
    const webPart = await start({ imageLink: LINK_A });
    const keys = collectPaneFields(webPart)
      .filter((field) => field.type === 'Custom')
      .map((field) => String(field.properties.key));
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => expect(key.indexOf(`${webPart.context.instanceId}-`)).toBe(0));
  });

  it('refreshes the pane only for settings that show or hide fields', async () => {
    const webPart = await start({ imageLink: LINK_A });
    webPart.onPropertyPaneFieldChanged('caption');
    expect(webPart.context.propertyPane.refresh).not.toHaveBeenCalled();
    webPart.onPropertyPaneFieldChanged('showHubLink');
    expect(webPart.context.propertyPane.refresh).toHaveBeenCalledTimes(1);
  });
});

describe('ProcViewWebPart — version in the property pane', () => {
  function readAboutText(webPart: IWebPartHarness): string {
    const about = collectPaneFields(webPart).find((field) => field.targetProperty === 'aboutInfo');
    const element = document.createElement('div');
    const onRender = about?.properties.onRender as (
      element: HTMLElement,
      context: unknown,
      onChange: () => void
    ) => void;
    onRender(element, undefined, () => undefined);
    return element.textContent ?? '';
  }

  it('shows the version from the manifest', async () => {
    const webPart = await start({ imageLink: LINK_A });
    expect(readAboutText(webPart)).toContain('VersionText 1.2.3');
  });

  it('shows no version when the host provides no manifest or no release version', async () => {
    const withoutManifest = await start({});
    withoutManifest.context.manifest = undefined;
    expect(readAboutText(withoutManifest)).not.toContain('VersionText');

    const unbuilt = await start({});
    unbuilt.context.manifest = { version: '*' };
    expect(readAboutText(unbuilt)).not.toContain('VersionText');
  });
});
