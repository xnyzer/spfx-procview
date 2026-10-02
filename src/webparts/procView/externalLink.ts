const SVG_NS = 'http://www.w3.org/2000/svg';

/** What an external link shows and where it leads. */
export interface IExternalLink {
  /** Validated `https:` URL. */
  url: string;
  text: string;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
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

/**
 * A link that opens in a new tab without opener access or referrer — the hub link (below the
 * diagram, as overlay and in messages) and the repository link in the property pane.
 */
export function externalLink(
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
  anchor.appendChild(externalLinkIcon(doc));

  const hint = doc.createElement('span');
  hint.className = classNames.srOnly;
  hint.textContent = ` ${link.newTabHint}`;
  anchor.appendChild(hint);
  return anchor;
}
