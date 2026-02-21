# Merkin Blog Consolidation Plan (REVISED)

**Date Updated:** 2026-02-21
**Strategy:** MEGAMEAL-based monorepo with shared core

---

## Objective
Consolidate all three sites (`Temporal-Flow`, `DNDIY.github.io`, `MEGAMEAL`) into a **true monorepo** where:
1. All sites share the same codebase (using MEGAMEAL as the proven base)
2. Sites differ only in content, configuration, and enabled features
3. One bug fix updates all three sites
4. Mobile publishing works across all sites

---

## Key Decision: Use MEGAMEAL as the Base

**Why MEGAMEAL?**
- ✅ Most advanced version with all features (blog, 3D game, store, quiz)
- ✅ Currently deployed and working at megameal.org
- ✅ Proven dependency stack (Svelte 5.26.2, Astro 5.1.6, Threlte)
- ✅ Contains superset of all features from other sites

**Strategy:** Instead of extracting from simpler sites, **copy MEGAMEAL's complete structure** to all sites.

---

## Target Architecture

### Monorepo Structure
```
/home/greggles/Merkin/
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # Workspace definition
├── packages/
│   └── blog-core/               # Shared code extracted from MEGAMEAL
│       ├── src/
│       │   ├── components/      # Shared Svelte/Astro components
│       │   ├── layouts/         # Page layouts
│       │   ├── utils/           # Utility functions
│       │   ├── services/        # Timeline, friends, RSS logic
│       │   └── types/           # TypeScript types
│       └── package.json
├── MEGAMEAL/                    # Full site (all features enabled)
│   ├── src/
│   │   ├── content/             # MEGAMEAL-specific content
│   │   ├── config/              # MEGAMEAL branding/settings
│   │   ├── threlte/             # 3D game engine (MEGAMEAL-only)
│   │   └── pages/               # All pages (imports from blog-core)
│   ├── astro.config.mjs
│   ├── CNAME                    # megameal.org
│   └── package.json
├── Temporal-Flow/               # Blog-only site
│   ├── src/
│   │   ├── content/             # Temporal-Flow content
│   │   ├── config/              # Temporal-Flow branding
│   │   └── pages/               # Blog pages (imports from blog-core)
│   ├── astro.config.mjs
│   ├── CNAME                    # temporal-flow domain
│   └── package.json
└── DNDIY.github.io/             # Blog + D&D content
    ├── src/
    │   ├── content/             # DNDIY content
    │   ├── config/              # DNDIY branding
    │   └── pages/               # Blog pages (imports from blog-core)
    ├── astro.config.mjs
    ├── CNAME                    # dndiy domain
    └── package.json
```

### What Goes in `packages/blog-core/`
**Shared code from MEGAMEAL:**
- Components: `PostEditor`, timeline, friends, navigation, footer
- Layouts: base layouts, post layouts
- Utils: date formatting, URL handling, theme utilities
- Services: RSS generation, timeline config, friends feed
- Types: shared TypeScript interfaces

**NOT in core:**
- Content (posts, media, about pages) - stays site-specific
- Config (branding, colors, site name) - stays site-specific
- Game engine (`src/threlte/*`) - MEGAMEAL-only
- Store/quiz pages - MEGAMEAL-only features

---

## Revised Phase Plan

### Phase 0: Baseline and Safety ✅ **COMPLETE**

1. ✅ Tagged all three repos with `pre-consolidation`
2. ✅ Created [PHASE0_COMPARISON.md](PHASE0_COMPARISON.md)
3. ✅ Created monorepo structure with `pnpm-workspace.yaml`
4. ✅ Verified MEGAMEAL builds successfully standalone

### Phase 1: Dependency Alignment ✅ **COMPLETE**

1. ✅ Updated all sites to use MEGAMEAL's dependency versions:
   - Svelte: `^5.26.2` (was ^5.23.1 in Temporal-Flow/DNDIY)
   - Astro: `5.1.6`
   - @astrojs/svelte: `7.0.3`
2. ✅ Removed Svelte override from root package.json
3. ✅ Standardized package names for workspace filters:
   - `temporal-flow`
   - `dndiy`
   - `megameal`

### Phase 2: Extract Shared Core 🔄 **IN PROGRESS (FOUNDATION + PRIMITIVE + NAV + TOC + WIDGET + FRIENDS + TIMELINE + SIDEBAR + LAYOUT SPLIT + NAV COMPOSITION EXTRACTION COMPLETE)**

**Goal:** Move shared MEGAMEAL code into `packages/blog-core`

**Steps:**
1. ✅ Create `packages/blog-core` package:
   - TypeScript configuration added
   - Version `0.1.0`
   - Package exports configured for `constants`, `types`, `utils`, `services`, `schemas`
