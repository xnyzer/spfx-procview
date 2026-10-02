import { parseDiagramLink } from './registry';
import { SIGNAVIO_HOSTS, signavioProvider } from './signavio';
import type { LinkParseResult } from './types';

// Placeholders only — real model ids and keys never enter the repository.
const MODEL = '0123456789abcdef0123456789abcdef';
// Deliberately low-entropy so secret scanners do not mistake it for a real key
const KEY64 = 'ab12'.repeat(16);
const KEY62 = KEY64.slice(0, 62);

function imageLink(host: string, query: string = `?inline&authkey=${KEY64}`): string {
  return `https://${host}/p/model/${MODEL}/png${query}`;
}

function parse(input: string): LinkParseResult | undefined {
  return signavioProvider.parse(input);
}

function errorOf(input: string): string | undefined {
  const result = parse(input);
  return result && !result.ok ? result.error : undefined;
}

describe('signavioProvider — valid "Simple image" links', () => {
  it.each(SIGNAVIO_HOSTS.map((host) => [host]))('recognises a link on %s', (host) => {
    expect(parse(imageLink(host))).toEqual({
      ok: true,
      link: {
        providerId: 'signavio',
        modelId: MODEL,
        imageUrl: `https://${host}/p/model/${MODEL}/png?inline&authkey=${KEY64}`,
        hubUrl: `https://${host}/p/portal#/model/${MODEL}`
      }
    });
  });

  it('covers exactly the seven verified regional hosts', () => {
    expect([...SIGNAVIO_HOSTS].sort()).toEqual([
      'app-au.signavio.com',
      'app-ca.signavio.com',
      'app-jp.signavio.com',
      'app-kr.signavio.com',
      'app-sgp.signavio.com',
      'app-us.signavio.com',
      'editor.signavio.com'
    ]);
  });

  it('accepts a link without "inline" and adds it to the output', () => {
    const result = parse(imageLink('editor.signavio.com', `?authkey=${KEY64}`));
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });

  it('accepts auth keys of varying length (62 hex characters seen in real links)', () => {
    const result = parse(imageLink('editor.signavio.com', `?inline&authkey=${KEY62}`));
    expect(result && result.ok && result.link.imageUrl).toContain(`authkey=${KEY62}`);
  });

  it('normalises an upper-case host', () => {
    const result = parse(imageLink('EDITOR.SIGNAVIO.COM'));
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });

  it('drops foreign query parameters and fragments from the output', () => {
    const result = parse(imageLink('editor.signavio.com', `?inline&authkey=${KEY64}&onerror=x#frag`));
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });

  it('is found through the registry with surrounding whitespace', () => {
    const result = parseDiagramLink(`  ${imageLink('app-us.signavio.com')}\n`);
    expect(result.ok && result.link.providerId).toBe('signavio');
  });
});

describe('signavioProvider — rejected input', () => {
  it('ignores input that does not mention Signavio (left to other providers)', () => {
    expect(parse('https://example.com/diagram.png')).toBeUndefined();
    expect(parseDiagramLink('https://example.com/diagram.png')).toEqual({ ok: false, error: 'unsupported' });
  });

  it('rejects the official embed code with a hint to the "Simple image" tab', () => {
    const embed =
      '<script type="text/javascript" src="https://editor.signavio.com/mashup/signavio.js"></script>' +
      `<script type="text/plain">{ url: "https://editor.signavio.com/p/model/${MODEL}", authToken: "x_y_z" }</script>`;
    expect(errorOf(embed)).toBe('embedCode');
  });

  it('rejects input that is not a URL', () => {
    expect(errorOf(`editor.signavio.com/p/model/${MODEL}/png?authkey=${KEY64}`)).toBe('notUrl');
    expect(errorOf('signavio diagram')).toBe('notUrl');
  });

  it('rejects non-https schemes', () => {
    expect(errorOf(`http://editor.signavio.com/p/model/${MODEL}/png?inline&authkey=${KEY64}`)).toBe('notHttps');
    // Assembled so the linter's no-script-url rule does not flag the hostile test input
    const scriptUrl = ['java', 'script:alert("signavio")'].join('');
    expect(errorOf(scriptUrl)).toBe('notHttps');
    expect(errorOf(`data:text/html,signavio`)).toBe('notHttps');
  });

  it.each([
    ['a lookalike host with a foreign suffix', 'editor.signavio.com.example.com'],
    ['a lookalike host with a prefix', 'evilsignavio.com'],
    ['the bare domain', 'signavio.com'],
    ['a non-existent regional host', 'app-eu.signavio.com'],
    ['an explicit port', 'editor.signavio.com:8443']
  ])('rejects %s', (_label, host) => {
    expect(errorOf(imageLink(host))).toBe('unknownHost');
  });

  it('rejects the userinfo trick that points to a foreign host', () => {
    expect(errorOf(`https://editor.signavio.com@example.com/p/model/${MODEL}/png?authkey=${KEY64}`)).toBe(
      'unknownHost'
    );
  });

  it('rejects userinfo on an allowed host', () => {
    const credentials = 'user:pass';
    expect(errorOf(`https://${credentials}@editor.signavio.com/p/model/${MODEL}/png?authkey=${KEY64}`)).toBe(
      'unknownHost'
    );
  });

  it.each([
    ['a Collaboration Hub link', `https://editor.signavio.com/p/hub/model/${MODEL}?t=workspace`],
    ['a portal link', `https://editor.signavio.com/p/portal#/model/${MODEL}`],
    ['a model link without /png', `https://editor.signavio.com/p/model/${MODEL}?authkey=${KEY64}`],
    ['an SVG link', `https://editor.signavio.com/p/model/${MODEL}/svg?authkey=${KEY64}`],
    ['a nested path', `https://editor.signavio.com/p/model/${MODEL}/png/extra?authkey=${KEY64}`]
  ])('rejects %s as not an image link', (_label, input) => {
    expect(errorOf(input)).toBe('notImageLink');
  });

  it.each([
    ['too short', MODEL.slice(0, 31)],
    ['too long', `${MODEL}0`],
    ['non-hex', `${MODEL.slice(0, 31)}g`],
    ['percent-encoded', `%30${MODEL.slice(1)}`]
  ])('rejects a model id that is %s', (_label, modelId) => {
    expect(errorOf(`https://editor.signavio.com/p/model/${modelId}/png?authkey=${KEY64}`)).toBe('invalidModelId');
  });

  it('rejects a missing or empty auth key', () => {
    expect(errorOf(imageLink('editor.signavio.com', '?inline'))).toBe('missingAuthKey');
    expect(errorOf(imageLink('editor.signavio.com', '?inline&authkey='))).toBe('missingAuthKey');
    expect(errorOf(imageLink('editor.signavio.com', ''))).toBe('missingAuthKey');
  });

  it.each([
    ['too short', KEY64.slice(0, 31)],
    ['too long', KEY64 + KEY64 + '0'],
    ['non-hex', `${KEY64.slice(0, 63)}g`],
    ['carrying markup', `${KEY64}"><img src=x>`]
  ])('rejects an auth key that is %s', (_label, key) => {
    expect(errorOf(imageLink('editor.signavio.com', `?inline&authkey=${encodeURIComponent(key)}`))).toBe(
      'invalidAuthKey'
    );
  });
});

