import { MESSAGE_KEYS, format, outcomeFor, resolveMessage, resolveState } from './messages';
import type { DiagramState, ILoadError, IMessageModel, Outcome } from './messages';
import type { IDiagramLink, LinkParseResult } from '../../providers/types';

// Placeholder link — real model ids and keys never enter the repository.
const IMAGE_URL = `https://editor.signavio.com/p/model/0123456789abcdef0123456789abcdef/png?inline&authkey=${'ab12'.repeat(16)}`;
const LINK: IDiagramLink = { providerId: 'signavio', modelId: '0123456789abcdef0123456789abcdef', imageUrl: IMAGE_URL };
const OK: LinkParseResult = { ok: true, link: LINK };

function messageOf(outcome: Outcome): IMessageModel {
  if (outcome.kind !== 'message') {
    throw new Error(`expected a message, got ${outcome.kind}`);
  }
  return outcome.message;
}

describe('resolveState', () => {
  it('maps an empty link to noLink and other link errors to invalidLink', () => {
    expect(resolveState({ ok: false, error: 'empty' }, undefined)).toEqual({ kind: 'noLink' });
    expect(resolveState({ ok: false, error: 'embedCode' }, undefined)).toEqual({
      kind: 'invalidLink',
      error: 'embedCode'
    });
  });

  it('is ok for a valid link without a load error', () => {
    expect(resolveState(OK, undefined)).toEqual({ kind: 'ok', link: LINK });
  });

  it('reports load failures and blocks for the same image URL', () => {
    expect(resolveState(OK, { imageUrl: IMAGE_URL, cause: 'failed' })).toEqual({ kind: 'loadFailed' });
    expect(resolveState(OK, { imageUrl: IMAGE_URL, cause: 'blocked' })).toEqual({
      kind: 'blocked',
      host: 'editor.signavio.com'
    });
  });

  it('ignores a load error that belongs to a previous link', () => {
    const stale: ILoadError = { imageUrl: 'https://app-us.signavio.com/p/model/x/png', cause: 'failed' };
    expect(resolveState(OK, stale)).toEqual({ kind: 'ok', link: LINK });
  });

  it('lets link errors win over a stored load error', () => {
    expect(resolveState({ ok: false, error: 'notHttps' }, { imageUrl: IMAGE_URL, cause: 'blocked' })).toEqual({
      kind: 'invalidLink',
      error: 'notHttps'
    });
  });
});

describe('outcomeFor — the state table', () => {
  it('renders the diagram when everything is fine, in both modes', () => {
    expect(outcomeFor({ kind: 'ok', link: LINK }, true)).toEqual({ kind: 'diagram', link: LINK });
    expect(outcomeFor({ kind: 'ok', link: LINK }, false)).toEqual({ kind: 'diagram', link: LINK });
  });

  it('no link — editors: guidance and Configure', () => {
    const message = messageOf(outcomeFor({ kind: 'noLink' }, true));
    expect(message).toMatchObject({
      tone: 'info',
      titleKey: 'MessageNoLinkTitle',
      bodyKey: 'MessageNoLinkBody',
      showConfigure: true,
      showHubLink: false
    });
  });

  it('no link — readers: nothing', () => {
    expect(outcomeFor({ kind: 'noLink' }, false)).toEqual({ kind: 'nothing' });
  });

  it('invalid link — editors: the specific link error and Configure', () => {
    const message = messageOf(outcomeFor({ kind: 'invalidLink', error: 'embedCode' }, true));
    expect(message).toMatchObject({
      tone: 'error',
      titleKey: 'MessageInvalidLinkTitle',
      bodyKey: 'LinkErrorEmbedCode',
      showConfigure: true
    });
  });

  it('invalid link — readers: a short neutral message', () => {
    const message = messageOf(outcomeFor({ kind: 'invalidLink', error: 'embedCode' }, false));
    expect(message).toMatchObject({ bodyKey: 'MessageUnavailableReader', showConfigure: false, showHubLink: false });
    expect(message.titleKey).toBeUndefined();
  });

  it('load failed — editors: the likely causes incl. a blocked domain', () => {
    const message = messageOf(outcomeFor({ kind: 'loadFailed' }, true));
    expect(message).toMatchObject({
      titleKey: 'MessageLoadFailedTitle',
      bodyKey: 'MessageLoadFailedCauses',
      detailKeys: ['CauseSharingRevoked', 'CauseLinkIncorrect', 'CauseDomainBlocked'],
      showConfigure: true
    });
  });

  it('load failed — readers: short message plus hub link', () => {
    const message = messageOf(outcomeFor({ kind: 'loadFailed' }, false));
    expect(message).toMatchObject({ bodyKey: 'MessageLoadFailedReader', showHubLink: true, showConfigure: false });
  });

  it('blocked — editors: domain named, pointing to the SharePoint administrator', () => {
    const message = messageOf(outcomeFor({ kind: 'blocked', host: 'editor.signavio.com' }, true));
    expect(message).toMatchObject({
      titleKey: 'MessageBlockedTitle',
      bodyKey: 'MessageBlockedBody',
      params: ['editor.signavio.com'],
      showConfigure: false
    });
  });

  it('blocked — readers: same as a failed load', () => {
    const blocked: DiagramState = { kind: 'blocked', host: 'editor.signavio.com' };
    expect(outcomeFor(blocked, false)).toEqual(outcomeFor({ kind: 'loadFailed' }, false));
  });
});

