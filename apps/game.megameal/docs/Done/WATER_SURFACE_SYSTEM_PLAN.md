# Water Surface System Plan

Status: shared visual water surface plus contract-owned animation/reflection data implemented; firefly flicker preview/cook sampling is contract-owned; shader animation, reflections/refraction rendering, water volumes, live firefly animation, and gameplay behavior remain planned.

This plan defines water as a reusable environmental surface system for `apps/game.megameal`, not as an Observatory-only mesh or material. The first implementation slice is intentionally simple: a static visual water plane that can be instanced and customized per level. Later packets can add animation, reflections, refraction, rising water, gameplay volumes, buoyancy, and authored water-body types without changing ownership.

## Why This Is A Shared Contract

AAA engines treat water as a reusable environment feature rather than a one-off level mesh:

- Unreal Engine's Water System is a shared system for rivers, lakes, oceans, islands, rendering, meshing, and editing: https://dev.epicgames.com/documentation/en-us/unreal-engine/water-system-in-unreal-engine
- Unity HDRP exposes water as a render-pipeline feature with water surfaces, water bodies, simulation, rendering, and quality settings: https://docs.unity.cn/Packages/com.unity.render-pipelines.high-definition@17.0/manual/WaterSystem-use.html
- Unity HDRP also separates water surfaces from authoring instances, so artists configure each surface while the pipeline owns rendering and simulation behavior: https://docs.unity.cn/Packages/com.unity.render-pipelines.high-definition@16.0/manual/WaterSystem-Overview.html

Reason:

```text
Water is a cross-scene environment primitive.
It can affect rendering, reflections, traversal, audio, weather, gameplay volumes,
and level identity. Treating it as a local Observatory mesh would make later
levels duplicate asset IDs, material policy, renderer behavior, and validation.
```

## Current Implementation

The current contract implements a visual water surface with authored renderer
parameters:

- Rendered as scene content through ordinary engine data.
- A `WaterSurface` component declares surface type, scrolling/static animation
  parameters, reflection mode/intensity, refraction settings, render order, and
  an explicitly disabled gameplay-volume slot.
- `src/engine/modules/rendering` exposes a renderer-safe projection helper so a
  future adapter can consume water appearance data without inheriting gameplay
  volume policy.
- No collider.
- No gameplay trigger volume.
- No shader animation, wave simulation, visual reflections, refraction, or
  rising-water behavior has been implemented in the Three adapter yet.
- No old `apps/game` water runtime code, editor code, generated products, or renderer repair path.
- Firefly population data now derives bounded deterministic flicker preview/cook
  samples from authored seed, phase, frequency, and amplitude values. The Three
  adapter does not yet animate firefly light intensity from those samples.

This keeps the first slice small while giving future water work a stable owner.

## Target Ownership

```text
src/game/assets/waterAssets.ts
  -> shared mesh/material asset declarations such as mesh_water_plane and
     material_water_surface

src/game/prefabs/waterPrefabs.ts
  -> shared water prefab archetypes such as water_surface_plane and default
     WaterSurface component data

src/game/levels/<level>.ts
  -> per-level water instances and customization, such as observatory:water

RuntimeSceneManifest / AssetManifest
  -> selected water assets, preload groups, and readiness assets when the
     surface is required for first playable render

Rendering module / ThreeRendererAdapter
  -> framework-neutral WaterSurface data and renderer-safe projection in the
     engine; Three-specific material, transparency, render order, future shader
     waves, reflections, and refraction remain adapter concerns
```

## V1 Implementation Rules

- Use shared water asset and prefab IDs for reusable water, not Observatory-prefixed owners.
- A level may own a stable instance ID such as `observatory:water`.
- The render mesh must not imply collision; collision or gameplay water volumes require a future explicit component/contract.
- Material tuning must flow through manifest-owned material parameters or per-level prefab overrides, not renderer defaults.
- Water animation/reflection/refraction settings must flow through
  `WaterSurface`, not hidden renderer defaults.
- `WaterSurface.gameplayVolume.enabled` must stay `false` until an explicit
  gameplay water-volume contract is implemented.
- A scene-specific water material can exist when the art direction requires it, but the shared water mesh/prefab owner remains the reusable water system.
- Runtime scenes must include water assets in preload/readiness when the water surface is required for the scene's first playable presentation.
- Svelte, Threlte, browser code, and old `apps/game` systems must not own water state.

## Observatory V1 Requirements

Observatory consumes the shared contract as the first concrete level instance:

- Shared mesh asset: `mesh_water_plane`.
- Shared prefab: `water_surface_plane`.
- Shared material: `material_water_surface`.
- Level instance ID: `observatory:water`.
- Position: `[0, -2, 0]`.
- Visual size: `4000 x 4000`.
- Authored `WaterSurface.animation.mode: "scrolling"` with bounded speed,
  direction, wave amplitude, and wave length.
- Authored `WaterSurface.reflection.mode: "environment"` with bounded
  intensity.
- Refraction disabled and gameplay volume disabled.
- No collider and no active water gameplay volume.

The Observatory packet must not make `mesh_observatory_water_plane`, `material_observatory_water`, or `observatory_water` the reusable owner. Those migration-scaffolding IDs are not part of the implementation; the reusable owners are `mesh_water_plane`, `material_water_surface`, and shared water-body prefabs such as `lake_water_surface` and `ocean_water_surface`.

## Future Feature Packets

Future water packets should extend `WaterSurfaceContract` rather than adding level-local policies:

- Water quality tiers and renderer diagnostics.
- Animated normal maps, depth fade, foam, and shoreline blending.
- Higher-fidelity visual reflections and refraction.
- Rising water and authored water-state timelines.
- Explicit water volumes, underwater state, audio filters, and traversal effects.
- Buoyancy and gameplay interactions.
- Additional river/lake/ocean/body authoring controls that extend the shared water-body contract.
- Import/cook tooling for authored water bodies and generated water assets.

## Validation Expectations

The first implementation has focused validation that proves:

- Shared water asset IDs exist in the selected manifest.
- Shared water body prefab IDs exist and are used by Observatory and Yggdrasil.
- `observatory:water` is a level instance of `lake_water_surface`.
- `yggdrasil:water:ocean` is a level instance of `ocean_water_surface`.
- Required water render assets are in preload/readiness when the scene declares them required.
- The water render mesh has no collider unless a later water-volume contract adds one explicitly.
- The authored water component accepts valid bounded animation/reflection data
  and rejects invalid wave/reflection/refraction/gameplay-volume data.
- Old `apps/game` water runtime/editor/generated code is not imported.

Expected docs-only validation for this plan:

```bash
git diff --check -- apps/game.megameal/docs/Done/WATER_SURFACE_SYSTEM_PLAN.md
rg -n "[ \t]$" apps/game.megameal/docs/Done/WATER_SURFACE_SYSTEM_PLAN.md
```

Expected code-packet validation when implemented:

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:water-firefly-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
```
