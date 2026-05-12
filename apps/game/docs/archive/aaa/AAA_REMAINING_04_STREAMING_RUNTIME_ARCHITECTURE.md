# AAA Remaining 04 - Streaming Runtime Architecture

## Mission

Turn the current world partition, prefetch, and cache pieces into a cohesive streaming runtime. Player activation must depend on explicit render, collision, spawn, and cell readiness, and optional assets must be requestable, observable, and evictable.

## Baseline Evidence

Runtime world partition types include cell states such as `not-requested`, `requested`, `loading`, `ready`, `active`, `evicting`, `evicted`, and `failed`. Optional GLTF prefetch and byte-aware cache eviction exist. The next step is to make these pieces act as a validated runtime controller, not just helper functions.

## Ownership

Primary ownership:

- `apps/game/src/threlte/engine/runtimeWorldPartition.ts`
- `apps/game/src/threlte/engine/levelAssetPreloader.ts`
- `apps/game/src/threlte/utils/gltfAssetCache.ts`
- `apps/game/src/threlte/stores/runtimeStreamingTelemetry.ts`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- World partition cook/audit scripts.

Coordinate with:

- Runtime boundary agent for manifest purity.
- Performance agent for cache and active cell budgets.
- Collision agent for collision readiness.
- Editor agent if streaming diagnostics are displayed in editor.

## Work Packages

1. Define one streaming controller contract.
   - Inputs: partition manifest, player position, movement direction, required cells, optional cells, cache policy.
   - Outputs: active actor ids, pending required cells, cell state, asset state, telemetry.

2. Make readiness explicit.
   - Initial gameplay activation waits for required resident render, required resident collision, required initial cells, spawn validation, and critical systems.
   - Optional prefetch must never block level-ready.

3. Implement deterministic state transitions.
   - Requested -> loading -> ready -> active.
   - Active -> evicting -> evicted when outside policy and safe to release.
   - Any failed required cell surfaces a clear level-ready failure.

4. Connect telemetry to audits.
   - Track pending required cells.
   - Track active and prefetched cell counts.
   - Track loaded, pending, referenced, and unreferenced GLTF cache bytes.

5. Add or tighten validation.
   - World partition manifests must match level ids.
   - Cells cannot reference non-streamable actors.
   - Required readiness arrays must be present and valid.
   - Budgets fail when stable.

## Acceptance Criteria

- Runtime uses one streaming state source for active actors and diagnostics.
- Required cells and collision readiness gate player activation.
- Optional prefetch and eviction are visible in telemetry.
- GLTF cache byte limits are enforced or reported with a clear strict path.
- World partition audits still pass.

## Avoid

- Do not load optional chunks before required readiness.
- Do not hard-code level-specific streaming behavior in components.
- Do not keep stale pending GLTF entries after level-ready without telemetry.
- Do not evict active or required assets.

## Validation

```bash
pnpm --dir apps/game cook:world-partition
pnpm --dir apps/game audit:engine
pnpm --dir apps/game profile:resources
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

When strict budgets are stable:

```bash
pnpm --dir apps/game profile:resources:strict
```

## Handoff

Report:

- Streaming contract changes.
- Cell state behavior changed.
- Cache policy impact.
- Readiness impact.
- Resource profile results.
- Remaining levels that need partition tuning.
