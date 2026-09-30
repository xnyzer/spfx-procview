import type { IDiagramLink } from '../../providers/types';
import type { CssDeclarations, IDiagramStyles } from './sizing';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type TextAlign = 'left' | 'center' | 'right';

/** Text alignment from untrusted property data — anything unknown means `fallback`. */
export function parseTextAlign(value: unknown, fallback: TextAlign): TextAlign {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback;
}

export type HubLinkPosition = 'below' | 'overlay';

/** Hub link position from untrusted property data — anything unknown means `below`. */
export function parseHubLinkPosition(value: unknown): HubLinkPosition {
  return value === 'overlay' ? 'overlay' : 'below';
}

/** Link to the tool's interactive view — below the diagram or as overlay in its corner. */
export interface IHubLinkView {
  url: string;
  text: string;
  position: HubLinkPosition;
  /** Alignment for `below`; ignored for the overlay (always bottom right). */
  align: TextAlign;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
}

/** Everything the diagram view needs — assembled by the web part, rendered here. */
export interface IDiagramView {
  /** Validated link; `undefined` shows the placeholder instead of an image. */
  link: IDiagramLink | undefined;
  style: IDiagramStyles;
  altText: string;
  /** Visible caption below the image; empty → none. */
  caption: string;
  captionAlign: TextAlign;
  /** Hub link (below the caption or as overlay on the image); `undefined` → none. */
  hubLink?: IHubLinkView;
  placeholderText: string;
  classNames: {
    root: string;
    figure: string;
    frame: string;
    image: string;
    caption: string;
    placeholder: string;
    hubLink: string;
    hubAnchor: string;
    hubOverlay: string;
    srOnly: string;
  };
  /** Called with the image's natural size once it has loaded. */
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
}

/**
 * Builds the web part's DOM with DOM APIs only — no markup strings, so nothing from the
 * settings can be interpreted as HTML (CODING-STANDARDS §13).
 */
export function renderDiagram(doc: Document, view: IDiagramView): HTMLElement {
  const root = doc.createElement('section');
  root.className = view.classNames.root;

  if (!view.link) {
    const placeholder = doc.createElement('p');
    placeholder.className = view.classNames.placeholder;
    placeholder.textContent = view.placeholderText;
    root.appendChild(placeholder);
    return root;
  }

  const figure = doc.createElement('figure');
  figure.className = view.classNames.figure;

  // Hugs the image, so an overlay can sit at the image's corner (sizing.ts)
  const frame = doc.createElement('div');
  frame.className = view.classNames.frame;
  applyStyles(frame, view.style.frame);

  const image = doc.createElement('img');
  image.className = view.classNames.image;
  image.alt = view.altText;
  // The process tool must not learn which SharePoint page embeds the diagram
  image.setAttribute('referrerpolicy', 'no-referrer');
  image.setAttribute('loading', 'lazy');
  image.setAttribute('decoding', 'async');
  applyStyles(image, view.style.image);

  const onImageLoad = view.onImageLoad;
  if (onImageLoad) {
    image.addEventListener('load', () => onImageLoad(image.naturalWidth, image.naturalHeight));
  }
  // Set last, so the load listener is in place before the request starts
  image.src = view.link.imageUrl;
  frame.appendChild(image);
  if (view.hubLink?.position === 'overlay') {
    const overlay = hubAnchor(doc, view.hubLink, view.classNames);
    overlay.className = `${view.classNames.hubAnchor} ${view.classNames.hubOverlay}`;
    frame.appendChild(overlay);
  }
  figure.appendChild(frame);

  if (view.caption !== '') {
    const caption = doc.createElement('figcaption');
    caption.className = view.classNames.caption;
    caption.textContent = view.caption;
    caption.style.setProperty('text-align', view.captionAlign);
    figure.appendChild(caption);
  }

  root.appendChild(figure);
  if (view.hubLink?.position === 'below') {
    const paragraph = doc.createElement('p');
    paragraph.className = view.classNames.hubLink;
    paragraph.style.setProperty('text-align', view.hubLink.align);
    paragraph.appendChild(hubAnchor(doc, view.hubLink, view.classNames));
    root.appendChild(paragraph);
  }
  return root;
}

function applyStyles(element: HTMLElement, declarations: CssDeclarations): void {
  Object.keys(declarations).forEach((property) => {
    element.style.setProperty(property, declarations[property]);
  });
}

/** Small "external link" icon (arrow out of a box). */
function externalLinkIcon(doc: Document): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M9 2h5v5M14 2 7 9M12 9v5H2V4h5');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  svg.appendChild(path);
  return svg;
}

/** The hub link itself — the same anchor below the diagram, as overlay and in messages. */
export function hubAnchor(
  doc: Document,
  hubLink: IHubLinkView,
  classNames: Pick<IDiagramView['classNames'], 'hubAnchor' | 'srOnly'>
): HTMLAnchorElement {
  const anchor = doc.createElement('a');
  anchor.className = classNames.hubAnchor;
  anchor.href = hubLink.url;
  anchor.target = '_blank';
  // No opener access and no referrer — the tool does not learn the SharePoint page URL
  anchor.rel = 'noopener noreferrer';
  anchor.appendChild(doc.createTextNode(hubLink.text));
  anchor.appendChild(externalLinkIcon(doc));

  const hint = doc.createElement('span');
  hint.className = classNames.srOnly;
  hint.textContent = ` ${hubLink.newTabHint}`;
  anchor.appendChild(hint);
  return anchor;
}
