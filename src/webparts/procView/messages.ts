import type { LinkErrorCode, LinkParseResult } from '../../providers/types';
import { LINK_ERROR_KEYS } from './linkErrors';

type StringKey = keyof IProcViewWebPartStrings;

/** Why the last image load failed — kept per image URL by the web part. */
export interface ILoadError {
  imageUrl: string;
  /** `blocked`: a security policy refused the image; `failed`: any other load error. */
  cause: 'failed' | 'blocked';
}

export type DiagramState =
  | { kind: 'ok' }
  | { kind: 'noLink' }
  | { kind: 'invalidLink'; error: LinkErrorCode }
  | { kind: 'loadFailed' }
  | { kind: 'blocked'; host: string };

/** What a message shows — `loc/` keys, resolved to texts by `resolveMessage`. */
export interface IMessageModel {
  tone: 'info' | 'error';
  titleKey?: StringKey;
  bodyKey: StringKey;
  detailKeys: StringKey[];
  /** Values for `{0}`, `{1}` … in title and body. */
  params: string[];
  /** Offer the "Configure" button (edit mode). */
  showConfigure: boolean;
  /** Offer the hub link as a way to the diagram (read mode, load errors). */
  showHubLink: boolean;
}

/** Render the diagram, render nothing, or render a message. */
export type Outcome = { kind: 'diagram' } | { kind: 'nothing' } | { kind: 'message'; message: IMessageModel };

/**
 * Combines the parsed link and the last load error into one state. A load error only
 * counts for the image URL it happened with — a changed link starts clean.
 */
export function resolveState(result: LinkParseResult, loadError: ILoadError | undefined): DiagramState {
  if (!result.ok) {
    return result.error === 'empty' ? { kind: 'noLink' } : { kind: 'invalidLink', error: result.error };
  }
  if (loadError && loadError.imageUrl === result.link.imageUrl) {
    return loadError.cause === 'blocked'
      ? { kind: 'blocked', host: hostOf(result.link.imageUrl) }
      : { kind: 'loadFailed' };
  }
  return { kind: 'ok' };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function message(partial: Partial<IMessageModel> & Pick<IMessageModel, 'bodyKey'>): IMessageModel {
  return { tone: 'error', detailKeys: [], params: [], showConfigure: false, showHubLink: false, ...partial };
}

/** Readers get short, neutral messages; editors get causes and a way to fix them. */
const READER_LOAD_FAILED = message({ bodyKey: 'MessageLoadFailedReader', showHubLink: true });

/** The state table of F-004: what editors and readers see in each state. */
export function outcomeFor(state: DiagramState, editMode: boolean): Outcome {
  switch (state.kind) {
    case 'ok':
      return { kind: 'diagram' };
    case 'noLink':
      return editMode
        ? {
            kind: 'message',
            message: message({
              tone: 'info',
              titleKey: 'MessageNoLinkTitle',
              bodyKey: 'MessageNoLinkBody',
              showConfigure: true
            })
          }
        : { kind: 'nothing' };
    case 'invalidLink':
      return {
        kind: 'message',
        message: editMode
          ? message({ titleKey: 'MessageInvalidLinkTitle', bodyKey: LINK_ERROR_KEYS[state.error], showConfigure: true })
          : message({ bodyKey: 'MessageUnavailableReader' })
      };
    case 'loadFailed':
      return {
        kind: 'message',
        message: editMode
          ? message({
              titleKey: 'MessageLoadFailedTitle',
              bodyKey: 'MessageLoadFailedCauses',
              detailKeys: ['CauseSharingRevoked', 'CauseLinkIncorrect', 'CauseDomainBlocked'],
              showConfigure: true
            })
          : READER_LOAD_FAILED
      };
    case 'blocked':
      return {
        kind: 'message',
        message: editMode
          ? message({ titleKey: 'MessageBlockedTitle', bodyKey: 'MessageBlockedBody', params: [state.host] })
          : READER_LOAD_FAILED
      };
  }
}

/** A message with its texts resolved — what `renderMessage` displays. */
export interface IMessageTexts {
  tone: 'info' | 'error';
  title?: string;
  body: string;
  details: string[];
  showConfigure: boolean;
  showHubLink: boolean;
}

function format(text: string, params: string[]): string {
  return params.reduce((result, value, index) => result.split(`{${index}}`).join(value), text);
}

/** Resolves the `loc/` keys of a message model; `{0}` … are replaced by the params. */
export function resolveMessage(model: IMessageModel, strings: IProcViewWebPartStrings): IMessageTexts {
  return {
    tone: model.tone,
    title: model.titleKey ? format(strings[model.titleKey], model.params) : undefined,
    body: format(strings[model.bodyKey], model.params),
    details: model.detailKeys.map((key) => strings[key]),
    showConfigure: model.showConfigure,
    showHubLink: model.showHubLink
  };
}

/** Every `loc/` key a message can use — for the completeness test. */
export const MESSAGE_KEYS: StringKey[] = [
  'MessageNoLinkTitle',
  'MessageNoLinkBody',
  'MessageInvalidLinkTitle',
  'MessageUnavailableReader',
  'MessageLoadFailedTitle',
  'MessageLoadFailedCauses',
  'MessageLoadFailedReader',
  'CauseSharingRevoked',
  'CauseLinkIncorrect',
  'CauseDomainBlocked',
  'MessageBlockedTitle',
  'MessageBlockedBody',
  'ConfigureButton'
];
