import { createDiagramImage } from './diagramImage';
import { createIcon } from './svgIcon';
import { attachZoom } from './zoomView';
import type { IZoomClassNames, IZoomLabels } from './zoomView';

/** What the full-screen view shows and how it looks. */
export interface ILightboxProps {
  imageUrl: string;
  altText: string;
  /** Gets the focus back on close; default the focused element (Safari does not focus clicked buttons). */
  opener?: HTMLElement;
  /** Colour exactly behind the PNG (`#rrggbb`, validated); `undefined` → transparent. */
  background?: string;
  labels: {
    close: string;
    /** Shown instead of the image when it cannot be loaded. */
    loadFailed: string;
    zoom: IZoomLabels;
  };
  classNames: {
    dialog: string;
    /** Clips the zoomed image and hosts the zoom controls. */
    frame: string;
    image: string;
    close: string;
    message: string;
    zoom: IZoomClassNames;
  };
  /** Called once when the view has closed, whichever way, after the focus went back. */
  onClose?: () => void;
}

/** An open full-screen view. */
export interface ILightbox {
  close(): void;
}

/**
 * Clicks that close the view (button, backdrop) count only this long after opening: the second
 * click of a double-click on the full-screen button lands on the new view and would close it
 * at once. About one double-click interval.
 */
export const CLOSE_GUARD_MS = 500;

interface ILightboxParts {
  dialog: HTMLDialogElement;
  frame: HTMLElement;
  image: HTMLImageElement;
  closeButton: HTMLButtonElement;
}

/** The image with its background colour and the error state — without `src` yet. */
function createImage(doc: Document, props: ILightboxProps, frame: HTMLElement): HTMLImageElement {
  const image = createDiagramImage(doc, {
    className: props.classNames.image,
    altText: props.altText,
    background: props.background
  });
  image.addEventListener('error', () => {
    // A broken image on the dark layer would show nothing readable — say what happened instead.
    // Removed, not hidden: no broken-image icon, no alt text in the dark layer's text colour
    image.remove();
    const message = doc.createElement('p');
    message.className = props.classNames.message;
    message.setAttribute('role', 'alert');
    message.textContent = props.labels.loadFailed;
    frame.appendChild(message);
  });
  return image;
}

function createParts(doc: Document, props: ILightboxProps): ILightboxParts {
  const { labels, classNames } = props;
  const dialog = doc.createElement('dialog');
  dialog.className = classNames.dialog;
  dialog.setAttribute('aria-label', props.altText);

  const frame = doc.createElement('div');
  frame.className = classNames.frame;
  const image = createImage(doc, props, frame);
  frame.appendChild(image);
  dialog.appendChild(frame);

  const closeButton = doc.createElement('button');
  closeButton.type = 'button';
  closeButton.className = classNames.close;
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.title = labels.close;
  closeButton.appendChild(createIcon(doc, 'close'));
  dialog.appendChild(closeButton);
  return { dialog, frame, image, closeButton };
}

/**
 * Wires the ways to close: the button, Escape (`cancel`) and a click on the backdrop. A drag that
 * starts on the image and ends on the backdrop must not close — the click then targets the dialog
 * too, so the press has to start on the backdrop as well. Clicks right after opening and held
 * keys (auto-repeat) close nothing.
 */
function bindClosing(parts: ILightboxParts, close: () => void): void {
  const { dialog, closeButton } = parts;
  // A monotonic clock: a system clock set back must not keep the view from closing
  const openedAt = performance.now();
  const isTooEarly = (): boolean => performance.now() - openedAt < CLOSE_GUARD_MS;
  let isPressOnBackdrop = false;

  closeButton.addEventListener('click', () => {
    if (!isTooEarly()) {
      close();
    }
  });
  dialog.addEventListener('cancel', (event: Event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('pointerdown', (event: Event) => {
    isPressOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener('click', (event: Event) => {
    if (event.target === dialog && isPressOnBackdrop && !isTooEarly()) {
      close();
    }
    isPressOnBackdrop = false;
  });
  // Enter held on the full-screen button keeps repeating on "close", which has the focus now —
  // only there: held keys on the zoom buttons repeat as usual
  closeButton.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
    }
  });
}

/** Shows the dialog modally — if the browser refuses, the dialog is removed and the error passed on. */
function showDialog(doc: Document, dialog: HTMLDialogElement): void {
  doc.body.appendChild(dialog);
  try {
    dialog.showModal();
  } catch (error) {
    dialog.remove();
    throw error;
  }
}

/**
 * Shows the diagram in a modal `<dialog>` — nothing but the image, a close button and zoom.
 * `showModal()` makes the page inert, keeps the focus inside, closes on Escape and renders in
 * the top layer above the SharePoint chrome. Closes via the button, Escape or a click on the
 * backdrop; afterwards the dialog is removed, the focus returns to where it was and `onClose`
 * is called. If the browser refuses `showModal()`, nothing is left behind and the error is passed
 * on.
 */
export function openLightbox(doc: Document, props: ILightboxProps): ILightbox {
  const opener = props.opener ?? (doc.activeElement instanceof HTMLElement ? doc.activeElement : undefined);
  const parts = createParts(doc, props);
  const { dialog, frame, image, closeButton } = parts;
  showDialog(doc, dialog);
  // Full screen always offers zoom: the diagram first fits the window
  const zoom = attachZoom(doc, {
    viewport: frame,
    image,
    labels: props.labels.zoom,
    classNames: props.classNames.zoom
  });

  let isClosed = false;
  function cleanup(): void {
    if (isClosed) {
      return;
    }
    isClosed = true;
    zoom.dispose();
    dialog.removeEventListener('close', cleanup);
    dialog.remove();
    if (opener?.isConnected) {
      opener.focus();
    }
    props.onClose?.();
  }
  function close(): void {
    if (dialog.open) {
      dialog.close();
    }
    cleanup();
  }

  bindClosing(parts, close);
  // Closed by other means (e.g. the browser) — still clean up
  dialog.addEventListener('close', cleanup);
  // Set last, so every load/error listener (also the zoom's) is in place before the request starts
  image.src = props.imageUrl;
  closeButton.focus();
  return { close };
}
