import type { IDiagramLink } from '../../providers/types';
import type { CssDeclarations, IDiagramStyles } from './sizing';
import { backgroundStyles } from './background';
import { externalLink } from './externalLink';
import type { IExternalLink } from './externalLink';
import { createIcon } from './svgIcon';
import { attachZoom } from './zoomView';
import type { IZoomClassNames, IZoomController, IZoomLabels } from './zoomView';

/** Alignment of a text below the diagram (caption, hub link). */
export type TextAlign = 'left' | 'center' | 'right';

/** Text alignment from untrusted property data — anything unknown means `fallback`. */
export function parseTextAlign(value: unknown, fallback: TextAlign): TextAlign {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback;
}

/** Where the hub link sits: below the diagram or as overlay in its bottom-right corner. */
export type HubLinkPosition = 'below' | 'overlay';

/** Hub link position from untrusted property data — anything unknown means `below`. */
export function parseHubLinkPosition(value: unknown): HubLinkPosition {
  return value === 'overlay' ? 'overlay' : 'below';
}

/** Link to the tool's interactive view — below the diagram or as overlay in its corner. */
export interface IHubLinkView extends IExternalLink {
  position: HubLinkPosition;
  /** Alignment for `below`; ignored for the overlay (always bottom right). */
  align: TextAlign;
}

/** Zoom and pan on the image ("Offer zoom"); the caller owns the controller and disposes it. */
export interface IDiagramZoom {
  labels: IZoomLabels;
  classNames: IZoomClassNames;
  onAttach: (controller: IZoomController) => void;
}

/** Button that opens the full-screen view ("Offer full screen"). */
export interface IDiagramFullScreen {
  label: string;
  className: string;
  /** Opens the full-screen view; the button gets the focus back when it closes. */
  onOpen: (button: HTMLButtonElement) => void;
  /** Gets the button as soon as it exists — the focus goes to the current one after a re-render. */
  onAttach?: (button: HTMLButtonElement) => void;
}

/** Everything the diagram view needs — assembled by the web part, rendered here. */
export interface IDiagramView {
  /** Validated link — without one the web part shows a message instead (messages.ts). */
  link: IDiagramLink;
  style: IDiagramStyles;
  altText: string;
  /** Visible caption below the image; empty → none. */
  caption: string;
  captionAlign: TextAlign;
  /** Hub link (below the caption or as overlay on the image); `undefined` → none. */
  hubLink?: IHubLinkView;
  /** Zoom and pan on the image; `undefined` → off. */
  zoom?: IDiagramZoom;
  /** Full-screen button on the image; `undefined` → off. */
  fullScreen?: IDiagramFullScreen;
  /** Colour exactly behind the PNG (`#rrggbb`, validated); `undefined` → transparent. */
  background?: string;
  classNames: {
    root: string;
    figure: string;
    frame: string;
    /** Bar top right on the image for the zoom and full-screen buttons. */
    controlBar: string;
    image: string;
    caption: string;
    hubLink: string;
    hubAnchor: string;
    hubOverlay: string;
    srOnly: string;
  };
  /** Called with the image's natural size once it has loaded. */
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
  /** Called when the image cannot be loaded. */
  onImageError?: () => void;
}

/**
 * Builds the web part's DOM with DOM APIs only — no markup strings, so nothing from the
 * settings can be interpreted as HTML (CODING-STANDARDS §13).
 */
export function renderDiagram(doc: Document, view: IDiagramView): HTMLElement {
  const root = doc.createElement('section');
  root.className = view.classNames.root;

  const figure = doc.createElement('figure');
  figure.className = view.classNames.figure;
  const image = createImage(doc, view);
  figure.appendChild(createFrame(doc, view, image));
  if (view.caption !== '') {
    figure.appendChild(createCaption(doc, view));
  }
  root.appendChild(figure);

  if (view.hubLink?.position === 'below') {
    const paragraph = doc.createElement('p');
    paragraph.className = view.classNames.hubLink;
    paragraph.style.setProperty('text-align', view.hubLink.align);
    paragraph.appendChild(externalLink(doc, view.hubLink, linkClassNames(view.classNames)));
    root.appendChild(paragraph);
  }
  // Set last, so every load/error listener (also the zoom's) is in place before the request starts
  image.src = view.link.imageUrl;
  return root;
}

