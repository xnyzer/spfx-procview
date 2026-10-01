import { ACCENT_VARIABLE, SEMANTIC_SLOTS } from './theme';
import { followTeamsTheme, parseTeamsTheme, teamsThemeVariables } from './teamsTheme';
import type { ITeamsJs, TeamsTheme } from './teamsTheme';

/** Relative luminance and contrast ratio (WCAG 2.x) of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe('parseTeamsTheme', () => {
  it('accepts the Teams themes and treats anything else as default', () => {
    expect(parseTeamsTheme('dark')).toBe('dark');
    expect(parseTeamsTheme('contrast')).toBe('contrast');
    ['default', '', 'DARK', undefined, 42].forEach((value) => expect(parseTeamsTheme(value)).toBe('default'));
  });
});

describe('teamsThemeVariables', () => {
  it('keeps the SharePoint colours for the default theme', () => {
    expect(teamsThemeVariables('default')).toBeUndefined();
  });

  it.each(['dark', 'contrast'] as TeamsTheme[])('covers every colour variable for %s', (theme) => {
    const variables = teamsThemeVariables(theme) as Record<string, string>;
    SEMANTIC_SLOTS.forEach((slot) => expect(variables[`--${slot}`]).toMatch(/^#[0-9a-f]{6}$/));
    expect(variables[ACCENT_VARIABLE]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(['dark', 'contrast'] as TeamsTheme[])('keeps text and links readable on %s (≥ 4.5:1)', (theme) => {
    const v = teamsThemeVariables(theme) as Record<string, string>;
    expect(contrast(v['--bodyText'], v['--bodyBackground'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v['--bodyText'], v['--bodyStandoutBackground'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v['--link'], v['--bodyBackground'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v['--buttonText'], v['--buttonBackground'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('followTeamsTheme', () => {
  function mockTeams(getContext: () => Promise<{ app: { theme: string } }>): {
    teamsJs: ITeamsJs;
    change: (theme: string) => void;
  } {
    let handler: ((theme: string) => void) | undefined;
    return {
      teamsJs: {
        app: {
          getContext,
          registerOnThemeChangeHandler: (h) => {
            handler = h;
          }
        }
      },
      change: (theme) => handler?.(theme)
    };
  }

  it('reports the current theme and every later change', async () => {
    const themes: TeamsTheme[] = [];
    const teams = mockTeams(() => Promise.resolve({ app: { theme: 'dark' } }));
    followTeamsTheme(teams.teamsJs, (theme) => themes.push(theme));
    await Promise.resolve();
    teams.change('contrast');
    teams.change('default');
    expect(themes).toEqual(['dark', 'contrast', 'default']);
  });

  it('ignores a failing getContext — the SharePoint colours stay', async () => {
    const themes: TeamsTheme[] = [];
    const teams = mockTeams(() => Promise.reject(new Error('not in Teams')));
    followTeamsTheme(teams.teamsJs, (theme) => themes.push(theme));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(themes).toEqual([]);
  });

  it('treats an unknown theme from Teams as default', async () => {
    const themes: TeamsTheme[] = [];
    const teams = mockTeams(() => Promise.resolve({ app: { theme: 'neon' } }));
    followTeamsTheme(teams.teamsJs, (theme) => themes.push(theme));
    await Promise.resolve();
    expect(themes).toEqual(['default']);
  });
});
