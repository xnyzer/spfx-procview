import { renderAlignmentButtons } from './alignmentField';
import type { IAlignmentButtonsProps } from './alignmentField';
import type { TextAlign } from './renderDiagram';

interface ISetup {
  root: HTMLElement;
  buttons: HTMLButtonElement[];
  onChange: jest.Mock;
}

function setup(selected: TextAlign = 'center', labelText: string = 'Alignment'): ISetup {
  const onChange = jest.fn();
  const props: IAlignmentButtonsProps = {
    labelText,
    options: [
      { key: 'left', text: 'Align left' },
      { key: 'center', text: 'Center' },
      { key: 'right', text: 'Align right' }
    ],
    selected,
    idPrefix: 'wp1',
    classNames: { root: 'root', label: 'label', group: 'group', button: 'button', selected: 'selected' },
    onChange
  };
  const root = renderAlignmentButtons(document, props);
  document.body.replaceChildren(root);
  const buttons = Array.from(root.querySelectorAll('button'));
  return { root, buttons, onChange };
}

function checked(buttons: HTMLButtonElement[]): string[] {
  return buttons.map((button) => button.getAttribute('aria-checked') ?? '');
}

function press(button: HTMLButtonElement, key: string): void {
  button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('renderAlignmentButtons — structure', () => {
  it('renders a labelled radio group with three icon buttons', () => {
    const { root, buttons } = setup();
    const group = root.querySelector('[role="radiogroup"]');
    const label = root.querySelector('#wp1-label');
    expect(label?.textContent).toBe('Alignment');
    expect(group?.getAttribute('aria-labelledby')).toBe('wp1-label');
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => {
      expect(button.type).toBe('button');
      expect(button.getAttribute('role')).toBe('radio');
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Align left', 'Center', 'Align right']);
    expect(buttons.map((button) => button.title)).toEqual(['Align left', 'Center', 'Align right']);
  });

  it('marks the selected option and makes only it a tab stop', () => {
    const { buttons } = setup('right');
    expect(checked(buttons)).toEqual(['false', 'false', 'true']);
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0]);
    expect(buttons[2].className).toBe('button selected');
    expect(buttons[0].className).toBe('button');
  });

  it('keeps markup in the label as plain text', () => {
    const { root } = setup('center', '<b>x</b>');
    expect(root.querySelector('#wp1-label')?.textContent).toBe('<b>x</b>');
    expect(root.querySelector('b')).toBeNull();
  });
});

describe('renderAlignmentButtons — interaction', () => {
  it('selects on click and reports the change once', () => {
    const { buttons, onChange } = setup('center');
    buttons[0].click();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('left');
    expect(checked(buttons)).toEqual(['true', 'false', 'false']);
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1]);
  });

  it('does not report a change when the selected option is clicked again', () => {
    const { buttons, onChange } = setup('center');
    buttons[1].click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('moves the selection and focus with the arrow keys, wrapping around', () => {
    const { buttons, onChange } = setup('center');
    press(buttons[1], 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('right');
    expect(document.activeElement).toBe(buttons[2]);
    press(buttons[2], 'ArrowDown');
    expect(onChange).toHaveBeenLastCalledWith('left');
    press(buttons[0], 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('right');
    press(buttons[2], 'ArrowUp');
    expect(onChange).toHaveBeenLastCalledWith('center');
  });

  it('jumps to the first and last option with Home and End', () => {
    const { buttons, onChange } = setup('center');
    press(buttons[1], 'End');
    expect(onChange).toHaveBeenLastCalledWith('right');
    press(buttons[2], 'Home');
    expect(onChange).toHaveBeenLastCalledWith('left');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('ignores other keys', () => {
    const { buttons, onChange } = setup('center');
    press(buttons[1], 'a');
    press(buttons[1], 'Tab');
    expect(onChange).not.toHaveBeenCalled();
  });
});
