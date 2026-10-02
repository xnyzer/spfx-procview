import type { IMessageTexts } from './messages';
import { externalLink } from './externalLink';
import type { IHubLinkView } from './renderDiagram';

/** Everything a message (empty or error state) needs — assembled by the web part. */
export interface IMessageView {
  texts: IMessageTexts;
  /** Label of the "Configure" button; the button appears only with `onConfigure`. */
  configureLabel: string;
  onConfigure?: () => void;
  /** Hub link offered below the message (only when the message asks for it). */
  hubLink?: IHubLinkView;
  classNames: {
    root: string;
    message: string;
    info: string;
    error: string;
    title: string;
    body: string;
    details: string;
    configure: string;
    hubLink: string;
    hubAnchor: string;
    srOnly: string;
  };
}

/** A paragraph with plain text. */
function createParagraph(doc: Document, className: string, text: string): HTMLElement {
  const paragraph = doc.createElement('p');
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

/** The message box: optional title, body, optional list of details and the Configure button. */
function createMessageBox(doc: Document, view: IMessageView): HTMLElement {
  const { texts, classNames } = view;
  const box = doc.createElement('div');
  box.className = `${classNames.message} ${texts.tone === 'info' ? classNames.info : classNames.error}`;
  if (texts.title) {
    box.appendChild(createParagraph(doc, classNames.title, texts.title));
  }
  box.appendChild(createParagraph(doc, classNames.body, texts.body));
  if (texts.details.length > 0) {
    const list = doc.createElement('ul');
    list.className = classNames.details;
    texts.details.forEach((detail) => {
      const item = doc.createElement('li');
      item.textContent = detail;
      list.appendChild(item);
    });
    box.appendChild(list);
  }
  const onConfigure = view.onConfigure;
  if (texts.showConfigure && onConfigure) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = classNames.configure;
    button.textContent = view.configureLabel;
    button.addEventListener('click', () => onConfigure());
    box.appendChild(button);
  }
  return box;
}

/**
 * Builds a message (empty/error state) with DOM APIs only — every text is set via
 * `textContent`, nothing is interpreted as markup (CODING-STANDARDS §13).
 */
export function renderMessage(doc: Document, view: IMessageView): HTMLElement {
  const { classNames } = view;
  const root = doc.createElement('section');
  root.className = classNames.root;
  root.appendChild(createMessageBox(doc, view));
  if (view.texts.showHubLink && view.hubLink) {
    const paragraph = doc.createElement('p');
    paragraph.className = classNames.hubLink;
    paragraph.appendChild(externalLink(doc, view.hubLink, { anchor: classNames.hubAnchor, srOnly: classNames.srOnly }));
    root.appendChild(paragraph);
  }
  return root;
}
