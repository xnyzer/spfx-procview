import { DisplayMode, Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  type IPropertyPaneCustomFieldProps,
  type IPropertyPaneField,
  PropertyPaneChoiceGroup,
  PropertyPaneFieldType,
  PropertyPaneLabel,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';
import { parseDiagramLink } from '../../providers/registry';
import { LINK_ERROR_KEYS } from './linkErrors';
import { renderAboutField } from './aboutField';
import { renderAlignmentButtons } from './alignmentField';
import { outcomeFor, resolveMessage, resolveState } from './messages';
import type { ILoadError } from './messages';
import { parseHubLinkPosition, parseTextAlign, renderDiagram } from './renderDiagram';
import type { IHubLinkView, TextAlign } from './renderDiagram';
import { renderMessage } from './renderMessage';
import { applyThemeVariables } from './theme';
import { trackImageViolations } from './violationTracker';
import type { IViolationTracker } from './violationTracker';
import { diagramStyles, dimensionErrorKey, parseDimension } from './sizing';
import type { Dimension, DimensionField } from './sizing';

export interface IProcViewWebPartProps {
  /** The tool's image link, e.g. the Signavio "Simple image" link. */
  imageLink?: string;
  /** px, `NN%` of the column, or empty/`auto`. */
  width?: string;
  /** px or empty/`auto`. */
  height?: string;
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
}

type AlignProperty = 'captionAlign' | 'hubLinkAlign';

/** Default alignment per setting: the caption is centred, the hub link sits on the right. */
const ALIGN_DEFAULTS: Record<AlignProperty, TextAlign> = { captionAlign: 'center', hubLinkAlign: 'right' };

interface INaturalSize {
  imageUrl: string;
  width: number;
  height: number;
}

const AUTO: Dimension = { kind: 'auto' };

export default class ProcViewWebPart extends BaseClientSideWebPart<IProcViewWebPartProps> {
  /** Natural size of the image last loaded — shown as "maximum size" in the pane. */
  private _naturalSize: INaturalSize | undefined;
  /** Last failed image load; only counts for the image URL it happened with. */
  private _loadError: ILoadError | undefined;
  /** Security-policy violations for images — tells "blocked" from other load errors. */
  private _violations: IViolationTracker | undefined;

  protected onInit(): Promise<void> {
    this._violations = trackImageViolations(document, () => this._onViolation());
    return super.onInit();
  }

  protected onDispose(): void {
    this._violations?.dispose();
    this._violations = undefined;
    super.onDispose();
  }

  public render(): void {
    const result = parseDiagramLink(this.properties.imageLink);
    const link = result.ok ? result.link : undefined;
    const outcome = outcomeFor(resolveState(result, this._loadError), this.displayMode === DisplayMode.Edit);

    if (outcome.kind === 'nothing') {
      this.domElement.replaceChildren();
      return;
    }

    const hubLink: IHubLinkView | undefined =
      this.properties.showHubLink === true && link?.hubUrl
        ? {
            url: link.hubUrl,
            text: this._text(this.properties.hubLinkText) || strings.HubLinkDefaultText,
            position: parseHubLinkPosition(this.properties.hubLinkPosition),
            align: this._align('hubLinkAlign'),
            newTabHint: strings.NewTabHint
          }
        : undefined;

    if (outcome.kind === 'message') {
      this.domElement.replaceChildren(
        renderMessage(document, {
          texts: resolveMessage(outcome.message, strings),
          configureLabel: strings.ConfigureButton,
          onConfigure: () => this.context.propertyPane.open(),
          // In a message the hub link always sits below it
          hubLink: hubLink ? { ...hubLink, position: 'below' } : undefined,
          classNames: {
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
          }
        })
      );
      return;
    }

    const view = renderDiagram(document, {
      link,
      style: diagramStyles(this._dimension('width'), this._dimension('height')),
      altText: this._text(this.properties.altText) || strings.DefaultAltText,
      caption: this._text(this.properties.caption),
      captionAlign: this._align('captionAlign'),
      hubLink,
      placeholderText: strings.NotConfiguredMessage,
      classNames: {
        root: styles.procView,
        figure: styles.figure,
        frame: styles.frame,
        image: styles.image,
        caption: styles.caption,
        placeholder: styles.placeholder,
        hubLink: styles.hubLink,
        hubAnchor: styles.hubAnchor,
        hubOverlay: styles.hubOverlay,
        srOnly: styles.srOnly
      },
      onImageLoad: link ? (width, height) => this._onImageLoad(link.imageUrl, width, height) : undefined,
      onImageError: link ? () => this._onImageError(link.imageUrl) : undefined
    });
    this.domElement.replaceChildren(view);
  }

  protected onDisplayModeChanged(): void {
    // Editors and readers see different messages (F-004 state table)
    this.render();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    // On a coloured section this is the section's theme variant — every colour on the page
    // comes from these variables (theme.ts); they cascade to the rendered elements, so no
    // re-render is needed
    applyThemeVariables(this.domElement.style, currentTheme);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.DiagramGroupName,
              groupFields: [
                PropertyPaneTextField('imageLink', {
                  label: strings.ImageLinkLabel,
                  description: strings.ImageLinkDescription,
                  placeholder: 'https://',
                  onGetErrorMessage: (value: string) => this._validateLink(value),
                  deferredValidationTime: 500
                }),
                // Read-only info — the target is a label id, not a stored property
                PropertyPaneLabel('naturalSizeInfo', {
                  text: this._naturalSizeText()
                })
              ]
            },
            {
              groupName: strings.CaptionGroupName,
              groupFields: [
                PropertyPaneTextField('caption', {
                  label: strings.CaptionLabel,
                  description: strings.CaptionDescription
                }),
                this._alignField('captionAlign', strings.CaptionAlignLabel)
              ]
            },
            {
              groupName: strings.HubLinkGroupName,
              groupFields: this._hubLinkFields()
            },
            {
              groupName: strings.SizeGroupName,
              groupFields: [
                PropertyPaneTextField('width', {
                  label: strings.WidthLabel,
                  description: strings.WidthDescription,
                  placeholder: 'auto',
                  onGetErrorMessage: (value: string) => this._validateDimension(value, 'width'),
                  deferredValidationTime: 300
                }),
                PropertyPaneTextField('height', {
                  label: strings.HeightLabel,
                  description: strings.HeightDescription,
                  placeholder: 'auto',
                  onGetErrorMessage: (value: string) => this._validateDimension(value, 'height'),
                  deferredValidationTime: 300
                })
              ]
            },
            {
              groupName: strings.AccessibilityGroupName,
              groupFields: [
                PropertyPaneTextField('altText', {
                  label: strings.AltTextLabel,
                  description: strings.AltTextDescription
                })
              ]
            },
            {
              groupName: strings.AboutGroupName,
              groupFields: [this._aboutField()]
            }
          ]
        }
      ]
    };
  }

  /** Hub link settings — text and position appear only while the link is switched on; the
   * alignment only for the position below the diagram (the overlay is always bottom right). */
  private _hubLinkFields(): IPropertyPaneField<unknown>[] {
    const fields: IPropertyPaneField<unknown>[] = [
      PropertyPaneToggle('showHubLink', {
        label: strings.ShowHubLinkLabel,
        onText: strings.ToggleOn,
        offText: strings.ToggleOff
      })
    ];
    const position = parseHubLinkPosition(this.properties.hubLinkPosition);
    if (this.properties.showHubLink === true) {
      fields.push(
        PropertyPaneTextField('hubLinkText', {
          label: strings.HubLinkTextLabel,
          description: strings.HubLinkTextDescription,
          placeholder: strings.HubLinkDefaultText
        }),
        PropertyPaneChoiceGroup('hubLinkPosition', {
          label: strings.HubLinkPositionLabel,
          options: [
            { key: 'below', text: strings.PositionBelow, checked: position === 'below' },
            { key: 'overlay', text: strings.PositionOverlay, checked: position === 'overlay' }
          ]
        })
      );
      if (position === 'below') {
        fields.push(this._alignField('hubLinkAlign', strings.HubLinkAlignLabel));
      }
    }
    return fields;
  }

  /** Alignment of a text setting, falling back to its default for unknown values. */
  private _align(property: AlignProperty): TextAlign {
    return parseTextAlign(this.properties[property], ALIGN_DEFAULTS[property]);
  }

  /** Custom property pane field with the alignment toolbar (documented SPFx custom-field pattern). */
  private _alignField(property: AlignProperty, labelText: string): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return {
      type: PropertyPaneFieldType.Custom,
      targetProperty: property,
      properties: {
        key: `${property}Field`,
        onRender: (
          element: HTMLElement,
          _context?: unknown,
          changeCallback?: (targetProperty?: string, newValue?: unknown) => void
        ) =>
          element.replaceChildren(
            renderAlignmentButtons(document, {
              labelText,
              options: [
                { key: 'left', text: strings.AlignLeft },
                { key: 'center', text: strings.AlignCenter },
                { key: 'right', text: strings.AlignRight }
              ],
              selected: this._align(property),
              idPrefix: `${this.instanceId}-${property}`,
              classNames: {
                root: styles.alignField,
                label: styles.alignLabel,
                group: styles.alignGroup,
                button: styles.alignButton,
                selected: styles.alignSelected
              },
              onChange: (key) => changeCallback?.(property, key)
            })
          ),
        onDispose: (element: HTMLElement) => element.replaceChildren()
      }
    };
  }

  /** Info field with the repository link — read-only, the target is a field id, not a stored property. */
  private _aboutField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return {
      type: PropertyPaneFieldType.Custom,
      targetProperty: 'aboutInfo',
      properties: {
        key: 'aboutInfoField',
        onRender: (element: HTMLElement) =>
          element.replaceChildren(
            renderAboutField(document, {
              linkText: strings.RepositoryLinkText,
              newTabHint: strings.NewTabHint,
              classNames: { root: styles.aboutField, hubAnchor: styles.hubAnchor, srOnly: styles.srOnly }
            })
          ),
        onDispose: (element: HTMLElement) => element.replaceChildren()
      }
    };
  }

  /** Re-evaluates the pane when the hub link is switched on or off (conditional fields). */
  protected onPropertyPaneFieldChanged(propertyPath: string): void {
    if (propertyPath === 'showHubLink' || propertyPath === 'hubLinkPosition') {
      this.context.propertyPane.refresh();
    }
  }

  /** Trimmed text of a property — web part properties are untrusted, non-strings count as empty. */
  private _text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
  }

  /** Parsed width/height; invalid values fall back to automatic (the pane shows the error). */
  private _dimension(field: DimensionField): Dimension {
    const result = parseDimension(this.properties[field], field === 'width');
    return result.ok ? result.dimension : AUTO;
  }

  private _validateLink(value: string): string {
    const result = parseDiagramLink(value);
    // An empty link is not an error — the web part simply shows its placeholder
    if (result.ok || result.error === 'empty') {
      return '';
    }
    return strings[LINK_ERROR_KEYS[result.error]];
  }

  private _validateDimension(value: string, field: DimensionField): string {
    const result = parseDimension(value, field === 'width');
    return result.ok ? '' : strings[dimensionErrorKey(result.error, field)];
  }

  private _naturalSizeText(): string {
    const result = parseDiagramLink(this.properties.imageLink);
    const size = this._naturalSize;
    if (result.ok && size && size.imageUrl === result.link.imageUrl) {
      return strings.NaturalSizeKnown.replace('{0}', String(size.width)).replace('{1}', String(size.height));
    }
    return strings.NaturalSizeUnknown;
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
