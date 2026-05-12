# AAA Next 04: Lighting, Reflection, And Art Direction

## Goal

Upgrade rendering from technically valid scenes to authored art direction with predictable lighting, reflection, exposure, tone mapping, and visual baselines.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns render-profile art direction. Coordinate with runtime rendering architecture before changing post-processing ownership and with performance certification before raising visual cost.

## Agent Assignment

Create one defensible art-directed visual slice. Your job is to move a representative level from "renders correctly" to "has authored lighting/profile intent" while keeping the cost and profile data measurable.

Priority target: choose one level with known visual value, add profile/bookmark/reflection decisions there, and avoid global renderer changes unless they are required by that slice.

## Current Baseline

- Runtime scene manifests include render profiles.
- Visual smoke passes representative levels.
- Lightweight bloom and vignette are implemented.
- Reflection and color grading strategy are still early.

## Target Architecture

Each level should have an explicit visual profile:

- Lighting intent.
- Exposure and tone mapping.
- Fog/atmosphere.
- Bloom policy.
- Reflection environment.
- Color grading or palette target.
- Camera bookmarks for visual regression.
- Platform quality settings.

The renderer should load visual policy from manifest/profile data, not ad hoc component decisions.

## Work Packages

1. Define visual profile schema.
   - Extend existing render profile only if needed.
   - Keep mobile/desktop/TV differences explicit.
   - Avoid creating a second competing profile concept.

2. Add reflection strategy.
   - Decide when to use environment maps, simple reflection planes, or no reflection.
   - Track reflection payload and performance cost.
   - Add audit metadata for missing required reflection assets.

3. Calibrate level lighting.
   - Pick one level as a vertical slice.
   - Author exposure, bloom, fog, and color target.
   - Use screenshot baselines to prevent drift.

4. Add visual bookmarks.
   - Store camera positions for visual smoke/regression.
   - Include Solitude ground/plateau, Yggdrasil crown, sci-fi-room interior, and Miranda portal/console.

5. Tie to performance tiers.
   - Low-tier rendering should disable or reduce expensive effects intentionally.
   - Audit should fail if a render profile references unavailable assets or unsupported effects.

## Key Files

- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`
- `apps/game/src/threlte/levels/SceneLighting.svelte`
- `apps/game/src/threlte/stores/runtimeRenderProfileStore.ts`
- `apps/game/src/threlte/features/performance/utils/runtimeVisualQualityPolicy.ts`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/game/scripts/visual-smoke-browser.mjs`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`

## Validation

Run:

```bash
pnpm --dir apps/game smoke:visual
pnpm --dir apps/game audit:engine
pnpm --dir apps/game smoke:engine
pnpm --dir apps/game type-check
```

When changing profiles or post-processing, inspect the visual smoke output metrics and any generated screenshots/artifacts.

## Do Not

- Do not add level-specific lighting branches in random runtime components.
- Do not raise bloom/exposure until every level looks bright enough by accident.
- Do not add expensive effects without low-tier policy.
- Do not weaken visual smoke thresholds to make bad frames pass.

## Done Means

- One level has a fully authored visual profile.
- Visual profile fields are validated in runtime scene audit.
- Visual smoke uses stable camera bookmarks.
- Mobile/desktop/TV differences are explicit.
