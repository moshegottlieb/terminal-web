// Terminal Website - Main TypeScript File
// main.ts

// Types for our content
interface ContentPage {
  type: 'page';
  route: string;
  title: string;
  content: (ContentItem | string)[];
}

interface ContentItem {
  type: 'text' | 'image' | 'link' | 'selection' | 'input' | 'button';
  content: string;
  url?: string;
  options?: OptionItem[];
  action?: string;
  id?: string;
  class?: string | string[];
  // Only applies to link type
  'navigation-dir'?: 'back' | 'forward';
  // Only applies to selection type, leave empty for numeric bullets
  bullet?: string;
}

interface OptionItem {
  content: string;
  url?: string;
  action?: string;
}

interface MenuItem {
  label?: string;
  url?: string;
  action?: string;
  items?: MenuItem[];
  divider?: boolean;
}

interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

// Theme interface
interface Theme {
  name: string;
  css: string; // path to CSS file
  switchTo: string; // theme name to switch to
  switchLabel: string; // label for "switch to other theme"
  setup(terminal: HTMLElement): void;
  teardown(): void;
  onContentLoaded?(menu: MenuDefinition[], navigateTo: (url: string) => void, runAction: (action: string) => void): void;
}

// Asset base path for cache-busted builds (set by build script via window.ASSET_BASE)
declare var ASSET_BASE: string | undefined;

// CRT Theme
class CRTTheme implements Theme {
  name = 'crt';
  css = 'themes/crt.css';
  switchTo = 'win311';
  switchLabel = 'Start Windows 3.11';
  private distortInterval: number | null = null;

  setup(_terminal: HTMLElement): void {
    const scanMove = document.createElement('div');
    scanMove.id = 'scan-effect';
    document.body.appendChild(scanMove);

    const overlay = document.createElement('div');
    overlay.className = 'crt-overlay';
    document.body.appendChild(overlay);

    this.distortInterval = window.setInterval(() => {
      const intensity = Math.random() * 10;
      if (intensity > 9) {
        document.body.classList.add('crt-distort');
        setTimeout(() => {
          document.body.classList.remove('crt-distort');
        }, 100 + Math.random() * 200);
      }
    }, 2000);
  }

  teardown(): void {
    if (this.distortInterval !== null) {
      clearInterval(this.distortInterval);
      this.distortInterval = null;
    }
    const scanEffect = document.getElementById('scan-effect');
    if (scanEffect) scanEffect.remove();
    const overlay = document.querySelector('.crt-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('crt-distort');
  }
}

// Windows 3.11 Theme
class Win311Theme implements Theme {
  name = 'win311';
  css = 'themes/win311.css';
  switchTo = 'crt';
  switchLabel = 'Start command line shell';
  private windowFrame: HTMLElement | null = null;
  private menubar: HTMLElement | null = null;
  private closeListener: ((e: MouseEvent) => void) | null = null;

  setup(terminal: HTMLElement): void {
    // Create window frame around terminal
    this.windowFrame = document.createElement('div');
    this.windowFrame.className = 'win-window';

    // Title bar
    const titlebar = document.createElement('div');
    titlebar.className = 'win-titlebar';

    const title = document.createElement('span');
    title.className = 'win-title';
    title.textContent = 'SHARKFOOD.COM';
    titlebar.appendChild(title);

    const buttons = document.createElement('div');
    buttons.className = 'win-buttons';
    const btnMin = document.createElement('button');
    btnMin.className = 'win-btn';
    btnMin.textContent = '▼';
    const btnMax = document.createElement('button');
    btnMax.className = 'win-btn';
    btnMax.textContent = '▲';
    buttons.appendChild(btnMin);
    buttons.appendChild(btnMax);
    titlebar.appendChild(buttons);

    // Menu bar (placeholder, populated by onContentLoaded)
    this.menubar = document.createElement('div');
    this.menubar.className = 'win-menubar';

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'win-content';

    // Status bar
    const statusbar = document.createElement('div');
    statusbar.className = 'win-statusbar';
    const statusSection = document.createElement('div');
    statusSection.className = 'win-status-section';
    statusSection.textContent = 'Ready';
    statusbar.appendChild(statusSection);

    // Assemble
    this.windowFrame.appendChild(titlebar);
    this.windowFrame.appendChild(this.menubar);
    this.windowFrame.appendChild(content);
    this.windowFrame.appendChild(statusbar);

    // Move terminal into the window content area
    terminal.parentNode?.insertBefore(this.windowFrame, terminal);
    content.appendChild(terminal);

    // Close menus when clicking outside
    this.closeListener = (e: MouseEvent) => {
      if (this.menubar && !this.menubar.contains(e.target as Node)) {
        this.closeAllMenus();
      }
    };
    document.addEventListener('click', this.closeListener);
  }

