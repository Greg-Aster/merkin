# Agent Instructions

These instructions apply to the whole repository. More specific `AGENTS.md` files in subdirectories add rules for that area.

## Operating Model

- Read the nearest `AGENTS.md` before editing files in that subtree.
- Respect the existing architecture before adding new patterns.
- Keep edits scoped to the requested project and feature.
- Do not revert unrelated dirty files or generated output unless explicitly asked.
- Prefer existing helpers, shared packages, and local conventions over new abstractions.
- Add abstractions only when they remove real duplication or clarify a shared contract.
- Do not run smoke checks, browser boot checks, dev-server smoke tests, or full app smoke harnesses by default. The user will run the program and report runtime issues; use focused type checks, audits, unit tests, or generated-drift checks for validation unless the user explicitly requests a smoke check.

## Monorepo Boundaries

- `apps/megameal` is the Megameal Astro/Svelte site.
- `apps/game` is the game app, but it serves static assets from `apps/megameal/public`.
- `packages/blog-core` contains shared layouts, components, and styles used by Megameal and related sites.
- Changes to `packages/blog-core` can affect multiple apps and need broader verification.

## Style And Frontend Rules

- Do not add large page-level `<style>` blocks as the default fix.
- Prefer Tailwind utilities for one-off layout, spacing, typography, and responsive rules.
- Promote repeated visual patterns to shared classes, feature CSS, or reusable components.
- Keep component-scoped styles only when the CSS is truly local to that component.
- Do not duplicate card, panel, button, banner, or navigation styling in multiple files.
- Before adding CSS, inspect existing style entry points and nearby components.

## Definition Of Done

For code changes, agents must report:

- Commands run, especially type-checks, tests, builds, or audits.
- Any commands that could not be run and why.
- Any new CSS surface area, including new files, new `<style>` blocks, or intentional component-scoped styles.

For Megameal frontend/style changes, also run the Megameal style audit and include the result:

```bash
pnpm --dir apps/megameal audit:css
```

For stricter changed-file review before handing off a CSS-heavy change:

```bash
pnpm --dir apps/megameal audit:css:changed
```
