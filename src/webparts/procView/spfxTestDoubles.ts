/**
 * Stand-ins for tests: the SharePoint Framework packages need SharePoint's internal modules and do
 * not load under Jest, and jsdom lacks modal dialogs and image loading. A test replaces the
 * packages at its very top — before its imports, which the compiled CommonJS keeps in this order:
 *
 *   jest.mock('@microsoft/sp-core-library', () => jest.requireActual('./spfxTestDoubles').coreLibraryDouble);
 *
 * Only tests import this module; nothing of it reaches the bundle.
 */

import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import type { ITeamsJs } from './teamsTheme';

// --- @microsoft/sp-core-library ---------------------------------------------------------

/** `DisplayMode` values as SharePoint defines them. */
export const DISPLAY_MODE = { Read: 1, Edit: 2 };

/** The parts of `@microsoft/sp-core-library` the web part uses; `Log.warn` records its calls. */
export const coreLibraryDouble = {
  DisplayMode: DISPLAY_MODE,
  Log: { warn: jest.fn() },
  Version: { parse: (version: string): string => version }
};

// --- @microsoft/sp-property-pane --------------------------------------------------------

/** A pane field as the stand-in factories record it — `type` names the factory. */
export interface IFieldDouble {
  type: string;
  targetProperty: string;
  properties: Record<string, unknown>;
}

function createFieldFactory(
  type: string
): (targetProperty: string, properties: Record<string, unknown>) => IFieldDouble {
  return (targetProperty, properties) => ({ type, targetProperty, properties });
}

/** The pane field factories the web part uses; custom fields get the type `Custom`. */
export const propertyPaneDouble = {
  PropertyPaneFieldType: { Custom: 'Custom' },
  PropertyPaneChoiceGroup: createFieldFactory('ChoiceGroup'),
  PropertyPaneLabel: createFieldFactory('Label'),
  PropertyPaneTextField: createFieldFactory('TextField'),
  PropertyPaneToggle: createFieldFactory('Toggle')
};

// --- ProcViewWebPartStrings -------------------------------------------------------------

/** Texts with placeholders keep them, so a test sees the values filled in. */
const TEXTS_WITH_PLACEHOLDERS: Record<string, string> = {
  NaturalSizeKnown: 'NaturalSizeKnown {0} x {1}',
  MessageBlockedTitle: 'MessageBlockedTitle {0}',
  MessageBlockedBody: 'MessageBlockedBody {0}',
  DimensionErrorTooLarge: 'DimensionErrorTooLarge {0}',
  VersionText: 'VersionText {0}'
};

/** Every text reads as its own key; `__esModule` keeps `import * as strings` from wrapping it. */
export const stringsDouble = new Proxy(
  {},
  { get: (_target, key) => (key === '__esModule' ? true : (TEXTS_WITH_PLACEHOLDERS[String(key)] ?? String(key))) }
);

// --- @microsoft/sp-webpart-base ---------------------------------------------------------

/** The web part context as far as the web part uses it; the pane calls are recorded. */
export interface IContextDouble {
  instanceId: string;
  /** The component manifest; a test can take it away, as a stand-in host might not have one. */
  manifest?: { version?: unknown };
  serviceScope: object;
  sdks: { microsoftTeams?: { teamsJs: ITeamsJs } };
  propertyPane: {
    open: jest.Mock;
    refresh: jest.Mock;
    isPropertyPaneOpen: jest.Mock<boolean, []>;
  };
}

let instanceCount = 0;

class BaseClientSideWebPartDouble {
  public readonly domElement: HTMLElement = document.createElement('div');
  public properties: Record<string, unknown> = {};
  public displayMode: number = DISPLAY_MODE.Edit;
  public readonly context: IContextDouble = {
    instanceId: `webpart-${++instanceCount}`,
    manifest: { version: '1.2.3' },
    serviceScope: {},
    sdks: {},
    propertyPane: { open: jest.fn(), refresh: jest.fn(), isPropertyPaneOpen: jest.fn(() => false) }
  };

  protected onInit(): Promise<void> {
    return Promise.resolve();
  }

  protected onDispose(): void {
    // SharePoint's base class releases its own resources here — nothing to stand in for
  }
}

/** `BaseClientSideWebPart` with the members the web part uses. */
export const webPartBaseDouble = { BaseClientSideWebPart: BaseClientSideWebPartDouble };

/** The web part as a test drives it: the lifecycle methods SharePoint calls are public here. */
export interface IWebPartHarness {
  readonly domElement: HTMLElement;
  readonly context: IContextDouble;
  properties: Record<string, unknown>;
  displayMode: number;
  render(): void;
  onInit(): Promise<void>;
  onDispose(): void;
  onDisplayModeChanged(): void;
  onThemeChanged(theme: unknown): void;
  getPropertyPaneConfiguration(): IPropertyPaneConfiguration;
  onPropertyPaneFieldChanged(propertyPath: string): void;
}

/** How `startWebPart` sets the web part up. */
export interface IStartOptions {
  /** `DISPLAY_MODE.Edit` by default. */
  displayMode?: number;
  /** Hosts the web part in a Teams tab with this TeamsJS. */
  teamsJs?: ITeamsJs;
}

const startedWebParts: IWebPartHarness[] = [];

/**
 * Creates the web part as SharePoint does — properties first, then `onInit` and the first
 * `render()` — with its element in the document, where focus works. `disposeWebParts` removes it.
 */
export async function startWebPart(
  webPartClass: new () => object,
  properties: Record<string, unknown>,
  options: IStartOptions = {}
): Promise<IWebPartHarness> {
  const webPart = new webPartClass() as IWebPartHarness;
  webPart.properties = properties;
  webPart.displayMode = options.displayMode ?? DISPLAY_MODE.Edit;
  if (options.teamsJs) {
    webPart.context.sdks.microsoftTeams = { teamsJs: options.teamsJs };
  }
  document.body.appendChild(webPart.domElement);
  startedWebParts.push(webPart);
  await webPart.onInit();
  webPart.render();
  return webPart;
}

/** Disposes every web part `startWebPart` created and takes it out of the document. */
export function disposeWebParts(): void {
  startedWebParts.splice(0).forEach((webPart) => {
    webPart.onDispose();
    webPart.domElement.remove();
  });
}

// --- What jsdom lacks -------------------------------------------------------------------

/** Installs a minimal `showModal`/`close` on `<dialog>` (incomplete in jsdom); returns the undo. */
export function installDialogStandIn(): () => void {
  const prototype = HTMLDialogElement.prototype as unknown as { showModal?: () => void; close?: () => void };
  const original = { showModal: prototype.showModal, close: prototype.close };
  prototype.showModal = function (this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  prototype.close = function (this: HTMLDialogElement): void {
    this.removeAttribute('open');
  };
  return () => {
    prototype.showModal = original.showModal;
    prototype.close = original.close;
  };
}

/** jsdom loads no images: gives the image a natural size and fires `load`. */
export function loadImage(
  image: HTMLImageElement,
  size: { width: number; height: number } = { width: 720, height: 457 }
): void {
  Object.defineProperty(image, 'naturalWidth', { value: size.width, configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: size.height, configurable: true });
  image.dispatchEvent(new Event('load'));
}

/** Reports a policy violation for images from `blockedURI` on the document, as browsers do. */
export function reportImageViolation(blockedURI: string): void {
  const event = new Event('securitypolicyviolation');
  Object.defineProperty(event, 'blockedURI', { value: blockedURI });
  Object.defineProperty(event, 'effectiveDirective', { value: 'img-src' });
  document.dispatchEvent(event);
}
