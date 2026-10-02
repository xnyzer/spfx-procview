/**
 * The web part's property pane: groups, fields and their validation, built from the current
 * settings on every `getPropertyPaneConfiguration()` call.
 */

import {
  type IPropertyPaneConfiguration,
  type IPropertyPaneCustomFieldProps,
  type IPropertyPaneField,
  type IPropertyPaneGroup,
  PropertyPaneChoiceGroup,
  PropertyPaneLabel,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';
import { parseDiagramLink } from '../../providers/registry';
import { renderAboutField } from './aboutField';
import { renderAlignmentButtons } from './alignmentField';
import { renderColorField } from './colorField';
import { customPaneField } from './customPaneField';
import { LINK_ERROR_KEYS } from './linkErrors';
import { readPaneSettings } from './settings';
import type { AlignProperty, IPaneSettings, IProcViewWebPartProps } from './settings';
import { dimensionErrorText, parseDimension } from './sizing';
import type { DimensionField } from './sizing';

/** Pause before the link is checked while typing — a half-pasted link is not flagged yet. */
const LINK_VALIDATION_DELAY_MS = 500;
/** Pause before width and height are checked while typing. */
const DIMENSION_VALIDATION_DELAY_MS = 300;

/** Settings that show or hide other fields — the pane is refreshed when they change. */
export const CONDITIONAL_FIELD_PROPERTIES: readonly string[] = ['showHubLink', 'hubLinkPosition', 'showBackground'];

/** What the pane needs from the web part. */
export interface IPaneSource {
  properties: IProcViewWebPartProps;
  /** Unique per web part instance — keeps the ids and keys of the custom fields apart. */
  instanceId: string;
  /** Read-only info on the loaded image ("maximum size"). */
  naturalSizeText: string;
}

/** What the field builders work from: the web part's source and its checked settings. */
interface IPane extends IPaneSource {
  settings: IPaneSettings;
}

/**
 * The whole property pane: one page with the groups in the order editors work through them —
 * the diagram and its description, its size and position, the texts around it, what readers
 * can do with it, and the about info last.
 */
export function propertyPaneConfiguration(source: IPaneSource): IPropertyPaneConfiguration {
  const pane: IPane = { ...source, settings: readPaneSettings(source.properties) };
  return {
    pages: [
      {
        header: { description: strings.PropertyPaneDescription },
        groups: [
          diagramGroup(),
          sizeGroup(pane),
          {
            groupName: strings.CaptionGroupName,
            groupFields: [
              PropertyPaneTextField('caption', {
                label: strings.CaptionLabel,
                description: strings.CaptionDescription
              }),
              alignField(pane, 'captionAlign', strings.CaptionAlignLabel)
            ]
          },
          { groupName: strings.HubLinkGroupName, groupFields: hubLinkFields(pane) },
          viewingGroup(pane),
          { groupName: strings.AboutGroupName, groupFields: [aboutField(pane)] }
        ]
      }
    ]
  };
}

/** Image link and the alternative text that describes the image. */
function diagramGroup(): IPropertyPaneGroup {
  return {
    groupName: strings.DiagramGroupName,
    groupFields: [
      PropertyPaneTextField('imageLink', {
        label: strings.ImageLinkLabel,
        description: strings.ImageLinkDescription,
        placeholder: 'https://',
        onGetErrorMessage: validateLink,
        deferredValidationTime: LINK_VALIDATION_DELAY_MS
      }),
      PropertyPaneTextField('altText', { label: strings.AltTextLabel, description: strings.AltTextDescription })
    ]
  };
}

/** Hub link settings — text and position appear only while the link is switched on; the
 * alignment only for the position below the diagram (the overlay is always bottom right). */
function hubLinkFields(pane: IPane): IPropertyPaneField<unknown>[] {
  const fields: IPropertyPaneField<unknown>[] = [
    PropertyPaneToggle('showHubLink', {
      label: strings.ShowHubLinkLabel,
      onText: strings.ToggleOn,
      offText: strings.ToggleOff
    })
  ];
  const { showHubLink, hubLinkPosition: position } = pane.settings;
  if (showHubLink) {
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
      fields.push(alignField(pane, 'hubLinkAlign', strings.HubLinkAlignLabel));
    }
  }
  return fields;
}

