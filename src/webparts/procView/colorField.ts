import type { ICustomFieldContent } from './customPaneField';

/** Texts, value and classes of the colour field in the property pane. */
export interface IColorFieldProps {
  labelText: string;
  /** Current colour as `#rrggbb`. */
  value: string;
  /** Unique per web part instance — the label is linked to the input by id. */
  idPrefix: string;
  classNames: {
    root: string;
    label: string;
    input: string;
  };
  onChange: (value: string) => void;
}

/**
 * Colour setting with the browser's own picker (`<input type="color">`) — SharePoint's property
 * pane has no colour field, and a picker library would ship to every page visitor. Reports a
 * value only when the picker is confirmed (`change`), not on every move (`input`): each change
 * re-renders the web part.
 */
export function renderColorField(doc: Document, props: IColorFieldProps): ICustomFieldContent<string> {
  const root = doc.createElement('div');
  root.className = props.classNames.root;

  const inputId = `${props.idPrefix}-input`;
  const label = doc.createElement('label');
  label.className = props.classNames.label;
  label.htmlFor = inputId;
  label.textContent = props.labelText;
  root.appendChild(label);

  const input = doc.createElement('input');
  input.type = 'color';
  input.id = inputId;
  input.className = props.classNames.input;
  input.value = props.value;
  input.addEventListener('change', () => props.onChange(input.value));
  root.appendChild(input);
  return {
    element: root,
    showValue: (value) => {
      // Only a different colour: rewriting the value could reset a picker that is still open
      if (input.value !== value) {
        input.value = value;
      }
    }
  };
}
