# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server (default port 4321, configurable via SITE_DEV_PORT)
pnpm build            # Astro build → Pagefind search index → PDF generation
pnpm type-check       # TypeScript validation (run before any PR)
pnpm audit:css        # Full CSS architecture audit
pnpm audit:css:changed  # Audit only changed files (faster for reviews)
pnpm lint:fix         # Biome lint + format in one pass
pnpm new-post         # Scaffold a new post via interactive script
```

The `AGENTS.md` in this directory lists additional required checks for frontend/style changes.

## Architecture Overview

Astro static site with Svelte islands. Swup handles SPA-style page transitions between routes — `#banner-container` and `#main-grid` are the two swapped containers. All interactive components are Svelte; Astro handles routing, layouts, and content.

**Import aliases:** `@components/*` → `src/components/`, `@assets/*` → `src/assets/`, `@utils/*` → `src/utils/`, `@/*` → `src/`

**Build chunking:** `astro.config.mjs` manually splits vendors — `three` → `vendor-3d-core`, `three/examples` + `@threlte` → `vendor-3d-extras`. Home components + banner-stage share a `feature-home-banner` chunk. Keep this in mind when adding new heavy imports to `src/components/home/` or `src/components/banner-stage/`.

**Game asset sharing:** `apps/game` sets `publicDir: '../megameal/public'`. All static assets served at `game.megameal.org` (terrain, audio, 3D models, heightmaps) must live in `apps/megameal/public/`. Do not put assets in `apps/game/public/` — only the CNAME lives there.

## Page Layout System

`MainGridLayout.astro` is the root wrapper for all pages. It delegates to `@merkin/blog-core`'s `SharedMainGridLayout` and injects megameal-specific slots:

- `homeLayout="portal"` activates `PortalHeroSlide` in the `banner-overlay-content` slot — this is the 3D home page experience
- `homeLayout="test-portal"` forces `banner-only` content mode for isolated portal testing
- All other pages render `UniverseHeroSlide` in the `banner-slide-content` slot

Site-wide configuration is in `src/config/config.ts` (site metadata, nav, banner defaults).

## Portal Scene (Home Page 3D)

The portal is the most complex system in the codebase. Read this section before touching any file in `src/components/home/`.

### Component responsibilities

| File | Role |
|------|------|
| `HomeIntroEnvironment.svelte` | Shell: input handling (pointer/touch/wheel), Canvas setup, background-reveal timing |
| `HomeIntroEnvironmentScene.svelte` | All Threlte scene objects: 360 particles, 3 rings, 8 carousel screens, logo mesh |
| `HomeIntroPostProcessing.svelte` | `EffectComposer` with `UnrealBloomPass`; **disables Threlte's auto-render** and owns the render loop |
| `HomeIntroParticle.svelte` | Single particle: core sprite + halo sprite (2 sprites per instance, 720 total) |
| `HomeIntroRingGlow.svelte` | Ring glow disc plane + emitter (SpotLight + PointLight + sprite) per ring. See known cruft below. |
| `HomeIntroScreenPanel.svelte` | Layered glass carousel panel (MeshPhysicalMaterial + frost/caustic/grime/sheen procedural textures) |
| `HomeIntroLogoReflections.svelte` | Three additive reflection streaks over the logo mesh |
| `homeIntroScreens.ts` | Data for the 8 portal carousel destinations (sceneId, copy, asset paths) |
| `homeIntroGlassTextures.ts` | Procedural canvas texture factories: frost, caustic, sheen, grime, image-alpha |

### Render loop

`HomeIntroPostProcessing` calls `autoRender.set(false)` on mount and registers a task on Threlte's `renderStage` that calls `composer.render()`. It restores `autoRender.set(true)` on destroy. This means **the bloom pass is the only thing drawing frames** — do not add a second render call or a standard `useTask` that also renders.

### Known cruft

`HomeIntroRingGlow` contains a spark-cloud sprite system (`{#each sparks}`) that is fully dead code. All three callsites in `HomeIntroEnvironmentScene` pass `count={0}`, so `sparks` is always an empty array and nothing renders from that block. The props `count`, `size`, `opacity`, `spinAxis`, `spinSpeed`, and `rotation` have no effect at any current callsite. Do not reference these when reasoning about draw call counts or scene complexity.

`atmosphere-preview.html` at `src/components/home/` is a development prototype, not a deployed asset or component.

### CSS layer stack (z-index within `.home-intro-environment`)

```
z-index 0  .home-intro-background-curtain   dark curtain, fades out on logo load
z-index 1  canvas                           WebGL output (bloom-composited)
z-index 2  ::after pseudo                   scanline + edge-vignette + color overlay (soft-light)
z-index 4  .home-intro-copy                 UI text panels (status top-right, feature bottom-left)
```

The `--portal-reveal-progress` CSS custom property (0→1) drives copy fade-in and is set from scroll/drag state in `HomeIntroEnvironment`.

### Portal scene tuning reference

- **Bloom params** (`HomeIntroPostProcessing`): strength `1.45`, radius `0.74`, threshold `0.08`. A `ShaderPass(CopyShader)` is added as the final pass after bloom — this is load-bearing: `UnrealBloomPass` when it is the last pass uses an opaque internal `MeshBasicMaterial` to write the scene to the canvas, destroying alpha and turning the transparent background black. The copy pass demotes bloom so it uses its additive-blend path, and the copy pass writes to canvas with alpha intact. Do not remove it.
- **Canvas DPR**: `1.15` (reduced from default for performance)
- **Particle count**: `360` instances of `HomeIntroParticle` (720 sprites total including halos)
- **Ring materials**: `MeshBasicMaterial` at low opacity (`0.095–0.12 × atmosphereReveal`) — these must be bright enough to exceed the bloom threshold to glow
- **Logo model**: loaded from `/assets/3D/Hy3D_textured_00005_.glb`, fitted to `logoTargetSize` `[4.68, 2.24, 1.44]`, roughness `0.16`, metalness `0.9`, env intensity `0.18`
- **Ambient light**: `intensity={0.0}` — scene is lit entirely by ring emitter SpotLights and PointLights

## Banner Stage System

`BannerStage.svelte` manages scene rotation across pages. Scenes register via a registry, are selected by page path, and rotate using a history cookie (`BANNER_STAGE_HISTORY_COOKIE`). The portal dispatches `merkin:banner-select-scene` custom events when the carousel changes screens, which the banner stage listens to for synchronized background transitions.

## Content Collections

Defined in `src/content/`: `posts`, `about`, `friends`, `products`, `quizzes`, `reviews`, `spec`, `team`. Timeline stories live under `src/content/posts/timelines/`. The `friends` collection drives federated content sharing via RSS.

## CSS Architecture

Per `AGENTS.md`: global styles enter through `src/styles/site.ts`. Do not add large `<style>` blocks to pages. Feature-level CSS belongs in `src/styles/features/<feature>/`. The portal scene CSS splits across three files by concern:
- `src/styles/features/home/portal-hero-slide.css` — page container, vignette, dot-noise overlay
- `src/styles/features/extracted/home-intro-environment.css` — canvas layers, curtain, UI copy
- `src/styles/features/home/home-intro-hero-slide.css` — alternative (non-portal) hero layout
