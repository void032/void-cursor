# void-cursor

A lightweight React cursor with an immediate dot and a smoothly trailing ring. It is SSR-safe, uses no runtime dependencies beyond React, and injects its own styles.

## Install

```bash
npm install void-cursor
```

`react` and `react-dom` 18 or 19 are peer dependencies.

## Module support

`void-cursor` is ESM-only. Use `import` syntax with a modern React bundler (Vite, Create React App, or Next.js); `require()` is not supported.

## Usage

```tsx
import { VoidCursor } from 'void-cursor'

export function App() {
  return (
    <>
      <VoidCursor />
      <button data-void-cursor="hover">Expand the cursor ring</button>
    </>
  )
}
```

Styles are injected after client mount; no stylesheet import is required. Hover expansion is opt-in: by default, only elements matching `[data-void-cursor="hover"]` expand the ring.

## Props

| Prop | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | Enables the cursor effect. |
| `smoothing` | `0.15` | Ring trailing strength; larger values follow more closely. |
| `ringSize` | `30` | Ring diameter in pixels. |
| `dotSize` | `10` | Dot diameter in pixels. |
| `ringColor` | `#f2efe8` | Ring stroke color. |
| `dotColor` | `#ffffff` | Dot fill color. |
| `hoverScale` | `2.5` | Ring scale for a matching hover target. |
| `zIndex` | `99999` | Stacking order for the cursor layer. |
| `hoverSelector` | `[data-void-cursor="hover"]` | Selector used for hover expansion. |
| `hideNativeCursor` | `false` | Hides the browser cursor while this instance is active. |
| `onHoverChange` | — | Called with `(hovered, target)` when the matched target changes. |

## Accessibility and device behavior

The cursor is `aria-hidden`. It disables itself on coarse-pointer devices and when `prefers-reduced-motion: reduce` is enabled. The browser cursor remains visible by default.

`hideNativeCursor` applies `cursor: none` globally while the component is active. Enable it only when the custom cursor provides an adequate replacement: hiding the native cursor also removes familiar text-caret, resize-handle, and other native cursor affordances.

## SSR and Next.js

`VoidCursor` is safe to import during server rendering. It renders no portal until client mount and its entry includes the `'use client'` directive for Next.js App Router. Render it from a Client Component, for example:

```tsx
'use client'

import { VoidCursor } from 'void-cursor'

export function CursorLayer() {
  return <VoidCursor />
}
```

## Content Security Policy

The library injects one `<style id="void-cursor-styles">` element into `document.head`. A strict CSP that disallows inline style elements can block these styles; permit the style injection or provide an appropriate CSP policy before using the component.

## Development

```bash
npm run lint
npm run typecheck
npm run build
```
