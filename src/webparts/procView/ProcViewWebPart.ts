import { DisplayMode, Log, Version } from '@microsoft/sp-core-library';
import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';
import { parseDiagramLink } from '../../providers/registry';
import type { IDiagramLink, LinkParseResult } from '../../providers/types';
import { readVersion } from './aboutField';
import { assertNever } from './assertNever';
import { format, outcomeFor, resolveMessage, resolveState } from './messages';
import type { ILoadError, IMessageModel } from './messages';
import { createLifecycleGuard } from './lifecycleGuard';
import { CONDITIONAL_FIELD_PROPERTIES, propertyPaneConfiguration } from './propertyPane';
import { renderDiagram } from './renderDiagram';
import type { IDiagramView } from './renderDiagram';
import { renderMessage } from './renderMessage';
import type { IMessageView } from './renderMessage';
import { readSettings } from './settings';
import type { IProcViewWebPartProps, ISettings } from './settings';
import { applyVariables, themeVariables } from './theme';
import { followTeamsTheme, teamsThemeVariables } from './teamsTheme';
import type { TeamsTheme } from './teamsTheme';
import { trackImageViolations } from './violationTracker';
import type { IViolationTracker } from './violationTracker';
import type { IZoomClassNames, IZoomController, IZoomLabels } from './zoomView';
import { openLightbox } from './lightbox';
import type { ILightbox } from './lightbox';

const DIAGRAM_CLASS_NAMES: IDiagramView['classNames'] = {
  root: styles.procView,
  figure: styles.figure,
  frame: styles.frame,
  controlBar: styles.controlBar,
  image: styles.image,
  caption: styles.caption,
  hubLink: styles.hubLink,
  hubAnchor: styles.hubAnchor,
  hubOverlay: styles.hubOverlay,
  srOnly: styles.srOnly
};

const MESSAGE_CLASS_NAMES: IMessageView['classNames'] = {
  root: styles.procView,
  message: styles.message,
  info: styles.messageInfo,
  error: styles.messageError,
  title: styles.messageTitle,
  body: styles.messageBody,
  details: styles.messageDetails,
  configure: styles.configureButton,
  hubLink: styles.hubLink,
  hubAnchor: styles.hubAnchor,
  srOnly: styles.srOnly
};

const ZOOM_LABELS: IZoomLabels = {
  zoomIn: strings.ZoomIn,
  zoomOut: strings.ZoomOut,
  reset: strings.ZoomReset,
  viewport: strings.ZoomViewportLabel
};

/** Zoom classes; `controls` places the zoom buttons (on the page or in full screen). */
function zoomClassNames(controls: string): IZoomClassNames {
  return { zoomable: styles.zoomable, zoomed: styles.zoomed, controls, button: styles.zoomButton };
}

/** Source name for SharePoint's log. */
const LOG_SOURCE = 'ProcViewWebPart';

interface INaturalSize {
  imageUrl: string;
  width: number;
  height: number;
}

/**
 * The ProcView web part: shows a process diagram from a shared image link on a SharePoint page or
 * in a Teams tab, with its property pane, empty and error states, zoom and full screen.
 */
export default class ProcViewWebPart extends BaseClientSideWebPart<IProcViewWebPartProps> {
  /** Natural size of the image last loaded — shown as "maximum size" in the pane. */
  private _naturalSize: INaturalSize | undefined;
  /** Last failed image load; only counts for the image URL it happened with. */
  private _loadError: ILoadError | undefined;
  /** Security-policy violations for images — tells "blocked" from other load errors. */
  private _violations: IViolationTracker | undefined;
  /** Zoom on the current diagram ("Offer zoom"); replaced on every render. */
  private _zoom: IZoomController | undefined;
  /** Open full-screen view, if any — closed when the web part goes away. */
  private _lightbox: ILightbox | undefined;
  /** The current diagram's full-screen button — the focus returns to it when the view closes. */
  private _fullScreenButton: HTMLButtonElement | undefined;
  /** SharePoint theme (on a coloured section: the section's variant) from `onThemeChanged`. */
  private _siteTheme: IReadonlyTheme | undefined;
  /** Teams theme when hosted in Teams; `default` elsewhere. */
  private _teamsTheme: TeamsTheme = 'default';
  /** Silences image events of replaced diagrams and every callback after dispose. */
  private readonly _guard = createLifecycleGuard();