describe('resolveMessage', () => {
  const strings = {
    MessageBlockedTitle: 'Images from {0} are blocked',
    MessageBlockedBody: 'Allow {0}, please — {0}.',
    CauseSharingRevoked: 'A',
    MessageLoadFailedCauses: 'Causes:'
  } as unknown as IProcViewWebPartStrings;

  it('resolves keys and replaces every {0}', () => {
    const texts = resolveMessage(messageOf(outcomeFor({ kind: 'blocked', host: 'x.example.com' }, true)), strings);
    expect(texts.title).toBe('Images from x.example.com are blocked');
    expect(texts.body).toBe('Allow x.example.com, please — x.example.com.');
    expect(texts.details).toEqual([]);
  });

  it('keeps the title undefined when the message has none', () => {
    const model: IMessageModel = {
      tone: 'error',
      bodyKey: 'MessageLoadFailedCauses',
      detailKeys: ['CauseSharingRevoked'],
      params: [],
      showConfigure: false,
      showHubLink: false
    };
    expect(resolveMessage(model, strings)).toEqual({
      tone: 'error',
      title: undefined,
      body: 'Causes:',
      details: ['A'],
      showConfigure: false,
      showHubLink: false
    });
  });
});

describe('format', () => {
  it('replaces every occurrence of each placeholder', () => {
    expect(format('{0} × {1} ({0})', ['720', '457'])).toBe('720 × 457 (720)');
  });

  it('inserts values literally — replacement patterns and markup stay text', () => {
    expect(format('Host: {0}', ["$&$`$'<img src=x onerror=alert(1)>"])).toBe(
      "Host: $&$`$'<img src=x onerror=alert(1)>"
    );
  });
});

describe('MESSAGE_KEYS', () => {
  it('lists every key the state table uses', () => {
    const states: DiagramState[] = [
      { kind: 'noLink' },
      { kind: 'loadFailed' },
      { kind: 'blocked', host: 'h' },
      { kind: 'invalidLink', error: 'empty' }
    ];
    const used = new Set<string>();
    states.forEach((state) =>
      [true, false].forEach((edit) => {
        const outcome = outcomeFor(state, edit);
        if (outcome.kind === 'message') {
          const m = outcome.message;
          [m.titleKey, m.bodyKey, ...m.detailKeys].forEach((key) => key && used.add(key));
        }
      })
    );
    used.delete('LinkErrorEmpty');
    used.forEach((key) => expect(MESSAGE_KEYS).toContain(key));
  });
});
