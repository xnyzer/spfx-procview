import { REPOSITORY_URL, renderAboutField } from './aboutField';

const CLASS_NAMES = { root: 'aboutField', hubAnchor: 'hubAnchor', srOnly: 'srOnly' };

function render(): HTMLElement {
  return renderAboutField(document, {
    linkText: 'Source code and documentation on GitHub',
    newTabHint: '(opens in a new tab)',
    classNames: CLASS_NAMES
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
    const root = renderAboutField(document, {
      linkText: '<b>bold</b>',
      newTabHint: '(new tab)',
      classNames: CLASS_NAMES
    });
    expect(root.className).toBe('aboutField');
    expect(root.querySelector('a')?.className).toBe('hubAnchor');
    expect(root.querySelector('b')).toBeNull();
  });
});
