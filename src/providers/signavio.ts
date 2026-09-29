import type { IProcessToolProvider, LinkErrorCode, LinkParseResult } from './types';

/**
 * Hosts that serve shared SAP Signavio links, one per region — verified 2026-09-29 via
 * Signavio/SAP docs, DNS and the `/p/model/…/png` endpoint. Matched exactly: a suffix
 * match would let lookalike hosts through.
 */
export const SIGNAVIO_HOSTS: readonly string[] = [
  'editor.signavio.com', // EU
  'app-us.signavio.com',
  'app-au.signavio.com',
  'app-ca.signavio.com',
  'app-jp.signavio.com',
  'app-kr.signavio.com',
  'app-sgp.signavio.com'
];

const MODEL_ID = /^[0-9a-f]{32}$/i;
// Real keys have been seen with 62 and 64 hex characters — the length is not fixed.
const AUTH_KEY = /^[0-9a-f]{32,128}$/i;
const IMAGE_PATH = /^\/p\/model\/([^/]+)\/png\/?$/;
// The official embed code loads the `signavio.js` mashup and carries an `authToken`.
const EMBED_CODE = /<script|signavio\.js|authToken/i;

function fail(error: LinkErrorCode): LinkParseResult {
  return { ok: false, error };
}

function parseUrl(input: string): URL | undefined {
  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

/**
 * Parses a Signavio "Simple image" link (Share → Embed diagram → tab "Simple image").
 * Claims every input that mentions Signavio, so wrong Signavio input gets a specific
 * error instead of "unsupported". The returned URLs are rebuilt from validated parts —
 * query parameters, fragments and userinfo of the input never reach the output.
 */
function parseSignavioLink(input: string): LinkParseResult | undefined {
  if (!/signavio/i.test(input)) {
    return undefined;
  }
  if (EMBED_CODE.test(input)) {
    return fail('embedCode');
  }

  const url = parseUrl(input);
  if (!url) {
    return fail('notUrl');
  }
  if (url.protocol !== 'https:') {
    return fail('notHttps');
  }
  const host = url.hostname.toLowerCase();
  if (url.username !== '' || url.password !== '' || url.port !== '' || SIGNAVIO_HOSTS.indexOf(host) === -1) {
    return fail('unknownHost');
  }

  const path = IMAGE_PATH.exec(url.pathname);
  if (!path) {
    return fail('notImageLink');
  }
  const modelId = path[1];
  if (!MODEL_ID.test(modelId)) {
    return fail('invalidModelId');
  }

  const authKey = url.searchParams.get('authkey');
  if (!authKey) {
    return fail('missingAuthKey');
  }
  if (!AUTH_KEY.test(authKey)) {
    return fail('invalidAuthKey');
  }

  return {
    ok: true,
    link: {
      providerId: 'signavio',
      modelId,
      imageUrl: `https://${host}/p/model/${modelId}/png?inline&authkey=${authKey}`,
      hubUrl: `https://${host}/p/portal#/model/${modelId}`
    }
  };
}

export const signavioProvider: IProcessToolProvider = {
  id: 'signavio',
  parse: parseSignavioLink
};
