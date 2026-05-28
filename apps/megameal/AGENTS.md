# Megameal Agent Instructions

These rules apply inside `apps/megameal`.

## Styling Architecture

- Global app styles enter through `src/styles/site.ts`.
- `src/styles/main.css` keeps Tailwind layer directives thin; shared global systems live in `src/styles/foundation/` and are imported through `site.ts`.
- `src/styles/variables.styl` owns theme variables and light/dark custom properties.
- `src/styles/foundation/` owns design tokens, global utilities, reusable component classes, and site-wide behavior.
- `src/styles/layouts/` owns layout wrapper CSS.
- Feature-level CSS belongs under `src/styles/features/` when multiple components in that feature use it.
- Page-specific extracted CSS belongs under `src/styles/pages/`.
- Component `.astro` or `.svelte` styles are allowed only for behavior tightly scoped to that component.

## CSS Decision Order

Before adding CSS:

1. Use existing Tailwind utilities for simple one-off layout, spacing, typography, color, and responsive behavior.
2. Reuse existing shared classes from `src/styles/foundation/` and feature CSS.
3. Reuse or extract an existing component if the markup and behavior repeat.
4. Add feature CSS under `src/styles/` if multiple files need the same visual system.
5. Add component-scoped CSS only when the style is local and unlikely to be reused.

Read `docs/frontend-architecture-guardrails.md` before frontend/style work. Treat it as the local reuse contract for component and CSS ownership.

## Avoid

- New large `<style>` blocks in pages.
- Copying card, panel, button, pill, badge, marketplace, banner, or nav styles between files.
- Adding standalone CSS files outside `src/styles/` unless they are imported sidecars for a specific component and cannot reasonably be shared.
- Inline `style` attributes for reusable visuals.
- New global selectors from a component file.
- Growing files listed in `reports/css-architecture-baseline.json` without reducing or extracting another responsibility in the same owner area.
- Updating the CSS architecture baseline to accept new debt unless the user explicitly approves that tradeoff.

## Required Checks

For Megameal code changes:

```bash
pnpm --dir apps/megameal type-check
```

For frontend/style changes:

```bash
pnpm --dir apps/megameal audit:css
```

For CSS-heavy work, include changed-file audit output or a summary:

```bash
pnpm --dir apps/megameal audit:css:changed
```

For changes that add CSS, new components, or new frontend ownership surfaces, also run the baseline gate:

```bash
pnpm --dir apps/megameal audit:css:strict
```

## Handoff Notes

Every agent handoff for frontend/style work must state:

- Whether new CSS was added.
- Where the CSS lives.
- Why it was not implemented with existing utilities/classes/components.
- Which existing components/classes/style files were inspected before adding CSS.
- Whether `type-check` and the CSS audit were run.
- Whether `audit:css:strict` passed or any remaining items are pre-existing baseline debt.
