# Level Terrain Cleanup Scratchpad

## Purpose

Stabilization-only coordination for cleaning existing levels around the terrain
pipeline. This is not a new feature pass.

## Goal

Keep two clear production modes:

- `scene-authored`: level visuals come from authored scene actors/prefabs.
- `glb-chunk-terrain`: large terrain visuals come from source-preserving GLB
  chunks cooked from an authored source GLB/GLTF.

Both modes may use baked terrain collision, but the baked collision must be
explicitly declared, source-traceable, and validated. Runtime must not rely on
stale visual chunks, hidden fallbacks, or level-specific code.

## Current Level Ownership

Latest audit target:

```txt
miranda      scene-authored     visual=scene-actors       collision=scene-colliders
observatory  glb-chunk-terrain  visual=source-glb-chunks  collision=source-linked-terrain-collision
sci-fi-room  scene-authored     visual=scene-actors       collision=scene-colliders
solitude     scene-authored     visual=scene-actors       collision=scene-colliders
yggdrasil    scene-authored     visual=scene-actors       collision=scene-colliders
```

`scene-authored` is not legacy. It is the intended mode for hand-built rooms,
modular kits, props, prefabs, and authored collision volumes.

## Cleanup Criteria

The pass is complete when:

- Scene-authored levels have no authoritative terrain visual chunks.
- GLB chunk levels have source-preserving visual chunks and source-linked
  collision metadata.
- Baked terrain collision manifests include source contracts, fingerprints,
  coverage bounds, role, and collision bake mode.
- Stale generated terrain chunk directories are removed or quarantined only
  when no scene/manifest/runtime asset references them.
- `audit:engine`, `test:publish-pipeline`, and `check:generated-drift` pass.

## Guardrails

- Do not remove `scene-authored`.
- Do not introduce level-id conditionals in generic runtime/editor code.
- Do not mark a scene-authored level as `glb-chunk-terrain` unless it has a
  real authored source GLB chunk cook.
- Do not treat render meshes as collision.
- Do not keep generated chunks around just because they used to exist.
- Do not hand-edit generated runtime scene JSON; regenerate it.

## Active Findings

- Observatory is the only current `glb-chunk-terrain` level.
- Scene-authored visual chunk products for `sci-fi-room`, `solitude`, and
  `yggdrasil` have already been removed from their manifests.
- Baked collision manifests for scene-authored levels were refreshed with
  source-contract metadata so the collision products are auditable.
- Yggdrasil no longer uses the baked heightfield as the runtime floor. Its
  authored ground actors now own walkable scene colliders, including a baked
  trimesh collider for the Well Dais.
- The retired Yggdrasil terrain manifest, heightmap, and baked-heightfield
  collider were removed from `apps/megameal/public/terrain` after runtime scene
  references were cleared.
- `apps/megameal/public/terrain/levels/depreciated_observatory-island/` was
  removed after reference search confirmed it was stale generated output.

## Current Pass Log

- Re-baked `sci-fi-room` terrain collision.
- Re-baked `solitude` terrain collision.
- Re-baked `yggdrasil` terrain collision.
- Removed unreferenced deprecated observatory-island terrain chunks.
- Tightened `terrainContractAudit` so baked terrain collision without a
  `sourceContract` fails the audit.
- Removed empty legacy `settings.observatory` / `settings.solitude` buckets
  from source scenes so canonical terrain settings live under `settings.level`.
- Tightened terrain manifest discovery to prefer `settings.level` and ignore
  empty legacy scene-specific buckets.
- Re-cooked runtime assets after the scene settings cleanup; empty legacy
  buckets are no longer emitted in observatory/solitude runtime scenes.
- Converted Yggdrasil from `collision=baked-heightfield` to
  `collision=scene-colliders` because its visible ground is scene-authored and
  the baked heightfield was producing misaligned invisible walkable surfaces.
- Baked `yggdrasil-dais` as an authored walkable trimesh collider and enabled
  walkable colliders for the ground, island shelf, bifrost path, and spawn pad.
- Removed the obsolete `yggdrasil.manifest.json`, `yggdrasil_heightmap.png`,
  `yggdrasil_config.json`, and `yggdrasil.collider.*` runtime terrain artifacts.

## Verification Commands

Latest pass after the legacy-bucket cleanup:

```txt
pnpm --dir apps/game cook:runtime-assets        PASS
pnpm --dir apps/game type-check                 PASS
pnpm --dir apps/game test:publish-pipeline      PASS (24 tests)
pnpm --dir apps/game audit:engine               PASS
pnpm --dir apps/game check:generated-drift      PASS
```

```bash
pnpm --dir apps/game bake:terrain-collision -- --level=sci-fi-room
pnpm --dir apps/game bake:terrain-collision -- --level=solitude
pnpm --dir apps/game bake:terrain-collision -- --level=yggdrasil
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If generated files change, report exactly which bake/cook command produced
them.
