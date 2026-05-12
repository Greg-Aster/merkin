# AAA Gap 05: Lighting, Post-Processing, Shadows, And Reflections

## Goal

Raise the runtime visual presentation from functional asset loading to a deliberate scene-rendering pipeline with quality tiers, budgets, and visual regression coverage.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The engine has runtime manifests, asset budgets, LODs, impostors, and smoke tests. The visual stack still needs a dedicated quality pass:

- Lighting is not treated as a first-class authored level contract.
- Shadows and reflection quality are not consistently budgeted by level/profile.
- Post-processing exists in dependencies but does not appear to be governed as a content pipeline.
- Visual smoke exists, but the lighting/post stack needs explicit baselines and failure criteria.

## Target Architecture

Lighting and post-processing should be authored and validated per level:

- Level lighting profile in scene settings or runtime manifest.
- Quality-tier overrides for mobile, desktop, and TV.
- Explicit shadow budget: enabled lights, shadow casters, map sizes, draw impact.
- Reflection strategy: none, static environment, screen-space, planar, or probe-like approximation.
- Post-processing stack: tone mapping, bloom, color grading, vignette, anti-aliasing, depth/fog where justified.
- Visual baseline screenshots for representative camera bookmarks.

## Key Files

- `apps/game/src/threlte/levels/SceneLighting.svelte`
- `apps/game/src/threlte/features/performance/systems/Performance.svelte`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/visual-smoke.mjs`
- `apps/game/visual-baselines.json`

## Implementation Steps

1. Inventory current lighting and post-processing ownership.
   - Find all lights, environment presets, post-processing components, and hard-coded quality choices.

2. Define a `lightingProfile` or `renderProfile` contract.
   - Keep it in level settings or cooked runtime scene manifest.
   - Include tier-specific budgets.

3. Move hard-coded level lighting decisions into profile data.

4. Add audit checks.
   - Max shadow-casting lights.
   - Max shadow map size by profile.
   - Max enabled post passes by profile.
   - Reflection mode allowed by profile.

5. Add or update visual baselines.
   - Solitude ground.
   - Yggdrasil tree/portal area.
   - Sci-fi room interior.
   - Miranda exterior/markers.

6. Run visual and boot validation.

## Validation

Run:

```bash
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:visual
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

Passing conditions:

- Lighting/post settings are authored data, not scattered branches.
- No level exceeds light/shadow/post/reflection budgets.
- Visual baselines show no blank frames, broken exposure, missing ground, or severe artifacting.
- Runtime telemetry remains within expected frame-time budget for each tier.

## Do Not

- Do not add global post effects without mobile/TV budget gates.
- Do not enable dynamic shadows everywhere by default.
- Do not solve exposure/color issues with per-component material hacks.
- Do not add new page-level CSS or UI styling for render features.

## Done Means

Each deployed level has an explicit rendering profile, the profile is cooked into runtime manifests, and visual smoke covers the representative lighting/post states.
