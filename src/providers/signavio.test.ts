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
    expect(SIGNAVIO_HOSTS).toHaveLength(7);
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
