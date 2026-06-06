# Water Surface System Plan

Status: V1 shared static visual water surface implemented; future water behavior remains planned.

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

## Current V1 Target

The V1 contract is a static visual water surface:

- Rendered as scene content through ordinary engine data.
- No collider.
- No gameplay trigger volume.
- No shader animation, wave simulation, reflections, refraction, or rising-water behavior.
- No old `apps/game` water runtime code, editor code, generated products, or renderer repair path.

This keeps the first slice small while giving future water work a stable owner.

## Target Ownership

```text
src/game/assets/waterAssets.ts
  -> shared mesh/material asset declarations such as mesh_water_plane and
     material_water_dark_still

src/game/prefabs/waterPrefabs.ts
  -> shared water prefab archetypes such as water_surface_plane

src/game/levels/<level>.ts
  -> per-level water instances and customization, such as observatory:water

RuntimeSceneManifest / AssetManifest
  -> selected water assets, preload groups, and readiness assets when the
     surface is required for first playable render

Rendering module / ThreeRendererAdapter
  -> framework-neutral render data in the engine; Three-specific material,
     transparency, render order, future waves, reflections, and refraction
     remain adapter concerns
```

## V1 Implementation Rules

- Use shared water asset and prefab IDs for reusable water, not Observatory-prefixed owners.
- A level may own a stable instance ID such as `observatory:water`.
- The render mesh must not imply collision; collision or gameplay water volumes require a future explicit component/contract.
- Material tuning must flow through manifest-owned material parameters or per-level prefab overrides, not renderer defaults.
- A scene-specific water material can exist when the art direction requires it, but the shared water mesh/prefab owner remains the reusable water system.
- Runtime scenes must include water assets in preload/readiness when the water surface is required for the scene's first playable presentation.
- Svelte, Threlte, browser code, and old `apps/game` systems must not own water state.

## Observatory V1 Requirements

Observatory consumes the shared contract as the first concrete level instance:

- Shared mesh asset: `mesh_water_plane`.
- Shared prefab: `water_surface_plane`.
- Shared or selected material: `material_water_dark_still`, unless a named Observatory material is justified as a scene-specific variant.
- Level instance ID: `observatory:water`.
- Position: `[0, -2, 0]`.
- Visual size: `4000 x 4000`.
- No collider and no water gameplay volume.

The Observatory packet must not make `mesh_observatory_water_plane`, `material_observatory_water`, or `observatory_water` the sole reusable owner. Those migration-scaffolding IDs are not part of the V1 implementation; the reusable owners are `mesh_water_plane`, `material_water_dark_still`, and `water_surface_plane`.

## Future Feature Packets

Future water packets should extend `WaterSurfaceContract` rather than adding level-local policies:

- Water quality tiers and renderer diagnostics.
- Animated normal maps and simple wave parameter sets.
- Reflections, refraction, depth fade, foam, and shoreline blending.
- Rising water and authored water-state timelines.
- Explicit water volumes, underwater state, audio filters, and traversal effects.
- Buoyancy and gameplay interactions.
- River/lake/ocean/body authoring types.
- Import/cook tooling for authored water bodies and generated water assets.

## Validation Expectations

The first implementation should add focused validation that proves:

- Shared water asset IDs exist in the selected manifest.
- Shared water prefab IDs exist and are used by Observatory.
- `observatory:water` is a level instance of the shared water prefab.
- Required water render assets are in preload/readiness when the scene declares them required.
- The water render mesh has no collider unless a later water-volume contract adds one explicitly.
- Old `apps/game` water runtime/editor/generated code is not imported.

Expected docs-only validation for this plan:

```bash
git diff --check -- apps/game.megameal/docs/WATER_SURFACE_SYSTEM_PLAN.md
rg -n "[ \t]$" apps/game.megameal/docs/WATER_SURFACE_SYSTEM_PLAN.md
```

Expected code-packet validation when implemented:

```bash
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal test:runtime-scene-contract
```
