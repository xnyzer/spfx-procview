import { CLOSE_GUARD_MS, openLightbox } from './lightbox';
import type { ILightbox, ILightboxProps } from './lightbox';

// Placeholder link — real model ids and keys never enter the repository.
const IMAGE_URL = `https://editor.signavio.com/p/model/0123456789abcdef0123456789abcdef/png?inline&authkey=${'ab12'.repeat(16)}`;

const PROPS: ILightboxProps = {
  imageUrl: IMAGE_URL,
  altText: 'Order process',
  labels: {
    close: 'Close',
    loadFailed: 'The diagram could not be loaded',
    zoom: { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Fit to frame', viewport: 'Zoomable diagram' }
  },
  classNames: {
    dialog: 'lightbox',
    frame: 'lightboxFrame',
    image: 'lightboxImage',
    close: 'lightboxClose',
    message: 'lightboxMessage',
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
/** The test clock (`performance.now`) — clicks that close only count after the guard time. */
let now = 0;
let clock: jest.SpyInstance<number, []> | undefined;

/** Lets the guard time after opening pass. */
function later(): void {
  now += CLOSE_GUARD_MS;
}

beforeEach(() => {
  now = 1000000;
  clock = jest.spyOn(performance, 'now').mockImplementation(() => now);
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
  clock?.mockRestore();
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
    later();
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
    later();
    press(dialog);
    expect(dialog.isConnected).toBe(false);
  });

  it('stays open for clicks on the image and the zoom controls', () => {
    const dialog = open();
    later();
    press(dialog.querySelector('img') as HTMLImageElement);
    press(dialog.querySelector('.zoomControls button') as HTMLButtonElement);
    expect(dialog.isConnected).toBe(true);
  });

  it('stays open when a drag starts on the image and ends on the backdrop', () => {
    const dialog = open();
    later();
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

describe('openLightbox — no close right after opening', () => {
  it('ignores the second click of a double-click on the full-screen button (backdrop or close)', () => {
    const dialog = open();
    press(dialog);
    (dialog.querySelector('button.lightboxClose') as HTMLButtonElement).click();
    expect(dialog.isConnected).toBe(true);
    later();
    press(dialog);
    expect(dialog.isConnected).toBe(false);
  });

  it('lets a held Enter not press "close" (keyboard auto-repeat)', () => {
    const dialog = open();
    const close = dialog.querySelector('button.lightboxClose') as HTMLButtonElement;
    const repeated = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
    close.dispatchEvent(repeated);
    expect(repeated.defaultPrevented).toBe(true);
    const single = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    close.dispatchEvent(single);
    expect(single.defaultPrevented).toBe(false);
  });

  it('still closes with Escape right away', () => {
    const dialog = open();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.isConnected).toBe(false);
  });
});

describe('openLightbox — held keys on the zoom buttons (audit L28)', () => {
  it('lets a held Enter repeat on the zoom buttons — only "close" ignores it', () => {
    const dialog = open();
    const zoomIn = dialog.querySelector('button[aria-label="Zoom in"]') as HTMLButtonElement;
    const repeat = new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true });
    zoomIn.dispatchEvent(repeat);
    expect(repeat.defaultPrevented).toBe(false);
  });
});

describe('openLightbox — showModal fails (audit L33)', () => {
  it('leaves no dialog behind and passes the error on', () => {
    showModal.mockImplementationOnce(() => {
      throw new Error('not allowed');
    });
    expect(() => openLightbox(document, PROPS)).toThrow('not allowed');
    expect(document.querySelector('dialog')).toBeNull();
  });
});

describe('openLightbox — error state', () => {
  it('shows the load-failed text instead of a broken image', () => {
    const dialog = open();
    const image = dialog.querySelector('img') as HTMLImageElement;
    image.dispatchEvent(new Event('error'));
    // Removed, not hidden: no broken-image icon, no alt text on the dark layer (audit L27)
    expect(dialog.querySelector('img')).toBeNull();
    const message = dialog.querySelector('.lightboxMessage');
    expect(message?.textContent).toBe('The diagram could not be loaded');
    expect(message?.getAttribute('role')).toBe('alert');
  });
});

describe('openLightbox — onClose', () => {
  function openWithOnClose(): { dialog: HTMLDialogElement; onClose: jest.Mock } {
    const onClose = jest.fn();
    lightbox = openLightbox(document, { ...PROPS, onClose });
    return { dialog: document.querySelector('dialog') as HTMLDialogElement, onClose };
  }

  it.each<[string, (dialog: HTMLDialogElement) => void]>([
    ['the close button', (dialog) => (dialog.querySelector('button.lightboxClose') as HTMLButtonElement).click()],
    ['Escape', (dialog) => dialog.dispatchEvent(new Event('cancel', { cancelable: true }))],
    ['the backdrop', (dialog) => press(dialog)],
    ['the browser', (dialog) => dialog.dispatchEvent(new Event('close'))],
    [
      'the API, twice',
      () => {
        lightbox?.close();
        lightbox?.close();
      }
    ]
  ])('fires once when closed via %s, after the focus went back', (_label, closeIt) => {
    const { dialog, onClose } = openWithOnClose();
    onClose.mockImplementation(() => expect(document.activeElement).toBe(opener));
    later();
    closeIt(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
