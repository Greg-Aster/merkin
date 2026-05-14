# Source-Derived Terrain Collision Scratchpad

## Purpose

Coordinate work on replacing legacy heightfield collision provenance for
`glb-chunk-terrain` with an explicit source-derived collision contract.

Read first:

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_16_OBSERVATORY_SOURCE_GLB_MIGRATION.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_17_GENERATED_TERRAIN_RETIREMENT_GATE.md`

## Current Contract Goal

For `glb-chunk-terrain`, the final clean contract should be:

```txt
source GLB/GLTF
  -> source-preserving visual chunk cook
  -> source-derived collision cook
  -> terrain manifest records matching source URL/hash for visual + collision
```

The replacement for legacy baked heightfield collision is not the render GLB
used directly as physics. It should be a separate cooked collision product
derived from the same recorded source contract.

Acceptable collision products:

- simplified collision mesh cooked from the source GLB
- collision heightfield/projected mesh derived from the source GLB, with the
  GLB recorded as primary authored source and the heightmap recorded as the
  intermediate collision mesh input
- authored scene colliders for levels that intentionally remain
  `scene-authored`

## Current Level State

Latest observed scene contracts:

```txt
miranda      mode=scene-authored    visual=scene-actors       collision=scene-colliders
observatory  mode=glb-chunk-terrain visual=source-glb-chunks  collision=source-linked-terrain-collision
sci-fi-room  mode=scene-authored    visual=scene-actors       collision=scene-colliders
solitude     mode=scene-authored    visual=scene-actors       collision=scene-colliders
yggdrasil    mode=scene-authored    visual=scene-actors       collision=scene-colliders
```

Only observatory is currently the active GLB terrain migration target.
Do not migrate other levels unless their authored contract explicitly changes.

## Observatory Current Gap

`apps/megameal/public/terrain/observatory-environment.manifest.json` already
has source GLB visual chunk provenance:

- source asset: `/models/levels/observatory-environment.glb`
- source hash:
  `09459cb38a6bee5db5143a5ddce1c3a086e722781450f15cad79ed2c3e1972ae`
- visual chunks: `source-glb`, `chunkCount=16`

But its collision source contract still primarily identifies:

- `terrainSourceType: heightfield-terrain`
- `sourceAssetUrl: /terrain/heightmaps/observatory-environment_heightmap.png`
- source hash is the heightmap hash
- the GLB is only present in `authoredSourceAssetUrls`

That was the original reason the terrain ownership audit treated observatory as
transitional.

## Current Status

The source-derived collision provenance pass has been implemented and verified.

Completed:

- `scripts/bake-terrain-collision.mjs` now records the source GLB/GLTF as the
  primary collision source for `glb-chunk-terrain` manifests.
- The heightmap remains recorded separately as `collisionMeshSource`, so the
  runtime collider is still a cooked collision product, not the render GLB.
- `validateTerrainManifestCollisionContract(...)` now rejects GLB terrain
  collision that does not reference the visual chunk source URL/hash.
- Observatory was re-baked so
  `/terrain/observatory-environment.manifest.json` and
  `/terrain/collision/observatory-environment.collider.meta.json` both record:

  ```txt
  sourceAssetUrl=/models/levels/observatory-environment.glb
  sourceHash=09459cb38a6bee5db5143a5ddce1c3a086e722781450f15cad79ed2c3e1972ae
  collisionMeshSource=/terrain/heightmaps/observatory-environment_heightmap.png
  ```

- Observatory scene/runtime metadata now reports:

  ```txt
  mode=glb-chunk-terrain
  visual=source-glb-chunks
  collision=source-linked-terrain-collision
  status=complete
  blockers=0
  ```

Verification completed:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game bake:terrain-collision -- --level=observatory
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

Residual risk:

- Collision is still heightfield-projected, but now from a source-linked
  contract. A future dedicated simplified source-GLB collider can replace the
  heightmap intermediate.
- `audit:engine` still reports informational
  `spawn-relies-on-baked-terrain` for levels that use baked terrain coverage;
  it is not a failure.

## Historical In-Progress Note

One local, not-yet-verified change was started in:

- `src/threlte/features/terrain/terrainManifest.ts`

Intent:

- `validateTerrainManifestCollisionContract(...)` should require
  `glb-chunk-terrain` collision contracts to reference the visual chunk source
  asset URL.
- If visual chunk source hash exists, collision must record the matching source
  hash for that same source asset URL.
- This should not reject approved transitional heightfield collision merely
  because `collisionBakeMode === "heightfield-projection"` when an approved
  exception exists.
- It should reject GLB terrain collision that cannot prove it came from, or was
  at least explicitly tied to, the same GLB source as the render chunks.

The intended validation shape is:

```ts
visualContract.terrainSourceType === 'glb-chunk-terrain'
  -> collisionContract references visualContract.sourceAssetUrl in
     sourceAssetUrl/sourceAssetUrls/authoredSourceAssetUrls
  -> collisionContract records a fingerprint for that source URL
  -> fingerprint matches visualContract's fingerprint for the same URL
```

This note is retained for context; the edit has since been completed and the
checks listed in Current Status have passed.

## Recommended Implementation Path

1. Update `scripts/bake-terrain-collision.mjs` so
   `buildTerrainSourceContract(...)` uses the authored GLB source as the primary
   source when the manifest/scene declares `glb-chunk-terrain` or
   `source-glb-chunks`.
2. Keep the heightmap as `heightmapUrl`, `heightmapFingerprint`, and
   `collisionMeshSource`.
3. Add source URL/hash metadata to both manifest collision contract and collider
   metadata.
4. Add tests around `validateTerrainManifestCollisionContract(...)` for:
   - matching GLB visual and collision source succeeds
   - missing GLB source hash fails
   - mismatched GLB source hash fails
   - primitive/scene-authored paths are not forced into GLB source validation
5. Re-bake only the necessary collision product if ownership is clear and the
   generated asset change is intended.

## Coordination Rules

- Do not hard-code observatory in generic validation.
- Do not weaken the existing terrain manifest collision validation.
- Do not delete generated terrain products in this pass unless explicitly
  taking Agent 17 ownership.
- Do not treat render chunks as physics collision.
- Keep `heightfield-terrain` and `scene-authored` valid behind their explicit
  contracts.

## Checks To Run

Required after code changes:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

If touching generated terrain products:

```bash
pnpm --dir apps/game bake:terrain-collision -- --level=observatory
```

Only run the bake when ready to own and report generated file changes.
