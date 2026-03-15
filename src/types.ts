export interface ContentPage {
  type: 'page';
  route: string;
  title: string;
  content?: (ContentItem | string)[];
  'content-url'?: string;
}

export interface ContentItem {
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

export interface OptionItem {
  content: string;
  url?: string;
  action?: string;
}

export interface MenuItem {
  label?: string;
  url?: string;
  action?: string;
  items?: MenuItem[];
  divider?: boolean;
}

export interface MenuDefinition {
  label: string;
  items: MenuItem[];
}

export interface ThemeInfo {
  name: string;
  label: string;
  icon: string;
}

export interface Theme {
  name: string;
  label: string;
  icon: string;
  css: string;
  setup(terminal: HTMLElement): void;
  teardown(): void;
  onContentLoaded?(menu: MenuDefinition[], navigateTo: (url: string) => void, runAction: (action: string) => void): void;
  renderThemeSwitcher(otherThemes: ThemeInfo[], basePath: string, runAction: (action: string) => void): void;
}
