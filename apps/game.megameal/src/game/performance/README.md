# Game Performance

Status: stage-one foundation and diagnostics.

`src/game/performance` owns Megameal runtime performance behavior and
diagnostic aggregation. The level package owns saved performance configuration,
and the editor owns optional controls for editing those level files.

## Data Flow

```text
src/levels/global/performance.json
  + src/levels/<level>/performance.json
  -> defineLevelPackage()
  -> level.resources["game:performanceConfig"]
  -> src/game/performance systems and diagnostics
  -> engine ports/adapters
```

Game performance code must never import `src/levels` or `src/editor`. The
runtime receives the effective config as a scene resource after the selected
level package has been composed.

## Folder Boundaries

- `types.ts` owns the stage-one config contract.
- `diagnostics/` owns read-only runtime performance summaries.
- `lod/` is reserved for runtime level-of-detail policy and systems.
- `culling/` is reserved for runtime visibility/culling policy and systems.
- `streaming/` is reserved for runtime asset, render, or collision residency
  policy and systems.
- `collision/` is reserved for runtime collision performance policy such as
  spatial lookup or broadphase-friendly walkable queries.

Stage one does not implement active LOD, culling, streaming, or collision
optimization. Stage one accepts only `off` and `diagnostic` modes so future
systems cannot be silently enabled before their runtime implementation exists.

## Boundaries

- Do not put level-specific values in this folder.
- Do not import Svelte, Astro, Three, Rapier, browser globals, `src/editor`, or
  `src/levels`.
- Do not create adapter-specific shortcuts here; adapters remain under
  `src/engine/adapters`.
- Do not make diagnostics mutate gameplay state.
