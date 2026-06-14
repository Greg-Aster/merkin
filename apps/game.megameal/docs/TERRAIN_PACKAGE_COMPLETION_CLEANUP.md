# Terrain Package Completion And Cleanup

Status as of 2026-06-10: the generic terrain package/cook/streaming foundation
is active architecture, not planned-only work. All current runtime scenes with
terrain or floor surfaces are registered through the same package path. This
document is the cleanup checklist for keeping that foundation unified as new
runtime scenes and richer terrain authoring features are added.

## Active Owners

- `TerrainVisualImportPipelineContract` owns visual terrain import provenance,
  generated visual outputs, material binding metadata, terrain package data,
  readiness linkage, write plans, and drift validation.
- `CookedTerrainChunkContract` owns collision terrain chunks, source-art scale
  bake policy, deterministic chunk ordering, stable IDs, hashes, and explicit
  collider data.
- `TerrainChunkStreamingContract` owns startup package activation, per-tick
  activation/deactivation planning, visual visibility projection through
  `Renderable.visible`, and readiness for required terrain packages.
- `RuntimeSceneManifest.terrainPackages` and
  `RuntimeSceneManifest.readiness.requiredTerrainPackageIds` are production
  scene data. They are not placeholder metadata.
- `src/engine/data/terrainCook` is the generic engine-data package/cook owner.
  New terrain cook behavior belongs there or behind that contract, not in
  level-specific scripts.
- `src/game/terrain/terrainRuntimeCatalog.ts` owns the authored generic terrain
  package catalog for current runtime scenes. `src/game/generated/terrainRuntime.ts`
  is the generated runtime wrapper owned by `cook:terrain -- --write`.

## Command Policy

- The only terrain cook command is `cook:terrain`.
- The only terrain drift gate is `ci:terrain-drift`.
- Level-specific terrain generation, cook, and drift commands are retired.
- Normal app builds must not silently generate or repair terrain packages.
- Write paths must have explicit generated output owners and deterministic
  drift checks before generated data is accepted.

## Runtime Policy

- Visual chunks, collision chunks, material bindings, package manifests, and
  readiness links are engine/game data products.
- Renderer adapters project active renderable entities only. They do not scan
  terrain assets, choose streamed chunks, or infer gameplay collision.
- Physics adapters project active collider entities only. They do not own
  terrain streaming, repair missing chunk data, or infer collision from render
  meshes.
- Game/runtime systems activate required startup packages before readiness and
  update streamable package chunks through ECS components.
- Runtime collision must come from explicit collider data after terrain package
  activation, never from render GLB inspection.

## Cleanup Checklist

- Remove or keep retired level-specific terrain scripts out of `package.json`.
- Keep package scripts named generically: `cook:terrain` and
  `ci:terrain-drift`.
- Do not add new tests outside focused contract owners for terrain import,
  terrain cook, terrain package readiness, and terrain streaming.
- Keep generated terrain/collision data owned, reproducible, hash-checked, and
  connected to runtime manifest package IDs.
- Treat old public/generated terrain partitions and old generated runtime scene
  terrain data as provenance only unless they pass through the generic import
  and cook contracts.

## Next Production Increments

- Production terrain editor import UI.
- Material/shader authoring UI and richer material package reports.
- Additional rollout validation for any newly added runtime scene package.
- Observatory collision data still uses the checked-in generated collision
  module as a provenance source for terrain chunks and non-terrain blockers;
  remove that legacy module only after the generic terrain runtime catalog owns
  equivalent explicit data without losing blocker coverage.
