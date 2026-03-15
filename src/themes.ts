import { Theme, ThemeInfo, MenuDefinition, MenuItem } from './types';

class CRTTheme implements Theme {
  name = 'crt';
  label = 'Terminal';
  icon = 'img/themes/terminal.svg';
  css = 'themes/crt.css';
  private distortInterval: number | null = null;
  private themeSwitcher: HTMLElement | null = null;

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

  renderThemeSwitcher(otherThemes: ThemeInfo[], basePath: string, runAction: (action: string) => void): void {
    if (this.themeSwitcher) this.themeSwitcher.remove();

    this.themeSwitcher = document.createElement('div');
    this.themeSwitcher.className = 'crt-theme-switcher';

    for (const theme of otherThemes) {
      const item = document.createElement('div');
      item.className = 'crt-theme-item';
      item.addEventListener('click', () => runAction(`setTheme:${theme.name}`));

      const icon = document.createElement('img');
      icon.src = basePath + theme.icon;
      icon.className = 'crt-theme-icon';
      icon.alt = theme.label;
      item.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'crt-theme-label';
      label.textContent = theme.label;
      item.appendChild(label);

      this.themeSwitcher.appendChild(item);
    }

    document.getElementById('terminal')?.appendChild(this.themeSwitcher);
  }

  teardown(): void {
    if (this.distortInterval !== null) {
      clearInterval(this.distortInterval);
      this.distortInterval = null;
    }
    if (this.themeSwitcher) {
      this.themeSwitcher.remove();
      this.themeSwitcher = null;
    }
    const scanEffect = document.getElementById('scan-effect');
    if (scanEffect) scanEffect.remove();
    const overlay = document.querySelector('.crt-overlay');
    if (overlay) overlay.remove();
    document.body.classList.remove('crt-distort');
  }
}

class Win311Theme implements Theme {
  name = 'win311';
  label = 'Windows';
  icon = 'img/themes/windows.svg';
  css = 'themes/win311.css';
  private windowFrame: HTMLElement | null = null;
  private menubar: HTMLElement | null = null;
  private closeListener: ((e: MouseEvent) => void) | null = null;
  private desktopIcons: HTMLElement | null = null;

  setup(terminal: HTMLElement): void {
    // Create desktop icons container (placed on the teal background)
    this.desktopIcons = document.createElement('div');
    this.desktopIcons.className = 'win-desktop-icons';

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

    // Insert desktop icons and window frame
    terminal.parentNode?.insertBefore(this.desktopIcons, terminal);
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

  renderThemeSwitcher(otherThemes: ThemeInfo[], basePath: string, runAction: (action: string) => void): void {
    if (!this.desktopIcons) return;
    this.desktopIcons.innerHTML = '';

    for (const theme of otherThemes) {
      const item = document.createElement('div');
      item.className = 'win-desktop-icon';
      item.addEventListener('click', () => runAction(`setTheme:${theme.name}`));

      const icon = document.createElement('img');
      icon.src = basePath + theme.icon;
      icon.className = 'win-desktop-icon-img';
      icon.alt = theme.label;
      item.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'win-desktop-icon-label';
      label.textContent = theme.label;
      item.appendChild(label);

      this.desktopIcons.appendChild(item);
    }
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
    if (this.desktopIcons) {
      this.desktopIcons.remove();
      this.desktopIcons = null;
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

class TWMTheme implements Theme {
  name = 'twm';
  label = 'X11';
  icon = 'img/themes/x11.svg';
  css = 'themes/twm.css';
  private windowFrame: HTMLElement | null = null;
  private desktopIcons: HTMLElement | null = null;

  setup(terminal: HTMLElement): void {
    // Desktop icons container
    this.desktopIcons = document.createElement('div');
    this.desktopIcons.className = 'twm-desktop-icons';

    this.windowFrame = document.createElement('div');
    this.windowFrame.className = 'twm-window';

    // Title bar
    const titlebar = document.createElement('div');
    titlebar.className = 'twm-titlebar';

    // Iconify button (left) - dot in square
    const btnIconify = document.createElement('button');
    btnIconify.className = 'twm-btn twm-btn-iconify';
    titlebar.appendChild(btnIconify);

    const title = document.createElement('span');
    title.className = 'twm-title';
    title.textContent = 'sharkfood.com';
    titlebar.appendChild(title);

    // Checkerboard fill between title and resize button
    const fill = document.createElement('div');
    fill.className = 'twm-titlebar-fill';
    titlebar.appendChild(fill);

    // Resize button (right) - nested squares
    const btnResize = document.createElement('button');
    btnResize.className = 'twm-btn twm-btn-resize';
    titlebar.appendChild(btnResize);

    // Content wrapper
    const content = document.createElement('div');
    content.className = 'twm-content';

    // Assemble
    this.windowFrame.appendChild(titlebar);
    this.windowFrame.appendChild(content);

    // Insert desktop icons and window frame
    terminal.parentNode?.insertBefore(this.desktopIcons, terminal);
    terminal.parentNode?.insertBefore(this.windowFrame, terminal);
    content.appendChild(terminal);
  }

  renderThemeSwitcher(otherThemes: ThemeInfo[], basePath: string, runAction: (action: string) => void): void {
    if (!this.desktopIcons) return;
    this.desktopIcons.innerHTML = '';

    for (const theme of otherThemes) {
      const item = document.createElement('div');
      item.className = 'twm-desktop-icon';
      item.addEventListener('click', () => runAction(`setTheme:${theme.name}`));

      // Teal square container with img inside for blend mode
      const iconBox = document.createElement('div');
      iconBox.className = 'twm-desktop-icon-img';
      const icon = document.createElement('img');
      icon.src = basePath + theme.icon;
      icon.alt = theme.label;
      iconBox.appendChild(icon);
      item.appendChild(iconBox);

      const label = document.createElement('span');
      label.className = 'twm-desktop-icon-label';
      label.textContent = theme.label;
      item.appendChild(label);

      this.desktopIcons.appendChild(item);
    }
  }

  teardown(): void {
    if (this.desktopIcons) {
      this.desktopIcons.remove();
      this.desktopIcons = null;
    }
    if (this.windowFrame) {
      const terminal = this.windowFrame.querySelector('#terminal');
      if (terminal) {
        this.windowFrame.parentNode?.insertBefore(terminal, this.windowFrame);
      }
      this.windowFrame.remove();
      this.windowFrame = null;
    }
  }
}

export const THEMES: Record<string, Theme> = {
  'crt': new CRTTheme(),
  'win311': new Win311Theme(),
  'twm': new TWMTheme(),
};

export const DEFAULT_THEME = 'crt';