/** The image with its sizing styles and listeners — without `src` yet. */
function createImage(doc: Document, view: IDiagramView): HTMLImageElement {
  const image = doc.createElement('img');
  image.className = view.classNames.image;
  image.alt = view.altText;
  // The process tool must not learn which SharePoint page embeds the diagram
  image.setAttribute('referrerpolicy', 'no-referrer');
  image.setAttribute('loading', 'lazy');
  image.setAttribute('decoding', 'async');
  applyStyles(image, view.style.image);

  const background = view.background;
  if (background) {
    // The natural size is known only now; the colour then covers exactly the painted PNG
    image.addEventListener('load', () =>
      applyStyles(image, backgroundStyles(background, { width: image.naturalWidth, height: image.naturalHeight }))
    );
  }
  const onImageLoad = view.onImageLoad;
  if (onImageLoad) {
    image.addEventListener('load', () => onImageLoad(image.naturalWidth, image.naturalHeight));
  }
  const onImageError = view.onImageError;
  if (onImageError) {
    image.addEventListener('error', () => onImageError());
  }
  return image;
}

/**
 * The frame hugs the image (sizing.ts), so the hub overlay sits at the image's corner and the
 * control bar at its top right; it also clips the zoomed image.
 */
function createFrame(doc: Document, view: IDiagramView, image: HTMLImageElement): HTMLElement {
  const frame = doc.createElement('div');
  frame.className = view.classNames.frame;
  applyStyles(frame, view.style.frame);
  frame.appendChild(image);
  if (view.hubLink?.position === 'overlay') {
    const overlay = externalLink(doc, view.hubLink, linkClassNames(view.classNames));
    overlay.className = `${view.classNames.hubAnchor} ${view.classNames.hubOverlay}`;
    frame.appendChild(overlay);
  }
  if (view.zoom || view.fullScreen) {
    frame.appendChild(createControlBar(doc, view, { frame, image }));
  }
  return frame;
}

/** One bar top right for zoom and full screen, alone or together. */
function createControlBar(
  doc: Document,
  view: IDiagramView,
  parts: { frame: HTMLElement; image: HTMLImageElement }
): HTMLElement {
  const bar = doc.createElement('div');
  bar.className = view.classNames.controlBar;
  if (view.zoom) {
    view.zoom.onAttach(
      attachZoom(doc, {
        viewport: parts.frame,
        image: parts.image,
        labels: view.zoom.labels,
        classNames: view.zoom.classNames,
        host: bar
      })
    );
  }
  if (view.fullScreen) {
    bar.appendChild(createFullScreenButton(doc, view.fullScreen));
  }
  return bar;
}

function createCaption(doc: Document, view: IDiagramView): HTMLElement {
  const caption = doc.createElement('figcaption');
  caption.className = view.classNames.caption;
  caption.textContent = view.caption;
  caption.style.setProperty('text-align', view.captionAlign);
  return caption;
}

function linkClassNames(classNames: IDiagramView['classNames']): { anchor: string; srOnly: string } {
  return { anchor: classNames.hubAnchor, srOnly: classNames.srOnly };
}

/** Sets CSS declarations on an element via `style.setProperty` (never as a markup string). */
export function applyStyles(element: HTMLElement, declarations: CssDeclarations): void {
  Object.keys(declarations).forEach((property) => {
    element.style.setProperty(property, declarations[property]);
  });
}

/** The full-screen button with its icon (two arrows pointing outwards). */
function createFullScreenButton(doc: Document, fullScreen: IDiagramFullScreen): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = fullScreen.className;
  button.setAttribute('aria-label', fullScreen.label);
  button.title = fullScreen.label;
  button.appendChild(createIcon(doc, 'fullScreen'));
  button.addEventListener('click', () => fullScreen.onOpen(button));
  fullScreen.onAttach?.(button);
  return button;
}