describe('signavioProvider — hostile input', () => {
  const PATH = `/p/model/${MODEL}/png?inline&authkey=${KEY64}`;
  // Assembled so the linter's no-script-url rule does not flag the hostile test input
  const script = ['java', 'script'].join('');

  it.each([
    ['a mixed-case script scheme', `${['JaVa', 'ScRiPt'].join('')}:alert('signavio')`],
    ['a script scheme with a tab', `java\tscript:alert('signavio')`],
    ['a script scheme behind a control character', `\u0001${script}:alert('signavio')`],
    ['a vbscript scheme', `vbscript:msgbox("signavio")`],
    ['a file URL', `file:///editor.signavio.com${PATH}`],
    ['an http link in upper case', `HTTP://editor.signavio.com${PATH}`]
  ])('rejects %s as not https', (_label, input) => {
    expect(errorOf(input)).toBe('notHttps');
  });

  it.each([
    ['a protocol-relative link', `//editor.signavio.com${PATH}`],
    ['a percent-encoded scheme', `%6A%61%76%61${script.slice(4)}:alert('signavio')`],
    ['a zero-width space in front', `\u200bhttps://editor.signavio.com${PATH}`],
    ['a direction override in front', `\u202ehttps://editor.signavio.com${PATH}`],
    ['a null character in the host', `https://editor.signavio.com\u0000.example.com${PATH}`]
  ])('rejects %s as not a URL', (_label, input) => {
    expect(errorOf(input)).toBe('notUrl');
  });

  it.each([
    ['a trailing dot', 'editor.signavio.com.'],
    ['a homoglyph (Cyrillic i)', 'editor.signavіo.com'],
    ['the punycode of a homoglyph', 'editor.xn--signavo-2bi.com'],
    ['an IPv4 address', '192.0.2.10'],
    ['an IPv6 address', '[2001:db8::1]'],
    ['a foreign host with the allowed host as path', 'example.com/editor.signavio.com']
  ])('rejects %s (through the registry, whichever provider answers)', (_label, host) => {
    const result = parseDiagramLink(`https://${host}${PATH}`);
    expect(result.ok ? 'accepted' : result.error).toMatch(/^(unknownHost|notImageLink|unsupported)$/);
  });

  it('rejects the backslash userinfo trick (foreign host)', () => {
    expect(errorOf(`https://example.com\\@editor.signavio.com${PATH}`)).toBe('unknownHost');
  });

  it('rejects an auth key that is only in the fragment', () => {
    expect(errorOf(`https://editor.signavio.com/p/model/${MODEL}/png?inline#authkey=${KEY64}`)).toBe('missingAuthKey');
  });

  it('rejects an encoded line break after the auth key', () => {
    expect(errorOf(imageLink('editor.signavio.com', `?inline&authkey=${KEY64}%0A`))).toBe('invalidAuthKey');
  });

  it('rejects very long input', () => {
    expect(errorOf(imageLink('editor.signavio.com', `?inline&authkey=${'a'.repeat(100000)}`))).toBe('invalidAuthKey');
    expect(errorOf(`https://editor.signavio.com/p/model/${'0'.repeat(100000)}/png?authkey=${KEY64}`)).toBe(
      'invalidModelId'
    );
  });

  it.each([
    ['fullwidth letters in the host', 'ｅｄｉｔｏｒ.signavio.ｃｏｍ'],
    ['ideographic full stops', 'editor。signavio。com'],
    ['a percent-encoded dot', 'editor%2Esignavio.com'],
    ['the default port', 'editor.signavio.com:443']
  ])('normalises %s to the canonical link (nothing of the input survives)', (_label, host) => {
    const result = parse(`https://${host}${PATH}`);
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });

  it('uses the first of two auth keys and rebuilds the link from it', () => {
    const result = parse(imageLink('editor.signavio.com', `?inline&authkey=${KEY64}&authkey=${KEY62}`));
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });

  it('removes dot segments before checking the path', () => {
    const result = parse(`https://editor.signavio.com/x/../p/model/${MODEL}/png?inline&authkey=${KEY64}`);
    expect(result && result.ok && result.link.imageUrl).toBe(imageLink('editor.signavio.com'));
  });
});
