# Consolidation Session Summary

**Date:** 2026-02-21
**Status:** 🔄 **PHASE 2 + PHASE 5 IN PROGRESS** - Shared extraction is stable and validation guardrails are being hardened
**Phase 2 Update (2026-02-21):** ✅ Navigation composition split extraction is complete for Temporal-Flow and DNDIY (`Navbar.astro`, `AdminNavbar.svelte`, `LoginForm.svelte`, and admin `NavigationConfigTab.svelte` wrappers) with shared implementations moved into `@merkin/blog-core`. ✅ The recurring non-fatal MEGAMEAL Svelte TS warning is cleared by setting `"verbatimModuleSyntax": true` in both `MEGAMEAL/tsconfig.json` and `packages/blog-core/tsconfig.json`. ✅ All three builds pass after these changes.
**Phase 5 Update (2026-02-21):** ✅ `pnpm build:all` passes (Temporal-Flow 18.45s / 32 pages, DNDIY 28.53s / 52 pages, MEGAMEAL 132.71s / 117 pages). ✅ `packages/blog-core` type-check issue fixed in `src/utils/starUtils.ts` (`window.THREE` typing). ✅ Monorepo deploy workflow added at `.github/workflows/deploy-sites.yml` with external-repo publishing and change detection. ⚠️ `pnpm type-check:all` remains red due existing Temporal-Flow/DNDIY strict typing drift.

---

## Final Solution: MEGAMEAL-Based Monorepo

### Architecture

**One Git Repo, Three Sites:**
```
/home/greggles/Merkin/
├── package.json                 # Root workspace with shared scripts
├── pnpm-workspace.yaml          # Workspace: Temporal-Flow, DNDIY, packages/*
├── Temporal-Flow/               # Blog site (in workspace)
├── DNDIY.github.io/             # Blog site (in workspace)
├── MEGAMEAL/                    # Full site (excluded from workspace)
└── packages/blog-core/          # Shared blog core package (primitives + shared UI + friends + timeline + nav composition + Temporal/DNDIY layouts extracted)
```

**Key Decision:** MEGAMEAL uses `--ignore-workspace` due to Threlte 3D engine having pre-compiled Svelte code that conflicts with pnpm workspace dependency resolution.

---

## What Works Now

### ✅ All Three Sites Build Successfully

**Temporal-Flow:**
```bash
pnpm build:temporal  # Builds via workspace
```

**DNDIY:**
```bash
pnpm build:dndiy     # Builds via workspace
```

**MEGAMEAL:**
```bash
pnpm build:megameal  # Builds with --ignore-workspace
```

**All Sites:**
```bash
pnpm build:all       # Builds all three sites
```

### ✅ Current Audit Summary

- Source-level consolidation changes are isolated from build-artifact churn.
- Temporal-Flow and DNDIY now consume shared UI wrappers from `@merkin/blog-core`.
- Temporal-Flow and DNDIY now consume shared primitive wrappers from `@merkin/blog-core` (`types`, `TimelineConfig`, `date/url/setting utils`, and shared constants with local `PAGE_WIDTH` override).
- All three sites now consume shared `NavMenuPanel` from `@merkin/blog-core/components/widget/NavMenuPanel.astro`.
- All three sites now consume shared widget primitives via wrappers:
  - `@merkin/blog-core/components/widget/TOC.astro`
  - `@merkin/blog-core/components/widget/WidgetLayout.astro`
  - `@merkin/blog-core/components/widget/Categories.astro`
  - `@merkin/blog-core/components/widget/Tags.astro`
  - `@merkin/blog-core/components/widget/DisplaySettings.svelte`
- All three sites now consume shared `ConfigCarrier` from `@merkin/blog-core/components/ConfigCarrier.astro` with local site hue passed via wrapper.
- All three sites now consume shared friends wrappers:
  - `@merkin/blog-core/components/svelte/friends/FriendManager.svelte`
  - `@merkin/blog-core/components/svelte/friends/FriendContentIntegrator.svelte`
- All three sites now consume shared timeline wrappers:
  - `@merkin/blog-core/components/timeline/TimelineBanner.astro`
  - `@merkin/blog-core/components/timeline/TimelineCard.astro`
  - `@merkin/blog-core/components/timeline/StarNode.astro`
  - `@merkin/blog-core/components/timeline/TimelineViewModes/ListView.astro`
  - `@merkin/blog-core/components/timeline/TimelineViewModes/MapView.astro`
  - `@merkin/blog-core/components/timeline/TimelineViewModes/TreeView.astro`
  - `@merkin/blog-core/components/timeline/TimelineViewModes/TimelineView.astro`
- Temporal-Flow and DNDIY now consume shared navigation composition wrappers:
  - `@merkin/blog-core/components/Navbar.astro`
  - `@merkin/blog-core/components/svelte/admin/AdminNavbar.svelte`
  - `@merkin/blog-core/components/svelte/admin/LoginForm.svelte`
  - `@merkin/blog-core/components/svelte/admin/config-tabs/NavigationConfigTab.svelte`
