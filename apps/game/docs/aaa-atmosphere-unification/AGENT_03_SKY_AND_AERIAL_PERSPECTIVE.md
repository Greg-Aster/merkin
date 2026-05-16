# Agent 03: Sky And Aerial Perspective

## Current Status

This work packet is suspended. The skybox atmosphere renderer was removed from
the runtime because the sky and ocean haze paths were visually inconsistent with
the scene-object haze. `Skybox.svelte` now uses the native Three cubemap
background/environment path; sky and ocean atmosphere integration should flow
through the full-scene `depth-fog` post-processing pass instead of a skybox-only
shader path.

## Mission

Make the sky/background consume the unified atmosphere without changing the
skybox's authored appearance unintentionally.

## Ownership

Primary files:

- `apps/game/src/threlte/systems/Skybox.svelte`
- `apps/game/src/threlte/levels/skyboxPresets.ts`

Suspended runtime experiment:

- `apps/game/src/threlte/atmosphere/SkyAtmosphereRenderer.svelte`
- `apps/game/src/threlte/atmosphere/skyAtmosphereMaterial.ts`

These files were removed from the runtime rollback. Do not recreate them until a
new sky/ocean fog contract is designed and verified against the object haze.

Secondary files only if needed:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- runtime atmosphere diagnostics

## Requirements

Native Three.js `scene.background` does not receive scene fog. Solve that as a
renderer architecture issue, not with a flat overlay.

The sky path must:

- consume the runtime atmosphere contract
- preserve cubemap orientation
- preserve background intensity
- preserve background blurriness where supported
- preserve environment/reflection texture behavior
- apply aerial perspective using the same distance/height atmosphere values
- expose diagnostics showing sky participation

If a custom sky mesh is used, it must match Three's background shader behavior
closely enough that the skybox does not look like a different asset.

## Non-Goals

- Do not add a screen-space veil or sky tint overlay.
- Do not special-case Yggdrasil.
- Do not change skybox assets.

## Acceptance Criteria

- Skybox renders with the same cubemap orientation and intensity as before.
- Atmosphere can occlude/tint the horizon and distant sky consistently.
- Looking upward remains less occluded than looking across ground-level fog.
- Browser smoke has no shader compile errors.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/systems/Skybox.svelte src/threlte/atmosphere
```

Capture before/after screenshots for the same level and camera if possible.
