# Game Performance

Status: runtime foundation with active culling, authored LOD swaps, async
asset streaming residency, visual/collider chunk residency, cached collision
spatial lookup, and scheduled diagnostics.

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

- `types.ts` owns the config contract and per-system mode validation.
- `runtime.ts` owns the scheduled game-runtime consumer for
  `game:performanceConfig`.
- `diagnostics/` owns runtime performance summaries from the scheduled state.
- `lod/` owns the distance/significance LOD evaluator, runtime reporting, and
  authored `PerformanceLod` renderable payload swaps.
- `culling/` owns visibility policy; active distance mode applies
  `Renderable.visible` and `Light.visible` through ECS.
- `streaming/` owns residency planning; plan mode uses authored
  `StreamingChunk` components to retain/load/release chunk-owned assets through
  the asset manager, apply renderable/light visibility through ECS, and remove
  or restore opt-in collider components while preserving readiness-required
  colliders.
- `collision/` owns collision summaries, cached spatial bucket planning,
  spatial query diagnostics, and walkable-grounding candidate lookup.

Runtime scheduling happens in the game runtime composition layer. Active modes
must still use existing engine resources and ports; this folder must not reach
into renderer objects, Rapier objects, editor modules, or level files directly.

## Boundaries

- Do not put level-specific values in this folder.
- Do not import Svelte, Astro, Three, Rapier, browser globals, `src/editor`, or
  `src/levels`.
- Do not create adapter-specific shortcuts here; adapters remain under
  `src/engine/adapters`.
- Do not make diagnostics mutate gameplay state.
