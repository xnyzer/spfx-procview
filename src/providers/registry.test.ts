import { parseDiagramLink } from './registry';
import type { IProcessToolProvider, LinkParseResult } from './types';

/** Stub that claims every input starting with its prefix. */
function stubProvider(id: string, prefix: string, result: LinkParseResult): IProcessToolProvider {
  return {
    id,
    parse: (input: string) => (input.indexOf(prefix) === 0 ? result : undefined)
  };
}

const okResult: LinkParseResult = {
  ok: true,
  link: { providerId: 'alpha', modelId: 'm1', imageUrl: 'https://alpha.example.com/m1.png' }
};
const failResult: LinkParseResult = { ok: false, error: 'invalidModelId' };

describe('parseDiagramLink', () => {
  const providers = [stubProvider('alpha', 'alpha:', okResult), stubProvider('beta', 'beta:', failResult)];

  it('rejects undefined, empty and whitespace-only input as empty', () => {
    expect(parseDiagramLink(undefined, providers)).toEqual({ ok: false, error: 'empty' });
    expect(parseDiagramLink('', providers)).toEqual({ ok: false, error: 'empty' });
    expect(parseDiagramLink('  \n\t ', providers)).toEqual({ ok: false, error: 'empty' });
  });

  it('treats values that are not strings as empty (untrusted property data)', () => {
    const nonStrings: unknown[] = [null, 42, true, {}, ['alpha:x'], { toString: (): string => 'alpha:x' }];
    nonStrings.forEach((value) => {
      expect(parseDiagramLink(value, providers)).toEqual({ ok: false, error: 'empty' });
    });
  });

  it('reports unsupported when no provider claims the input', () => {
    expect(parseDiagramLink('https://unknown.example.com/diagram.png', providers)).toEqual({
      ok: false,
      error: 'unsupported'
    });
  });

  it('reports unsupported when no providers are registered', () => {
    expect(parseDiagramLink('alpha:anything', [])).toEqual({ ok: false, error: 'unsupported' });
  });

  it('returns the result of the provider that claims the input', () => {
    expect(parseDiagramLink('alpha:x', providers)).toBe(okResult);
    expect(parseDiagramLink('beta:x', providers)).toBe(failResult);
  });

  it('passes trimmed input to the providers', () => {
    const seen: string[] = [];
    const recorder: IProcessToolProvider = {
      id: 'recorder',
      parse: (input: string) => {
        seen.push(input);
        return undefined;
      }
    };
    parseDiagramLink('  alpha:x \n', [recorder]);
    expect(seen).toEqual(['alpha:x']);
  });

  it('asks providers in order and stops at the first claim', () => {
    const second = stubProvider('second', 'alpha:', failResult);
    expect(parseDiagramLink('alpha:x', [providers[0], second])).toBe(okResult);
  });
});

describe('parseDiagramLink — provider output is checked (fail closed)', () => {
  // Assembled so the linter's no-script-url rule does not flag the hostile test input
  const scriptUrl = ['java', 'script:alert(1)'].join('');

  function claimWith(imageUrl: string, hubUrl?: string): LinkParseResult {
    const provider = stubProvider('faulty', 'x:', {
      ok: true,
      link: { providerId: 'faulty', modelId: 'm1', imageUrl, hubUrl }
    });
    return parseDiagramLink('x:anything', [provider]);
  }

  it.each([
    ['a script URL as image', scriptUrl, undefined],
    ['a data URI as image', 'data:image/svg+xml,<svg onload=alert(1)>', undefined],
    ['an http image URL', 'http://alpha.example.com/m1.png', undefined],
    ['a relative image URL', '/m1.png', undefined],
    ['a protocol-relative image URL', '//alpha.example.com/m1.png', undefined],
    ['a script URL as hub link', 'https://alpha.example.com/m1.png', scriptUrl],
    ['an http hub link', 'https://alpha.example.com/m1.png', 'http://alpha.example.com/hub']
  ])('rejects %s as unsupported', (_label, imageUrl, hubUrl) => {
    expect(claimWith(imageUrl, hubUrl)).toEqual({ ok: false, error: 'unsupported' });
  });

  it('accepts https image and hub URLs', () => {
    const result = claimWith('https://alpha.example.com/m1.png', 'https://alpha.example.com/hub#/m1');
    expect(result.ok).toBe(true);
  });
});
