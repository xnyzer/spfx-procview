import { renderColorField } from './colorField';

function render(onChange: (value: string) => void = () => undefined): HTMLElement {
  return renderColorField(document, {
    labelText: 'Background color',
    value: '#ffffff',
    idPrefix: 'wp1-backgroundColor',
    classNames: { root: 'colorField', label: 'colorLabel', input: 'colorInput' },
    onChange
  });
}

describe('renderColorField', () => {
  it('renders a colour input with a linked label', () => {
    const root = render();
    const label = root.querySelector('label') as HTMLLabelElement;
    const input = root.querySelector('input') as HTMLInputElement;
    expect(root.className).toBe('colorField');
    expect(label.textContent).toBe('Background color');
    expect(input.type).toBe('color');
    expect(input.value).toBe('#ffffff');
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).toBe('wp1-backgroundColor-input');
  });

  it('reports the chosen colour when the picker is confirmed', () => {
    const values: string[] = [];
    const input = render((value) => values.push(value)).querySelector('input') as HTMLInputElement;
    input.value = '#0e5a73';
    input.dispatchEvent(new Event('input'));
    expect(values).toEqual([]);
    input.dispatchEvent(new Event('change'));
    expect(values).toEqual(['#0e5a73']);
  });

  it('treats the label as text, not markup', () => {
    const root = renderColorField(document, {
      labelText: '<b>Colour</b>',
      value: '#ffffff',
      idPrefix: 'x',
      classNames: { root: 'r', label: 'l', input: 'i' },
      onChange: () => undefined
    });
    expect(root.querySelector('b')).toBeNull();
  });
});
