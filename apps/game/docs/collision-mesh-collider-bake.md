# Mesh Collider Bake Pipeline

Agent 03 editor controls should call:

```txt
POST /api/editor-collision/bake-mesh-collider
```

with:

```json
{
  "levelId": "active-level",
  "nodeId": "selected-asset-node",
  "intent": "blocker",
  "channel": "worldStatic",
  "triangleBudget": 5000,
  "lodSourceTier": "low"
}
```

The route runs `pnpm --dir apps/game bake:mesh-collider` and updates the scene
node after the collider asset and metadata are written. Generated colliders live
under:

```txt
/generated/runtime-game-assets/collision/<level>/<node>.collider.glb
/generated/runtime-game-assets/collision/<level>/<node>.collider.meta.json
```

The bake only supports deterministic source assets from the selected asset node.
It does not use live render state.

Each `.collider.meta.json` now records the asset-local alignment contract used
by runtime collision and editor validation:

```json
{
  "sourceActorId": "selected-asset-node",
  "sourceAssetUrl": "/generated/runtime-game-assets/source.glb",
  "sourceAssetFingerprint": { "algorithm": "sha256", "value": "..." },
  "colliderSourceAssetUrl": "/generated/runtime-game-assets/source.low.glb",
  "colliderSourceAssetFingerprint": { "algorithm": "sha256", "value": "..." },
  "lodSourceTier": "low",
  "visualLocalBounds": { "min": [0, 0, 0], "max": [1, 1, 1] },
  "colliderLocalBounds": { "min": [0, 0, 0], "max": [1, 1, 1] },
  "assetLocalTransform": {
    "schemaVersion": 1,
    "coordinateSpaceVersion": 1,
    "sourceAssetUrl": "/generated/runtime-game-assets/source.glb",
    "visualLocalBounds": { "min": [0, 0, 0], "max": [1, 1, 1] },
    "colliderLocalBounds": { "min": [0, 0, 0], "max": [1, 1, 1] },
    "visualToPhysicsMatrix": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  }
}
```

Actor transforms place instances in the world. Asset-local metadata aligns the
cooked visual and collider products inside that actor. Legacy colliders without
`assetLocalTransform` remain loadable, but publish readiness flags them so they
can be regenerated.

Each `.collider.meta.json` is a provenance contract, not just an artifact note.
New metadata uses `schemaVersion: 3` and records:

- `sourceActorId`, `sourceActorName`, `sourceAssetUrl`, and
  `sourceAssetFingerprint` using a SHA-256 content hash of the public source
  asset.
- `colliderSourceAssetUrl`, `colliderSourceAssetFingerprint`, and
  `lodSourceTier`. Mesh collider bakes default to the `low` runtime LOD source
  and will cook that LOD if it is missing.
- `visualLocalBounds` from the exact scene asset URL and `colliderLocalBounds`
  from the cooked collider GLB.
- `assetLocalTransform`, with `coordinateSpaceVersion: 1`,
  `sourceAssetUrl`, optional source node naming, both local bounds, and a
  `visualToPhysicsMatrix`.
- `provenance.bakeConfig`, including the requested intent, channel, triangle
  budget, simplification settings, and bake command.
- `triangleCount`, `vertexCount`, collision policy, simplification details, and
  generated artifact URLs.

The coordinate-space rule is: the actor transform places an instance in the
world; `assetLocalTransform` aligns cooked visual and physics products inside
that actor. The bake currently emits an identity
`visualToPhysicsMatrix` because the collider source is an asset-local LOD mesh
and the baker does not apply actor world transforms.
If the source asset URL or SHA-256 fingerprint no longer matches the scene node,
the collider should be treated as stale and regenerated. Legacy metadata without
`assetLocalTransform` remains loadable, but validation should report it as
missing the asset-local contract.

For scene-wide cleanup or publish preparation, run:

```bash
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=<level-id>
pnpm --dir apps/game bake:scene-mesh-colliders -- --all-levels=true
```

The batch command scans visible asset nodes that are not marked visual-only and
generates baked collider GLBs for anything missing a collider asset. Asset meshes
must not fall back to primitive box/cylinder collision. If the bake cannot meet
the configured triangle budget, publish should fail and the asset needs a better
source mesh, a tighter collision-specific mesh, or an explicit visual-only role.
Batch bakes delegate to the single-asset bake, so single-asset and scene-wide
runs write the same collider metadata shape.

Use `detailMesh` plus the `detail` channel for high-triangle non-blocking
diagnostic colliders. Player blockers and walkables should use cooked collider
assets with explicit budgets.
