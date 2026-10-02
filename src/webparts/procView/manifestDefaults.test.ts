/**
 * The manifest's initial values against the code fallbacks (audit L56, CLAUDE.md "Defaults"): the
 * property pane selects what is stored, so a new web part must start with exactly the values the
 * code falls back to for pages saved without them. The manifest is read from the source folder as
 * SharePoint's build reads it — JSON with comments, parsed by TypeScript's own parser.
 */

import { normalizeStoredSettings, readPaneSettings, readSettings } from './settings';
import type { SettingsStrings } from './settings';

// Node and TypeScript as far as this test needs them — the web part's compilation has no Node types
interface INodeProcess {
  cwd(): string;
}
interface INodeFs {
  readFileSync(path: string, encoding: 'utf8'): string;
}
interface ITypeScript {
  parseConfigFileTextToJson(fileName: string, jsonText: string): { config?: unknown; error?: unknown };
}

/** The manifest in the source folder; `heft test` runs in the project folder. */
const MANIFEST = `${jest.requireActual<INodeProcess>('process').cwd()}/src/webparts/procView/ProcViewWebPart.manifest.json`;
/** The settings whose initial value the manifest sets — each has a fallback in settings.ts. */
const PROPERTIES_WITH_FALLBACKS = [
  'backgroundColor',
  'captionAlign',
  'diagramAlign',
  'hubLinkAlign',
  'hubLinkPosition',
  'offerFullScreen',
  'offerZoom',
  'showBackground',
  'showHubLink'
];
const STRINGS: SettingsStrings = { DefaultAltText: 'Alt', HubLinkDefaultText: 'Hub', NewTabHint: 'Tab' };

/** The initial values of the manifest's toolbox entry. */
function readInitialValues(): Record<string, unknown> {
  const text = jest.requireActual<INodeFs>('fs').readFileSync(MANIFEST, 'utf8');
  const { config, error } = jest.requireActual<ITypeScript>('typescript').parseConfigFileTextToJson(MANIFEST, text);
  if (error !== undefined || config === undefined) {
    throw new Error(`${MANIFEST} cannot be parsed`);
  }
  return (config as { preconfiguredEntries: { properties: Record<string, unknown> }[] }).preconfiguredEntries[0]
    .properties;
}

describe('the manifest’s initial values', () => {
  const initial = readInitialValues();

  it('set exactly the settings that have a fallback in the code — a misspelled key fails here', () => {
    expect(Object.keys(initial).sort()).toEqual(PROPERTIES_WITH_FALLBACKS);
  });

  it('read back as the defaults of the property pane', () => {
    expect(readPaneSettings(initial)).toEqual(readPaneSettings({}));
  });

  it('read back as the defaults of the page', () => {
    expect(readSettings(initial, undefined, STRINGS)).toEqual(readSettings({}, undefined, STRINGS));
  });

  it('are values the web part keeps as they are', () => {
    expect(normalizeStoredSettings(initial)).toEqual(initial);
  });
});
