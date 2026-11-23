# Megameal Frontend Architecture Guardrails

This app should evolve by reusing existing components and CSS ownership surfaces before adding new CSS. The CSS audit baseline exists to keep known debt visible while blocking new fragmentation.

## Decision Order

Before adding CSS or creating a new component variant:

1. Reuse an existing component if the markup, behavior, or role already exists.
2. Use Tailwind utilities for one-off spacing, layout, sizing, typography, and responsive rules.
3. Reuse shared classes from `src/styles/foundation/` for repeated cards, panels, buttons, badges, nav, banners, forms, and interaction states.
4. Reuse feature CSS from `src/styles/features/` when the visual system belongs to a feature area.
5. Add CSS under `src/styles/pages/` only for page-specific extracted styles.
6. Keep component-local `<style>` blocks only for behavior that cannot reasonably be shared.

## Approved Style Owners

- `src/styles/site.ts`: app-level style entry point.
- `src/styles/main.css`: Tailwind layer entry point; keep it thin.
- `src/styles/variables.styl`: theme variables and light/dark custom properties.
- `src/styles/foundation/`: global tokens, reusable utilities, shared components, and site-wide behavior.
- `src/styles/layouts/`: layout wrapper CSS.
- `src/styles/features/`: feature-owned CSS used by multiple files in that feature.
- `src/styles/pages/`: extracted page-specific CSS.

Standalone CSS files outside `src/styles/` are exceptions. They require a clear component-local reason and must be imported by the owner component.

## New CSS Gate

Any change that adds CSS must state:

- Which existing components, classes, and style files were inspected first.
- Why Tailwind utilities or an existing shared class were not sufficient.
- Why the CSS belongs in the chosen owner path.
- Whether the change creates a new CSS file, a new `<style>` block, or component-scoped styles.

Do not add another card, panel, button, badge, banner, nav, or marketplace visual system when an existing one can be extended or reused.

## Baseline Policy

`reports/css-architecture-baseline.json` records known frontend architecture debt. Strict audits should fail when a new issue appears or an existing measured issue grows beyond its baseline `maxValue`.

Do not add entries to the baseline to approve new debt without explicit user approval. When cleanup reduces or removes debt, update the baseline downward in the same change.

## Current Highest-Risk Files

These files are allowed by the baseline but should not grow. If a task touches one, prefer extracting a focused child component, moving reusable CSS to the proper owner path, or moving pure logic into an adjacent helper:

- `src/components/home/HomeIntroEnvironment.svelte`
- `src/components/home/HomeIntroEnvironmentScene.svelte`
- `src/components/timeline/TimelinePortalCarousel.svelte`

Bug fixes may still be surgical. The rule is to avoid increasing mixed ownership inside already oversized files.
