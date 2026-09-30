import { parseTextAlign, renderDiagram } from './renderDiagram';
import type { IDiagramView } from './renderDiagram';
import { imageStyle } from './sizing';
import type { IDiagramLink } from '../../providers/types';

// Placeholder link — real model ids and keys never enter the repository.
const LINK: IDiagramLink = {
  providerId: 'signavio',
  modelId: '0123456789abcdef0123456789abcdef',
  imageUrl: `https://editor.signavio.com/p/model/0123456789abcdef0123456789abcdef/png?inline&authkey=${'ab12'.repeat(16)}`,
  hubUrl: 'https://editor.signavio.com/p/portal#/model/0123456789abcdef0123456789abcdef'
};

function view(overrides: Partial<IDiagramView> = {}): IDiagramView {
  return {
    link: LINK,
    style: imageStyle({ kind: 'percent', value: 50 }, { kind: 'px', value: 600 }),
    altText: 'Order process',
    caption: '',
    captionAlign: 'center',
    placeholderText: 'No process diagram is configured yet.',
    classNames: {
      root: 'root',
      figure: 'figure',
      image: 'image',
      caption: 'caption',
      placeholder: 'placeholder',
      hubLink: 'hubLink',
      hubAnchor: 'hubAnchor',
      srOnly: 'srOnly'
    },
    ...overrides
  };
}

describe('renderDiagram — valid link', () => {
  const root = renderDiagram(document, view());
  const image = root.querySelector('img');

  it('renders exactly one image inside the root section', () => {
    expect(root.tagName).toBe('SECTION');
    expect(root.className).toBe('root');
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(root.querySelector('p')).toBeNull();
  });

  it('uses the rebuilt image URL and the alt text', () => {
    expect(image?.getAttribute('src')).toBe(LINK.imageUrl);
    expect(image?.alt).toBe('Order process');
    expect(image?.className).toBe('image');
  });

  it('sends no referrer and loads lazily', () => {
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
  });

  it('applies the sizing styles', () => {
    expect(image?.style.getPropertyValue('width')).toBe('50%');
    expect(image?.style.getPropertyValue('height')).toBe('600px');
    expect(image?.style.getPropertyValue('max-width')).toBe('100%');
    expect(image?.style.getPropertyValue('object-fit')).toBe('contain');
  });

  it('reports the natural size once the image has loaded', () => {
    const onImageLoad = jest.fn();
    const loaded = renderDiagram(document, view({ onImageLoad })).querySelector('img') as HTMLImageElement;
    Object.defineProperty(loaded, 'naturalWidth', { value: 3193 });
    Object.defineProperty(loaded, 'naturalHeight', { value: 2232 });
    loaded.dispatchEvent(new Event('load'));
    expect(onImageLoad).toHaveBeenCalledWith(3193, 2232);
  });
});

describe('renderDiagram — no valid link', () => {
  it('renders the placeholder text and no image', () => {
    const root = renderDiagram(document, view({ link: undefined }));
    expect(root.querySelector('img')).toBeNull();
    const placeholder = root.querySelector('p');
    expect(placeholder?.className).toBe('placeholder');
    expect(placeholder?.textContent).toBe('No process diagram is configured yet.');
  });

  it('never interprets texts as markup', () => {
    const root = renderDiagram(document, view({ link: undefined, placeholderText: '<img src=x onerror=alert(1)>' }));
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('p')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps markup in the alt text as plain text', () => {
    const image = renderDiagram(document, view({ altText: '"><script>x</script>' })).querySelector('img');
    expect(image?.alt).toBe('"><script>x</script>');
    expect(image?.parentElement?.querySelector('script')).toBeNull();
  });
});

