# terminal-web
A website that looks like a terminal

This is how [sharkfood.com](https://sharkfood.com) is built.

## Getting started

```bash
npm install
npm run build   # production build to dist/
npm start       # serve dist/ on http://localhost:3000
npm run watch   # build + watch for changes
```

## Content

Content is defined in `content/content.json`. Each page has a route, title, and either inline content or a `content-url` pointing to a separate JSON file that is lazy-loaded on navigation.

### Page definition

```json
{
  "about": {
    "type": "page",
    "route": "/about",
    "title": "About",
    "content": [...]
  }
}
```

Or with lazy-loaded content:

```json
{
  "about": {
    "type": "page",
    "route": "/about",
    "title": "About",
    "content-url": "content/about.json"
  }
}
```

When `content-url` is used, the file is only fetched when the user navigates to that page. The file contains the content array directly. Inline `content` and `content-url` are mutually exclusive; if both are present, inline `content` takes priority.

### Content items

Content is an array of items. A plain string is shorthand for a text item.

| Type | Fields | Description |
|------|--------|-------------|
| `text` | `content`, `class?` | Text paragraph |
| `image` | `content` (image path) | Progressively loaded image |
| `link` | `content`, `url`, `navigation-dir?` | Internal or external link |
| `selection` | `content`, `options[]`, `bullet?` | Clickable option list |
| `input` | `content` (label), `id?` | Text input field |
| `button` | `content`, `action?` | Clickable button |

### Actions

Some items support an `action` field instead of (or in addition to) a `url`. Actions use the format `command:argument`. Currently supported:

- `setTheme:<name>` — switch to the named theme (e.g. `setTheme:win311`)

Actions work on selection options, menu items, and buttons.

## Menus

The top-level `menu` key in `content/content.json` defines a menu bar. Not all themes support menus — currently only the Windows 3.11 theme renders them. The CRT theme ignores menu data.

```json
{
  "menu": [
    {
      "label": "File",
      "items": [
        { "label": "Home", "url": "/" },
        { "divider": true },
        { "label": "Switch theme", "action": "setTheme:crt" }
      ]
    },
    {
      "label": "View",
      "items": [
        { "label": "Projects", "items": [
          { "label": "Fooducate", "url": "/projects/fooducate" }
        ]}
      ]
    }
  ]
}
```

Menu items can have:
- `label` + `url` — navigates to a page
- `label` + `action` — runs an action
- `label` + `items` — opens a submenu
- `divider: true` — renders a horizontal separator

Each theme also automatically injects a theme-switch item into the File menu and the home page selection.

## Themes

Themes control the entire visual presentation. Each theme has:
- A CSS file in `themes/`
- A TypeScript class in `src/main.ts` that handles setup/teardown of theme-specific DOM

### Available themes

| Theme | Key | Description |
|-------|-----|-------------|
| CRT Terminal | `crt` | Retro orange-on-black terminal with scanlines, glow, and VGA font |
| Windows 3.11 | `win311` | Classic Windows 3.11 look with window chrome, menus, and 3D borders |

### Switching themes

- URL parameter: `?theme=win311`
- From code/console: `setTheme('crt')`
- From content: use `action: "setTheme:win311"` on a selection option or menu item

The selected theme is persisted in `localStorage`.

## Build

`npm run build` creates a production build in `dist/` with cache-busted paths:

```
dist/
  index.html              # only file to invalidate on CloudFront
  favicon.ico
  robots.txt
  bimi.svg
  <hash>/
    main.js
    style.css
    content/
    fonts/
    img/
    themes/
    manifest.json
    logo192.png
    logo512.png
```

All assets are under a git-hash directory. To deploy, upload `dist/` to S3 and invalidate only `/index.html` on CloudFront.
