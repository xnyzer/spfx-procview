import type { IReadonlyTheme } from '@microsoft/sp-component-base';

type SemanticSlot =
  | 'bodyBackground'
  | 'bodyStandoutBackground'
  | 'bodyText'
  | 'bodySubtext'
  | 'bodyDivider'
  | 'link'
  | 'linkHovered'
  | 'focusBorder'
  | 'errorText'
  | 'buttonBackground'
  | 'buttonBackgroundHovered'
  | 'buttonText'
  | 'buttonBorder';

/** Semantic colours the page elements use; each becomes the custom property `--<slot>`. */
export const SEMANTIC_SLOTS: readonly SemanticSlot[] = [
  'bodyBackground',
  'bodyStandoutBackground',
  'bodyText',
  'bodySubtext',
  'bodyDivider',
  'link',
  'linkHovered',
  'focusBorder',
  'errorText',
  'buttonBackground',
  'buttonBackgroundHovered',
  'buttonText',
  'buttonBorder'
];

/** Accent of the info message; from the palette, which a section variant adapts as well. */
export const ACCENT_VARIABLE = '--themePrimary';

/**
 * CSS custom properties for the theme SharePoint passes to the web part — on a coloured
 * section this is the section's variant, not the page theme, so every colour must come from
 * here. Missing or empty colours are left out: the stylesheet then falls back to its static
 * theme token.
 */
export function themeVariables(theme: IReadonlyTheme | undefined): Record<string, string> {
  const variables: Record<string, string> = {};
  const semanticColors = theme?.semanticColors;
  SEMANTIC_SLOTS.forEach((slot) => {
    const value = semanticColors?.[slot];
    if (typeof value === 'string' && value !== '') {
      variables[`--${slot}`] = value;
    }
  });
  const accent = theme?.palette?.themePrimary;
  if (typeof accent === 'string' && accent !== '') {
    variables[ACCENT_VARIABLE] = accent;
  }
  return variables;
}

/**
 * Sets the theme's custom properties on the web part element and removes those the theme
 * does not provide, so a colour from a previous theme never lingers.
 */
export function applyThemeVariables(style: CSSStyleDeclaration, theme: IReadonlyTheme | undefined): void {
  applyVariables(style, themeVariables(theme));
}

/**
 * Sets the given colour variables (e.g. a Teams palette) on the web part element and removes the
 * other known ones, so a colour from a previous theme never lingers.
 */
export function applyVariables(style: CSSStyleDeclaration, variables: Record<string, string>): void {
  const names = SEMANTIC_SLOTS.map((slot) => `--${slot}`).concat(ACCENT_VARIABLE);
  names.forEach((name) => {
    if (name in variables) {
      style.setProperty(name, variables[name]);
    } else {
      style.removeProperty(name);
    }
  });
}
