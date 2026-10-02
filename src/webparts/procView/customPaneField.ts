import {
  type IPropertyPaneCustomFieldProps,
  type IPropertyPaneField,
  PropertyPaneFieldType
} from '@microsoft/sp-property-pane';

/** Change callback SharePoint hands a custom field. */
type ChangeCallback = (targetProperty?: string, newValue?: unknown) => void;

/**
 * A custom property pane field in the documented `PropertyPaneFieldType.Custom` pattern
 * (`PropertyPaneCustomField()` is not public API in SPFx 1.23). `build` creates the field's
 * content; its `onChange` stores a new value for `targetProperty`. For read-only fields the
 * target is a field id, not a stored property.
 *
 * The key is unique per web part instance: a host may render a custom field again only when its
 * key changes (the local workbench does), and with one key for all web parts the pane kept
 * showing the previous web part's value after switching.
 */
export function customPaneField(
  instanceId: string,
  targetProperty: string,
  build: (onChange: (value: unknown) => void) => HTMLElement
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return {
    type: PropertyPaneFieldType.Custom,
    targetProperty,
    properties: {
      key: `${instanceId}-${targetProperty}`,
      onRender: (element: HTMLElement, _context?: unknown, changeCallback?: ChangeCallback) =>
        element.replaceChildren(build((value) => changeCallback?.(targetProperty, value))),
      onDispose: (element: HTMLElement) => element.replaceChildren()
    }
  };
}
