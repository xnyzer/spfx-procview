import type { CaptionAlign } from './renderDiagram';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface IAlignmentOption {
  key: CaptionAlign;
  /** Tooltip and accessible name of the button, e.g. "Align left". */
  text: string;
}

export interface IAlignmentButtonsProps {
  /** Visible label above the buttons; also names the radio group. */
  labelText: string;
  options: IAlignmentOption[];
  selected: CaptionAlign;
  /** Unique per web part instance — used for the label id. */
  idPrefix: string;
  classNames: { root: string; label: string; group: string; button: string; selected: string };
  onChange: (key: CaptionAlign) => void;
}

/** 16×16 alignment icon: four lines, the short ones aligned like the text. */
function alignIcon(doc: Document, align: CaptionAlign): SVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

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
 * Compact icon toolbar for the caption alignment, built as an accessible radio group:
 * one tab stop (the selected button), arrow keys/Home/End move the selection, the
 * buttons carry `aria-checked`. It keeps its own state, because a property pane host may
 * render a custom field only once.
 */
export function renderAlignmentButtons(doc: Document, props: IAlignmentButtonsProps): HTMLElement {
  const root = doc.createElement('div');
  root.className = props.classNames.root;

  const labelId = `${props.idPrefix}-caption-align-label`;
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

  let selected = props.selected;
  const buttons = props.options.map((option) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-label', option.text);
    button.title = option.text;
    button.appendChild(alignIcon(doc, option.key));
    group.appendChild(button);
    return button;
  });

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

  const select = (index: number, moveFocus: boolean): void => {
    const key = props.options[index].key;
    if (moveFocus) {
      buttons[index].focus();
    }
    if (key === selected) {
      return;
    }
    selected = key;
    update();
    props.onChange(key);
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => select(index, false));
    button.addEventListener('keydown', (event: KeyboardEvent) => {
      const last = buttons.length - 1;
      const target: Record<string, number> = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowDown: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        ArrowUp: index === 0 ? last : index - 1,
        Home: 0,
        End: last
      };
      if (event.key in target) {
        event.preventDefault();
        select(target[event.key], true);
      }
    });
  });

  update();
  return root;
}
