import type { IProcessToolProvider, LinkParseResult } from './types';

/** Providers the web part asks, in order. Signavio is registered in F-001b. */
export const defaultProviders: readonly IProcessToolProvider[] = [];

/**
 * Turns editor input into a validated diagram link. Trims the input, rejects empty
 * input and asks each provider in turn; the first provider that claims the input
 * decides the result.
 */
export function parseDiagramLink(
  input: string | undefined,
  providers: readonly IProcessToolProvider[] = defaultProviders
): LinkParseResult {
  const trimmed = (input ?? '').trim();
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
