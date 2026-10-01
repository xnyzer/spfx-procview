import { signavioProvider } from './signavio';
import type { IDiagramLink, IProcessToolProvider, LinkParseResult } from './types';

/** Providers the web part asks, in order. */
export const defaultProviders: readonly IProcessToolProvider[] = [signavioProvider];

/**
 * Turns editor input into a validated diagram link. Trims the input, rejects empty
 * input and asks each provider in turn; the first provider that claims the input
 * decides the result. Web part properties are untrusted data — anything that is not a
 * string counts as empty. A provider's link that is not `https:` throughout is rejected as
 * unsupported, whatever the provider claims.
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
      // Fail closed: the renderers use the links as `src`/`href` without further checks
      return result.ok && !hasHttpsLinks(result.link) ? { ok: false, error: 'unsupported' } : result;
    }
  }

  return { ok: false, error: 'unsupported' };
}

/** Whether every URL of a provider's link is an absolute `https:` URL. */
function hasHttpsLinks(link: IDiagramLink): boolean {
  return isHttpsUrl(link.imageUrl) && (link.hubUrl === undefined || isHttpsUrl(link.hubUrl));
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    // Not parseable as an absolute URL — certainly not a safe one
    return false;
  }
}
