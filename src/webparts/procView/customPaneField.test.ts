// The real package needs SharePoint's internal modules — only the field type is used here
jest.mock('@microsoft/sp-property-pane', () => ({ PropertyPaneFieldType: { Custom: 1 } }));

import { customPaneField } from './customPaneField';

function colourInput(onChange: (value: unknown) => void): HTMLElement {
  const input = document.createElement('input');
  input.addEventListener('change', () => onChange('#0e5a73'));
  return input;
}

describe('customPaneField', () => {
  it('gives each web part instance its own key, so the pane shows each web part’s own value', () => {
    const first = customPaneField('wp-1', 'backgroundColor', colourInput);
    const second = customPaneField('wp-2', 'backgroundColor', colourInput);
    expect(first.properties.key).not.toBe(second.properties.key);
    expect(first.properties.key).toBe(customPaneField('wp-1', 'backgroundColor', colourInput).properties.key);
    expect(first.properties.key).not.toBe(customPaneField('wp-1', 'captionAlign', colourInput).properties.key);
  });

  it('renders anew into the element and reports changes for its target property', () => {
    const field = customPaneField('wp-1', 'backgroundColor', colourInput);
    const element = document.createElement('div');
    element.appendChild(document.createElement('span'));
    const changeCallback = jest.fn();
    field.properties.onRender(element, undefined, changeCallback);
    expect(element.querySelector('span')).toBeNull();
    element.querySelector('input')?.dispatchEvent(new Event('change'));
    expect(changeCallback).toHaveBeenCalledWith('backgroundColor', '#0e5a73');
  });

  it('empties the element on dispose', () => {
    const field = customPaneField('wp-1', 'aboutInfo', () => document.createElement('p'));
    const element = document.createElement('div');
    field.properties.onRender(element);
    field.properties.onDispose?.(element);
    expect(element.childNodes).toHaveLength(0);
  });
});
