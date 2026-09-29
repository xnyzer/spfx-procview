import { Version } from '@microsoft/sp-core-library';
import type { IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

import styles from './ProcViewWebPart.module.scss';
import * as strings from 'ProcViewWebPartStrings';

// Properties arrive with F-002 (diagram link, size, alt text).
export type IProcViewWebPartProps = Record<string, never>;

export default class ProcViewWebPart extends BaseClientSideWebPart<IProcViewWebPartProps> {
  public render(): void {
    // DOM via createElement/textContent only — no markup strings (CODING-STANDARDS §13)
    const section = document.createElement('section');
    section.className = styles.procView;

    const message = document.createElement('p');
    message.className = styles.placeholder;
    message.textContent = strings.NotConfiguredMessage;
    section.appendChild(message);

    this.domElement.replaceChildren(section);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--bodySubtext', semanticColors.bodySubtext || null);
    }

    // Theme changes after the first render must reach the elements already on the page
    if (this.renderedOnce) {
      this.render();
    }
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: []
        }
      ]
    };
  }
}
