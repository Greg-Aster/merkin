# Megameal Styles

`site.ts` is the app-level global style entry point. Layouts should import that entry point instead of importing global CSS files one by one.

Use this folder for styles that are shared beyond a single component:

- `main.css`: Tailwind component-layer entry point. Keep it thin.
- `variables.styl`: theme variables and light/dark CSS custom properties.
- `foundation/`: design tokens, global utilities, reusable component classes, and site-wide behavior.
- `layouts/`: CSS owned by layout wrappers.
- `features/`: CSS used across one feature area.
- `pages/`: extracted page-specific CSS.

Keep styles inside `.astro` or `.svelte` files when they are tightly scoped to that component and are not reused elsewhere. If the same visual pattern appears in multiple files, promote it to `foundation/` or a feature-level CSS file and reuse a named class.

Tailwind is still active in this app. Prefer Tailwind utilities for simple spacing, layout, typography, and responsive rules; prefer shared CSS classes for repeated visual systems like cards, panels, buttons, banners, and interaction states.
