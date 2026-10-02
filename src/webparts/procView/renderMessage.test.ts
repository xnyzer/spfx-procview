import { renderMessage } from './renderMessage';
import type { IMessageView } from './renderMessage';
import type { IMessageTexts } from './messages';

const CLASS_NAMES: IMessageView['classNames'] = {
  root: 'root',
  message: 'message',
  info: 'info',
  error: 'error',
  title: 'title',
  body: 'body',
  details: 'details',
  configure: 'configure',
  hubLink: 'hubLink',
  hubAnchor: 'hubAnchor',
  srOnly: 'srOnly'
};

const HUB = {
  url: 'https://editor.signavio.com/p/portal#/model/0123456789abcdef0123456789abcdef',
  text: 'Open in Signavio',
  position: 'below' as const,
  align: 'right' as const,
  newTabHint: '(opens in a new tab)'
};

function texts(overrides: Partial<IMessageTexts> = {}): IMessageTexts {
  return {
    tone: 'error',
    title: 'The diagram could not be loaded',
    body: 'Possible causes:',
    details: ['Sharing revoked', 'Link incorrect', 'Domain blocked'],
    showConfigure: true,
    showHubLink: false,
    ...overrides
  };
}

function view(overrides: Partial<IMessageView> = {}): IMessageView {
  return { texts: texts(), configureLabel: 'Configure', onConfigure: jest.fn(), classNames: CLASS_NAMES, ...overrides };
}

describe('renderMessage', () => {
  it('renders title, body and the list of causes', () => {
    const root = renderMessage(document, view());
    expect(root.tagName).toBe('SECTION');
    expect(root.querySelector('.message')?.className).toBe('message error');
    expect(root.querySelector('.title')?.textContent).toBe('The diagram could not be loaded');
    expect(root.querySelector('.body')?.textContent).toBe('Possible causes:');
    expect(Array.from(root.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
      'Sharing revoked',
      'Link incorrect',
      'Domain blocked'
    ]);
  });

  it('uses the info tone for guidance', () => {
    const root = renderMessage(document, view({ texts: texts({ tone: 'info' }) }));
    expect(root.querySelector('.message')?.className).toBe('message info');
  });

  it('omits title and list when there are none', () => {
    const root = renderMessage(document, view({ texts: texts({ title: undefined, details: [] }) }));
    expect(root.querySelector('.title')).toBeNull();
    expect(root.querySelector('ul')).toBeNull();
  });

  it('offers a Configure button that calls back', () => {
    const onConfigure = jest.fn();
    const button = renderMessage(document, view({ onConfigure })).querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('Configure');
    button.click();
    expect(onConfigure).toHaveBeenCalledTimes(1);
  });

  it('shows no button when the message does not ask for it or no callback exists', () => {
    expect(
      renderMessage(document, view({ texts: texts({ showConfigure: false }) })).querySelector('button')
    ).toBeNull();
    expect(renderMessage(document, view({ onConfigure: undefined })).querySelector('button')).toBeNull();
  });

  it('adds the hub link below the message when asked for and available', () => {
    const root = renderMessage(document, view({ texts: texts({ showHubLink: true }), hubLink: HUB }));
    const anchor = root.querySelector('a') as HTMLAnchorElement;
    expect(root.lastElementChild?.className).toBe('hubLink');
    expect(anchor.getAttribute('href')).toBe(HUB.url);
    expect(anchor.target).toBe('_blank');
    expect(anchor.rel).toBe('noopener noreferrer');
  });

  it('shows no hub link when not asked for or not available', () => {
    expect(renderMessage(document, view({ hubLink: HUB })).querySelector('a')).toBeNull();
    expect(renderMessage(document, view({ texts: texts({ showHubLink: true }) })).querySelector('a')).toBeNull();
  });

  it('never interprets texts as markup', () => {
    const hostile = '<img src=x onerror=alert(1)>';
    const root = renderMessage(
      document,
      view({ texts: texts({ title: hostile, body: hostile, details: [hostile] }), configureLabel: hostile })
    );
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.title')?.textContent).toBe(hostile);
    expect(root.querySelector('button')?.textContent).toBe(hostile);
  });
});
