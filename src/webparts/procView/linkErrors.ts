import type { LinkErrorCode } from '../../providers/types';

/**
 * `loc/` string key for every link error code. The `Record` type makes a missing code a
 * compile error; the key type makes a missing string in `mystrings.d.ts` a compile error.
 */
export const LINK_ERROR_KEYS: Record<LinkErrorCode, keyof IProcViewWebPartStrings> = {
  empty: 'LinkErrorEmpty',
  unsupported: 'LinkErrorUnsupported',
  notUrl: 'LinkErrorNotUrl',
  notHttps: 'LinkErrorNotHttps',
  unknownHost: 'LinkErrorUnknownHost',
  embedCode: 'LinkErrorEmbedCode',
  notImageLink: 'LinkErrorNotImageLink',
  missingAuthKey: 'LinkErrorMissingAuthKey',
  invalidModelId: 'LinkErrorInvalidModelId',
  invalidAuthKey: 'LinkErrorInvalidAuthKey'
};
