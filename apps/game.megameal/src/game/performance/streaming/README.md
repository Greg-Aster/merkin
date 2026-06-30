# Streaming Performance

This folder is reserved for game-owned runtime residency policy for assets,
render content, and collision products. Stage one provides only configuration
and diagnostics; active streaming is future work.

## Stage Two Foundation

`index.ts` defines the pure streaming planner. It is framework-neutral and
does not load, unload, retain, dispose, or mutate assets by itself. A runtime
integration must apply the returned operation list through existing scene,
asset, render, and collision services.

The planner models three chunk roles:

- `startup`: required for startup readiness and never treated as optional
  streamable content.
- `resident`: desired while the scene is active, but not part of the startup
  readiness list.
- `streamable`: optional content selected by distance from the player and/or
  camera with load/unload hysteresis.

The current shared performance config still accepts only `off` and
`diagnostic` modes, so using a composed `game:performanceConfig` keeps streaming
operations inert. The planner only emits operations when called with the
explicit planner mode `plan`; wiring that mode into level-owned
`performance.json` files requires a separate shared config/editor/runtime
integration packet.

## Runtime Integration Contract

A future runtime system should:

- read the composed `game:performanceConfig` scene resource,
- pass level-resolved chunk definitions and current residency into
  `createStreamingPlan()`,
- apply only the returned `load-chunk` and `unload-chunk` operations through
  existing asset/scene services,
- keep startup readiness checks separate from streamable optional residency,
  and
- avoid level-specific branches in this folder.
