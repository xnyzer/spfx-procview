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
