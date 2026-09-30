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
