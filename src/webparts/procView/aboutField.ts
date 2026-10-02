import { createExternalLink } from './externalLink';

/** Public repository of this web part — source code, documentation and issue tracker. */
export const REPOSITORY_URL = 'https://github.com/xnyzer/spfx-procview';

/** A release version as the build writes it into the manifest: `x.y.z` from package.json. */
const RELEASE_VERSION = /^\d+\.\d+\.\d+$/;

/** Texts and classes of the "About" field in the property pane. */
export interface IAboutFieldProps {
  linkText: string;
  /** Screen-reader-only note appended to the link text, e.g. "(opens in a new tab)". */
  newTabHint: string;
  /** Shown below the link, e.g. "Version 1.0.0"; left out when empty or missing. */
  versionText?: string;
  classNames: {
    root: string;
    anchor: string;
    srOnly: string;
    version: string;
  };
}

/**
 * The web part's version from its manifest (`"version": "*"` there is package.json's version),
 * or `undefined` when it does not look like `x.y.z` — then the pane shows no version at all.
 */
export function readVersion(value: unknown): string | undefined {
  return typeof value === 'string' && RELEASE_VERSION.test(value) ? value : undefined;
}

/**
 * Info field at the end of the property pane: a link to the repository that opens in a new
 * tab without opener or referrer — `PropertyPaneLink` cannot set `rel`, so this is a custom
 * field — and the version below it.
 */
export function renderAboutField(doc: Document, props: IAboutFieldProps): HTMLElement {
  const root = doc.createElement('p');
  root.className = props.classNames.root;
  root.appendChild(
    createExternalLink(
      doc,
      { url: REPOSITORY_URL, text: props.linkText, newTabHint: props.newTabHint },
      props.classNames
    )
  );
  if (props.versionText) {
    const version = doc.createElement('span');
    version.className = props.classNames.version;
    version.textContent = props.versionText;
    root.appendChild(version);
  }
  return root;
}
