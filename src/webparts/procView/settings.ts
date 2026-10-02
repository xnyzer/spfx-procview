/**
 * Reading the web part's settings: everything SharePoint stores for the web part is page data
 * and untrusted — any field can hold any type. Every value is checked here and gets its default,
 * so the renderers only ever see validated values. Pure functions — no DOM, no SharePoint.
 */

import type { IDiagramLink } from '../../providers/types';
import { parseBackgroundColor } from './background';
import { parseHubLinkPosition, parseTextAlign } from './renderDiagram';
import type { IDiagramView, IHubLinkView, TextAlign } from './renderDiagram';
import { diagramStyles, parseDimension } from './sizing';
import type { Dimension, DimensionField } from './sizing';

/** The web part's settings as the property pane writes them. */
export interface IProcViewWebPartProps {
  /** The tool's image link, e.g. the Signavio "Simple image" link. */
  imageLink?: string;
  /** px, `NN%` of the column, or empty/`auto`. */
  width?: string;
  /** px or empty/`auto`. */
  height?: string;
  /** Position of a diagram narrower than its column: `left`, `center` (default) or `right`. */
  diagramAlign?: string;
  /** Alternative text of the image; empty → generic text. */
  altText?: string;
  /** Visible caption below the diagram; empty → none. */
  caption?: string;
  /** `left`, `center` (default) or `right`. */
  captionAlign?: string;
  /** Show the link to the tool's interactive view (Collaboration Hub). */
  showHubLink?: boolean;
  /** Link text; empty → default text. */
  hubLinkText?: string;
  /** `left`, `center` or `right` (default). */
  hubLinkAlign?: string;
  /** `below` (default) the diagram or `overlay` in its bottom-right corner. */
  hubLinkPosition?: string;
  /** Zoom and pan controls on the diagram (default off). */
  offerZoom?: boolean;
  /** Full-screen button on the diagram (default on — a missing value counts as on). */
  offerFullScreen?: boolean;
  /** Colour behind the transparent PNG (default on — a missing value counts as on). */
  showBackground?: boolean;
  /** `#rrggbb`; anything else counts as white. */
  backgroundColor?: string;
}

/** The settings as they really arrive: page data can hold any type in any field. */
export type UntrustedProps = { readonly [K in keyof IProcViewWebPartProps]?: unknown };

/** Settings with an alignment. */
export type AlignProperty = 'diagramAlign' | 'captionAlign' | 'hubLinkAlign';

/** Default alignment per setting: diagram and caption are centred, the hub link sits on the right. */
const ALIGN_DEFAULTS: Record<AlignProperty, TextAlign> = {
  diagramAlign: 'center',
  captionAlign: 'center',
  hubLinkAlign: 'right'
};

const AUTO: Dimension = { kind: 'auto' };

/**
 * Unicode ranges removed from editor texts: control characters other than whitespace, and the
 * explicit direction embeddings, overrides and isolates (U+202A–U+202E, U+2066–U+2069). Nobody
 * types them into a one-line setting on purpose, but they can hide text or show it reversed.
 */
const HIDDEN_CONTROL_RANGES: readonly (readonly [number, number])[] = [
  [0x0000, 0x0008],
  [0x000e, 0x001f],
  [0x007f, 0x009f],
  [0x202a, 0x202e],
  [0x2066, 0x2069]
];

/** Characters that draw nothing: whitespace, soft hyphen, zero-width characters and marks, BOM. */
const INVISIBLE = /[\s\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/g;

/** Texts the settings fall back to (from `loc/`). */
export type SettingsStrings = Pick<IProcViewWebPartStrings, 'DefaultAltText' | 'HubLinkDefaultText' | 'NewTabHint'>;

/** What the web part shows, read from its settings — every value checked, defaults applied. */
export interface ISettings {
  /** Fields of the diagram view that come straight from the settings (`renderDiagram`). */
  diagram: Pick<IDiagramView, 'style' | 'altText' | 'caption' | 'captionAlign' | 'hubLink' | 'background'>;
  /** "Offer zoom" — off by default. */
  offerZoom: boolean;
  /** "Offer full screen" — on by default. */
  offerFullScreen: boolean;
}

function isHiddenControl(code: number): boolean {
  return HIDDEN_CONTROL_RANGES.some(([first, last]) => code >= first && code <= last);
}

/**
 * Text of a setting: anything that is not a string counts as empty; control and direction
 * characters are removed; a text made of invisible characters only counts as empty, so the
 * default text applies instead of an empty-looking link or alt text.
 */
export function readText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const text = value
    .split('')
    .filter((character) => !isHiddenControl(character.charCodeAt(0)))
    .join('')
    .trim();
  return text.replace(INVISIBLE, '') === '' ? '' : text;
}

/** A toggle that is off by default: only an explicit `true` switches it on. */
export function isOn(value: unknown): boolean {
  return value === true;
}

/**
 * A toggle that is on by default: only an explicit `false` switches it off — also for web parts
 * saved before the setting existed.
 */
export function isOnByDefault(value: unknown): boolean {
  return value !== false;
}

/** Width or height; invalid values count as automatic (the pane shows the error). */
export function readDimension(value: unknown, field: DimensionField): Dimension {
  const result = parseDimension(value, field === 'width');
  return result.ok ? result.dimension : AUTO;
}

/** Alignment of a text setting; unknown values fall back to the setting's default. */
export function readAlign(props: UntrustedProps, property: AlignProperty): TextAlign {
  return parseTextAlign(props[property], ALIGN_DEFAULTS[property]);
}

/** Colour behind the PNG (`#rrggbb`), or `undefined` when switched off — on and white by default. */
export function readBackground(props: UntrustedProps): string | undefined {
  return isOnByDefault(props.showBackground) ? parseBackgroundColor(props.backgroundColor) : undefined;
}

/** Hub link, when switched on and the tool has an interactive view for the link. */
function readHubLink(
  props: UntrustedProps,
  link: IDiagramLink | undefined,
  strings: SettingsStrings
): IHubLinkView | undefined {
  if (!isOn(props.showHubLink) || !link?.hubUrl) {
    return undefined;
  }
  return {
    url: link.hubUrl,
    text: readText(props.hubLinkText) || strings.HubLinkDefaultText,
    position: parseHubLinkPosition(props.hubLinkPosition),
    align: readAlign(props, 'hubLinkAlign'),
    newTabHint: strings.NewTabHint
  };
}

/**
 * Reads all settings the page shows. `link` is the validated diagram link, if any — the hub
 * link is derived from it, never taken from the settings.
 */
export function readSettings(
  props: UntrustedProps,
  link: IDiagramLink | undefined,
  strings: SettingsStrings
): ISettings {
  return {
    diagram: {
      style: diagramStyles(
        readDimension(props.width, 'width'),
        readDimension(props.height, 'height'),
        readAlign(props, 'diagramAlign')
      ),
      altText: readText(props.altText) || strings.DefaultAltText,
      caption: readText(props.caption),
      captionAlign: readAlign(props, 'captionAlign'),
      hubLink: readHubLink(props, link, strings),
      background: readBackground(props)
    },
    offerZoom: isOn(props.offerZoom),
    offerFullScreen: isOnByDefault(props.offerFullScreen)
  };
}
