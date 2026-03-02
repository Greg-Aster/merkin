# Phase 0: Consolidation Comparison Sheet

Generated: 2026-02-20

## 1. Dependencies Comparison

### Core Framework Versions

| Package | Temporal-Flow | DNDIY.github.io | MEGAMEAL |
|---------|---------------|-----------------|----------|
| astro | 5.1.6 | 5.1.6 | 5.1.6 |
| svelte | 5.23.1 | ^5.23.1 | ^5.26.2 |
| tailwindcss | 3.4.16 | ^3.4.16 | ^3.4.17 |
| typescript | 5.7.2 | ^5.7.2 | ^5.7.3 |
| @biomejs/biome | 1.8.3 | 1.8.3 | 1.8.3 |
| pagefind | ^1.2.0 | ^1.2.0 | ^1.3.0 |

### Shared Dependencies (All 3 Projects)

**Astro Integrations:**
- @astrojs/check, @astrojs/mdx, @astrojs/rss, @astrojs/sitemap
- @astrojs/svelte, @astrojs/tailwind
- @swup/astro, astro-compress, astro-icon, astro-seo

**Content Processing:**
- markdown-it, marked, mammoth
- remark-math, remark-directive, remark-sectionize
- rehype-katex, rehype-slug, rehype-autolink-headings
- katex, sanitize-html, reading-time

**Icons & Fonts:**
- @iconify/svelte, @iconify-json/fa6-*, @iconify-json/mdi, @iconify-json/material-symbols
- @fontsource/roboto, @fontsource/sriracha, @fontsource-variable/jetbrains-mono

**UI & Utilities:**
- photoswipe, overlayscrollbars, sharp, stylus

### MEGAMEAL-Only Dependencies (Game/Store Features)

**3D Game Engine:**
- @threlte/core, @threlte/extras, @threlte/rapier, @threlte/theatre
- three, @dimforge/rapier3d-compat
- threlte-postprocessing, postprocessing

**Game Utilities:**
- bitecs (ECS), peerjs (P2P multiplayer), howler (audio)
- stats.js, lil-gui, canvas

**GLTF Processing:**
- @gltf-transform/cli, @gltf-transform/core, @gltf-transform/functions

**Charts:**
- chart.js

### Dependency Counts

| Project | Dependencies | DevDependencies | Total |
|---------|--------------|-----------------|-------|
| Temporal-Flow | 47 | 11 | 58 |
| DNDIY.github.io | 47 | 11 | 58 |
| MEGAMEAL | 86 | 16 | 102 |

---

## 2. Page Routes Comparison

### Shared Routes (All 3 Projects) - 18 routes

```
[...page].astro          # Catch-all page router
about.astro              # About page
archive/
├── index.astro          # Archive index
├── category/
│   ├── [category].astro # Category pages
│   └── uncategorized.astro
└── tag/
    └── [tag].astro      # Tag pages
atom.xml.ts              # Atom feed
community.astro          # Community page
configs.astro            # Configuration page
feed.xml.ts              # Feed generator
feed/index.xml.ts        # Feed directory
friend-content-json.ts   # Friend content JSON
friends.astro            # Friends page
new-post.astro           # New post creator
posts/[...slug].astro    # Post pages
robots.txt.ts            # Robots.txt
rss.xml.ts               # RSS feed
rss/index.xml.ts         # RSS directory
```

### MEGAMEAL-Only Routes - 9 additional routes

```
404.astro                # Custom error page
about/[...slug].astro    # Nested about pages
game.astro               # Game entry point
host.astro               # Multiplayer hosting
quiz/
├── index.astro          # Quiz listing
└── [slug].astro         # Individual quizzes
store.astro              # Store main page
store-placeholder.astro  # Store placeholder
store/page/[page].astro  # Paginated store
```

### Route Summary

| Project | Total Routes | Shared | Unique |
|---------|--------------|--------|--------|
| Temporal-Flow | 18 | 18 | 0 |
| DNDIY.github.io | 18 | 18 | 0 |
| MEGAMEAL | 27 | 18 | 9 |

**Key Finding:** Temporal-Flow and DNDIY.github.io have 100% route overlap.

---

## 3. Content Collections Comparison

### Shared Collections (All 3 Projects)

| Collection | Purpose |
|------------|---------|
| `posts` | Blog posts/timeline stories |
| `spec` | Specification documents |
| `team` | Team member profiles |
| `friends` | Friend site profiles |
| `avatar` | Avatar image assets |

### Posts Schema - Core Fields (All Projects)

