import { LINK_ERROR_KEYS } from './linkErrors';
import { dimensionErrorKey } from './sizing';
import type { DimensionError, DimensionField } from './sizing';
import type { LinkErrorCode } from '../../providers/types';

type StringsFactory = () => Record<string, unknown>;

/**
 * Loads the AMD locale module `loc/en-us.js` by providing a minimal `define`. Call once:
 * Jest caches the module, so a second load would not run `define` again.
 */
function loadEnUsStrings(): Record<string, unknown> {
  let strings: Record<string, unknown> = {};
  const host = globalThis as unknown as { define?: (deps: string[], factory: StringsFactory) => void };
  host.define = (_deps: string[], factory: StringsFactory) => {
    strings = factory();
  };
  try {
    jest.requireActual('./loc/en-us.js');
  } finally {
    delete host.define;
  }
  return strings;
}

const enUs = loadEnUsStrings();

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

  it('points wrong-input codes to the "Simple image" tab', () => {
    const strings = enUs;
    expect(strings[LINK_ERROR_KEYS.embedCode]).toContain('"Simple image"');
    expect(strings[LINK_ERROR_KEYS.notImageLink]).toContain('"Simple image"');
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
  NotConfiguredMessage: true,
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
  AccessibilityGroupName: true,
  AltTextLabel: true,
  AltTextDescription: true,
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

describe('loc/en-us.js completeness', () => {
  it('has a non-empty text for every key declared in mystrings.d.ts', () => {
    (Object.keys(ALL_STRING_KEYS) as (keyof IProcViewWebPartStrings)[]).forEach((key) => {
      expect(typeof enUs[key]).toBe('string');
      expect((enUs[key] as string).trim()).not.toBe('');
    });
  });
});
