# Streaming Performance

This folder owns game-owned runtime residency policy for assets, render
content, and collision products.

## Runtime Foundation

`index.ts` defines the pure streaming planner. It is framework-neutral and
does not load, unload, retain, dispose, or mutate assets by itself. Runtime
integration reads the returned operation list through `runtime.ts`.

The planner models three chunk roles:

- `startup`: required for startup readiness and never treated as optional
  streamable content.
- `resident`: desired while the scene is active, but not part of the startup
  readiness list.
- `streamable`: optional content selected by distance from the player and/or
  camera with load/unload hysteresis.

The shared performance config accepts `off`, `diagnostic`, and `plan` for
streaming. `runtime.ts` calls the planner, exposes deterministic operations in
runtime diagnostics, and applies residency for authored `StreamingChunk`
components:

- chunk-owned `assetIds` are retained, loaded, and released through the asset
  manager without direct unload calls,
- renderables and lights are hidden or restored through ECS visibility fields
  while assets are absent or loading,
- opt-in colliders are removed/restored through ECS `Collider` components, and
- startup preload chunks remain readiness-owned and are not treated as optional
  streamable content.

The current runtime does not spawn/despawn entities or mutate adapter internals
directly. Physics adapter collider creation/destruction follows the existing
`PhysicsSyncSystem` response to ECS component state.

## Runtime Integration Contract

Streaming runtime integration must:

- read the composed `game:performanceConfig` scene resource,
- pass level-resolved chunk definitions and current residency into
  `createStreamingPlan()`,
- apply asset load/unload operations through existing async asset/scene services
  without bypassing refcounts,
- keep startup readiness checks separate from streamable optional residency,
  keep visual residency as ECS `Renderable.visible` / `Light.visible` state,
  keep collider residency as ECS `Collider` component state,
  and
- avoid level-specific branches in this folder.
