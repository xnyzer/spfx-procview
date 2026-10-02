import { ACCENT_VARIABLE, SEMANTIC_SLOTS } from './theme';

/** The themes Microsoft Teams reports (`app.getContext()` → `app.theme`). */
export type TeamsTheme = 'default' | 'dark' | 'contrast';

/** Teams theme from untrusted host data — anything unknown counts as `default`. */
export function parseTeamsTheme(value: unknown): TeamsTheme {
  return value === 'dark' || value === 'contrast' ? value : 'default';
}

type Palette = Record<(typeof SEMANTIC_SLOTS)[number], string> & { accent: string };

/**
 * Teams dark — Fluent UI v9 `teamsDarkTheme` tokens (packages/tokens: teamsDarkColor.ts with the
 * Teams brand ramp, verified 2026-10-01).
 */
const DARK: Palette = {
  bodyBackground: '#292929', // colorNeutralBackground1
  bodyStandoutBackground: '#1f1f1f', // colorNeutralBackground3
  bodyText: '#ffffff', // colorNeutralForeground1
  bodySubtext: '#d6d6d6', // colorNeutralForeground2
  bodyDivider: '#666666', // colorNeutralStroke1
  link: '#7f85f5', // colorBrandForegroundLink (brandTeams 100)
  linkHovered: '#9299f7', // colorBrandForegroundLinkHover (brandTeams 110)
  focusBorder: '#ffffff', // colorStrokeFocus2
  errorText: '#e37d80', // colorPaletteRedForeground1 (red tint30)
  buttonBackground: '#292929', // colorNeutralBackground1
  buttonBackgroundHovered: '#3d3d3d', // colorNeutralBackground1Hover
  buttonText: '#ffffff', // colorNeutralForeground1
  buttonBorder: '#666666', // colorNeutralStroke1
  accent: '#7f85f5' // colorBrandForeground1
};

/**
 * Teams high contrast — the classic Teams palette (black, white, yellow links, cyan focus). Fluent
 * v9 maps this theme to CSS system colours, which only resolve correctly in the operating
 * system's forced-colours mode, not in Teams' own contrast theme — hence fixed values. Not checked
 * against a published source; confirm in Teams.
 */
const CONTRAST: Palette = {
  bodyBackground: '#000000',
  bodyStandoutBackground: '#000000',
  bodyText: '#ffffff',
  bodySubtext: '#ffffff',
  bodyDivider: '#ffffff',
  link: '#ffff01',
  linkHovered: '#ffff01',
  focusBorder: '#1aebff',
  errorText: '#ffff01',
  buttonBackground: '#000000',
  buttonBackgroundHovered: '#1aebff',
  buttonText: '#ffffff',
  buttonBorder: '#ffffff',
  accent: '#1aebff'
};

/**
 * CSS variables that replace the SharePoint colours in Teams' dark and high-contrast themes —
 * there the web part would otherwise stay a light block. `undefined` for `default`: the
 * SharePoint site theme (from `onThemeChanged`) applies as on a page.
 */
export function teamsThemeVariables(theme: TeamsTheme): Record<string, string> | undefined {
  const palette = theme === 'dark' ? DARK : theme === 'contrast' ? CONTRAST : undefined;
  if (!palette) {
    return undefined;
  }
  const variables: Record<string, string> = {};
  SEMANTIC_SLOTS.forEach((slot) => {
    variables[`--${slot}`] = palette[slot];
  });
  variables[ACCENT_VARIABLE] = palette.accent;
  return variables;
}

/** The part of TeamsJS v2 (`context.sdks.microsoftTeams.teamsJs`) used here. */
export interface ITeamsJs {
  app: {
    getContext(): Promise<{ app: { theme: string } }>;
    registerOnThemeChangeHandler(handler: (theme: string) => void): void;
  };
}

/**
 * Reports the current Teams theme and every later change. TeamsJS keeps a single theme handler
 * per frame and cannot remove it — the caller makes `onTheme` a no-op once the web part is gone.
 * When Teams cannot report its theme, or `onTheme` fails to apply it, `onError` gets the reason
 * and the SharePoint colours stay, the safe fallback — never an unhandled rejection.
 */
export function followTeamsTheme(
  teamsJs: ITeamsJs,
  onTheme: (theme: TeamsTheme) => void,
  onError: (error: unknown) => void
): void {
  let hasChanged = false;
  let context: Promise<{ app: { theme: string } }>;
  const applyTheme = (theme: unknown): void => {
    try {
      onTheme(parseTeamsTheme(theme));
    } catch (error) {
      onError(error);
    }
  };
  try {
    teamsJs.app.registerOnThemeChangeHandler((theme) => {
      hasChanged = true;
      applyTheme(theme);
    });
    context = teamsJs.app.getContext();
  } catch (error) {
    onError(error);
    return;
  }
  context.then((current) => {
    // A change reported in the meantime is newer than the context
    if (!hasChanged) {
      applyTheme(current?.app?.theme);
    }
  }, onError);
}