- Temporal-Flow and DNDIY now consume shared layout wrappers:
  - `@merkin/blog-core/layouts/Layout.astro`
  - `@merkin/blog-core/layouts/MainGridLayout.astro`
- A detailed keep/defer breakdown is documented in `CONSOLIDATION_AUDIT.md`.
- MEGAMEAL lockfile has been re-baselined and reduced from large transitive drift to a focused lockfile delta.
- MEGAMEAL standalone flow requires a local `pnpm install --ignore-workspace` after `packages/blog-core` changes so `file:../packages/blog-core` updates are available.
- `@iconify/svelte` was added as a direct dependency in `packages/blog-core` to satisfy pnpm workspace module resolution for shared Svelte widget imports.
- Shared layout dependencies (`@fontsource/roboto`, `@fontsource/sriracha`, `katex`, `overlayscrollbars`, `photoswipe`) were added to `packages/blog-core` so extracted layout modules resolve correctly from package scope.
- `packages/blog-core/src/components/LightDarkSwitch.svelte` was normalized to legacy-mode props (no runes/TS coupling) for cross-site Svelte 5 compatibility.
- `verbatimModuleSyntax` is now enabled in both `MEGAMEAL/tsconfig.json` and `packages/blog-core/tsconfig.json` to match Svelte TS expectations and remove warning noise.

### ✅ Unified Dependencies

**All sites share:**
- Astro 5.1.6
- Svelte 5.26.2
- @astrojs/svelte 7.0.3
- Tailwind CSS 3.4.17
- TypeScript 5.7.3
- Biome 1.8.3
- All blog packages (pagefind, markdown processors, etc.)

