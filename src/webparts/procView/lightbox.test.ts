import { openLightbox } from './lightbox';
import type { ILightbox, ILightboxProps } from './lightbox';

// Placeholder link — real model ids and keys never enter the repository.
const IMAGE_URL = `https://editor.signavio.com/p/model/0123456789abcdef0123456789abcdef/png?inline&authkey=${'ab12'.repeat(16)}`;

const PROPS: ILightboxProps = {
  imageUrl: IMAGE_URL,
  altText: 'Order process',
  labels: {
    close: 'Close',
    zoom: { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit to frame', viewport: 'Zoomable diagram' }
  },
  classNames: {
    dialog: 'lightbox',
    frame: 'lightboxFrame',
    image: 'lightboxImage',
    close: 'lightboxClose',
    zoom: { zoomable: 'zoomable', zoomed: 'zoomed', controls: 'zoomControls', button: 'zoomButton' }
  }
};

// jsdom does not implement modal dialogs completely — a minimal stand-in records the calls
const proto = HTMLDialogElement.prototype as unknown as {
  showModal?: () => void;
  close?: () => void;
};
const original = { showModal: proto.showModal, close: proto.close };
const showModal = jest.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const closeDialog = jest.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});

beforeAll(() => {
  proto.showModal = showModal;
  proto.close = closeDialog;
});

afterAll(() => {
  proto.showModal = original.showModal;
  proto.close = original.close;
});

let opener: HTMLButtonElement;
let lightbox: ILightbox | undefined;

beforeEach(() => {
  showModal.mockClear();
  closeDialog.mockClear();
  opener = document.createElement('button');
  document.body.appendChild(opener);
  opener.focus();
});

afterEach(() => {
  lightbox?.close();
  lightbox = undefined;
  opener.remove();
});

function open(): HTMLDialogElement {
  lightbox = openLightbox(document, PROPS);
  return document.querySelector('dialog.lightbox') as HTMLDialogElement;
}

function press(target: Element, clickTarget: Element = target): void {
  target.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
  clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('openLightbox — content', () => {
  it('opens a modal dialog named after the diagram', () => {
    const dialog = open();
    expect(dialog).not.toBeNull();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Order process');
  });

  it('shows only the diagram, a close button and the zoom controls', () => {
    const dialog = open();
    const image = dialog.querySelector('img.lightboxImage') as HTMLImageElement;
    expect(dialog.querySelectorAll('img')).toHaveLength(1);
    expect(image.getAttribute('src')).toBe(IMAGE_URL);
    expect(image.alt).toBe('Order process');
    expect(image.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(dialog.querySelector('figcaption, a')).toBeNull();

    const close = dialog.querySelector('button.lightboxClose') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.title).toBe('Close');
    expect(dialog.querySelector('.lightboxFrame .zoomControls')).not.toBeNull();
  });

  it('moves the focus to the close button', () => {
    const dialog = open();
    expect(document.activeElement).toBe(dialog.querySelector('button.lightboxClose'));
  });
});

describe('openLightbox — background', () => {
  it('puts the configured colour behind the PNG, or nothing without it', () => {
    lightbox = openLightbox(document, { ...PROPS, background: '#0e5a73' });
    const image = document.querySelector('dialog img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 720 });
    Object.defineProperty(image, 'naturalHeight', { value: 457 });
    image.dispatchEvent(new Event('load'));
    expect(decodeURIComponent(image.style.backgroundImage)).toContain('#0e5a73');
    lightbox.close();

    lightbox = openLightbox(document, PROPS);
    const plain = document.querySelector('dialog img') as HTMLImageElement;
    plain.dispatchEvent(new Event('load'));
    expect(plain.style.backgroundImage).toBe('');
  });
});

describe('openLightbox — closing', () => {
  it('closes with the close button and returns the focus', () => {
    const dialog = open();
    (dialog.querySelector('button.lightboxClose') as HTMLButtonElement).click();
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('returns the focus to an explicitly given opener', () => {
    const other = document.createElement('button');
    document.body.appendChild(other);
    lightbox = openLightbox(document, { ...PROPS, opener: other });
    lightbox.close();
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it('closes with Escape (the cancel event)', () => {
    const dialog = open();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes with a click on the backdrop', () => {
    const dialog = open();
    press(dialog);
    expect(dialog.isConnected).toBe(false);
  });

  it('stays open for clicks on the image and the zoom controls', () => {
    const dialog = open();
    press(dialog.querySelector('img') as HTMLImageElement);
    press(dialog.querySelector('.zoomControls button') as HTMLButtonElement);
    expect(dialog.isConnected).toBe(true);
  });

  it('stays open when a drag starts on the image and ends on the backdrop', () => {
    const dialog = open();
    // The click then targets the dialog (common ancestor), but the press started on the image
    press(dialog.querySelector('img') as HTMLImageElement, dialog);
    expect(dialog.isConnected).toBe(true);
  });

  it('cleans up when the browser closes the dialog by other means', () => {
    const dialog = open();
    dialog.dispatchEvent(new Event('close'));
    expect(dialog.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('removes the zoom with the dialog and tolerates closing twice', () => {
    const dialog = open();
    const frame = dialog.querySelector('.lightboxFrame') as HTMLElement;
    lightbox?.close();
    lightbox?.close();
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(frame.querySelector('.zoomControls')).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });
});