describe('renderDiagram — caption', () => {
  it('wraps the image in a figure and adds no caption when it is empty', () => {
    const root = renderDiagram(document, view());
    const figure = root.querySelector('figure');
    expect(figure?.className).toBe('figure');
    expect(figure?.querySelector('img')).not.toBeNull();
    expect(root.querySelector('figcaption')).toBeNull();
  });

  it.each<['left' | 'center' | 'right']>([['left'], ['center'], ['right']])(
    'renders the caption below the image, aligned %s',
    (align) => {
      const figure = renderDiagram(document, view({ caption: 'Order-to-cash', captionAlign: align })).querySelector(
        'figure'
      );
      const caption = figure?.lastElementChild as HTMLElement;
      expect(caption.tagName).toBe('FIGCAPTION');
      expect(figure?.firstElementChild?.tagName).toBe('IMG');
      expect(caption.textContent).toBe('Order-to-cash');
      expect(caption.className).toBe('caption');
      expect(caption.style.getPropertyValue('text-align')).toBe(align);
    }
  );

  it('keeps markup in the caption as plain text', () => {
    const root = renderDiagram(document, view({ caption: '<b onclick=x>bold</b>' }));
    expect(root.querySelector('figcaption')?.textContent).toBe('<b onclick=x>bold</b>');
    expect(root.querySelector('b')).toBeNull();
  });

  it('shows no caption without a valid link (placeholder only)', () => {
    const root = renderDiagram(document, view({ link: undefined, caption: 'Order-to-cash' }));
    expect(root.querySelector('figcaption')).toBeNull();
  });
});

describe('parseTextAlign', () => {
  it('accepts left, center and right', () => {
    expect(parseTextAlign('left', 'center')).toBe('left');
    expect(parseTextAlign('center', 'right')).toBe('center');
    expect(parseTextAlign('right', 'center')).toBe('right');
  });

  it.each([[undefined], [''], ['justify'], ['LEFT'], [42], [{}]])('falls back for %p', (value) => {
    expect(parseTextAlign(value, 'center')).toBe('center');
    expect(parseTextAlign(value, 'right')).toBe('right');
  });
});

describe('renderDiagram — Collaboration Hub link', () => {
  const HUB = {
    url: LINK.hubUrl as string,
    text: 'Open in Signavio',
    align: 'right' as const,
    newTabHint: '(opens in a new tab)'
  };

  it('renders no link when none is requested', () => {
    expect(renderDiagram(document, view()).querySelector('a')).toBeNull();
  });

  it('renders the link below the diagram and its caption', () => {
    const root = renderDiagram(document, view({ caption: 'Order-to-cash', hubLink: HUB }));
    const children = Array.from(root.children).map((child) => child.tagName);
    expect(children).toEqual(['FIGURE', 'P']);
    expect(root.querySelector('figure')?.lastElementChild?.tagName).toBe('FIGCAPTION');
    expect((root.lastElementChild as HTMLElement).className).toBe('hubLink');
  });

  it('opens the hub URL in a new tab without opener or referrer', () => {
    const anchor = renderDiagram(document, view({ hubLink: HUB })).querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe(LINK.hubUrl);
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
    expect(anchor.className).toBe('hubAnchor');
  });

  it('shows the text, a decorative icon and a screen-reader-only new-tab hint', () => {
    const anchor = renderDiagram(document, view({ hubLink: HUB })).querySelector('a') as HTMLAnchorElement;
    expect(anchor.firstChild?.textContent).toBe('Open in Signavio');
    expect(anchor.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    const hint = anchor.querySelector('span');
    expect(hint?.className).toBe('srOnly');
    expect(hint?.textContent).toBe(' (opens in a new tab)');
    expect(anchor.textContent).toBe('Open in Signavio (opens in a new tab)');
  });

  it.each<['left' | 'center' | 'right']>([['left'], ['center'], ['right']])('aligns the link %s', (align) => {
    const root = renderDiagram(document, view({ hubLink: { ...HUB, align } }));
    expect((root.lastElementChild as HTMLElement).style.getPropertyValue('text-align')).toBe(align);
  });

  it('keeps markup in the link text as plain text', () => {
    const root = renderDiagram(document, view({ hubLink: { ...HUB, text: '<img src=x onerror=alert(1)>' } }));
    expect(root.querySelector('a')?.firstChild?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(root.querySelectorAll('img')).toHaveLength(1);
  });

  it('renders no link without a valid diagram (placeholder only)', () => {
    const root = renderDiagram(document, view({ link: undefined, hubLink: HUB }));
    expect(root.querySelector('a')).toBeNull();
  });
});
