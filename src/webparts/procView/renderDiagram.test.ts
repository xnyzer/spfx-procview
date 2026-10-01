import { parseHubLinkPosition, parseTextAlign, renderDiagram } from './renderDiagram';
import type { IDiagramView, IDiagramZoom } from './renderDiagram';
import type { IZoomController } from './zoomView';
import { diagramStyles } from './sizing';
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
    style: diagramStyles({ kind: 'percent', value: 50 }, { kind: 'px', value: 600 }),
    altText: 'Order process',
    caption: '',
    captionAlign: 'center',
    placeholderText: 'No process diagram is configured yet.',
    classNames: {
      root: 'root',
      figure: 'figure',
      frame: 'frame',
      image: 'image',
      caption: 'caption',
      placeholder: 'placeholder',
      hubLink: 'hubLink',
      hubAnchor: 'hubAnchor',
      hubOverlay: 'hubOverlay',
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

  it('puts the image into a frame inside the figure', () => {
    const frame = image?.parentElement as HTMLElement;
    expect(frame.tagName).toBe('DIV');
    expect(frame.className).toBe('frame');
    expect(frame.parentElement?.tagName).toBe('FIGURE');
  });

  it('applies the sizing styles to frame and image', () => {
    const frame = image?.parentElement as HTMLElement;
    expect(frame.style.getPropertyValue('width')).toBe('50%');
    expect(frame.style.getPropertyValue('max-width')).toBe('100%');
    expect(image?.style.getPropertyValue('width')).toBe('100%');
    expect(image?.style.getPropertyValue('height')).toBe('600px');
    expect(image?.style.getPropertyValue('max-width')).toBe('100%');
    expect(image?.style.getPropertyValue('object-fit')).toBe('contain');
  });

  it('reports a failed image load', () => {
    const onImageError = jest.fn();
    const failed = renderDiagram(document, view({ onImageError })).querySelector('img') as HTMLImageElement;
    failed.dispatchEvent(new Event('error'));
    expect(onImageError).toHaveBeenCalledTimes(1);
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
      expect(figure?.firstElementChild?.className).toBe('frame');
      expect(figure?.firstElementChild?.firstElementChild?.tagName).toBe('IMG');
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
    position: 'below' as const,
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

describe('renderDiagram — hub link as overlay', () => {
  const OVERLAY = {
    url: LINK.hubUrl as string,
    text: 'Open in Signavio',
    position: 'overlay' as const,
    align: 'left' as const,
    newTabHint: '(opens in a new tab)'
  };

  it('places the link inside the image frame, after the image', () => {
    const root = renderDiagram(document, view({ caption: 'Order-to-cash', hubLink: OVERLAY }));
    const frame = root.querySelector('.frame') as HTMLElement;
    expect(Array.from(frame.children).map((child) => child.tagName)).toEqual(['IMG', 'A']);
    expect(frame.lastElementChild?.className).toBe('hubAnchor hubOverlay');
  });

  it('renders no link paragraph below the diagram', () => {
    const root = renderDiagram(document, view({ hubLink: OVERLAY }));
    expect(root.querySelector('p')).toBeNull();
    expect(Array.from(root.children).map((child) => child.tagName)).toEqual(['FIGURE']);
    expect(root.querySelectorAll('a')).toHaveLength(1);
  });

  it('keeps the link attributes and the screen-reader hint', () => {
    const anchor = renderDiagram(document, view({ hubLink: OVERLAY })).querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toBe(LINK.hubUrl);
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
    expect(anchor.textContent).toBe('Open in Signavio (opens in a new tab)');
  });

  it('ignores the alignment (the overlay is always bottom right)', () => {
    const anchor = renderDiagram(document, view({ hubLink: OVERLAY })).querySelector('a') as HTMLAnchorElement;
    expect(anchor.style.getPropertyValue('text-align')).toBe('');
  });

  it('renders no overlay without a valid diagram', () => {
    expect(renderDiagram(document, view({ link: undefined, hubLink: OVERLAY })).querySelector('a')).toBeNull();
  });
});

describe('renderDiagram — zoom', () => {
  function zoomOption(onAttach: (controller: IZoomController) => void): IDiagramZoom {
    return {
      labels: { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit to frame', viewport: 'Zoomable diagram' },
      classNames: { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'zoomControls', button: 'zoomButton' },
      onAttach
    };
  }

  it('adds no zoom without the option — the diagram is unchanged', () => {
    const root = renderDiagram(document, view());
    expect(root.querySelector('.zoomControls')).toBeNull();
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('.frame')?.hasAttribute('tabindex')).toBe(false);
  });

  it('attaches the zoom to the image frame and hands over the controller', () => {
    const attached: IZoomController[] = [];
    const root = renderDiagram(document, view({ zoom: zoomOption((controller) => attached.push(controller)) }));
    const frame = root.querySelector('.frame');
    expect(attached).toHaveLength(1);
    expect(frame?.querySelector('.zoomControls')).not.toBeNull();
    expect(frame?.querySelectorAll('.zoomButton')).toHaveLength(3);
    expect((root.querySelector('img') as HTMLImageElement).style.transformOrigin).toBe('0 0');
    attached[0].dispose();
    expect(frame?.querySelector('.zoomControls')).toBeNull();
  });

  it('keeps the controls hidden until the loaded image turns out to be zoomable', () => {
    // jsdom lays nothing out: the image has no size, so there is nothing to zoom
    const root = renderDiagram(document, view({ zoom: zoomOption(() => undefined) }));
    const controls = root.querySelector('.zoomControls') as HTMLElement;
    expect(controls.hidden).toBe(true);
    expect(root.querySelector('.frame')?.classList.contains('zoomable')).toBe(false);
  });

  it('leaves the hub overlay in place next to the controls', () => {
    const hubLink = {
      url: LINK.hubUrl as string,
      text: 'Open in Signavio',
      position: 'overlay' as const,
      align: 'right' as const,
      newTabHint: '(opens in a new tab)'
    };
    const root = renderDiagram(document, view({ hubLink, zoom: zoomOption(() => undefined) }));
    const frame = root.querySelector('.frame');
    expect(frame?.querySelector('a.hubOverlay')).not.toBeNull();
    expect(frame?.querySelector('.zoomControls')).not.toBeNull();
  });

  it('adds no zoom without a valid diagram', () => {
    const attached: IZoomController[] = [];
    renderDiagram(document, view({ link: undefined, zoom: zoomOption((controller) => attached.push(controller)) }));
    expect(attached).toHaveLength(0);
  });
});

describe('parseHubLinkPosition', () => {
  it('accepts overlay and below', () => {
    expect(parseHubLinkPosition('overlay')).toBe('overlay');
    expect(parseHubLinkPosition('below')).toBe('below');
  });

  it.each([[undefined], [''], ['corner'], ['OVERLAY'], [1], [{}]])('falls back to below for %p', (value) => {
    expect(parseHubLinkPosition(value)).toBe('below');
  });
});
