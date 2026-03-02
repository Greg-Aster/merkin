# Blog Consolidation Progress

## Current Status: Phase 1 In Progress

Last updated: 2026-02-20

---

## Phase 0: Baseline and Safety - COMPLETE

### Tags Created
| Repo | Commit | Tag |
|------|--------|-----|
| Temporal-Flow | `72453b3` | `pre-consolidation` |
| DNDIY.github.io | `128190e` | `pre-consolidation` |
| MEGAMEAL | `c0c79e5` | `pre-consolidation` |

### Deliverables
- [PHASE0_COMPARISON.md](PHASE0_COMPARISON.md) - Full comparison of dependencies, routes, collections, workflows

### Key Findings
- Temporal-Flow and DNDIY.github.io are 100% identical in routes/collections
- MEGAMEAL is a superset with 9 additional routes and 5 additional collections
- All three share 58 core dependencies

---

## Phase 1: Extract Core Blog Layer - IN PROGRESS

### Monorepo Structure Created

```
/home/greggles/Merkin/
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # Workspace definition
├── packages/
│   └── blog-core/            # @merkin/blog-core package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts      # Main exports
│           ├── constants/    # Shared constants
│           ├── types/        # Shared TypeScript types
│           ├── utils/        # Utility functions
│           └── services/     # Timeline services
├── Temporal-Flow/            # Site (linked to blog-core)
├── DNDIY.github.io/          # Site (linked to blog-core)
└── MEGAMEAL/                 # Site (linked to blog-core)
```

### @merkin/blog-core Package Contents

#### Constants (`src/constants/index.ts`)
- `LIGHT_MODE`, `DARK_MODE`, `AUTO_MODE`
- `PAGE_SIZE`, `UNCATEGORIZED`
- Banner height constants (desktop/mobile)
- Page layout constants

#### Types (`src/types/index.ts`)
- `SiteConfig` - Site configuration
- `BlogPostData` - Post frontmatter structure
- `NavBarConfig`, `NavBarLink`, `LinkPreset`
- `ProfileConfig`, `LicenseConfig`
- `PasswordConfig`
- `LIGHT_DARK_MODE` type

#### Utilities (`src/utils/`)
- `date-utils.ts` - Date formatting functions
- `url-utils.ts` - URL manipulation (paths, slugs, categories)
- `theme-utils.ts` - Theme/hue management

#### Services (`src/services/`)
- `TimelineConfig.ts` - Complete timeline system
  - `TimelineEvent`, `TimelineViewConfig`, `EraConfig` interfaces
  - `defaultEraConfig`, `defaultTimelineViewConfig`
  - Era detection, grouping, and statistics functions

### Package Versions
- Package name: `@merkin/blog-core`
- Version: `0.1.0`
- Linked via: `workspace:*` protocol

### Site Integration Status
| Site | Linked to blog-core | Imports Migrated | Builds |
|------|---------------------|------------------|--------|
| Temporal-Flow | ✅ | ❌ Not started | ❌ CSS issue |
| DNDIY.github.io | ✅ | ❌ Not started | ⏳ Untested |
| MEGAMEAL | ✅ | ❌ Not started | ❌ Svelte issue |

---

## Pre-existing Build Issues Identified

### Temporal-Flow
**Issue:** CSS `@apply link` class not defined
```
/home/greggles/Merkin/Temporal-Flow/src/styles/markdown.css:23:9
The `link` class does not exist.
```
**Fix needed:** Define `link` class in Tailwind config or replace with explicit styles

### MEGAMEAL
**Issue:** @threlte/rapier incompatible with Svelte 5
```
@threlte/rapier/dist/components/Debug/Debug.svelte:16:27
`$bindable()` can only be used inside a `$props()` declaration
```
**Fix needed:** Update @threlte/rapier to Svelte 5 compatible version

---

## Next Steps

### Immediate (Phase 1 Completion)
1. [ ] Fix Temporal-Flow CSS build issue
2. [ ] Fix MEGAMEAL @threlte/rapier compatibility
3. [ ] Extract shared Astro components to blog-core
4. [ ] Migrate Temporal-Flow imports to use @merkin/blog-core
5. [ ] Validate builds pass with new imports

### Upcoming (Phase 2)
- Create site overlays
- Refactor DNDIY to use core imports
- Refactor MEGAMEAL to use core imports + feature modules

---

## Commands Reference

```bash
# Root workspace commands
pnpm install              # Install all workspace deps
pnpm dev:temporal         # Run Temporal-Flow dev server
pnpm dev:dndiy           # Run DNDIY dev server
pnpm dev:megameal        # Run MEGAMEAL dev server
pnpm build:all           # Build all sites

# Per-site commands (from site directory)
pnpm dev                 # Dev server
pnpm build               # Production build
pnpm type-check          # TypeScript validation

# Package commands
cd packages/blog-core && pnpm type-check  # Validate blog-core types
```

---

## File Changes Log

### New Files Created
- `/home/greggles/Merkin/package.json`
- `/home/greggles/Merkin/pnpm-workspace.yaml`
- `/home/greggles/Merkin/packages/blog-core/*`
- `/home/greggles/Merkin/PHASE0_COMPARISON.md`
- `/home/greggles/Merkin/CONSOLIDATION_PROGRESS.md`

### Modified Files
- `/home/greggles/Merkin/Temporal-Flow/package.json` - Added blog-core dep, renamed to temporal-flow
- `/home/greggles/Merkin/DNDIY.github.io/package.json` - Added blog-core dep, renamed to dndiy
- `/home/greggles/Merkin/MEGAMEAL/package.json` - Added blog-core dep, renamed to megameal
