import { parseHubLinkPosition, parseTextAlign, renderDiagram } from './renderDiagram';
import type { IDiagramFullScreen, IDiagramView, IDiagramZoom } from './renderDiagram';
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
    classNames: {
      root: 'root',
      figure: 'figure',
      frame: 'frame',
      controlBar: 'controlBar',
      image: 'image',
      caption: 'caption',
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

describe('renderDiagram — alt text', () => {
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
});

describe('parseTextAlign', () => {
  it('accepts left, center and right', () => {
    expect(parseTextAlign('left', 'center')).toBe('left');
    expect(parseTextAlign('center', 'right')).toBe('center');
    expect(parseTextAlign('right', 'center')).toBe('right');
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['justify'],
    ['LEFT'],
    [' left'],
    ['left;color:red'],
    ['__proto__'],
    ['constructor'],
    [42],
    [{}],
    [['left']],
    [{ toString: (): string => 'left' }]
  ])('falls back for %p', (value) => {
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
    expect(frame?.querySelector('.controlBar > .zoomControls')).not.toBeNull();
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
});

describe('renderDiagram — full screen and control bar', () => {
  function fullScreenOption(onOpen: (button: HTMLButtonElement) => void): IDiagramFullScreen {
    return { label: 'Full screen', className: 'zoomButton', onOpen };
  }
  const zoom: IDiagramZoom = {
    labels: { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit to frame', viewport: 'Zoomable diagram' },
    classNames: { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'zoomControls', button: 'zoomButton' },
    onAttach: () => undefined
  };

  it('adds no control bar without zoom and full screen', () => {
    const root = renderDiagram(document, view());
    expect(root.querySelector('.controlBar')).toBeNull();
  });

  it('shows the full-screen button alone when only full screen is offered', () => {
    const root = renderDiagram(document, view({ fullScreen: fullScreenOption(() => undefined) }));
    const bar = root.querySelector('.frame > .controlBar') as HTMLElement;
    expect(bar.querySelectorAll('button')).toHaveLength(1);
    const button = bar.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Full screen');
    expect(button.title).toBe('Full screen');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.zoomControls')).toBeNull();
  });

  it('puts zoom and full screen into one bar, the full-screen button last', () => {
    const root = renderDiagram(document, view({ zoom, fullScreen: fullScreenOption(() => undefined) }));
    const bar = root.querySelector('.controlBar') as HTMLElement;
    expect(Array.from(bar.children).map((child) => child.className)).toEqual(['zoomControls', 'zoomButton']);
    expect(root.querySelectorAll('.controlBar')).toHaveLength(1);
  });

  it('hands the button to onOpen, so the focus can return to it', () => {
    const opened: HTMLButtonElement[] = [];
    const root = renderDiagram(document, view({ fullScreen: fullScreenOption((button) => opened.push(button)) }));
    const button = root.querySelector('.controlBar button') as HTMLButtonElement;
    button.click();
    expect(opened).toEqual([button]);
  });
});

describe('renderDiagram — background behind the diagram', () => {
  /** jsdom loads nothing: give the image a natural size and fire its load event. */
  function load(image: HTMLImageElement, width: number, height: number): void {
    Object.defineProperty(image, 'naturalWidth', { value: width });
    Object.defineProperty(image, 'naturalHeight', { value: height });
    image.dispatchEvent(new Event('load'));
  }

  it('puts the colour exactly behind the PNG once it has loaded', () => {
    const root = renderDiagram(document, view({ background: '#ffffff' }));
    const image = root.querySelector('img') as HTMLImageElement;
    expect(image.style.backgroundImage).toBe('');
    load(image, 2000, 1000);
    expect(image.style.backgroundImage).toContain('data:image/svg+xml');
    expect(image.style.backgroundSize).toBe('contain');
  });

  it('stays transparent without the option', () => {
    const root = renderDiagram(document, view());
    const image = root.querySelector('img') as HTMLImageElement;
    load(image, 2000, 1000);
    expect(image.style.backgroundImage).toBe('');
  });
});

describe('parseHubLinkPosition', () => {
  it('accepts overlay and below', () => {
    expect(parseHubLinkPosition('overlay')).toBe('overlay');
    expect(parseHubLinkPosition('below')).toBe('below');
  });

  it.each([
    [undefined],
    [null],
    [''],
    ['corner'],
    ['OVERLAY'],
    ['overlay '],
    ['__proto__'],
    [1],
    [{}],
    [['overlay']],
    [{ toString: (): string => 'overlay' }]
  ])('falls back to below for %p', (value) => {
    expect(parseHubLinkPosition(value)).toBe('below');
  });
});
