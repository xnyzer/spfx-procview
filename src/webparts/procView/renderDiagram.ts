import type { IDiagramLink } from '../../providers/types';
import type { IImageStyle } from './sizing';

export type CaptionAlign = 'left' | 'center' | 'right';

/** Caption alignment from untrusted property data — anything unknown means `center`. */
export function parseCaptionAlign(value: unknown): CaptionAlign {
  return value === 'left' || value === 'right' ? value : 'center';
}

/** Everything the diagram view needs — assembled by the web part, rendered here. */
export interface IDiagramView {
  /** Validated link; `undefined` shows the placeholder instead of an image. */
  link: IDiagramLink | undefined;
  style: IImageStyle;
  altText: string;
  /** Visible caption below the image; empty → none. */
  caption: string;
  captionAlign: CaptionAlign;
  placeholderText: string;
  classNames: { root: string; figure: string; image: string; caption: string; placeholder: string };
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
  return root;
}
