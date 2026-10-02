import { LINK_ERROR_KEYS } from './linkErrors';
import { dimensionErrorKey } from './sizing';
import type { DimensionError, DimensionField } from './sizing';
import type { LinkErrorCode } from '../../providers/types';

type StringsFactory = () => Record<string, unknown>;

/** Every language file in `loc/` — a new language file must be added here. */
const LOCALES = ['en-us', 'de-de', 'fr-fr', 'es-es'] as const;
type Locale = (typeof LOCALES)[number];

/**
 * Loads the AMD locale module `loc/<locale>.js` by providing a minimal `define`. Call once
 * per locale: Jest caches the module, so a second load would not run `define` again.
 */
function loadStrings(locale: Locale): Record<string, unknown> {
  let strings: Record<string, unknown> = {};
  const host = globalThis as unknown as { define?: (deps: string[], factory: StringsFactory) => void };
  host.define = (_deps: string[], factory: StringsFactory) => {
    strings = factory();
  };
  try {
    jest.requireActual(`./loc/${locale}.js`);
  } finally {
    delete host.define;
  }
  return strings;
}

const STRINGS = LOCALES.reduce(
  (all, locale) => {
    all[locale] = loadStrings(locale);
    return all;
  },
  {} as Record<Locale, Record<string, unknown>>
);
const enUs = STRINGS['en-us'];

/** The Signavio tab with the image link, as the Signavio UI names it in each language. */
const SIMPLE_IMAGE_TAB: Record<Locale, string> = {
  'en-us': '"Simple image"',
  'de-de': '„Einfaches Bild“',
  // French typography: no-break spaces (U+00A0) inside the guillemets
  'fr-fr': '«\u00a0Image simple\u00a0»',
  // No Spanish Signavio documentation found — the English label is used (owner decision)
  'es-es': '«Simple image»'
};

const ALL_CODES: LinkErrorCode[] = [
  'empty',
  'unsupported',
  'notUrl',
  'notHttps',
  'unknownHost',
  'embedCode',
  'notImageLink',
  'missingAuthKey',
  'invalidModelId',
  'invalidAuthKey'
];

describe('LINK_ERROR_KEYS', () => {
  it('maps every link error code', () => {
    expect(Object.keys(LINK_ERROR_KEYS).sort()).toEqual([...ALL_CODES].sort());
  });

  it('uses a distinct string for every code', () => {
    const keys = ALL_CODES.map((code) => LINK_ERROR_KEYS[code]);
    expect(new Set(keys).size).toBe(ALL_CODES.length);
  });

  it.each(LOCALES)('points wrong-input codes to the "Simple image" tab (%s)', (locale) => {
    const strings = STRINGS[locale];
    expect(strings[LINK_ERROR_KEYS.embedCode]).toContain(SIMPLE_IMAGE_TAB[locale]);
    expect(strings[LINK_ERROR_KEYS.notImageLink]).toContain(SIMPLE_IMAGE_TAB[locale]);
  });
});

describe('loc/en-us.js', () => {
  it('has a non-empty text for every key the messages use', () => {
    const strings = enUs;
    const errors: DimensionError[] = ['invalid', 'tooLarge', 'percentNotAllowed', 'percentOutOfRange'];
    const fields: DimensionField[] = ['width', 'height'];
    const usedKeys = [
      ...ALL_CODES.map((code) => LINK_ERROR_KEYS[code]),
      ...errors.reduce<string[]>(
        (keys, error) => keys.concat(fields.map((field) => dimensionErrorKey(error, field))),
        []
      )
    ];

    usedKeys.forEach((key) => {
      expect(typeof strings[key]).toBe('string');
      expect((strings[key] as string).trim()).not.toBe('');
    });
  });
});

