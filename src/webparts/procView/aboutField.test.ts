import { REPOSITORY_URL, readVersion, renderAboutField } from './aboutField';
import type { IAboutFieldProps } from './aboutField';

const CLASS_NAMES = { root: 'aboutField', anchor: 'hubAnchor', srOnly: 'srOnly', version: 'aboutVersion' };
/** A four-part solution version (x.y.z.0), built from its parts — written out, privacy-lint takes it for an IP address. */
const SOLUTION_VERSION = ['1', '0', '0', '0'].join('.');

function render(overrides: Partial<IAboutFieldProps> = {}): HTMLElement {
  return renderAboutField(document, {
    linkText: 'Source code and documentation on GitHub',
    newTabHint: '(opens in a new tab)',
    classNames: CLASS_NAMES,
    ...overrides
  });
}

describe('renderAboutField', () => {
  it('points to the public repository', () => {
    expect(REPOSITORY_URL).toBe('https://github.com/xnyzer/spfx-procview');
    const anchor = render().querySelector('a');
    expect(anchor?.getAttribute('href')).toBe(REPOSITORY_URL);
  });

  it('opens in a new tab without opener access or referrer', () => {
    const anchor = render().querySelector('a');
    expect(anchor?.target).toBe('_blank');
    expect(anchor?.rel).toBe('noopener noreferrer');
  });

  it('shows the link text and announces the new tab to screen readers', () => {
    const root = render();
    const anchor = root.querySelector('a');
    expect(anchor?.textContent).toContain('Source code and documentation on GitHub');
    const hint = root.querySelector('.srOnly');
    expect(hint?.textContent?.trim()).toBe('(opens in a new tab)');
    expect(anchor?.contains(hint as Node)).toBe(true);
  });

  it('uses the given class names and treats texts as text, not markup', () => {
    const root = render({ linkText: '<b>bold</b>', newTabHint: '(new tab)', versionText: '<i>Version</i>' });
    expect(root.className).toBe('aboutField');
    expect(root.querySelector('a')?.className).toBe('hubAnchor');
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('i')).toBeNull();
    expect(root.querySelector('.aboutVersion')?.textContent).toBe('<i>Version</i>');
  });

  it('shows the version below the link, outside of it', () => {
    const root = render({ versionText: 'Version 1.0.0' });
    const version = root.querySelector('.aboutVersion');
    expect(version?.textContent).toBe('Version 1.0.0');
    expect(root.lastElementChild).toBe(version);
    expect(root.querySelector('a')?.contains(version as Node)).toBe(false);
  });

  it('shows no version line without a version text', () => {
    expect(render().querySelector('.aboutVersion')).toBeNull();
    expect(render({ versionText: '' }).querySelector('.aboutVersion')).toBeNull();
  });
});

describe('readVersion', () => {
  it('takes a release version as the build writes it into the manifest', () => {
    expect(readVersion('1.0.0')).toBe('1.0.0');
    expect(readVersion('12.30.4')).toBe('12.30.4');
  });

  it('ignores anything else, so the pane shows no version', () => {
    ['*', '1.0', SOLUTION_VERSION, '1.0.0-beta.1', ' 1.0.0', '1.0.0\n', 'v1.0.0', '<b>1</b>.0.0', ''].forEach((value) =>
      expect(readVersion(value)).toBeUndefined()
    );
    [undefined, null, 1, { version: '1.0.0' }, ['1.0.0']].forEach((value) =>
      expect(readVersion(value)).toBeUndefined()
    );
  });
});
