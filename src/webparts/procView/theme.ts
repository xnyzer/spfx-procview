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
 * Colour syntax a theme value may use: hex, `rgb()`/`rgba()`/`hsl()`/`hsla()` with plain numbers,
 * or a keyword such as `transparent`. The variables feed `background:` declarations, which also
 * accept images — anything else (`url(…)`, `image-set(…)`, `;`) is dropped, so a theme value can
 * never make the browser load something.
 */
const THEME_COLOR = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\([0-9.,%\s/+-]*\)|[a-z]+)$/i;

function isThemeColor(value: unknown): value is string {
  return typeof value === 'string' && THEME_COLOR.test(value.trim());
}

/**
 * CSS custom properties for the theme SharePoint passes to the web part — on a coloured
 * section this is the section's variant, not the page theme, so every colour must come from
 * here. Missing values and values that are not a colour are left out: the stylesheet then
 * falls back to its static theme token.
 */
export function themeVariables(theme: IReadonlyTheme | undefined): Record<string, string> {
  const variables: Record<string, string> = {};
  const semanticColors = theme?.semanticColors;
  SEMANTIC_SLOTS.forEach((slot) => {
    const value = semanticColors?.[slot];
    if (isThemeColor(value)) {
      variables[`--${slot}`] = value.trim();
    }
  });
  const accent = theme?.palette?.themePrimary;
  if (isThemeColor(accent)) {
    variables[ACCENT_VARIABLE] = accent.trim();
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
