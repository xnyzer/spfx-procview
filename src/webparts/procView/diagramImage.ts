/**
 * The diagram image as the page and the full-screen view both build it — DOM APIs only, so
 * nothing from the settings can be interpreted as markup (CODING-STANDARDS §13).
 */

import { backgroundStyles } from './background';
import type { CssDeclarations } from './sizing';

/** Sets CSS declarations on an element via `style.setProperty` (never as a markup string). */
export function applyStyles(element: HTMLElement, declarations: CssDeclarations): void {
  Object.keys(declarations).forEach((property) => {
    element.style.setProperty(property, declarations[property]);
  });
}

/** What the page and the full-screen view set on the diagram image alike. */
export interface IDiagramImageProps {
  className: string;
  altText: string;
  /** Colour exactly behind the PNG (`#rrggbb`, validated); `undefined` → transparent. */
  background?: string;
}

/**
 * The diagram `<img>` without `src` — the caller sets it last, once every listener is in place.
 * No referrer: the process tool must not learn which SharePoint page shows the diagram. Once the
 * natural size is known, the background colour covers exactly the painted PNG.
 */
export function createDiagramImage(doc: Document, props: IDiagramImageProps): HTMLImageElement {
  const image = doc.createElement('img');
  image.className = props.className;
  image.alt = props.altText;
  image.setAttribute('referrerpolicy', 'no-referrer');
  image.setAttribute('decoding', 'async');
  const background = props.background;
  if (background) {
    image.addEventListener('load', () =>
      applyStyles(image, backgroundStyles(background, { width: image.naturalWidth, height: image.naturalHeight }))
    );
  }
  return image;
}
