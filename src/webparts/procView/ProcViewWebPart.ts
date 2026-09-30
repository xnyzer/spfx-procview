import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  type IPropertyPaneCustomFieldProps,
  type IPropertyPaneField,
  PropertyPaneFieldType,
  PropertyPaneLabel,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';
import { parseDiagramLink } from '../../providers/registry';
import { LINK_ERROR_KEYS } from './linkErrors';
import { renderAlignmentButtons } from './alignmentField';
import { parseCaptionAlign, renderDiagram } from './renderDiagram';
import { dimensionErrorKey, imageStyle, parseDimension } from './sizing';
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
}

interface INaturalSize {
  imageUrl: string;
  width: number;
  height: number;
}

const AUTO: Dimension = { kind: 'auto' };

export default class ProcViewWebPart extends BaseClientSideWebPart<IProcViewWebPartProps> {
  /** Natural size of the image last loaded — shown as "maximum size" in the pane. */
  private _naturalSize: INaturalSize | undefined;

  public render(): void {
    const result = parseDiagramLink(this.properties.imageLink);
    const link = result.ok ? result.link : undefined;

    const view = renderDiagram(document, {
      link,
      style: imageStyle(this._dimension('width'), this._dimension('height')),
      altText: this._text(this.properties.altText) || strings.DefaultAltText,
      caption: this._text(this.properties.caption),
      captionAlign: parseCaptionAlign(this.properties.captionAlign),
      placeholderText: strings.NotConfiguredMessage,
      classNames: {
        root: styles.procView,
        figure: styles.figure,
        image: styles.image,
        caption: styles.caption,
        placeholder: styles.placeholder
      },
      onImageLoad: link ? (width, height) => this._onImageLoad(link.imageUrl, width, height) : undefined
    });
    this.domElement.replaceChildren(view);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--bodySubtext', semanticColors.bodySubtext || null);
    }

    // Theme changes after the first render must reach the elements already on the page
    if (this.renderedOnce) {
      this.render();
    }
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
                this._captionAlignField()
              ]
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
            }
          ]
        }
      ]
    };
  }

  /** Custom property pane field for the caption alignment (documented SPFx custom-field pattern). */
  private _captionAlignField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
    return {
      type: PropertyPaneFieldType.Custom,
      targetProperty: 'captionAlign',
      properties: {
        key: 'captionAlignField',
        onRender: (
          element: HTMLElement,
          _context?: unknown,
          changeCallback?: (targetProperty?: string, newValue?: unknown) => void
        ) => this._renderCaptionAlign(element, changeCallback),
        onDispose: (element: HTMLElement) => element.replaceChildren()
      }
    };
  }

  /** Compact icon toolbar for the caption alignment (custom property pane field). */
  private _renderCaptionAlign(
    element: HTMLElement,
    changeCallback?: (targetProperty?: string, newValue?: unknown) => void
  ): void {
    const toolbar = renderAlignmentButtons(document, {
      labelText: strings.CaptionAlignLabel,
      options: [
        { key: 'left', text: strings.AlignLeft },
        { key: 'center', text: strings.AlignCenter },
        { key: 'right', text: strings.AlignRight }
      ],
      selected: parseCaptionAlign(this.properties.captionAlign),
      idPrefix: this.instanceId,
      classNames: {
        root: styles.alignField,
        label: styles.alignLabel,
        group: styles.alignGroup,
        button: styles.alignButton,
        selected: styles.alignSelected
      },
      onChange: (key) => changeCallback?.('captionAlign', key)
    });
    element.replaceChildren(toolbar);
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
