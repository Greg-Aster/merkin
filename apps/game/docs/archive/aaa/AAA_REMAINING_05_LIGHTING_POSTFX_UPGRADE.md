# AAA Remaining 05 - Lighting And PostFX Upgrade

## Mission

Move lighting and post-processing from a lightweight baseline to a production-quality, profile-driven renderer for the browser. The work must stay tiered and measurable so visual quality does not destroy mobile or TV performance.

## Baseline Evidence

The runtime has tone mapping, bloom, vignette, render profiles, visual bookmarks, scene lighting, and visual smoke checks. The editor still says ambient occlusion is not wired into the live renderer. That is a verified rendering gap.

## Ownership

Primary ownership:

- `apps/game/src/threlte/systems/SimplePostProcessing.svelte`
- `apps/game/src/threlte/levels/SceneLighting.svelte`
- `apps/game/src/threlte/stores/runtimeRenderProfileStore.ts`
- Runtime visual quality policy.
- Scene render profile data.
- Visual smoke scripts and baselines.

Coordinate with:

- Performance agent before enabling costly passes.
- Material agent for PBR response.
- Runtime rendering architecture owner for render stage boundaries.
- CI agent before making new visual checks required.

## Work Packages

1. Define render profile tiers.
   - Low, medium, high, and TV need explicit effect settings.
   - Every expensive pass must be tier-controllable.

2. Add missing production features carefully.
   - Ambient occlusion or an equivalent contact-shadow solution.
   - Reflection/environment map validation.
   - Exposure and color grading consistency.
   - Optional fog/volumetric style where already represented by descriptors.

3. Keep render ownership clean.
   - PostFX system owns post-processing.
   - Scene lighting owns lights.
   - Render profile store owns resolved profile settings.
   - Level data owns authored intent.

4. Strengthen visual regression.
   - Use visual bookmarks as test camera positions.
   - Update baselines only with intentional review.
   - Record screenshots/artifacts for failures.

5. Measure cost.
   - For every added pass, capture FPS, frame time, draw calls, and texture count.

## Acceptance Criteria

- Ambient occlusion/contact-shadow gap is closed or explicitly replaced by a validated technique.
- Render profiles define tier-specific settings for all expensive visual effects.
- Visual smoke passes.
- Performance capture shows acceptable cost for the selected vertical slice.
- No level-specific branches are added inside generic render systems.

## Avoid

- Do not add effects that cannot be disabled or scaled by quality tier.
- Do not bake art direction into component conditionals by level id.
- Do not update visual baselines without explaining the intentional visual change.
- Do not hide performance regression by loosening budgets without evidence.

## Validation

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:visual
pnpm --dir apps/game profile:resources
pnpm --dir apps/game baseline:performance
pnpm --dir apps/game type-check
```

## Implementation Notes

- Wired `SSAOPass` into `SimplePostProcessing.svelte` behind the runtime render profile and visual quality policy.
- Added `ambient-occlusion` to the render profile pass contract and scene/profile audits.
- Added tiered AO settings to scene render profiles:
  - Mobile keeps AO disabled by omitting the pass.
  - Desktop enables AO for Miranda, Observatory, Solitude, and Sci-Fi Room.
  - Yggdrasil keeps desktop AO disabled because targeted smoke still times out on its readiness path; TV keeps an authored AO setting for review on stronger hardware.
- Added post-processing diagnostics for AO and bloom enablement.
- Updated the editor atmosphere note so AO is no longer described as an unwired gap.

Validation notes:

- `pnpm --dir apps/game type-check` passed.
- `pnpm --dir apps/game audit:engine` passed.
- `GAME_DEV_PORT=4329 GAME_VISUAL_LEVEL=sci-fi-room pnpm --dir apps/game smoke:visual` passed.
- `GAME_DEV_PORT=4333 GAME_VISUAL_LEVEL=miranda pnpm --dir apps/game smoke:visual -- --skip-baselines` passed; Miranda has no visual baseline yet.
- `GAME_PERF_SKIP_BUILD=1 GAME_DEV_PORT=4331 pnpm --dir apps/game baseline:performance -- --level=miranda` passed.
- `GAME_PROFILE_SKIP_BUILD=1 GAME_DEV_PORT=4330 pnpm --dir apps/game profile:resources -- --levels=sci-fi-room` completed with existing budget warnings for editor chunks, pending GLTF cache entries, long tasks, and low RAF FPS.
- Full `smoke:visual` still fails on Yggdrasil readiness with `Timed out waiting for runtime console signal`; this remains a validation gap rather than a baseline update.
- Non-skip-build `profile:resources` is blocked by the existing Astro static build error: missing `apps/game/dist/renderers.mjs`.

## Handoff

Report:

- Effects added or changed.
- Render profile fields changed.
- Visual baseline changes.
- Performance cost.
- Mobile/desktop/TV tier behavior.