2. ✅ Extract shared primitives into blog-core:
   - Utility functions (date, URL, theme)
   - Content schemas (posts, about, media/spec/team/friends)
   - Shared constants/types/timeline service config
3. ✅ Extract first shared UI components into blog-core:
   - `BackToTop.astro`
   - `ButtonLink.astro`
   - `ButtonTag.astro`
   - `Pagination.astro`
   - `Markdown.astro`
   - `PostMeta.astro`
   - `Footer.astro`
   - `ArchivePanel.astro`
   - `CollapsibleScript.astro`
   - `misc/License.astro`
   - `widget/NavMenuPanel.astro`
   - `ConfigCarrier.astro` (prop-based with site hue passed from each site)
   - `widget/TOC.astro` (prop-driven site behavior toggles)
   - `widget/WidgetLayout.astro` (prop-driven `more` label)
   - `widget/Categories.astro` (data-driven list renderer)
   - `widget/Tags.astro` (data-driven list renderer)
   - `widget/DisplaySettings.svelte` (label-driven shared panel)
   - `friends/FriendManager.svelte` (shared manager with host-provided `savedFriends`)
   - `friends/FriendContentIntegrator.svelte` (shared friend feed integration logic)
   - `timeline/TimelineBanner.astro`
   - `timeline/TimelineCard.astro`
   - `timeline/StarNode.astro`
   - `timeline/TimelineViewModes/ListView.astro`
   - `timeline/TimelineViewModes/MapView.astro`
   - `timeline/TimelineViewModes/TreeView.astro`
   - `timeline/TimelineViewModes/TimelineView.astro`
   - `styles/timeline-styles.css` and `utils/starUtils.ts` (timeline styling/util support)
   - `Navbar.astro`
   - `svelte/admin/AdminNavbar.svelte`
   - `svelte/admin/LoginForm.svelte`
   - `svelte/admin/config-tabs/NavigationConfigTab.svelte` (split-safe shared source for Temporal-Flow/DNDIY wrappers)
   - `misc/ImageWrapper.astro`
   - `widget/Profile.astro` (prop-driven with avatar/social config from site)
   - `widget/SideBar.astro` (prop-driven sidebar composition for Temporal-Flow/DNDIY)
   - `layouts/Layout.astro` (shared baseline layout for Temporal-Flow/DNDIY)
   - `layouts/MainGridLayout.astro` (shared baseline layout for Temporal-Flow/DNDIY)
   - `components/LightDarkSwitch.svelte` compatibility fix (legacy-mode props for Svelte 5 cross-site build stability)
   - Note: MEGAMEAL's SideBar.astro remains site-specific (uses BleepyPostWidget, FactsWidget)
4. ✅ Update MEGAMEAL to import from `@merkin/blog-core`:
   - `src/constants/constants.ts`
   - `src/types/config.ts`
   - `src/services/TimelineConfig.ts`
   - `src/content/config.ts` (shared collections)
   - `src/utils/date-utils.ts`, `src/utils/url-utils.ts`, `src/utils/setting-utils.ts`
   - `src/components/ArchivePanel.astro`
   - `src/components/CollapsibleScript.astro`
   - `src/components/Footer.astro`
   - `src/components/PostMeta.astro`
   - `src/components/control/BackToTop.astro`
   - `src/components/control/ButtonLink.astro`
   - `src/components/control/ButtonTag.astro`
   - `src/components/control/Pagination.astro`
   - `src/components/misc/License.astro`
   - `src/components/misc/Markdown.astro`
   - `src/components/widget/NavMenuPanel.astro`
   - `src/components/ConfigCarrier.astro`
5. ✅ Verify MEGAMEAL still builds
6. ✅ Apply wrappers to Temporal-Flow and DNDIY:
   - ✅ Shared primitive wrappers (`constants`, `types`, `services`, `utils`)
   - ✅ Shared friends wrappers
   - ✅ Shared timeline wrappers
   - ✅ Shared navigation composition wrappers in Temporal-Flow and DNDIY (`src/components/Navbar.astro`, `src/components/svelte/admin/AdminNavbar.svelte`, `src/components/svelte/admin/LoginForm.svelte`, `src/components/svelte/admin/config-tabs/NavigationConfigTab.svelte`)
   - ✅ Shared sidebar/profile/widget wrappers (ImageWrapper, Profile, SideBar)
   - ✅ Shared layout wrappers in Temporal-Flow and DNDIY (`src/layouts/Layout.astro`, `src/layouts/MainGridLayout.astro`)
   - ✅ `verbatimModuleSyntax` warning fixed by setting `"verbatimModuleSyntax": true` in both `MEGAMEAL/tsconfig.json` and `packages/blog-core/tsconfig.json`
   - ✅ Temporal-Flow builds successfully (32 pages)
   - ✅ DNDIY builds successfully (52 pages)
   - ✅ MEGAMEAL builds successfully (117 pages)
