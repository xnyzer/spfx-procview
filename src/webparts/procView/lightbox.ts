import { attachZoom } from './zoomView';
import type { IZoomClassNames, IZoomLabels } from './zoomView';

export interface ILightboxProps {
  imageUrl: string;
  altText: string;
  labels: {
    close: string;
    zoom: IZoomLabels;
  };
  classNames: {
    dialog: string;
    /** Clips the zoomed image and hosts the zoom controls. */
    frame: string;
    image: string;
    close: string;
    zoom: IZoomClassNames;
  };
}

export interface ILightbox {
  close(): void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 16 × 16 "close" icon (an X). */
function closeIcon(doc: Document): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = doc.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M3 3l10 10M13 3L3 13');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  svg.appendChild(path);
  return svg;
}

/**
 * Shows the diagram in a modal `<dialog>` — nothing but the image, a close button and zoom.
 * `showModal()` makes the page inert, keeps the focus inside, closes on Escape and renders in
 * the top layer above the SharePoint chrome. Closes via the button, Escape or a click on the
 * backdrop; afterwards the dialog is removed and the focus returns to where it was.
 */
export function openLightbox(doc: Document, props: ILightboxProps): ILightbox {
  const { labels, classNames } = props;
  const opener = doc.activeElement instanceof HTMLElement ? doc.activeElement : undefined;

  const dialog = doc.createElement('dialog');
  dialog.className = classNames.dialog;
  dialog.setAttribute('aria-label', props.altText);

  const frame = doc.createElement('div');
  frame.className = classNames.frame;
  const image = doc.createElement('img');
  image.className = classNames.image;
  image.alt = props.altText;
  // As on the page: the process tool must not learn which SharePoint page shows the diagram
  image.setAttribute('referrerpolicy', 'no-referrer');
  image.setAttribute('decoding', 'async');
  frame.appendChild(image);
  dialog.appendChild(frame);

  const closeButton = doc.createElement('button');
  closeButton.type = 'button';
  closeButton.className = classNames.close;
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.title = labels.close;
  closeButton.appendChild(closeIcon(doc));
  dialog.appendChild(closeButton);

  // Full screen always offers zoom: the diagram first fits the window
  const zoom = attachZoom(doc, { viewport: frame, image, labels: labels.zoom, classNames: classNames.zoom });

  let closed = false;
  /** Whether the current press started on the backdrop (the dialog element itself). */
  let pressOnBackdrop = false;

  function cleanup(): void {
    if (closed) {
      return;
    }
    closed = true;
    zoom.dispose();
    dialog.removeEventListener('close', cleanup);
    dialog.remove();
    if (opener?.isConnected) {
      opener.focus();
    }
  }

  function close(): void {
    if (closed) {
      return;
    }
    if (dialog.open && typeof dialog.close === 'function') {
      dialog.close();
    }
    cleanup();
  }

  closeButton.addEventListener('click', close);
  // Escape: the browser fires `cancel`; close through the same path
  dialog.addEventListener('cancel', (event: Event) => {
    event.preventDefault();
    close();
  });
  // A drag that starts on the image and ends on the backdrop must not close: the click then
  // targets the dialog too, so the press has to start on the backdrop as well
  dialog.addEventListener('pointerdown', (event: Event) => {
    pressOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', (event: Event) => {
    if (event.target === dialog && pressOnBackdrop) {
      close();
    }
    pressOnBackdrop = false;
  });
  // Closed by other means (e.g. the browser) — still clean up
  dialog.addEventListener('close', cleanup);

  doc.body.appendChild(dialog);
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  // Set last, so the zoom's load listener is in place before the request starts
  image.src = props.imageUrl;
  closeButton.focus();

  return { close };
}
