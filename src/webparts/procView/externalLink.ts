import { createIcon } from './svgIcon';

/** The external-link icon is smaller than the button icons — it sits in running text. */
const EXTERNAL_LINK_ICON_SIZE = 12;

/** What an external link shows and where it leads. */
export interface IExternalLink {
  /** Validated `https:` URL. */
  url: string;
  text: string;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
}

/**
 * A link that opens in a new tab without opener access or referrer — the hub link (below the
 * diagram, as overlay and in messages) and the repository link in the property pane.
 */
export function createExternalLink(
  doc: Document,
  link: IExternalLink,
  classNames: { anchor: string; srOnly: string }
): HTMLAnchorElement {
  const anchor = doc.createElement('a');
  anchor.className = classNames.anchor;
  anchor.href = link.url;
  anchor.target = '_blank';
  // No opener access and no referrer — the target does not learn the SharePoint page URL
  anchor.rel = 'noopener noreferrer';
  anchor.appendChild(doc.createTextNode(link.text));
  anchor.appendChild(createIcon(doc, 'externalLink', EXTERNAL_LINK_ICON_SIZE));

  const hint = doc.createElement('span');
  hint.className = classNames.srOnly;
  hint.textContent = ` ${link.newTabHint}`;
  anchor.appendChild(hint);
  return anchor;
}
