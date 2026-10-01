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
  PropertyPaneFieldType,
  PropertyPaneLabel,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';
import { parseDiagramLink } from '../../providers/registry';
import { renderAboutField } from './aboutField';
import { renderAlignmentButtons } from './alignmentField';
import { parseBackgroundColor } from './background';
import { renderColorField } from './colorField';
import { LINK_ERROR_KEYS } from './linkErrors';
import { parseHubLinkPosition } from './renderDiagram';
import { isOn, isOnByDefault, readAlign } from './settings';
import type { AlignProperty, IProcViewWebPartProps } from './settings';
import { dimensionErrorKey, parseDimension } from './sizing';
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
  /** Unique per web part instance — keeps the ids of the custom fields apart. */
  instanceId: string;
  /** Read-only info on the loaded image ("maximum size"). */
  naturalSizeText: string;
}

/** Change callback SharePoint hands a custom field. */
type ChangeCallback = (targetProperty?: string, newValue?: unknown) => void;

/** The whole property pane: one page with the groups in the order editors work through them. */
export function propertyPaneConfiguration(source: IPaneSource): IPropertyPaneConfiguration {
  return {
    pages: [
      {
        header: { description: strings.PropertyPaneDescription },
        groups: [
          diagramGroup(source),
          {
            groupName: strings.CaptionGroupName,
            groupFields: [
              PropertyPaneTextField('caption', {
                label: strings.CaptionLabel,
                description: strings.CaptionDescription
              }),
              alignField(source, 'captionAlign', strings.CaptionAlignLabel)
            ]
          },
          { groupName: strings.HubLinkGroupName, groupFields: hubLinkFields(source) },
          sizeGroup(),
          viewingGroup(source),
          {
            groupName: strings.AccessibilityGroupName,
            groupFields: [
              PropertyPaneTextField('altText', { label: strings.AltTextLabel, description: strings.AltTextDescription })
            ]
          },
          { groupName: strings.AboutGroupName, groupFields: [aboutField()] }
        ]
      }
    ]
  };
}

/** Image link and, read-only, the natural size of the loaded image. */
function diagramGroup(source: IPaneSource): IPropertyPaneGroup {
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
      // Read-only info — the target is a label id, not a stored property
      PropertyPaneLabel('naturalSizeInfo', { text: source.naturalSizeText })
    ]
  };
}

/** Hub link settings — text and position appear only while the link is switched on; the
 * alignment only for the position below the diagram (the overlay is always bottom right). */
function hubLinkFields(source: IPaneSource): IPropertyPaneField<unknown>[] {
  const fields: IPropertyPaneField<unknown>[] = [
    PropertyPaneToggle('showHubLink', {
      label: strings.ShowHubLinkLabel,
      onText: strings.ToggleOn,
      offText: strings.ToggleOff
    })
  ];
  const position = parseHubLinkPosition(source.properties.hubLinkPosition);
  if (isOn(source.properties.showHubLink)) {
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
      fields.push(alignField(source, 'hubLinkAlign', strings.HubLinkAlignLabel));
    }
  }
  return fields;
}

function sizeGroup(): IPropertyPaneGroup {
  return {
    groupName: strings.SizeGroupName,
    groupFields: [
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
      })
    ]
  };
}

/** Zoom, full screen and the background — own group: a toggle right below a text field's
 * description sits too close to it. */
function viewingGroup(source: IPaneSource): IPropertyPaneGroup {
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
        checked: isOnByDefault(source.properties.offerFullScreen)
      }),
      ...backgroundFields(source)
    ]
  };
}

/** Background toggle and, only while it is on, the colour (default on and white). */
function backgroundFields(source: IPaneSource): IPropertyPaneField<unknown>[] {
  const isBackgroundOn = isOnByDefault(source.properties.showBackground);
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
    fields.push(colorField(source));
  }
  return fields;
}

/**
 * A custom field in the documented `PropertyPaneFieldType.Custom` pattern
 * (`PropertyPaneCustomField()` is not public API in SPFx 1.23). `build` creates the field's
 * content; its `onChange` stores a new value for `targetProperty`. For read-only fields the
 * target is a field id, not a stored property.
 */
function customPaneField(
  targetProperty: string,
  build: (onChange: (value: unknown) => void) => HTMLElement
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return {
    type: PropertyPaneFieldType.Custom,
    targetProperty,
    properties: {
      key: `${targetProperty}Field`,
      onRender: (element: HTMLElement, _context?: unknown, changeCallback?: ChangeCallback) =>
        element.replaceChildren(build((value) => changeCallback?.(targetProperty, value))),
      onDispose: (element: HTMLElement) => element.replaceChildren()
    }
  };
}

/** Alignment toolbar (alignmentField.ts). */
function alignField(
  source: IPaneSource,
  property: AlignProperty,
  labelText: string
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField(property, (onChange) =>
    renderAlignmentButtons(document, {
      labelText,
      options: [
        { key: 'left', text: strings.AlignLeft },
        { key: 'center', text: strings.AlignCenter },
        { key: 'right', text: strings.AlignRight }
      ],
      selected: readAlign(source.properties, property),
      idPrefix: `${source.instanceId}-${property}`,
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
function colorField(source: IPaneSource): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField('backgroundColor', (onChange) =>
    renderColorField(document, {
      labelText: strings.BackgroundColorLabel,
      value: parseBackgroundColor(source.properties.backgroundColor),
      idPrefix: `${source.instanceId}-backgroundColor`,
      classNames: { root: styles.colorField, label: styles.colorLabel, input: styles.colorInput },
      onChange
    })
  );
}

/** Repository link — read-only (aboutField.ts). */
function aboutField(): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return customPaneField('aboutInfo', () =>
    renderAboutField(document, {
      linkText: strings.RepositoryLinkText,
      newTabHint: strings.NewTabHint,
      classNames: { root: styles.aboutField, hubAnchor: styles.hubAnchor, srOnly: styles.srOnly }
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
  return result.ok ? '' : strings[dimensionErrorKey(result.error, field)];
}