  // --- Lifecycle --------------------------------------------------------------------------

  protected onInit(): Promise<void> {
    this._violations = trackImageViolations(document, () => this._onViolation());
    // In Teams the web part gets the SharePoint site theme, not the Teams theme — follow Teams'
    // dark and high-contrast themes (TeamsJS ships with SPFx)
    const teams = this.context.sdks.microsoftTeams;
    if (teams) {
      followTeamsTheme(
        teams.teamsJs,
        this._guard.forLifetime((theme: TeamsTheme) => {
          this._teamsTheme = theme;
          this._applyTheme();
        }),
        // The SharePoint colours stay — the web part remains usable
        (error) => Log.warn(LOG_SOURCE, `Teams theme not applied: ${String(error)}`, this.context.serviceScope)
      );
    }
    return super.onInit();
  }

  protected onDispose(): void {
    this._guard.dispose();
    this._disposeZoom();
    this._lightbox?.close();
    this._lightbox = undefined;
    this._violations?.dispose();
    this._violations = undefined;
    super.onDispose();
  }

  protected onDisplayModeChanged(): void {
    // Editors and readers see different messages (F-004 state table)
    this.render();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    // On a coloured section this is the section's theme variant — every colour on the page
    // comes from these variables (theme.ts); they cascade to the rendered elements, so no
    // re-render is needed
    this._siteTheme = currentTheme;
    this._applyTheme();
  }

  /** Teams' dark/high-contrast palette when hosted there, otherwise the SharePoint theme. */
  private _applyTheme(): void {
    applyVariables(this.domElement.style, teamsThemeVariables(this._teamsTheme) ?? themeVariables(this._siteTheme));
  }

  /**
   * Version of the stored settings, not of the release: it stays 1.0 as long as every stored
   * value keeps its meaning — new settings bring their own code fallback, so no page needs a
   * migration. Raise it only when the meaning of a stored value changes (README "Versioning
   * and releases").
   */
  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  // --- Rendering --------------------------------------------------------------------------

  public render(): void {
    if (this._guard.isDisposed) {
      return;
    }
    // Every render builds a new diagram: the old zoom's listeners and observer must go, and the
    // replaced image's late load/error events must not reach the web part any more
    this._guard.nextRender();
    this._disposeZoom();
    this._fullScreenButton = undefined;
    const result = parseDiagramLink(this.properties.imageLink);
    this._dropOtherLoadError(result);
    const settings = readSettings(this.properties, result.ok ? result.link : undefined, strings);
    const outcome = outcomeFor(resolveState(result, this._loadError), this.displayMode === DisplayMode.Edit);
    switch (outcome.kind) {
      case 'nothing':
        this.domElement.replaceChildren();
        return;
      case 'message':
        this.domElement.replaceChildren(this._messageView(outcome.message, settings));
        return;
      case 'diagram':
        this.domElement.replaceChildren(this._diagramView(outcome.link, settings));
        return;
      default:
        assertNever(outcome);
    }
  }

  /** Empty or error state; a hub link always sits below the message (renderMessage.ts). */
  private _messageView(message: IMessageModel, settings: ISettings): HTMLElement {
    return renderMessage(document, {
      texts: resolveMessage(message, strings),
      configureLabel: strings.ConfigureButton,
      onConfigure: () => this.context.propertyPane.open(),
      hubLink: settings.diagram.hubLink,
      classNames: MESSAGE_CLASS_NAMES
    });
  }

  private _diagramView(link: IDiagramLink, settings: ISettings): HTMLElement {
    return renderDiagram(document, {
      ...settings.diagram,
      link,
      zoom: settings.offerZoom
        ? {
            labels: ZOOM_LABELS,
            classNames: zoomClassNames(styles.zoomControls),
            onAttach: (controller) => (this._zoom = controller)
          }
        : undefined,
      fullScreen: settings.offerFullScreen
        ? {
            label: strings.FullScreen,
            className: styles.zoomButton,
            onOpen: (button) => this._openFullScreen(link, settings, button),
            onAttach: (button) => (this._fullScreenButton = button)
          }
        : undefined,
      classNames: DIAGRAM_CLASS_NAMES,
      onImageLoad: this._guard.forRender((width: number, height: number) =>
        this._onImageLoad(link.imageUrl, width, height)
      ),
      onImageError: this._guard.forRender(() => this._onImageError(link.imageUrl))
    });
  }