/** The natural size as orientation, then width, height and the position in the column. */
function sizeGroup(pane: IPane): IPropertyPaneGroup {
  return {
    groupName: strings.SizeGroupName,
    groupFields: [
      // Read-only info — the target is a label id, not a stored property
      PropertyPaneLabel('naturalSizeInfo', { text: pane.naturalSizeText }),
      PropertyPaneTextField('width', {
        label: strings.WidthLabel,
        description: strings.WidthDescription,
        placeholder: 'auto',
        onGetErrorMessage: (value: string) => validateDimension(value, 'width'),
        deferredValidationTime: DIMENSION_VALIDATION_DELAY_MS
      }),
      PropertyPaneTextField('height', {
        label: strings.HeightLabel,
        description: strings.HeightDescription,
        placeholder: 'auto',
        onGetErrorMessage: (value: string) => validateDimension(value, 'height'),
        deferredValidationTime: DIMENSION_VALIDATION_DELAY_MS
      }),
      alignField(pane, 'diagramAlign', strings.DiagramAlignLabel)
    ]
  };
}

/** Zoom, full screen and the background — own group: a toggle right below a text field's
 * description sits too close to it. */
function viewingGroup(pane: IPane): IPropertyPaneGroup {
  return {
    groupName: strings.ViewingGroupName,
    groupFields: [
      PropertyPaneToggle('offerZoom', {
        label: strings.OfferZoomLabel,
        onText: strings.ToggleOn,
        offText: strings.ToggleOff
      }),
      PropertyPaneToggle('offerFullScreen', {
        label: strings.OfferFullScreenLabel,
        onText: strings.ToggleOn,
        offText: strings.ToggleOff,
        // Shows the default for web parts saved before the setting existed
        checked: pane.settings.offerFullScreen
      }),
      ...backgroundFields(pane)
    ]
  };
}

/** Background toggle and, only while it is on, the colour (default on and white). */
function backgroundFields(pane: IPane): IPropertyPaneField<unknown>[] {
  const isBackgroundOn = pane.settings.showBackground;
  const fields: IPropertyPaneField<unknown>[] = [
    PropertyPaneToggle('showBackground', {
      label: strings.ShowBackgroundLabel,
      onText: strings.ToggleOn,
      offText: strings.ToggleOff,
      // Shows the default for web parts saved before the setting existed
      checked: isBackgroundOn
    })
  ];
  if (isBackgroundOn) {
    fields.push(colorField(pane));
  }
  return fields;
}

/** Alignment toolbar (alignmentField.ts). */
function alignField(
  pane: IPane,
  property: AlignProperty,
  labelText: string
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField(pane.instanceId, property, (onChange) =>
    renderAlignmentButtons(document, {
      labelText,
      options: [
        { key: 'left', text: strings.AlignLeft },
        { key: 'center', text: strings.AlignCenter },
        { key: 'right', text: strings.AlignRight }
      ],
      selected: pane.settings.align[property],
      idPrefix: `${pane.instanceId}-${property}`,
      classNames: {
        root: styles.alignField,
        label: styles.alignLabel,
        group: styles.alignGroup,
        button: styles.alignButton,
        selected: styles.alignSelected
      },
      onChange
    })
  );
}

/** The browser's colour picker (colorField.ts). */
function colorField(pane: IPane): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField(pane.instanceId, 'backgroundColor', (onChange) =>
    renderColorField(document, {
      labelText: strings.BackgroundColorLabel,
      value: pane.settings.backgroundColor,
      idPrefix: `${pane.instanceId}-backgroundColor`,
      classNames: { root: styles.colorField, label: styles.colorLabel, input: styles.colorInput },
      onChange
    })
  );
}

/** Repository link — read-only (aboutField.ts). */
function aboutField(pane: IPane): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField(pane.instanceId, 'aboutInfo', () =>
    renderAboutField(document, {
      linkText: strings.RepositoryLinkText,
      newTabHint: strings.NewTabHint,
      classNames: { root: styles.aboutField, anchor: styles.hubAnchor, srOnly: styles.srOnly }
    })
  );
}

function validateLink(value: string): string {
  const result = parseDiagramLink(value);
  // An empty link is not an error — the web part shows its guidance message instead
  if (result.ok || result.error === 'empty') {
    return '';
  }
  return strings[LINK_ERROR_KEYS[result.error]];
}

function validateDimension(value: string, field: DimensionField): string {
  const result = parseDimension(value, field === 'width');
  return result.ok ? '' : dimensionErrorText(result.error, field, strings);
}