| Field | Type | Required |
|-------|------|----------|
| title | string | ✓ |
| published | date | ✓ |
| updated | date | optional |
| draft | boolean | default: false |
| description | string | default: '' |
| image | string | default: '' |
| avatarImage | string | optional |
| authorName | string | optional |
| authorBio | string | optional |
| tags | string[] | default: [] |
| category | string | default: '' |
| bannerType | enum | optional |
| bannerLink | string | optional |
| bannerData | object | optional |
| timelineYear | number | optional |
| timelineEra | string | optional |
| timelineLocation | string | optional |
| isKeyEvent | boolean | optional |
| yIndex | number | optional |

### MEGAMEAL-Only Posts Fields

| Field | Type | Purpose |
|-------|------|---------|
| authorLink | string | Custom author URL |
| mascotContext | string | Mascot interaction context |
| oneColumn | boolean | Layout control |
| backgroundImage | string | Dynamic background |

### MEGAMEAL-Only Collections

| Collection | Purpose | Type |
|------------|---------|------|
| `about` | Character/author profiles | content |
| `products` | Store items | content |
| `quizzes` | Interactive quizzes | data (JSON) |
| `mascot` | Mascot image assets | data |

### Collection Counts

| Project | Collections |
|---------|-------------|
| Temporal-Flow | 5 |
| DNDIY.github.io | 5 |
| MEGAMEAL | 10 |

---

## 4. CI/Deploy Workflows Comparison

### Workflow Files

| Workflow | Temporal-Flow | DNDIY.github.io | MEGAMEAL |
|----------|---------------|-----------------|----------|
| deploy.yml | ✓ | ✓ | ✓ |
| ci-checks.yml | ✗ | ✗ | ✓ |
| template-cleanup.yml | ✓ | ✗ | ✗ |

### Deploy Workflow Features

| Feature | Temporal-Flow | DNDIY.github.io | MEGAMEAL |
|---------|---------------|-----------------|----------|
| Push to main trigger | ✓ | ✓ | ✓ |
| Manual dispatch | ✓ | ✓ | ✓ |
| Astro Action v3 | ✓ | ✓ | ✓ |
| GitHub Pages deploy | ✓ | ✓ | ✓ |
| Pages status check | ✓ | ✗ | ✗ |

### CI Checks (MEGAMEAL Only)

- Triggered on: Pull requests to main/develop
- Steps: format check, lint, type-check, build test
- Node.js: v20 with pnpm caching

### Workflow Gaps

- **DNDIY.github.io** and **Temporal-Flow**: Missing CI checks on PRs
- **DNDIY.github.io** and **MEGAMEAL**: Missing Pages status check
- Only **Temporal-Flow** has template-cleanup (designed as fork template)

---

## 5. Consolidation Recommendations

### Core Blog Package Should Include

From shared analysis:
- All 18 shared page routes
- 5 shared content collections (posts, spec, team, friends, avatar)
- Shared posts schema fields
- Core dependencies (~58 packages)
- Deploy workflow (with Pages status check from Temporal-Flow)
- CI checks workflow (from MEGAMEAL)

### MEGAMEAL Feature Modules (Separate)

- 3D game engine (threlte/three/rapier stack)
- Quiz system
- Store/products system
- About/character profiles
- Mascot integration
- GLTF processing tools

### Schema Consolidation

Start with MEGAMEAL's config.ts as base (superset), then:
1. Core schema: shared fields only
2. Extended schema: add oneColumn, backgroundImage, authorLink, mascotContext as optional

---

## 6. Branch Naming Convention

For Phase 1+ work:
- `consolidation/phase-1-extract-core`
- `consolidation/phase-2-dndiy-overlay`
- `consolidation/phase-2-megameal-overlay`
- `consolidation/phase-3-mobile-hardening`
- `consolidation/phase-4-ci-standardization`

---

## 7. Current Git State (Pre-Tag)

| Repo | Branch | Status | Commit |
|------|--------|--------|--------|
| Temporal-Flow | main | ✅ Clean | 72453b3 |
| DNDIY.github.io | main | ⚠️ Staged changes | eb208f9 |
| MEGAMEAL | main | ⚠️ Unstaged changes | f5d4774 |

### Uncommitted Changes

**DNDIY.github.io (staged):**
- `googlefe0bbbed9de22227.html` (new)
- `src/content/posts/timelines/Snuggaliod-Emergence.mdx` (modified)

**MEGAMEAL (unstaged):**
- `cloudflare-worker/src/index.ts`
- `public/models/levels/output/terrain/**/*.glb` (terrain chunks)
- `public/posts/Mega-Meal-Explained/gif/*`
- `src/threlte/features/conversation/conversationStores.ts`
- `cloudflare-worker/pnpm-lock.yaml` (untracked)
