// The real package needs SharePoint's internal modules — only the field type is used here
jest.mock('@microsoft/sp-property-pane', () => ({ PropertyPaneFieldType: { Custom: 1 } }));

import { customPaneField } from './customPaneField';
import type { ICustomFieldSpec } from './customPaneField';

type OnRender = (element: HTMLElement, context?: unknown, changeCallback?: jest.Mock) => void;

/** A colour input as field content; `shown` records every value shown in place. */
function createColourSpec(value: string, shown: string[] = []): ICustomFieldSpec<string> {
  return {
    value,
    create: (onChange) => {
      const input = document.createElement('input');
      input.value = value;
      input.addEventListener('change', () => onChange('#0e5a73'));
      return {
        element: input,
        showValue: (next) => {
          shown.push(next);
          input.value = next;
        }
      };
    }
  };
}

function renderInto(element: HTMLElement, spec: ICustomFieldSpec<string>, changeCallback?: jest.Mock): void {
  const field = customPaneField('wp-1', 'backgroundColor', spec);
  (field.properties.onRender as OnRender)(element, undefined, changeCallback);
}

let element: HTMLElement;

beforeEach(() => {
  element = document.createElement('div');
  document.body.appendChild(element);
});

afterEach(() => element.remove());

describe('customPaneField', () => {
  it('gives each web part instance its own key, so the pane shows each web part’s own value', () => {
    const first = customPaneField('wp-1', 'backgroundColor', createColourSpec('#ffffff'));
    const second = customPaneField('wp-2', 'backgroundColor', createColourSpec('#ffffff'));
    expect(first.properties.key).not.toBe(second.properties.key);
    expect(first.properties.key).toBe(
      customPaneField('wp-1', 'backgroundColor', createColourSpec('#000000')).properties.key
    );
    expect(first.properties.key).not.toBe(
      customPaneField('wp-1', 'captionAlign', createColourSpec('#ffffff')).properties.key
    );
  });

  it('builds its content into the element and reports changes for its target property', () => {
    element.appendChild(document.createElement('span'));
    const changeCallback = jest.fn();
    renderInto(element, createColourSpec('#ffffff'), changeCallback);
    expect(element.querySelector('span')).toBeNull();
    element.querySelector('input')?.dispatchEvent(new Event('change'));
    expect(changeCallback).toHaveBeenCalledWith('backgroundColor', '#0e5a73');
  });

  it('keeps its content and the focus when SharePoint renders the same element again (audit M15)', () => {
    const shown: string[] = [];
    renderInto(element, createColourSpec('#ffffff', shown));
    const input = element.querySelector('input') as HTMLInputElement;
    input.focus();
    renderInto(element, createColourSpec('#0e5a73'));
    expect(element.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(shown).toEqual(['#0e5a73']);
  });

  it('reports changes to the latest callback SharePoint handed over', () => {
    const first = jest.fn();
    const latest = jest.fn();
    renderInto(element, createColourSpec('#ffffff'), first);
    renderInto(element, createColourSpec('#ffffff'), latest);
    element.querySelector('input')?.dispatchEvent(new Event('change'));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith('backgroundColor', '#0e5a73');
  });

  it('builds anew for another element — the local workbench renders a new host per key', () => {
    renderInto(element, createColourSpec('#ffffff'));
    const other = document.createElement('div');
    renderInto(other, createColourSpec('#0e5a73'));
    expect(other.querySelector('input')?.value).toBe('#0e5a73');
    expect(element.querySelector('input')?.value).toBe('#ffffff');
  });

  it('empties the element on dispose and builds anew when rendered again', () => {
    const field = customPaneField('wp-1', 'backgroundColor', createColourSpec('#ffffff'));
    (field.properties.onRender as OnRender)(element);
    const disposed = element.querySelector('input');
    field.properties.onDispose?.(element);
    expect(element.childNodes).toHaveLength(0);
    (field.properties.onRender as OnRender)(element);
    expect(element.querySelector('input')).not.toBe(disposed);
  });
});