  onContentLoaded(menu: MenuDefinition[], navigateTo: (url: string) => void, runAction: (action: string) => void): void {
    if (!this.menubar) return;
    this.menubar.innerHTML = '';

    for (const menuDef of menu) {
      const menuItem = document.createElement('div');
      menuItem.className = 'win-menu-item';
      menuItem.textContent = menuDef.label;

      const dropdown = this.buildDropdown(menuDef.items, navigateTo, runAction);
      menuItem.appendChild(dropdown);

      menuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('win-dropdown-open');
        this.closeAllMenus();
        if (!isOpen) {
          dropdown.classList.add('win-dropdown-open');
          menuItem.classList.add('win-menu-item-active');
        }
      });

      // Hover to switch between open menus
      menuItem.addEventListener('mouseenter', () => {
        const anyOpen = this.menubar?.querySelector('.win-dropdown-open');
        if (anyOpen) {
          this.closeAllMenus();
          dropdown.classList.add('win-dropdown-open');
          menuItem.classList.add('win-menu-item-active');
        }
      });

      this.menubar.appendChild(menuItem);
    }
  }

  private buildDropdown(items: MenuItem[], navigateTo: (url: string) => void, runAction: (action: string) => void): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'win-dropdown';

    for (const item of items) {
      if (item.divider) {
        const divider = document.createElement('div');
        divider.className = 'win-dropdown-divider';
        dropdown.appendChild(divider);
        continue;
      }

      const entry = document.createElement('div');
      entry.className = 'win-dropdown-item';
      entry.textContent = item.label || '';

      if (item.items) {
        // Submenu
        entry.classList.add('win-dropdown-has-submenu');
        const submenu = this.buildDropdown(item.items, navigateTo, runAction);
        submenu.classList.add('win-submenu');
        entry.appendChild(submenu);

        entry.addEventListener('mouseenter', () => {
          submenu.classList.add('win-dropdown-open');
        });
        entry.addEventListener('mouseleave', () => {
          submenu.classList.remove('win-dropdown-open');
        });
      } else if (item.url) {
        entry.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeAllMenus();
          navigateTo(item.url!);
        });
      } else if (item.action) {
        entry.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeAllMenus();
          runAction(item.action!);
        });
      }

      dropdown.appendChild(entry);
    }

    return dropdown;
  }

  private closeAllMenus(): void {
    if (!this.menubar) return;
    this.menubar.querySelectorAll('.win-dropdown-open').forEach(el => {
      el.classList.remove('win-dropdown-open');
    });
    this.menubar.querySelectorAll('.win-menu-item-active').forEach(el => {
      el.classList.remove('win-menu-item-active');
    });
  }

  teardown(): void {
    if (this.closeListener) {
      document.removeEventListener('click', this.closeListener);
      this.closeListener = null;
    }
    if (this.windowFrame) {
      const terminal = this.windowFrame.querySelector('#terminal');
      if (terminal) {
        this.windowFrame.parentNode?.insertBefore(terminal, this.windowFrame);
      }
      this.windowFrame.remove();
      this.windowFrame = null;
    }
    this.menubar = null;
  }
}

const THEMES: Record<string, Theme> = {
  'crt': new CRTTheme(),
  'win311': new Win311Theme(),
};

const DEFAULT_THEME = 'crt';

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
    // Inject theme switch into File menu
    const menuWithSwitch = this.menuData.map(m => {
      if (m.label === 'File') {
        return {
          ...m,
          items: [
            ...m.items,
            { divider: true },
            { label: this.currentTheme!.switchLabel, action: `setTheme:${this.currentTheme!.switchTo}` }
          ]
        };
      }
      return m;
    });
    this.currentTheme.onContentLoaded(
      menuWithSwitch,
      (url: string) => this.navigateTo(url),
      (action: string) => this.runAction(action)
    );
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
  private navigateToPath(path: string): void {
    const pageKey = this.routeMap[path];
    if (pageKey && this.contentData[pageKey]) {
      this.clearTerminal();
      this.currentPage = this.contentData[pageKey];
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

    // Process each content item, injecting theme switch into home selections
    page.content.forEach(item => {
      if (pageId === 'home' && this.currentTheme && typeof item === 'object' && item.type === 'selection' && item.options) {
        const augmented = {
          ...item,
          options: [
            ...item.options,
            { content: this.currentTheme.switchLabel, action: `setTheme:${this.currentTheme.switchTo}` }
          ]
        };
        this.renderContentItem(augmented);
      } else {
        this.renderContentItem(item);
      }
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
              eval(action);
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
  terminal.loadContent('content.json').then(() => {
    const path = window.location.pathname;
    terminal.navigateTo(path === '/' ? '/' : path);
  });

  // Expose theme switcher globally for easy access
  (window as any).setTheme = (name: string) => terminal.setTheme(name);
});
