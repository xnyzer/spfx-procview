import { hubAnchor } from './renderDiagram';

/** Public repository of this web part — source code, documentation and issue tracker. */
export const REPOSITORY_URL = 'https://github.com/xnyzer/spfx-procview';

export interface IAboutFieldProps {
  linkText: string;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
  classNames: {
    root: string;
    hubAnchor: string;
    srOnly: string;
  };
}

/**
 * Info field at the end of the property pane: a link to the repository that opens in a new
 * tab without opener or referrer — `PropertyPaneLink` cannot set `rel`, so this is a custom
 * field. F-009 adds the version number here.
 */
export function renderAboutField(doc: Document, props: IAboutFieldProps): HTMLElement {
  const root = doc.createElement('p');
  root.className = props.classNames.root;
  root.appendChild(
    hubAnchor(doc, { url: REPOSITORY_URL, text: props.linkText, newTabHint: props.newTabHint }, props.classNames)
  );
  return root;
}
