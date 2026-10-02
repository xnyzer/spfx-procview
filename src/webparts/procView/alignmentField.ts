import type { ICustomFieldContent } from './customPaneField';
import type { TextAlign } from './renderDiagram';
import { SVG_NS, createIconCanvas } from './svgIcon';

/** One choice of the alignment toolbar. */
export interface IAlignmentOption {
  key: TextAlign;
  /** Tooltip and accessible name of the button, e.g. "Align left". */
  text: string;
}

/** Everything the alignment toolbar needs — the web part assembles it per text setting. */
export interface IAlignmentButtonsProps {
  /** Visible label above the buttons; also names the radio group. */
  labelText: string;
  options: IAlignmentOption[];
  selected: TextAlign;
  /** Unique per web part instance and field — the label id is `${idPrefix}-label`. */
  idPrefix: string;
  classNames: { root: string; label: string; group: string; button: string; selected: string };
  onChange: (key: TextAlign) => void;
}

/** 16×16 alignment icon: four lines, the short ones aligned like the text. */
function alignIcon(doc: Document, align: TextAlign): SVGElement {
  const svg = createIconCanvas(doc);

  const shortX = align === 'left' ? 1 : align === 'center' ? 3.5 : 6;
  [
    { y: 2, x: 1, width: 14 },
    { y: 6, x: shortX, width: 9 },
    { y: 10, x: 1, width: 14 },
    { y: 14, x: shortX, width: 9 }
  ].forEach((line) => {
    const rect = doc.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(line.x));
    rect.setAttribute('y', String(line.y - 0.75));
    rect.setAttribute('width', String(line.width));
    rect.setAttribute('height', '1.5');
    rect.setAttribute('fill', 'currentColor');
    svg.appendChild(rect);
  });
  return svg;
}

/**
 * Button the arrow keys, Home and End move the selection to (wrapping around); `undefined` for
 * any other key. A `switch`, not an object lookup — key names such as `toString` must not hit
 * inherited object members.
 */
function keyTarget(key: string, index: number, last: number): number | undefined {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return index === last ? 0 : index + 1;
    case 'ArrowLeft':
    case 'ArrowUp':
      return index === 0 ? last : index - 1;
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return undefined;
  }
}

/** The labelled radio group the buttons go into, inside the field's root element. */
function createLabelledGroup(doc: Document, props: IAlignmentButtonsProps): { root: HTMLElement; group: HTMLElement } {
  const root = doc.createElement('div');
  root.className = props.classNames.root;

  const labelId = `${props.idPrefix}-label`;
  const label = doc.createElement('div');
  label.id = labelId;
  label.className = props.classNames.label;
  label.textContent = props.labelText;
  root.appendChild(label);

  const group = doc.createElement('div');
  group.className = props.classNames.group;
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', labelId);
  root.appendChild(group);
  return { root, group };
}

/** One icon button of the radio group; the option text is its accessible name and tooltip. */
function createOptionButton(doc: Document, option: IAlignmentOption): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'radio');
  button.setAttribute('aria-label', option.text);
  button.title = option.text;
  button.appendChild(alignIcon(doc, option.key));
  return button;
}

/** A click selects its option; arrow keys, Home and End move the selection and the focus. */
function bindOptionEvents(
  buttons: HTMLButtonElement[],
  select: (index: number, shouldMoveFocus: boolean) => void
): void {
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index, false));
    button.addEventListener('keydown', (event: KeyboardEvent) => {
      const target = keyTarget(event.key, index, buttons.length - 1);
      if (target !== undefined) {
        event.preventDefault();
        select(target, true);
      }
    });
  });
}

/**
 * Compact icon toolbar for a text alignment, built as an accessible radio group:
 * one tab stop (the selected button), arrow keys/Home/End move the selection, the
 * buttons carry `aria-checked`. It keeps its own state, and `showValue` shows a newly stored
 * value in place, so the keyboard focus stays on its button.
 */
export function renderAlignmentButtons(doc: Document, props: IAlignmentButtonsProps): ICustomFieldContent<TextAlign> {
  const { root, group } = createLabelledGroup(doc, props);
  const buttons = props.options.map((option) => group.appendChild(createOptionButton(doc, option)));
  let selected = props.selected;

  const update = (): void => {
    buttons.forEach((button, index) => {
      const isSelected = props.options[index].key === selected;
      button.setAttribute('aria-checked', String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      button.className = isSelected
        ? `${props.classNames.button} ${props.classNames.selected}`
        : props.classNames.button;
    });
  };

  const select = (index: number, shouldMoveFocus: boolean): void => {
    const key = props.options[index].key;
    if (shouldMoveFocus) {
      buttons[index].focus();
    }
    if (key === selected) {
      return;
    }
    selected = key;
    update();
    props.onChange(key);
  };

  bindOptionEvents(buttons, select);
  update();
  return {
    element: root,
    showValue: (key) => {
      selected = key;
      update();
    }
  };
}
