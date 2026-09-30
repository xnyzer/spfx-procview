import type { IDiagramLink } from '../../providers/types';
import type { IImageStyle } from './sizing';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type TextAlign = 'left' | 'center' | 'right';

/** Text alignment from untrusted property data — anything unknown means `fallback`. */
export function parseTextAlign(value: unknown, fallback: TextAlign): TextAlign {
  return value === 'left' || value === 'center' || value === 'right' ? value : fallback;
}

/** Link to the tool's interactive view, rendered below the diagram. */
export interface IHubLinkView {
  url: string;
  text: string;
  align: TextAlign;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
}

/** Everything the diagram view needs — assembled by the web part, rendered here. */
export interface IDiagramView {
  /** Validated link; `undefined` shows the placeholder instead of an image. */
  link: IDiagramLink | undefined;
  style: IImageStyle;
  altText: string;
  /** Visible caption below the image; empty → none. */
  caption: string;
  captionAlign: TextAlign;
  /** Link below the diagram (after the caption); `undefined` → none. */
  hubLink?: IHubLinkView;
  placeholderText: string;
  classNames: {
    root: string;
    figure: string;
    image: string;
    caption: string;
    placeholder: string;
    hubLink: string;
    hubAnchor: string;
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

  const image = doc.createElement('img');
  image.className = view.classNames.image;
  image.alt = view.altText;
  // The process tool must not learn which SharePoint page embeds the diagram
  image.setAttribute('referrerpolicy', 'no-referrer');
  image.setAttribute('loading', 'lazy');
  image.setAttribute('decoding', 'async');
  (Object.keys(view.style) as (keyof IImageStyle)[]).forEach((property) => {
    image.style.setProperty(property, view.style[property]);
  });

  const onImageLoad = view.onImageLoad;
  if (onImageLoad) {
    image.addEventListener('load', () => onImageLoad(image.naturalWidth, image.naturalHeight));
  }
  // Set last, so the load listener is in place before the request starts
  image.src = view.link.imageUrl;
  figure.appendChild(image);

  if (view.caption !== '') {
    const caption = doc.createElement('figcaption');
    caption.className = view.classNames.caption;
    caption.textContent = view.caption;
    caption.style.setProperty('text-align', view.captionAlign);
    figure.appendChild(caption);
  }

  root.appendChild(figure);
  if (view.hubLink) {
    root.appendChild(renderHubLink(doc, view.hubLink, view.classNames));
  }
  return root;
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

function renderHubLink(doc: Document, hubLink: IHubLinkView, classNames: IDiagramView['classNames']): HTMLElement {
  const paragraph = doc.createElement('p');
  paragraph.className = classNames.hubLink;
  paragraph.style.setProperty('text-align', hubLink.align);

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

  paragraph.appendChild(anchor);
  return paragraph;
}
