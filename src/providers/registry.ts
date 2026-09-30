import { signavioProvider } from './signavio';
import type { IProcessToolProvider, LinkParseResult } from './types';

/** Providers the web part asks, in order. */
export const defaultProviders: readonly IProcessToolProvider[] = [signavioProvider];

/**
 * Turns editor input into a validated diagram link. Trims the input, rejects empty
 * input and asks each provider in turn; the first provider that claims the input
 * decides the result. Web part properties are untrusted data — anything that is not a
 * string counts as empty.
 */
export function parseDiagramLink(
  input: unknown,
  providers: readonly IProcessToolProvider[] = defaultProviders
): LinkParseResult {
  const trimmed = typeof input === 'string' ? input.trim() : '';
  if (trimmed === '') {
    return { ok: false, error: 'empty' };
  }

  for (const provider of providers) {
    const result = provider.parse(trimmed);
    if (result !== undefined) {
      return result;
    }
  }

  return { ok: false, error: 'unsupported' };
}