7. ⏳ Remaining for full Phase 2 closeout:
   - Evaluate optional MEGAMEAL-specific navigation/layout decomposition without changing runtime behavior
   - Optional cleanup: retire duplicated legacy timeline `.svelte` internals in Temporal-Flow/DNDIY now that timeline `.astro` wrappers are shared
   - Note: after changing `packages/blog-core`, run `pnpm install --ignore-workspace` in `MEGAMEAL/` before standalone build/dev so file dependency changes are reflected

### Phase 3: Temporal-Flow Parity Hardening ⏳ **PENDING**

**Goal:** Complete Temporal-Flow alignment with shared core using incremental wrappers (no big-bang copy)

**Steps:**
1. Inventory remaining Temporal-Flow local modules that duplicate `@merkin/blog-core`
2. Convert low-risk duplicates to wrappers/imports (component-by-component)
3. Keep explicit Temporal-Flow-only surfaces local (branding/content/config)
4. Run build verification after each extraction batch
5. Document accepted local exceptions in consolidation docs

### Phase 4: DNDIY Parity Hardening ⏳ **PENDING**

**Goal:** Complete DNDIY alignment with shared core using incremental wrappers (no big-bang copy)

**Steps:**
1. Inventory remaining DNDIY local modules that duplicate `@merkin/blog-core`
2. Convert low-risk duplicates to wrappers/imports (component-by-component)
3. Keep explicit DNDIY-only surfaces local (branding/content/config)
4. Run build verification after each extraction batch
5. Document accepted local exceptions in consolidation docs

### Phase 5: Workspace Validation and Guardrails 🔄 **IN PROGRESS**

**Goal:** Keep consolidation stable with repeatable validation and low-noise build signals

**Steps:**
1. ✅ Baseline install at root (`pnpm install`)
2. 🔄 Run build matrix and capture timings/warnings:
   - `pnpm build:temporal`
   - `pnpm build:dndiy`
   - `pnpm build:megameal`
   - `pnpm build:all`
   - ✅ `pnpm build:all` pass (2026-02-21): Temporal-Flow 32 pages in 18.45s, DNDIY 52 pages in 28.53s, MEGAMEAL 117 pages in 132.71s
3. 🔄 Run workspace checks:
   - `pnpm type-check:all`
   - `pnpm lint:all`
   - ✅ `packages/blog-core` type-check fixed (`window.THREE` typing in `src/utils/starUtils.ts`)
   - ⚠️ `pnpm type-check:all` currently fails due existing Temporal-Flow/DNDIY strict typing drift (not introduced by current wrapper batch)
4. Track warning budget (expected vs new warnings) for each site
5. Keep lockfile/dep changes scoped and revalidate MEGAMEAL after any blog-core change
6. ✅ Monorepo deployment workflow added:
   - `.github/workflows/deploy-sites.yml` (path-aware deploy to external site repos)
   - `.github/workflows/DEPLOYMENT_SETUP.md` (secrets/variables/pages-branch setup)

### Phase 6: Mobile Publishing Enhancement ⏳ **PENDING**

**Goal:** Unified mobile posting across all sites

**Steps:**
1. Audit current auth/token handling
2. Implement GitHub fine-grained PAT pattern
3. Remove hardcoded credentials
4. Add token expiry warnings
5. Test mobile posting workflow

---

## Current Status