**MEGAMEAL-only:**
- @threlte/* (3D engine): 8.1.3, 9.4.2, 3.1.4, 3.0.4
- @dimforge/rapier3d-compat 0.17.3
- three.js 0.178.0
- Game packages (bitecs, peerjs, postprocessing, etc.)

---

## Build Status

| Site | Status | Build Time | Pages | Notes |
|------|--------|-----------|-------|-------|
| Temporal-Flow | ✅ Builds | ~18s | 32 | Workspace build (non-fatal PostCSS + known Astro prerender warnings logged) |
| DNDIY.github.io | ✅ Builds | ~29s | 52 | Workspace build (non-fatal missing-image + known Astro prerender warnings logged) |
| MEGAMEAL | ✅ Builds | ~133s | 117 | Standalone build (--ignore-workspace), `verbatimModuleSyntax` warning cleared |

### ⚠️ Type-Check Status

- `pnpm type-check:all` currently fails in `Temporal-Flow` and `DNDIY.github.io` due existing strict typing drift (TimelineService/friendStore/config typing mismatches).
- `packages/blog-core` now type-checks cleanly after fixing `window.THREE` typing in `packages/blog-core/src/utils/starUtils.ts`.
- `LinkPreset.Projects` mapping is now present in Temporal-Flow and DNDIY (`src/constants/link-presets.ts`), removing that mapped-type error class.

---

## How It Works

### Workspace Structure

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'Temporal-Flow'
  - 'DNDIY.github.io'
  # MEGAMEAL excluded due to Threlte/workspace conflict
  # - 'MEGAMEAL'
  - 'packages/*'
```

### Root Scripts

**package.json:**
```json
{
  "scripts": {
    "dev:temporal": "pnpm --filter temporal-flow dev",
    "dev:dndiy": "pnpm --filter dndiy dev",
    "dev:megameal": "cd MEGAMEAL && pnpm install --ignore-workspace && pnpm dev",
    "build:all": "pnpm -r build && cd MEGAMEAL && pnpm install --ignore-workspace && pnpm build",
    "build:temporal": "pnpm --filter temporal-flow build",
    "build:dndiy": "pnpm --filter dndiy build",
    "build:megameal": "cd MEGAMEAL && pnpm install --ignore-workspace && pnpm build"
  }
}
```

### Why MEGAMEAL is Different

**The Threlte Problem:**
- Threlte packages contain pre-compiled Svelte 5 code
- The compiled output has this pattern: `let _a = $props(), { ref = $bindable() } = _a`
- Svelte 5.26.2 rejects this as invalid syntax (must be `let { ref = $bindable() } = $props()`)
- This code builds fine standalone but fails in pnpm workspace
- Root cause: pnpm workspace hoisting resolves dependencies differently

**The Solution:**
- MEGAMEAL uses `--ignore-workspace` to install its own node_modules
- This gives it the exact dependency resolution it needs
- Still part of the monorepo (same git repo, shared tooling)

---

## Commands Reference

### Development
```bash
pnpm dev:temporal      # Run Temporal-Flow dev server
pnpm dev:dndiy         # Run DNDIY dev server
pnpm dev:megameal      # Run MEGAMEAL dev server (auto-installs first)
```

### Building
```bash
pnpm build:all         # Build all three sites
pnpm build:temporal    # Build Temporal-Flow only
pnpm build:dndiy       # Build DNDIY only
pnpm build:megameal    # Build MEGAMEAL only (auto-installs first)
```

### Maintenance
```bash
pnpm install           # Install workspace dependencies (Temporal + DNDIY)
pnpm lint:all          # Lint all workspace projects
pnpm format:all        # Format all workspace projects
pnpm type-check:all    # Type check all workspace projects
```

---

## Git Tags

All three repos tagged at consolidation start:
- **Temporal-Flow**: `pre-consolidation` at `72453b3`
- **DNDIY.github.io**: `pre-consolidation` at `128190e`
- **MEGAMEAL**: `pre-consolidation` at `c0c79e5`

---

## Key Files Modified

### Created
- `/home/greggles/Merkin/package.json` - Root workspace config
- `/home/greggles/Merkin/pnpm-workspace.yaml` - Workspace definition
- `/home/greggles/Merkin/.npmrc` - pnpm settings
- `/home/greggles/Merkin/CONSOLIDATION_PLAN.md` - Consolidation strategy
- `/home/greggles/Merkin/PHASE0_COMPARISON.md` - Pre-consolidation comparison

### Modified
- `Temporal-Flow/package.json` - Updated to MEGAMEAL's blog dependencies + mammoth
- `DNDIY.github.io/package.json` - Updated to MEGAMEAL's blog dependencies + mammoth
- `MEGAMEAL/package.json` - Pinned Threlte versions (8.1.3, 9.4.2, 3.1.4)
- `MEGAMEAL/tsconfig.json` - Added `"verbatimModuleSyntax": true`
- `packages/blog-core/tsconfig.json` - Added `"verbatimModuleSyntax": true`
- `packages/blog-core/src/utils/starUtils.ts` - Added global `Window.THREE` typing for `type-check:all` compatibility
- `Temporal-Flow/src/constants/link-presets.ts` - Added missing `LinkPreset.Projects` mapping for nav preset type completeness
- `DNDIY.github.io/src/constants/link-presets.ts` - Added missing `LinkPreset.Projects` mapping for nav preset type completeness

---

## Lessons Learned

1. **Workspace hoisting can break complex packages** - Threlte's pre-compiled Svelte code works standalone but breaks in workspace
2. **`--ignore-workspace` is a valid monorepo pattern** - Not all projects need to share node_modules
3. **Pinning exact versions matters** - Threlte 8.1.3 vs ^8.1.3 makes a difference
4. **MEGAMEAL's package.json is the source of truth** - It has the proven working dependency set
5. **Mammoth is a blog feature** - Used for importing Word documents in post editor

---

## Next Steps (Phase 2+)

### Extract Shared Blog Core
Now that all sites build, we can:
1. Continue extracting from MEGAMEAL:
   - Optional MEGAMEAL-specific navigation/layout components (only after strict parity checks)
   - Optional cleanup: retire duplicated legacy timeline `.svelte` internals in Temporal-Flow and DNDIY now that timeline `.astro` wrappers are shared
2. Keep MEGAMEAL on wrapper imports so behavior stays stable during extraction
3. Continue incremental extraction batches with per-site build checks
4. Verify all three builds after each extraction batch
5. Burn down Temporal-Flow/DNDIY type-check debt to make `pnpm type-check:all` green

### Benefits
- ✅ Bug fix once, updates all sites
- ✅ Consistent features across all blogs
- ✅ Easier to add new sites (just content + config)
- ✅ True DRY (Don't Repeat Yourself)

---

## Success Criteria Met

✅ All three sites use same Astro/Svelte versions
✅ All three sites build successfully
✅ Sites differ only in content and enabled features
✅ One git repo (monorepo achieved)
✅ Shared tooling (lint, format, type-check)
✅ Pre-consolidation tags created for rollback safety

---

## Deployment

Deployment is now orchestrated from the monorepo workflow:
- Workflow: `.github/workflows/deploy-sites.yml`
- Setup guide: `.github/workflows/DEPLOYMENT_SETUP.md`
- Deploy model: monorepo builds static output and publishes to each external GitHub Pages repo/branch

Target sites:
- **Temporal-Flow**: GitHub Pages → temporal-flow.org
- **DNDIY**: GitHub Pages → dndiy.org
- **MEGAMEAL**: GitHub Pages → megameal.org

Notes:
- Path-aware deploy: site-local changes deploy one site; `packages/blog-core` changes deploy all sites.
- Manual deploy is supported via `workflow_dispatch` (`all`, `temporal`, `dndiy`, `megameal`).

---

**Status:** 🔄 **Consolidation Phase 2 + Phase 5 In Progress**
**All three sites are building successfully with shared UI + primitive wrapper adoption in place, including TOC/shared widgets, friends, timeline components, navigation composition wrappers (Temporal-Flow/DNDIY: Navbar/AdminNavbar/LoginForm/NavigationConfigTab), and split-safe layout wrappers for Temporal-Flow/DNDIY; remaining gate is Temporal-Flow/DNDIY type-check debt.**
