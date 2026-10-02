/**
 * Contract between the web part and the process tools it can display.
 * Providers are pure: they only parse and validate text — no DOM, no network.
 */

/**
 * Why an input was rejected. The UI (F-002) maps each code to a localized message;
 * `embedCode` and `notImageLink` carry the hint to use the tool's image link instead.
 */
export type LinkErrorCode =
  | 'empty'
  | 'unsupported'
  | 'notUrl'
  | 'notHttps'
  | 'unknownHost'
  | 'embedCode'
  | 'notImageLink'
  | 'missingAuthKey'
  | 'invalidModelId'
  | 'invalidAuthKey';

/** A validated diagram link, rebuilt from checked parts — never the raw input. */
export interface IDiagramLink {
  /** Id of the provider that recognised the link, e.g. `signavio`. */
  providerId: string;
  /** The tool's id of the diagram/model. */
  modelId: string;
  /** Normalised URL of the diagram image, safe to use as `<img src>`. */
  imageUrl: string;
  /** Link to the interactive view in the tool, if the tool has one. */
  hubUrl?: string;
}

/** Result of parsing a link: the validated link or the reason it was rejected. */
export type LinkParseResult = { ok: true; link: IDiagramLink } | { ok: false; error: LinkErrorCode };

/** A process tool the web part can show diagrams from (one per tool, see registry.ts). */
export interface IProcessToolProvider {
  readonly id: string;
  /**
   * Parses trimmed, non-empty input. Returns `undefined` when the input does not belong
   * to this tool at all, so the registry can ask the next provider; returns a failure
   * result when it is this tool's input but invalid.
   */
  parse(input: string): LinkParseResult | undefined;
}
