import type { IMessageTexts } from './messages';
import { hubAnchor } from './renderDiagram';
import type { IHubLinkView } from './renderDiagram';

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

/**
 * Builds a message (empty/error state) with DOM APIs only — every text is set via
 * `textContent`, nothing is interpreted as markup (CODING-STANDARDS §13).
 */
export function renderMessage(doc: Document, view: IMessageView): HTMLElement {
  const { texts, classNames } = view;
  const root = doc.createElement('section');
  root.className = classNames.root;

  const box = doc.createElement('div');
  box.className = `${classNames.message} ${texts.tone === 'info' ? classNames.info : classNames.error}`;
  root.appendChild(box);

  if (texts.title) {
    const title = doc.createElement('p');
    title.className = classNames.title;
    title.textContent = texts.title;
    box.appendChild(title);
  }

  const body = doc.createElement('p');
  body.className = classNames.body;
  body.textContent = texts.body;
  box.appendChild(body);

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

  if (texts.showHubLink && view.hubLink) {
    const paragraph = doc.createElement('p');
    paragraph.className = classNames.hubLink;
    paragraph.appendChild(hubAnchor(doc, view.hubLink, classNames));
    root.appendChild(paragraph);
  }

  return root;
}
