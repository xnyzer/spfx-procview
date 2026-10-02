/**
 * The property pane on SharePoint stand-ins (spfxTestDoubles.ts): order of groups and fields,
 * fields that appear only with their setting, the defaults the toggles and toolbars show, and the
 * validation while typing — all from untrusted stored values.
 */
jest.mock('@microsoft/sp-property-pane', () => jest.requireActual('./spfxTestDoubles').propertyPaneDouble);
jest.mock('ProcViewWebPartStrings', () => jest.requireActual('./spfxTestDoubles').stringsDouble, { virtual: true });

import { CONDITIONAL_FIELD_PROPERTIES, propertyPaneConfiguration } from './propertyPane';
import { normalizeStoredSettings } from './settings';
import { findShownChoice } from './spfxTestDoubles';
import type { IFieldDouble } from './spfxTestDoubles';

interface IGroupDouble {
  groupName: string;
  groupFields: IFieldDouble[];
}

function listGroups(properties: Record<string, unknown>): IGroupDouble[] {
  const configuration = propertyPaneConfiguration({ properties, instanceId: 'webpart-1', naturalSizeText: 'size' });
  return configuration.pages[0].groups as unknown as IGroupDouble[];
}

/** Group names with the target properties of their fields, in pane order. */
function listLayout(properties: Record<string, unknown>): [string, string[]][] {
  return listGroups(properties).map((group) => [
    group.groupName,
    group.groupFields.map((field) => field.targetProperty)
  ]);
}

function findField(properties: Record<string, unknown>, targetProperty: string): IFieldDouble {
  const fields = listGroups(properties).reduce<IFieldDouble[]>((all, group) => all.concat(group.groupFields), []);
  const field = fields.find((candidate) => candidate.targetProperty === targetProperty);
  if (!field) {
    throw new Error(`no field for ${targetProperty}`);
  }
  return field;
}

/** Renders a custom field the way SharePoint does; `onChange` records what the field stores. */
function renderCustomField(field: IFieldDouble): { element: HTMLElement; onChange: jest.Mock } {
  const element = document.createElement('div');
  const onChange = jest.fn();
  const onRender = field.properties.onRender as (element: HTMLElement, context: unknown, onChange: jest.Mock) => void;
  onRender(element, undefined, onChange);
  return { element, onChange };
}

function readSelectedAlignment(properties: Record<string, unknown>, targetProperty: string): string | undefined {
  const { element } = renderCustomField(findField(properties, targetProperty));
  return element.querySelector('[aria-checked="true"]')?.getAttribute('aria-label') ?? undefined;
}

function validate(properties: Record<string, unknown>, targetProperty: string, value: string): string {
  const onGetErrorMessage = findField(properties, targetProperty).properties.onGetErrorMessage as (
    value: string
  ) => string;
  return onGetErrorMessage(value);
}

describe('propertyPaneConfiguration — layout', () => {
  it('lists the groups and fields in the editors’ order (decision log 2026-10-02)', () => {
    expect(listLayout({})).toEqual([
      ['DiagramGroupName', ['imageLink', 'altText']],
      ['SizeGroupName', ['naturalSizeInfo', 'width', 'height', 'diagramAlign']],
      ['CaptionGroupName', ['caption', 'captionAlign']],
      ['HubLinkGroupName', ['showHubLink']],
      ['ViewingGroupName', ['offerZoom', 'offerFullScreen', 'showBackground', 'backgroundColor']],
      ['AboutGroupName', ['aboutInfo']]
    ]);
  });

  it('shows text, position and alignment of the hub link only while it is switched on', () => {
    expect(listLayout({ showHubLink: true })[3][1]).toEqual([
      'showHubLink',
      'hubLinkText',
      'hubLinkPosition',
      'hubLinkAlign'
    ]);
    expect(listLayout({ showHubLink: true, hubLinkPosition: 'overlay' })[3][1]).toEqual([
      'showHubLink',
      'hubLinkText',
      'hubLinkPosition'
    ]);
    expect(listLayout({ showHubLink: 'true' })[3][1]).toEqual(['showHubLink']);
  });

  it('selects below for an unknown hub link position once the web part has normalised it (audit L55)', () => {
    const stored = { showHubLink: true, hubLinkPosition: '<img src=x>' };
    // SharePoint selects the stored value before any checked option — as stored, none would show
    expect(findShownChoice(findField(stored, 'hubLinkPosition'), stored)).toBeUndefined();
    const properties = normalizeStoredSettings(stored) as Record<string, unknown>;
    expect(findShownChoice(findField(properties, 'hubLinkPosition'), properties)).toBe('below');
    expect(listLayout(properties)[3][1]).toContain('hubLinkAlign');
  });

  it('shows the colour only while the background is on — on unless explicitly off', () => {
    expect(listLayout({ showBackground: false })[4][1]).toEqual(['offerZoom', 'offerFullScreen', 'showBackground']);
    expect(listLayout({ showBackground: 'false' })[4][1]).toContain('backgroundColor');
  });

  it('refreshes the pane for exactly the settings that show or hide fields', () => {
    expect(CONDITIONAL_FIELD_PROPERTIES).toEqual(['showHubLink', 'hubLinkPosition', 'showBackground']);
  });
});

