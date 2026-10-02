import type { IDiagramLink } from '../../providers/types';
import { DEFAULT_BACKGROUND } from './background';
import { isOn, isOnByDefault, readAlign, readBackground, readDimension, readSettings, readText } from './settings';
import type { SettingsStrings } from './settings';
import { diagramStyles } from './sizing';

// Placeholder link — real model ids and keys never enter the repository.
const MODEL = '0123456789abcdef0123456789abcdef';
const LINK: IDiagramLink = {
  providerId: 'signavio',
  modelId: MODEL,
  imageUrl: `https://editor.signavio.com/p/model/${MODEL}/png?inline&authkey=${'ab12'.repeat(16)}`,
  hubUrl: `https://editor.signavio.com/p/portal#/model/${MODEL}`
};

const STRINGS: SettingsStrings = {
  DefaultAltText: 'Process diagram',
  HubLinkDefaultText: 'Open in Signavio',
  NewTabHint: '(opens in a new tab)'
};

/** Values page data can hold instead of the expected type. */
const WRONG_TYPES: unknown[] = [null, 42, NaN, true, {}, [], ['text'], { toString: (): string => 'text' }];

describe('readText', () => {
  it('trims ordinary text and keeps everything else', () => {
    expect(readText('  Order-to-cash ')).toBe('Order-to-cash');
    expect(readText('Auftrag → Rechnung (DE/FR/ES)')).toBe('Auftrag → Rechnung (DE/FR/ES)');
  });

  it.each(WRONG_TYPES.map((value) => [value]))('reads the non-string %p as empty', (value) => {
    expect(readText(value)).toBe('');
  });

  it('keeps markup as plain text — escaping is the renderers’ job (DOM APIs only)', () => {
    expect(readText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });

  it('removes control characters and direction overrides that hide or reverse text', () => {
    expect(readText('Order\u0000 process\u0007')).toBe('Order process');
    expect(readText('\u202eOrder\u202c process')).toBe('Order process');
    expect(readText('\u2066Order\u2069')).toBe('Order');
    expect(readText('a\u0085b\u009fc')).toBe('abc');
  });

  it('keeps marks and joiners that real text needs', () => {
    expect(readText('Teil\u00adprozess')).toBe('Teil\u00adprozess');
    expect(readText('\u200fשלום\u200f')).toBe('\u200fשלום\u200f');
    expect(readText('👩\u200d💻 Team')).toBe('👩\u200d💻 Team');
  });

  it.each([
    ['zero-width space', '\u200b'],
    ['zero-width joiners and marks', '\u200c\u200d\u200e\u200f'],
    ['byte order mark and word joiner', '\ufeff\u2060'],
    ['soft hyphen', '\u00ad'],
    ['direction override only', '\u202e\u202c'],
    ['null characters', '\u0000\u0000'],
    ['whitespace mix', ' \t\u00a0\u3000 ']
  ])('reads text made only of invisible characters (%s) as empty', (_label, value) => {
    expect(readText(value)).toBe('');
  });
});

describe('toggles', () => {
  it('isOn: only an explicit true switches on (default off)', () => {
    expect(isOn(true)).toBe(true);
    [undefined, false, 'true', 1, {}, [true], null].forEach((value) => expect(isOn(value)).toBe(false));
  });

  it('isOnByDefault: only an explicit false switches off (default on)', () => {
    expect(isOnByDefault(false)).toBe(false);
    [undefined, true, 'false', 0, null, {}].forEach((value) => expect(isOnByDefault(value)).toBe(true));
  });
});

describe('readDimension', () => {
  it('reads valid values', () => {
    expect(readDimension('800', 'width')).toEqual({ kind: 'px', value: 800 });
    expect(readDimension('50%', 'width')).toEqual({ kind: 'percent', value: 50 });
  });

  it.each([['50%'], ['0'], ['800;background:url(https://example.com/x)'], ['calc(100% + 1px)'], ['abc']])(
    'reads the invalid height %p as automatic',
    (value) => {
      expect(readDimension(value, 'height')).toEqual({ kind: 'auto' });
    }
  );

  it.each(WRONG_TYPES.map((value) => [value]))('reads the non-string %p as automatic', (value) => {
    expect(readDimension(value, 'width')).toEqual({ kind: 'auto' });
  });
});

describe('readAlign', () => {
  it('falls back per setting: diagram and caption centred, hub link right', () => {
    expect(readAlign({}, 'diagramAlign')).toBe('center');
    expect(readAlign({ diagramAlign: 'right' }, 'diagramAlign')).toBe('right');
    expect(readAlign({}, 'captionAlign')).toBe('center');
    expect(readAlign({}, 'hubLinkAlign')).toBe('right');
    expect(readAlign({ captionAlign: 'left', hubLinkAlign: 'center' }, 'captionAlign')).toBe('left');
    expect(readAlign({ captionAlign: 'left', hubLinkAlign: 'center' }, 'hubLinkAlign')).toBe('center');
  });

  it.each([['left;color:red'], ['__proto__'], [['left']], [{ toString: (): string => 'left' }]])(
    'ignores the hostile value %p',
    (value) => {
      expect(readAlign({ captionAlign: value }, 'captionAlign')).toBe('center');
      expect(readAlign({ diagramAlign: value }, 'diagramAlign')).toBe('center');
    }
  );
});

describe('readBackground', () => {
  it('is on and white by default — also for web parts saved before the setting existed', () => {
    expect(readBackground({})).toBe(DEFAULT_BACKGROUND);
  });

  it('is off only for an explicit false', () => {
    expect(readBackground({ showBackground: false, backgroundColor: '#000000' })).toBeUndefined();
    expect(readBackground({ showBackground: 'false', backgroundColor: '#0E5A73' })).toBe('#0e5a73');
  });

  it.each([['#ffffff;background:url(https://example.com/x)'], ['red'], [{ toString: (): string => '#000000' }]])(
    'uses white for the colour %p',
    (value) => {
      expect(readBackground({ backgroundColor: value })).toBe(DEFAULT_BACKGROUND);
    }
  );
});

describe('readSettings', () => {
  it('applies every default to empty settings', () => {
    expect(readSettings({}, LINK, STRINGS)).toEqual({
      diagram: {
        style: diagramStyles({ kind: 'auto' }, { kind: 'auto' }, 'center'),
        altText: 'Process diagram',
        caption: '',
        captionAlign: 'center',
        hubLink: undefined,
        background: DEFAULT_BACKGROUND
      },
      offerZoom: false,
      offerFullScreen: true
    });
  });

  it('derives the hub link from the validated link, never from the settings', () => {
    const settings = readSettings(
      { showHubLink: true, hubLinkText: ' Details ', hubLinkPosition: 'overlay', hubLinkAlign: 'left' },
      LINK,
      STRINGS
    );
    expect(settings.diagram.hubLink).toEqual({
      url: LINK.hubUrl,
      text: 'Details',
      position: 'overlay',
      align: 'left',
      newTabHint: '(opens in a new tab)'
    });
  });

  it('offers no hub link without a link, without a hub URL or unless switched on with true', () => {
    expect(readSettings({ showHubLink: true }, undefined, STRINGS).diagram.hubLink).toBeUndefined();
    expect(
      readSettings({ showHubLink: true }, { ...LINK, hubUrl: undefined }, STRINGS).diagram.hubLink
    ).toBeUndefined();
    expect(readSettings({ showHubLink: 'true' }, LINK, STRINGS).diagram.hubLink).toBeUndefined();
  });

  it('falls back to the default texts for empty-looking link and alt texts', () => {
    const settings = readSettings(
      { showHubLink: true, hubLinkText: '\u200b', altText: '\u202e \ufeff' },
      LINK,
      STRINGS
    );
    expect(settings.diagram.hubLink?.text).toBe('Open in Signavio');
    expect(settings.diagram.altText).toBe('Process diagram');
  });

  it('switches zoom on and full screen off only with real booleans', () => {
    expect(readSettings({ offerZoom: true, offerFullScreen: false }, LINK, STRINGS)).toMatchObject({
      offerZoom: true,
      offerFullScreen: false
    });
    expect(readSettings({ offerZoom: 'true', offerFullScreen: 'false' }, LINK, STRINGS)).toMatchObject({
      offerZoom: false,
      offerFullScreen: true
    });
  });
});

describe('readSettings — diagram alignment', () => {
  it('centres the diagram by default — also for web parts saved before the setting existed', () => {
    const { frame } = readSettings({ width: '400' }, LINK, STRINGS).diagram.style;
    expect(frame['margin-left']).toBe('auto');
    expect(frame['margin-right']).toBe('auto');
  });

  it('puts the diagram to the left or right on request', () => {
    expect(readSettings({ diagramAlign: 'left' }, LINK, STRINGS).diagram.style.frame['margin-left']).toBe('0');
    expect(readSettings({ diagramAlign: 'right' }, LINK, STRINGS).diagram.style.frame['margin-right']).toBe('0');
  });
});