### ✅ Working
- MEGAMEAL builds successfully standalone
- All three sites use same Svelte/Astro versions
- Workspace structure defined
- Pre-consolidation tags created
- `packages/blog-core` is live and consumed by all three sites (UI + primitive wrapper batches)
- Shared widget batch (`TOC`, `WidgetLayout`, `Categories`, `Tags`, `DisplaySettings`) is extracted and wrapped across all three sites
- Shared friends batch (`FriendManager`, `FriendContentIntegrator`) is extracted and wrapped across all three sites
- Shared timeline batch (`TimelineBanner`, `TimelineCard`, `StarNode`, `TimelineViewModes/*`, `timeline-styles.css`) is extracted and wrapped across all three sites
- Shared navigation composition batch (`Navbar.astro`, `AdminNavbar.svelte`, `LoginForm.svelte`, `NavigationConfigTab.svelte`) is extracted using split-safe wrappers in Temporal-Flow and DNDIY
- Shared sidebar batch (`ImageWrapper`, `Profile`, `SideBar`) is extracted and wrapped in Temporal-Flow and DNDIY
- Shared layout split batch (`layouts/Layout.astro`, `layouts/MainGridLayout.astro`) is extracted and wrapped in Temporal-Flow and DNDIY
- MEGAMEAL intentionally keeps site-specific `src/layouts/Layout.astro` and `src/layouts/MainGridLayout.astro` for safety
- MEGAMEAL keeps its site-specific SideBar.astro (uses BleepyPostWidget, FactsWidget not present in other sites)
- MEGAMEAL non-fatal Svelte TS warning is cleared (`verbatimModuleSyntax` now set in MEGAMEAL and blog-core tsconfig)
- Phase 5 build matrix entrypoint `pnpm build:all` passes (Temporal-Flow 18.45s, DNDIY 28.53s, MEGAMEAL 132.71s)
- `packages/blog-core` type-check issue fixed (`window.THREE` typing), but workspace `type-check:all` still fails on pre-existing Temporal-Flow/DNDIY typing debt
- Temporal-Flow and DNDIY `LinkPreset.Projects` mapped-type error class is removed; both sites still build (Temporal-Flow 17.85s, DNDIY 27.68s)
- Monorepo deployment workflow is implemented (`.github/workflows/deploy-sites.yml`) with per-site change detection and manual dispatch support
- All three builds re-verified after navigation composition extraction + warning cleanup:
  - Temporal-Flow: 32 pages ✅
  - DNDIY: 52 pages ✅
  - MEGAMEAL: 117 pages ✅
- MEGAMEAL lockfile drift is reduced to a small, targeted diff aligned with package changes

### 🔄 In Progress
- Phase 2 shared extraction closeout (optional MEGAMEAL navigation/layout decomposition and cleanup tasks remaining)
- Phase 5 workspace validation and guardrails (build matrix + workspace checks)

### ⏳ Blocked/Pending
- Workspace type-check gate remains red due existing Temporal-Flow/DNDIY strict typing drift

---

## Acceptance Criteria

Consolidation is successful when:

1. ✅ All three sites use identical dependency versions
2. 🔄 Shared code lives in `packages/blog-core` (primitives + shared UI + friends + timeline + navigation composition + Temporal/DNDIY layout split extracted; MEGAMEAL-specific modules pending)
3. ✅ All three sites build successfully in monorepo (re-verified after navigation composition extraction)
4. ⏳ Sites differ only in:
   - Content (`src/content/`)
   - Config (`src/config/config.ts`, `astro.config.mjs`, `CNAME`)
   - Enabled features (game/store/quiz for MEGAMEAL only)
5. ⏳ Bug fix in blog-core updates all sites
6. ⏳ No duplicate code (>70% reduction achieved)
7. ⏳ Mobile publishing works across all sites

---

## Risks and Mitigations

### Risk: Workspace dependency hoisting conflicts
**Status:** ✅ RESOLVED
**Mitigation:** Unified all sites to Svelte 5.26.2

### Risk: MEGAMEAL 3D game breaks during extraction
**Mitigation:** Keep `src/threlte/*` entirely in MEGAMEAL, not in core

### Risk: Route regressions when applying core to other sites
**Mitigation:** Test each site individually, keep pre-consolidation tags for rollback

### Risk: Content loss during restructuring
**Mitigation:** Backup content before each phase, git commits at each step

---

## Next Immediate Actions

1. ✅ Align all sites to MEGAMEAL dependency versions
2. ✅ Configure workspace and clean install
3. ✅ Extract first and second shared component batches into blog-core
4. ✅ Test MEGAMEAL with blog-core imports
5. ✅ Apply wrapper/import pattern to Temporal-Flow and DNDIY
6. ✅ Apply shared primitive wrappers to Temporal-Flow and DNDIY
7. ✅ Extract shared widget primitives and wrappers (`TOC`, `WidgetLayout`, `Categories`, `Tags`, `DisplaySettings`)
8. ✅ Extract shared timeline modules and wrappers
9. ⏳ Decide whether to extract MEGAMEAL-specific navigation/layout modules or close Phase 2 at current split-safe boundary
10. ✅ Execute Phase 5 build matrix (`pnpm build:all`) and record timings/warnings
11. 🔄 Resolve/baseline `pnpm type-check:all` errors in Temporal-Flow and DNDIY, then run `pnpm lint:all`
12. ⏳ Configure `PAGES_DEPLOY_TOKEN` + optional repo variables, then run manual deploy workflow for all 3 sites

---

## Success Metrics

- **Code Duplication:** Reduce from ~3x to ~1.3x (70% reduction)
- **Build Time:** All three sites build in <5 minutes total
- **Maintenance:** Bug fix updates all sites with one PR
- **Mobile Publishing:** <3 minutes from phone to deployed post
