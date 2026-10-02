import {
  type IPropertyPaneCustomFieldProps,
  type IPropertyPaneField,
  PropertyPaneFieldType
} from '@microsoft/sp-property-pane';

/** Change callback SharePoint hands a custom field. */
type ChangeCallback = (targetProperty?: string, newValue?: unknown) => void;

/** A custom field's content: its element and how it shows a newly stored value in place. */
export interface ICustomFieldContent<TValue> {
  element: HTMLElement;
  /** Shows the current stored value without rebuilding, so the keyboard focus stays put. */
  showValue(value: TValue): void;
}

/** What a custom field shows and how its content is built. */
export interface ICustomFieldSpec<TValue> {
  /** The stored value, as read when the pane configuration was built. */
  value: TValue;
  /** Builds the content; its `onChange` stores a new value for the field's target property. */
  create(onChange: (value: unknown) => void): ICustomFieldContent<TValue>;
}

interface IMountedField {
  content: ICustomFieldContent<unknown>;
  /** The latest callback SharePoint handed over — changes go there. */
  changeCallback?: ChangeCallback;
}

/** The content built into each host element SharePoint renders a custom field into. */
const mountedFields = new WeakMap<HTMLElement, IMountedField>();

/**
 * Builds the content into the host element — or, when SharePoint renders the same element again,
 * only shows the new value: SharePoint fetches the pane configuration again after every change
 * and calls `onRender` of every custom field again, and a rebuilt field drops the keyboard focus.
 */
function renderField<TValue>(
  element: HTMLElement,
  field: { targetProperty: string; spec: ICustomFieldSpec<TValue> },
  changeCallback: ChangeCallback | undefined
): void {
  const mounted = mountedFields.get(element);
  if (mounted && mounted.content.element.parentNode === element) {
    mounted.changeCallback = changeCallback;
    mounted.content.showValue(field.spec.value);
    return;
  }
  const content = field.spec.create((value) =>
    mountedFields.get(element)?.changeCallback?.(field.targetProperty, value)
  );
  mountedFields.set(element, { content, changeCallback });
  element.replaceChildren(content.element);
}

/**
 * A custom property pane field in the documented `PropertyPaneFieldType.Custom` pattern
 * (`PropertyPaneCustomField()` is not public API in SPFx 1.23). For read-only fields the target
 * is a field id, not a stored property.
 *
 * The key is unique per web part instance: a host may render a custom field again only when its
 * key changes (the local workbench does), and with one key for all web parts the pane kept
 * showing the previous web part's value after switching.
 */
export function customPaneField<TValue>(
  instanceId: string,
  targetProperty: string,
  spec: ICustomFieldSpec<TValue>
): IPropertyPaneField<IPropertyPaneCustomFieldProps> {
  return {
    type: PropertyPaneFieldType.Custom,
    targetProperty,
    properties: {
      key: `${instanceId}-${targetProperty}`,
      onRender: (element: HTMLElement, _context?: unknown, changeCallback?: ChangeCallback) =>
        renderField(element, { targetProperty, spec }, changeCallback),
      onDispose: (element: HTMLElement) => {
        mountedFields.delete(element);
        element.replaceChildren();
      }
    }
  };
}
