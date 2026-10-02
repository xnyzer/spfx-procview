import type { IReadonlyTheme } from '@microsoft/sp-component-base';
import { ACCENT_VARIABLE, SEMANTIC_SLOTS, applyVariables, themeVariables } from './theme';

/** A light page theme (default Fluent colours). */
const PAGE_THEME = {
  palette: { themePrimary: '#0078d4' },
  semanticColors: {
    bodyBackground: '#ffffff',
    bodyStandoutBackground: '#faf9f8',
    bodyText: '#323130',
    bodySubtext: '#605e5c',
    bodyDivider: '#edebe9',
    link: '#0078d4',
    linkHovered: '#004578',
    focusBorder: '#605e5c',
    errorText: '#a4262c',
    buttonBackground: '#ffffff',
    buttonBackgroundHovered: '#f3f2f1',
    buttonText: '#323130',
    buttonBorder: '#8a8886'
  }
} as unknown as IReadonlyTheme;

/**
 * A "strong" section variant as SharePoint passes it: the section is filled with the theme
 * colour, text turns white, the palette is swapped as well.
 */
const STRONG_SECTION_THEME = {
  palette: { themePrimary: '#ffffff' },
  semanticColors: {
    bodyBackground: '#0078d4',
    bodyStandoutBackground: '#106ebe',
    bodyText: '#ffffff',
    bodySubtext: '#deecf9',
    bodyDivider: '#2b88d8',
    link: '#ffffff',
    linkHovered: '#eff6fc',
    focusBorder: '#ffffff',
    errorText: '#ffffff',
    buttonBackground: '#0078d4',
    buttonBackgroundHovered: '#106ebe',
    buttonText: '#ffffff',
    buttonBorder: '#ffffff'
  }
} as unknown as IReadonlyTheme;

describe('themeVariables', () => {
  it('maps every semantic slot and the accent to a custom property', () => {
    const variables = themeVariables(PAGE_THEME);
    SEMANTIC_SLOTS.forEach((slot) => {
      expect(variables[`--${slot}`]).toBe((PAGE_THEME.semanticColors as Record<string, string>)[slot]);
    });
    expect(variables[ACCENT_VARIABLE]).toBe('#0078d4');
    expect(Object.keys(variables)).toHaveLength(SEMANTIC_SLOTS.length + 1);
  });

  it('takes message text and background from the same strong section, not the page', () => {
    const variables = themeVariables(STRONG_SECTION_THEME);
    expect(variables['--bodyText']).toBe('#ffffff');
    expect(variables['--bodyStandoutBackground']).toBe('#106ebe');
    // Focus outline and info accent stay visible on the theme-coloured section
    expect(variables['--focusBorder']).toBe('#ffffff');
    expect(variables[ACCENT_VARIABLE]).toBe('#ffffff');
    expect(variables['--buttonBackground']).toBe('#0078d4');
    expect(variables['--buttonText']).toBe('#ffffff');
  });

  it('leaves out missing, empty and non-string colours so the stylesheet falls back', () => {
    const partial = {
      semanticColors: { bodyText: '#111111', link: '', bodySubtext: 42 }
    } as unknown as IReadonlyTheme;
    expect(themeVariables(partial)).toEqual({ '--bodyText': '#111111' });
  });

  it('returns no variables without a theme', () => {
    expect(themeVariables(undefined)).toEqual({});
    expect(themeVariables({} as IReadonlyTheme)).toEqual({});
  });

  it.each([
    ['#fff'],
    ['#ffff'],
    ['#0078d4'],
    ['#0078d4cc'],
    ['rgba(0, 0, 0, 0.4)'],
    ['rgb(0 120 212 / 50%)'],
    ['hsl(206, 100%, 42%)'],
    ['transparent'],
    [' #0078d4 ']
  ])('accepts the colour %p', (value) => {
    const theme = { semanticColors: { bodyBackground: value } } as unknown as IReadonlyTheme;
    expect(themeVariables(theme)).toEqual({ '--bodyBackground': value.trim() });
  });

  it.each([
    ['url(https://example.com/track.png)'],
    ['image-set("https://example.com/x.png" 1x)'],
    ['red;background:url(https://example.com/a)'],
    ['#fff}body{display:none'],
    ['#fff /* x */'],
    ['expression(alert(1))'],
    ['var(--evil)'],
    ['rgb(0,0,0) url(https://example.com/x)'],
    ['linear-gradient(red, blue)'],
    ['\\75 rl(x)']
  ])('drops the hostile value %p — no request, no breakout', (value) => {
    const theme = {
      palette: { themePrimary: value },
      semanticColors: { bodyBackground: value, bodyStandoutBackground: value }
    } as unknown as IReadonlyTheme;
    expect(themeVariables(theme)).toEqual({});
  });
});

describe('applyVariables with a SharePoint theme', () => {
  it('sets the variables on the element style', () => {
    const element = document.createElement('div');
    applyVariables(element.style, themeVariables(STRONG_SECTION_THEME));
    expect(element.style.getPropertyValue('--bodyText')).toBe('#ffffff');
    expect(element.style.getPropertyValue(ACCENT_VARIABLE)).toBe('#ffffff');
  });

  it('removes colours the new theme does not provide — nothing lingers from the old one', () => {
    const element = document.createElement('div');
    applyVariables(element.style, themeVariables(STRONG_SECTION_THEME));
    applyVariables(
      element.style,
      themeVariables({
        semanticColors: { bodyText: '#111111' }
      } as unknown as IReadonlyTheme)
    );
    expect(element.style.getPropertyValue('--bodyText')).toBe('#111111');
    expect(element.style.getPropertyValue('--bodyStandoutBackground')).toBe('');
    expect(element.style.getPropertyValue(ACCENT_VARIABLE)).toBe('');
  });

  it('clears everything without a theme', () => {
    const element = document.createElement('div');
    applyVariables(element.style, themeVariables(PAGE_THEME));
    applyVariables(element.style, themeVariables(undefined));
    expect(element.style.cssText).toBe('');
  });
});

describe('applyVariables', () => {
  it('sets a given palette and removes the other known colours', () => {
    const element = document.createElement('div');
    applyVariables(element.style, themeVariables(PAGE_THEME));
    applyVariables(element.style, { '--bodyText': '#ffffff', '--bodyBackground': '#292929' });
    expect(element.style.getPropertyValue('--bodyText')).toBe('#ffffff');
    expect(element.style.getPropertyValue('--bodyBackground')).toBe('#292929');
    expect(element.style.getPropertyValue('--link')).toBe('');
    expect(element.style.getPropertyValue(ACCENT_VARIABLE)).toBe('');
  });
});