describe('propertyPaneConfiguration — defaults from untrusted values', () => {
  it('shows on-by-default toggles as on for web parts saved before the setting existed', () => {
    expect(findField({}, 'offerFullScreen').properties.checked).toBe(true);
    expect(findField({}, 'showBackground').properties.checked).toBe(true);
    expect(findField({ offerFullScreen: false }, 'offerFullScreen').properties.checked).toBe(false);
    expect(findField({ showBackground: false }, 'showBackground').properties.checked).toBe(false);
  });

  it('selects each toolbar’s default for missing or hostile values', () => {
    const hostile = {
      showHubLink: true,
      diagramAlign: 'justify',
      captionAlign: { toString: () => 'left' },
      hubLinkAlign: 42
    };
    [{ showHubLink: true }, hostile].forEach((properties) => {
      expect(readSelectedAlignment(properties, 'diagramAlign')).toBe('AlignCenter');
      expect(readSelectedAlignment(properties, 'captionAlign')).toBe('AlignCenter');
      expect(readSelectedAlignment(properties, 'hubLinkAlign')).toBe('AlignRight');
    });
    expect(readSelectedAlignment({ diagramAlign: 'left' }, 'diagramAlign')).toBe('AlignLeft');
  });

  it('stores a toolbar choice for its own setting', () => {
    const { element, onChange } = renderCustomField(findField({}, 'diagramAlign'));
    element.querySelector<HTMLButtonElement>('[aria-label="AlignRight"]')?.click();
    expect(onChange).toHaveBeenCalledWith('diagramAlign', 'right');
  });

  it('shows white in the colour field for a stored value that is not a colour (audit L41)', () => {
    // jsdom turns an invalid colour input into #000000 — white proves the value was checked first
    const hostile = renderCustomField(
      findField({ backgroundColor: 'red;background:url(https://example.com/x)' }, 'backgroundColor')
    );
    expect(hostile.element.querySelector('input')?.value).toBe('#ffffff');
    const stored = renderCustomField(findField({ backgroundColor: '#0e5a73' }, 'backgroundColor'));
    expect(stored.element.querySelector('input')?.value).toBe('#0e5a73');
  });
});

describe('propertyPaneConfiguration — validation while typing', () => {
  it('accepts an empty link and explains a wrong one', () => {
    expect(validate({}, 'imageLink', '')).toBe('');
    expect(validate({}, 'imageLink', 'https://example.com/diagram.png')).toBe('LinkErrorUnsupported');
  });

  it('explains a width or height out of range', () => {
    expect(validate({}, 'width', '640')).toBe('');
    expect(validate({}, 'width', '20000')).toBe('DimensionErrorTooLarge 10000');
    expect(validate({}, 'height', '50%')).toBe('DimensionErrorPercentHeight');
  });
});

describe('propertyPaneConfiguration — SharePoint renders the pane again after a change (audit M15)', () => {
  /** SharePoint keeps the host element, fetches the configuration again and calls `onRender` again. */
  function renderInto(element: HTMLElement, properties: Record<string, unknown>, targetProperty: string): void {
    const onRender = findField(properties, targetProperty).properties.onRender as (
      element: HTMLElement,
      context: unknown,
      onChange: () => void
    ) => void;
    onRender(element, undefined, () => undefined);
  }

  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => element.remove());

  it('keeps the keyboard focus in a toolbar and shows the new choice', () => {
    renderInto(element, {}, 'diagramAlign');
    const right = element.querySelector<HTMLButtonElement>('[aria-label="AlignRight"]') as HTMLButtonElement;
    right.focus();
    right.click();
    renderInto(element, { diagramAlign: 'right' }, 'diagramAlign');
    expect(document.activeElement).toBe(right);
    expect(element.querySelector('[aria-checked="true"]')).toBe(right);
  });

  it('keeps the colour input and shows the stored colour', () => {
    renderInto(element, {}, 'backgroundColor');
    const input = element.querySelector('input') as HTMLInputElement;
    input.focus();
    renderInto(element, { backgroundColor: '#0e5a73' }, 'backgroundColor');
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe('#0e5a73');
  });
});

describe('propertyPaneConfiguration — about', () => {
  function renderAbout(version: string | undefined): HTMLElement {
    const configuration = propertyPaneConfiguration({
      properties: {},
      instanceId: 'webpart-1',
      naturalSizeText: 'size',
      version
    });
    const groups = configuration.pages[0].groups as unknown as IGroupDouble[];
    const about = groups[groups.length - 1].groupFields[0];
    return renderCustomField(about).element;
  }

  it('shows the version below the repository link', () => {
    const element = renderAbout('1.2.3');
    expect(element.textContent).toContain('RepositoryLinkText');
    expect(element.textContent).toContain('VersionText 1.2.3');
  });

  it('shows no version line without a version', () => {
    expect(renderAbout(undefined).textContent).not.toContain('VersionText');
  });
});
