# AAA Next 07: Streaming And World Partition Maturity

## Goal

Turn world partition from a validated manifest feature into a runtime streaming system with predictable readiness, prefetch, unload, and memory-pressure behavior.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns runtime streaming and partition behavior. Coordinate with performance certification before changing memory policies and with editor UX before adding authoring controls.

## Agent Assignment

Make world partition observable and reliable at runtime. Your job is to turn partition data into a clear streaming lifecycle for one level, including required readiness, optional prefetch, unload behavior, and diagnostics.

Priority target: one partitioned level with measured cell state and no level-specific Svelte branches.

## Current Baseline

- World partition audit exists.
- Solitude and Yggdrasil report cells, resident actors, streamable actors, and readiness gates.
- Runtime prefetch and GLTF cache behavior exist, but maturity is early.

## Target Architecture

Streaming should be explicit:

- Resident actors always loaded.
- Required initial cells loaded before gameplay activation.
- Optional cells prefetched based on player/camera movement.
- Assets unloaded when out of scope and memory pressure requires it.
- Collision and render readiness tracked separately.
- Debug overlay shows cell state and asset state.

## Work Packages

1. Define streaming state machine.
   - Not requested.
   - Requested.
   - Loading.
   - Ready.
   - Active.
   - Evicting.
   - Evicted.
   - Failed.

2. Add runtime diagnostics.
   - Active cells.
   - Pending required cells.
   - Loaded render assets.
   - Loaded collision assets.
   - Prefetch queue.
   - Eviction queue.

3. Improve prefetch rules.
   - Start with distance-to-cell and current movement direction.
   - Add priority for visible landmarks and required interaction assets.

4. Improve unload policy.
   - Respect required/resident assets.
   - Consider GLTF cache bytes.
   - Add low-memory behavior and cooldowns.

5. Add partition authoring validation.
   - Fail cells with no bounds.
   - Fail streamable actor references that do not exist.
   - Warn when required assets are not in initial cells.

## Key Files

- `apps/game/src/threlte/engine/runtimeWorldPartition.ts`
- `apps/game/src/threlte/engine/levelAssetPreloader.ts`
- `apps/game/src/threlte/utils/gltfAssetCache.ts`
- `apps/game/src/threlte/stores/runtimeProductionTelemetry.ts`
- `apps/game/src/threlte/ui/RuntimeDiagnosticsPanel.svelte`
- `apps/game/scripts/cook-world-partition.mjs`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/src/threlte/editor/scenes/*.partition.json`

## Validation

Run:

```bash
pnpm --dir apps/game cook:world-partition
pnpm --dir apps/game audit:engine
pnpm --dir apps/game baseline:performance
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
pnpm --dir apps/game type-check
```

## Do Not

- Do not activate gameplay before required render and collision gates pass.
- Do not evict resident or required current-cell assets.
- Do not hard-code level-specific streaming in Svelte components.
- Do not merge streaming state into unrelated performance stores.

## Done Means

- Runtime cell state is inspectable.
- Required initial readiness remains strict.
- Optional streaming can prefetch and unload without console errors.
- Performance telemetry records streaming impact.