  /** Full-screen view of the diagram: only the image, zoom and a close button (lightbox.ts). */
  private _openFullScreen(link: IDiagramLink, settings: ISettings, opener: HTMLElement): void {
    this._lightbox?.close();
    this._lightbox = openLightbox(document, {
      imageUrl: link.imageUrl,
      altText: settings.diagram.altText,
      opener,
      // The background switch applies here as on the page (owner decision 2026-10-02)
      background: settings.diagram.background,
      labels: { close: strings.CloseFullScreen, loadFailed: strings.MessageLoadFailedTitle, zoom: ZOOM_LABELS },
      classNames: {
        dialog: styles.lightbox,
        frame: styles.lightboxFrame,
        image: styles.lightboxImage,
        close: styles.lightboxClose,
        message: styles.lightboxMessage,
        zoom: zoomClassNames(styles.lightboxZoomControls)
      },
      // Not after dispose: onDispose closes the view itself
      onClose: this._guard.forLifetime(() => this._onFullScreenClosed())
    });
  }

  /**
   * Forgets the closed view. If a re-render replaced the full-screen button while the view was
   * open, the focus could not go back to it — give it to the current one instead.
   */
  private _onFullScreenClosed(): void {
    this._lightbox = undefined;
    if (document.activeElement && document.activeElement !== document.body) {
      return;
    }
    this._fullScreenButton?.focus();
  }

  private _disposeZoom(): void {
    this._zoom?.dispose();
    this._zoom = undefined;
  }

  // --- Property pane ----------------------------------------------------------------------

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return propertyPaneConfiguration({
      properties: this.properties,
      // From the context: the local workbench's stand-in base class has no `instanceId` getter
      // (SharePoint's returns the same value), and one id for all web parts kept the custom
      // fields showing the previous web part's value
      instanceId: this.context.instanceId,
      naturalSizeText: this._naturalSizeText(),
      version: this._readVersion()
    });
  }

  /** The release version from the manifest; a host without one (a stand-in) shows none. */
  private _readVersion(): string | undefined {
    const manifest: { version?: unknown } | undefined = this.context.manifest;
    return readVersion(manifest?.version);
  }

  /** Re-evaluates the pane when a setting with conditional fields is switched. */
  protected onPropertyPaneFieldChanged(propertyPath: string): void {
    if (CONDITIONAL_FIELD_PROPERTIES.indexOf(propertyPath) >= 0) {
      this.context.propertyPane.refresh();
    }
  }

  private _naturalSizeText(): string {
    const result = parseDiagramLink(this.properties.imageLink);
    const size = this._naturalSize;
    if (result.ok && size && size.imageUrl === result.link.imageUrl) {
      return format(strings.NaturalSizeKnown, [String(size.width), String(size.height)]);
    }
    return strings.NaturalSizeUnknown;
  }

  // --- Image events -----------------------------------------------------------------------

  /**
   * A load error counts only while its link stays entered (owner decision 2026-10-02): another
   * link — or none — drops it, so a link entered again loads again, and a late policy violation
   * can no longer upgrade the error of a link that is gone.
   */
  private _dropOtherLoadError(result: LinkParseResult): void {
    const error = this._loadError;
    if (error && !(result.ok && result.link.imageUrl === error.imageUrl)) {
      this._loadError = undefined;
    }
  }

  private _onImageError(imageUrl: string): void {
    this._loadError = { imageUrl, cause: this._violations?.isBlocked(imageUrl) ? 'blocked' : 'failed' };
    this.render();
  }

  /** A policy violation may be reported after the image's error event — upgrade the cause. */
  private _onViolation(): void {
    const error = this._loadError;
    if (error && error.cause === 'failed' && this._violations?.isBlocked(error.imageUrl)) {
      this._loadError = { ...error, cause: 'blocked' };
      this.render();
    }
  }

  private _onImageLoad(imageUrl: string, width: number, height: number): void {
    const previous = this._naturalSize;
    if (previous && previous.imageUrl === imageUrl && previous.width === width && previous.height === height) {
      return;
    }
    this._naturalSize = { imageUrl, width, height };
    if (this.context.propertyPane.isPropertyPaneOpen()) {
      this.context.propertyPane.refresh();
    }
  }
}
