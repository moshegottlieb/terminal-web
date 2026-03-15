import { ContentPage, ContentItem, MenuDefinition, Theme, ThemeInfo } from './types';
import { THEMES, DEFAULT_THEME } from './themes';

// Asset base path for cache-busted builds (set by build script via window.ASSET_BASE)
declare var ASSET_BASE: string | undefined;

// State management
class TerminalState {
  private currentPage: ContentPage | null = null;
  private contentData: Record<string, ContentPage> = {};
  private routeMap: Record<string, string> = {}; // route path -> page key
  private terminal: HTMLElement;
  private printSpeed = 5; // ms between characters
  private printQueue: (() => Promise<void>)[] = [];
  private printing = false;
  private basePath: string;
  private currentTheme: Theme | null = null;
  private themeLink: HTMLLinkElement | null = null;
  private menuData: MenuDefinition[] = [];

  constructor(terminalId: string) {
    this.basePath = (typeof ASSET_BASE !== 'undefined') ? ASSET_BASE : '/';
    this.terminal = document.getElementById(terminalId) || document.body;

    // Apply theme
    this.applyTheme(this.getThemeName());

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      this.navigateToPath(window.location.pathname);
    });
  }

  private getThemeName(): string {
    const params = new URLSearchParams(window.location.search);
    const paramTheme = params.get('theme');
    if (paramTheme && THEMES[paramTheme]) {
      localStorage.setItem('theme', paramTheme);
      return paramTheme;
    }
    return localStorage.getItem('theme') || DEFAULT_THEME;
  }

  private applyTheme(themeName: string): void {
    // Teardown current theme
    if (this.currentTheme) {
      this.currentTheme.teardown();
    }
    // Remove old theme CSS
    if (this.themeLink) {
      this.themeLink.remove();
    }

    const theme = THEMES[themeName];
    if (!theme) return;

    // Load theme CSS
    this.themeLink = document.createElement('link');
    this.themeLink.rel = 'stylesheet';
    this.themeLink.href = this.basePath + theme.css;
    document.head.appendChild(this.themeLink);

    // Run theme setup
    theme.setup(this.terminal);
    this.currentTheme = theme;

    localStorage.setItem('theme', themeName);

    // Re-apply menu data to new theme
    this.notifyThemeMenu();
  }

  private notifyThemeMenu(): void {
    if (!this.currentTheme?.onContentLoaded || this.menuData.length === 0) return;
    this.currentTheme.onContentLoaded(
      this.menuData,
      (url: string) => this.navigateTo(url),
      (action: string) => this.runAction(action)
    );
  }

  private renderThemeSwitcher(): void {
    if (!this.currentTheme) return;
    const otherThemes: ThemeInfo[] = Object.values(THEMES)
      .filter(t => t.name !== this.currentTheme!.name)
      .map(t => ({ name: t.name, label: t.label, icon: t.icon }));
    this.currentTheme.renderThemeSwitcher(otherThemes, this.basePath, (action: string) => this.runAction(action));
  }

  private runAction(action: string): void {
    const [command, arg] = action.split(':');
    switch (command) {
      case 'setTheme':
        this.setTheme(arg);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  public setTheme(themeName: string): void {
    if (!THEMES[themeName]) return;
    this.applyTheme(themeName);
    // Re-render current page
    if (this.currentPage) {
      const pageKey = Object.entries(this.contentData).find(
        ([_, page]) => page === this.currentPage
      )?.[0];
      if (pageKey) {
        this.clearTerminal();
        this.renderPage(this.currentPage, pageKey);
      }
    }
  }

  // Load content from JSON
  public async loadContent(jsonUrl: string): Promise<void> {
    try {
      const response = await fetch(this.basePath + jsonUrl);
      const data = await response.json();
      // Extract menu definition if present
      this.menuData = data.menu || [];
      delete data.menu;
      // Remaining entries are pages
      this.contentData = data;
      // Build route map from page routes
      for (const [key, page] of Object.entries(this.contentData)) {
        if (page.route) {
          this.routeMap[page.route] = key;
        }
      }
      // Notify theme of menu data
      this.notifyThemeMenu();
      console.log('Content loaded:', this.contentData);
    } catch (error) {
      console.error('Failed to load content:', error);
      this.print('Error: Failed to load content. Please check console for details.');
    }
  }

  // Navigate by path (e.g. "/about", "/projects/fooducate")
  private async navigateToPath(path: string): Promise<void> {
    const pageKey = this.routeMap[path];
    if (pageKey && this.contentData[pageKey]) {
      const page = this.contentData[pageKey];
      // Lazy load content if needed
      if (!page.content && page['content-url']) {
        try {
          const response = await fetch(this.basePath + page['content-url']);
          page.content = await response.json();
        } catch (error) {
          console.error('Failed to load page content:', error);
          this.print(`Error: Failed to load content for '${pageKey}'.`);
          return;
        }
      }
      this.clearTerminal();
      this.currentPage = page;
      this.renderPage(this.currentPage, pageKey);
    } else {
      // Fall back to home
      this.navigateToPath('/');
    }
  }

  // Navigate to a URL (internal path or external)
  public navigateTo(url?: string): void {
    if (!url) return;
    if (this.isExternalLink(url)) {
      window.open(url, '_blank');
    } else {
      history.pushState(null, '', url);
      this.navigateToPath(url);
    }
  }

  // Clear the terminal screen
  private clearTerminal(): void {
    this.printQueue = [];
    this.terminal.innerHTML = '';
  }

  // Render a content page
  private renderPage(page: ContentPage, pageId: string): void {
    // Update window title if Win3.11 theme
    const winTitle = document.querySelector('.win-title');
    if (winTitle) {
      winTitle.textContent = page.title;
    }

    // Add title
    const titleElement = document.createElement('p');
    titleElement.className = 'terminal-title';
    this.terminal.appendChild(titleElement);

    this.queuePrint(async () => {
      await this.typeText(titleElement, page.title);
    });

    // Process each content item
    (page.content || []).forEach(item => {
      this.renderContentItem(item);
    });

    if (pageId != 'home') {
      const back: ContentItem = {
        type: 'link',
        content: 'Restart program',
        'navigation-dir': 'back',
        url: '/'
      }
      this.renderContentItem(back);
    }

    // Render theme switcher icons
    this.renderThemeSwitcher();

    // Start printing from queue
    this.processQueue();
  }

  // Add a print function to the queue
  private queuePrint(printFn: () => Promise<void>): void {
    this.printQueue.push(printFn);
  }

  // Process the print queue
  private async processQueue(): Promise<void> {
    if (this.printing || this.printQueue.length === 0) return;

    this.printing = true;

    while (this.printQueue.length > 0) {
      const printFn = this.printQueue.shift();
      if (printFn) {
        try {
          await printFn();
        } catch (error) {
          console.error('Error printing:', error);
        }
      }
    }

    this.printing = false;
  }

  private isExternalLink(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:');
  }

  // Render individual content item
  private renderContentItem(rawItem: ContentItem | string): void {
    let item: ContentItem;
    if (typeof rawItem === 'string') {
      item = {
        type: 'text',
        content: rawItem
      }
    } else {
      item = rawItem;
    }
    let element: HTMLElement;
    let id_element: HTMLElement | null = null;
    switch (item.type) {
      case 'text':
        const paragraph = document.createElement('p');
        element = paragraph;
        paragraph.className = 'terminal-text';
        this.terminal.appendChild(paragraph);
        this.queuePrint(async () => {
          await this.typeText(paragraph, item.content);
        });
        break;

      case 'image':
        const imgContainer = document.createElement('div');
        element = imgContainer;
        imgContainer.className = 'image-container';
        this.terminal.appendChild(imgContainer);

        this.queuePrint(async () => {
          await this.loadImageProgressively(imgContainer, item.content);
        });
        break;

      case 'link':
        const linkContainer = document.createElement('div');
        element = linkContainer;
        linkContainer.className = 'link-container';
        this.terminal.appendChild(linkContainer);
        const linkElement = document.createElement('a');
        id_element = linkElement;

        this.queuePrint(async () => {
          linkElement.href = item.url || '/';
          linkElement.className = 'terminal-link';

          let prefix: string;
          // If it's an internal link
          if (item.url && !this.isExternalLink(item.url)) {
            if (item["navigation-dir"] == 'back') {
              prefix = '◃ '
            } else {
              prefix = '▹ ';
            }
          } else {
            linkElement.target = '_blank';
            prefix = '▹▹ ';
          }
          linkElement.addEventListener('click', (e) => {
            if (item.url && !this.isExternalLink(item.url)) {
              e.preventDefault();
              this.navigateTo(item.url);
            }
          });

          linkContainer.appendChild(linkElement);
          await this.typeText(linkElement, prefix + item.content);
        });
        break;

      case 'selection':
        const selectContainer = document.createElement('div');
        element = selectContainer;
        selectContainer.className = 'select-container';
        this.terminal.appendChild(selectContainer);

        this.queuePrint(async () => {
          const selectLabel = document.createElement('span');
          selectLabel.className = 'select-label';
          selectContainer.appendChild(selectLabel);
          await this.typeText(selectLabel, `${item.content}`);

          const selectElement = document.createElement('div');
          selectElement.className = 'terminal-select';
          selectContainer.appendChild(selectElement);

          if (item.options) {
            item.options.forEach((option, index) => {
              const optionElement = document.createElement('div');
              optionElement.className = 'select-option';
              if (item.bullet) {
                optionElement.textContent = `${item.bullet} ${option.content}`;
              } else {
                optionElement.textContent = `${index + 1}. ${option.content}`;
              }

              optionElement.addEventListener('click', () => {
                if (option.action) {
                  this.runAction(option.action);
                } else if (option.url) {
                  this.navigateTo(option.url);
                }
              });
              selectElement.appendChild(optionElement);
            });
          }
        });
        break;

      case 'input':
        const inputContainer = document.createElement('div');
        element = inputContainer;
        inputContainer.className = 'input-container';
        this.terminal.appendChild(inputContainer);
        const inputElement = document.createElement('input');
        id_element = inputElement;
        this.queuePrint(async () => {
          const inputLabel = document.createElement('span');
          inputLabel.className = 'input-label';
          inputContainer.appendChild(inputLabel);
          await this.typeText(inputLabel, `${item.content}:`);

          inputElement.type = 'text';
          inputElement.className = 'terminal-input';
          inputContainer.appendChild(inputElement);
        });
        break;

      case 'button':
        const buttonContainer = document.createElement('div');
        element = buttonContainer;
        buttonContainer.className = 'button-container';
        this.terminal.appendChild(buttonContainer);

        const buttonElement = document.createElement('button');
        element = buttonElement;
        this.queuePrint(async () => {
          buttonElement.className = 'terminal-button';
          const action = item.action;
          if (action != null) {
            buttonElement.addEventListener('click', () => {
              this.runAction(action);
            });
          }

          buttonContainer.appendChild(buttonElement);
          await this.typeText(buttonElement, item.content);
        });
        break;
    }
    if (item.class) {
      if (Array.isArray(item.class)) {
        item.class.forEach((cls) => {
          element.classList.add(cls);
        });
      } else {
        element.classList.add(item.class);
      }
    }
    const id = item.id || 'input-' + Math.random().toString(36).substring(2);
    if (id_element instanceof HTMLElement) {
      id_element.id = id;
    } else {
      element.id = id;
    }
  }

  // Type text with delay to mimic old terminals
  private async typeText(element: HTMLElement, text: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!element.isConnected) {
        resolve();
        return;
      }
      let i = 0;
      const typeNextChar = () => {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(typeNextChar, this.printSpeed);
        } else {
          resolve();
        }
      };

      element.textContent = '';
      typeNextChar();
    });
  }

  // Load and display an image progressively
  private async loadImageProgressively(container: HTMLElement, imageUrl: string): Promise<void> {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.className = 'terminal-image';
      img.style.opacity = '0';

      container.innerHTML = `<div class="loading-text">Loading image...</div>`;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        container.innerHTML = `<div class="error-text">Error creating context</div>`;
        resolve();
        return;
      }

      img.onload = () => {
        container.innerHTML = '';
        container.appendChild(canvas);
        canvas.width = img.width;
        canvas.height = img.height;

        let height = 0;
        const STEP = img.height / 50;
        const drawImage = () => {
          if (!canvas.isConnected) {
            resolve();
            return;
          }
          if (height < img.height) {
            // Randomly pause to simulate loading
            if (Math.random() < 0.1) {
              setTimeout(drawImage, 100);
              return;
            }
            const new_height = height + STEP;
            ctx.drawImage(img, 0, height, img.width, STEP, 0, height, img.width, STEP);
            height = new_height;
            setTimeout(drawImage, 10);
          } else {
            resolve();
          }
        };
        drawImage();
      };

      img.onerror = () => {
        container.innerHTML = `<div class="error-text">Error loading image: ${imageUrl}</div>`;
        resolve();
      };

      // Set source to begin loading
      img.src = this.basePath + imageUrl;
    });
  }

  // Simple print message function
  public print(message: string): void {
    const paragraph = document.createElement('p');
    paragraph.className = 'terminal-text';
    this.terminal.appendChild(paragraph);

    this.queuePrint(async () => {
      await this.typeText(paragraph, message);
    });

    this.processQueue();
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const terminal = new TerminalState('terminal');

  // Load content and navigate based on current URL
  terminal.loadContent('content/content.json').then(() => {
    const path = window.location.pathname;
    terminal.navigateTo(path === '/' ? '/' : path);
  });

  // Expose theme switcher globally for easy access
  (window as any).setTheme = (name: string) => terminal.setTheme(name);
});