/** Every key of `IProcViewWebPartStrings` — the type makes this list complete. */
const ALL_STRING_KEYS: Record<keyof IProcViewWebPartStrings, true> = {
  PropertyPaneDescription: true,
  DefaultAltText: true,
  DiagramGroupName: true,
  ImageLinkLabel: true,
  ImageLinkDescription: true,
  NaturalSizeKnown: true,
  NaturalSizeUnknown: true,
  CaptionGroupName: true,
  CaptionLabel: true,
  CaptionDescription: true,
  CaptionAlignLabel: true,
  AlignLeft: true,
  AlignCenter: true,
  AlignRight: true,
  HubLinkGroupName: true,
  ShowHubLinkLabel: true,
  ToggleOn: true,
  ToggleOff: true,
  HubLinkTextLabel: true,
  HubLinkTextDescription: true,
  HubLinkDefaultText: true,
  HubLinkAlignLabel: true,
  HubLinkPositionLabel: true,
  PositionBelow: true,
  PositionOverlay: true,
  NewTabHint: true,
  MessageNoLinkTitle: true,
  MessageNoLinkBody: true,
  MessageInvalidLinkTitle: true,
  MessageUnavailableReader: true,
  MessageLoadFailedTitle: true,
  MessageLoadFailedCauses: true,
  MessageLoadFailedReader: true,
  CauseSharingRevoked: true,
  CauseLinkIncorrect: true,
  CauseDomainBlocked: true,
  MessageBlockedTitle: true,
  MessageBlockedBody: true,
  ConfigureButton: true,
  SizeGroupName: true,
  WidthLabel: true,
  WidthDescription: true,
  HeightLabel: true,
  HeightDescription: true,
  DiagramAlignLabel: true,
  ViewingGroupName: true,
  OfferZoomLabel: true,
  OfferFullScreenLabel: true,
  ShowBackgroundLabel: true,
  BackgroundColorLabel: true,
  FullScreen: true,
  CloseFullScreen: true,
  ZoomIn: true,
  ZoomOut: true,
  ZoomReset: true,
  ZoomViewportLabel: true,
  AltTextLabel: true,
  AltTextDescription: true,
  AboutGroupName: true,
  RepositoryLinkText: true,
  LinkErrorEmpty: true,
  LinkErrorUnsupported: true,
  LinkErrorNotUrl: true,
  LinkErrorNotHttps: true,
  LinkErrorUnknownHost: true,
  LinkErrorEmbedCode: true,
  LinkErrorNotImageLink: true,
  LinkErrorMissingAuthKey: true,
  LinkErrorInvalidModelId: true,
  LinkErrorInvalidAuthKey: true,
  DimensionErrorInvalidWidth: true,
  DimensionErrorInvalidHeight: true,
  DimensionErrorTooLarge: true,
  DimensionErrorPercentOutOfRange: true,
  DimensionErrorPercentHeight: true
};

const DECLARED_KEYS = Object.keys(ALL_STRING_KEYS) as (keyof IProcViewWebPartStrings)[];

/** The `{0}`, `{1}` … placeholders of a text, sorted. */
function placeholders(text: string): string[] {
  return (text.match(/\{\d+\}/g) || []).sort();
}

describe.each(LOCALES)('loc/%s.js', (locale) => {
  const strings = STRINGS[locale];

  it('has a non-empty text for every key declared in mystrings.d.ts', () => {
    DECLARED_KEYS.forEach((key) => {
      expect(typeof strings[key]).toBe('string');
      expect((strings[key] as string).trim()).not.toBe('');
    });
  });

  it('has no keys beyond mystrings.d.ts (catches typos)', () => {
    expect(Object.keys(strings).sort()).toEqual([...DECLARED_KEYS].sort());
  });

  it('keeps the placeholders of the English text', () => {
    DECLARED_KEYS.forEach((key) => {
      expect({ key, placeholders: placeholders(strings[key] as string) }).toEqual({
        key,
        placeholders: placeholders(enUs[key] as string)
      });
    });
  });

  it('names the default texts in the "empty" hints', () => {
    expect(strings.HubLinkTextDescription).toContain(strings.HubLinkDefaultText as string);
    expect(strings.AltTextDescription).toContain(strings.DefaultAltText as string);
  });
});
