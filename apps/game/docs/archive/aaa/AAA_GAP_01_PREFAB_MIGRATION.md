# AAA Gap 01: Remaining Procedural Prefab Migration

## Goal

Remove the remaining runtime procedural prefab contracts and make every deployed prefab resolve through baked assets, explicit runtime manifests, and typed animation or VFX descriptors.

## Parallel Coordination

Before starting or handing off work, read `AAA_PARALLEL_AGENT_COORDINATION.md`. Follow its file ownership map, merge order, and handoff requirements. Do not edit `AAA_GRAPHICS_REFACTOR_TRACKER.md`, `CRUFT_TODO.md`, or generated manifests unless your assigned task explicitly requires it; otherwise, include proposed tracker/TODO text in your handoff for the integration lead.

## Current State

The prefab pipeline is partially migrated:

- Baked static and variant prefabs exist under `apps/megameal/public/generated/runtime-game-assets/prefabs`.
- `story-marker`, `anomaly-cluster`, `bench-growth`, and `growth-planter` are baked assets with runtime animation descriptors.
- `courtyard-fountain` is a baked asset with a runtime VFX descriptor.
- `audit:runtime-prefabs` currently reports `prefabs=20`, `proceduralContracts=2`, `assetAnimations=4`, `assetVfx=1`, `payload=785.6KB`.
- Remaining procedural contracts in `runtimePrefabCatalog.json`:
  - `portal-apparatus`
  - `command-console`

## Target Architecture

Each prefab type should have one of these explicit runtime forms:

- Static baked GLB with `assetUrls`.
- Variant baked GLBs with `assetVariants`.
- Baked GLB plus `assetAnimations` for simple transform loops.
- Baked GLB plus a future VFX descriptor for opacity, emissive, screen, water, portal, or shader-like behavior.

No deployed prefab should depend on `resolveRuntimePrefabMeshes(..., time)` during gameplay.

## Recommended Work Order

1. Migrate `growth-planter` first. Done.
   - It is closest to the completed `bench-growth` pass.
   - Preserve only animated nodes: rim and spokes; batch leaf layers into one animated merged mesh.
   - Merge static pot/body geometry by material where possible.

2. Migrate `courtyard-fountain` second. Done.
   - Keep static fountain geometry baked.
   - Defer water/opacity behavior to the VFX descriptor system if the current animation descriptor is too weak.

3. Migrate `portal-apparatus` third.
   - Bake rings, struts, base, and static pieces.
   - Move rotating rings and opacity pulses to VFX or node animation descriptors.

4. Migrate `command-console` last.
   - Bake console body.
   - Move screens, antenna, and emissive pulses to VFX descriptors.
   - Avoid baking screen state into static geometry.

## Key Files

- `apps/game/src/threlte/engine/runtimePrefabCatalog.json`
- `apps/game/src/threlte/engine/runtimePrefabGrowthMeshes.ts`
- `apps/game/src/threlte/engine/runtimePrefabCourtyardMeshes.ts`
- `apps/game/src/threlte/engine/runtimePrefabTechMeshes.ts`
- `apps/game/src/threlte/engine/runtimePrefabTypes.ts`
- `apps/game/src/threlte/levels/RuntimePrefabNode.svelte`
- `apps/game/scripts/bake-runtime-prefabs.mjs`
- `apps/megameal/public/generated/runtime-game-assets/prefabs/manifest.json`

## Implementation Steps

1. Add the prefab to `bakePlan` in `scripts/bake-runtime-prefabs.mjs`.
2. Use `preserveSourceMeshIds` only for parts that animate independently.
3. Add an `assetUrls` entry in `runtimePrefabCatalog.json`.
4. Add an `assetAnimations` descriptor if transform-only animation is enough.
5. Remove the prefab from `proceduralRuntime`.
6. Bake and cook:

```bash
pnpm --dir apps/game bake:runtime-prefabs
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game report:graphics-backlog:write
```

7. Update `AAA_GRAPHICS_REFACTOR_TRACKER.md` and `CRUFT_TODO.md`.

## Validation

Run:

```bash
pnpm --dir apps/game audit:runtime-prefabs
pnpm --dir apps/game audit:engine
pnpm --dir apps/game type-check
GAME_DEV_PORT=4324 pnpm --dir apps/game smoke:boot
```

Passing conditions:

- `proceduralContracts` decreases after each migrated prefab.
- No prefab is both `assetUrls` and `proceduralRuntime`.
- No node animation descriptor references missing baked mesh names.
- Runtime asset cook has `render budget errors: 0`.
- Browser smoke loads gameplay, editor, and deployed levels without console warnings/errors.

## Do Not

- Do not leave the old procedural contract in place after adding `assetUrls`.
- Do not raise budgets before first trying to merge static geometry.
- Do not preserve every source mesh if only a few parts need animation.
- Do not hard-code level-specific prefab behavior in `RuntimePrefabNode.svelte`.

## Done Means

`runtimePrefabCatalog.json` has zero `proceduralRuntime` entries, or only VFX-backed temporary contracts that are explicitly tracked in `AAA_GAP_04_VFX_DESCRIPTOR_SYSTEM.md`.
