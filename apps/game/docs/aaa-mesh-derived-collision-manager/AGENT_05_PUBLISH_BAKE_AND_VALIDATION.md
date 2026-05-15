# Agent 05: Publish Bake And Validation

## Goal

Make publish bake Collision Manager products into deterministic runtime
artifacts and reject stale or missing generated collision.

## Ownership

Primary write scope:

- publish pipeline scripts
- runtime manifest builders
- collision generation bake scripts
- audits and validation gates
- generated collision artifact schema

Coordinate before editing:

- contract names with Agent 01
- manager product API with Agent 02
- runtime adapter with Agent 03
- scene migration with Agent 06

## Publish Contract

Publish must use this sequence:

```txt
load source scene
normalize collision policy
ask Collision Manager/generator for required products
generate missing or dirty products
validate product fingerprints
write runtime collision artifacts
write runtime scene manifest
run architecture/collision audits
```

If any enabled actor has missing, stale, invalid, or over-budget generated
collision, publish fails.

## Stale Detection

Generated collision product must match:

- source mesh URL or primitive descriptor
- source mesh fingerprint
- transform fingerprint if baked into local geometry
- policy fingerprint
- generator version

If any mismatch exists, product is stale.

## Runtime Manifest

Runtime manifests should reference generated collision products as manager-owned
artifacts, not as scene-authored collider URLs.

Good:

```json
{
  "actorId": "root-southwest",
  "collision": {
    "mode": "auto",
    "productId": "root-southwest:auto:simplifiedMesh",
    "artifactUrl": "/generated/runtime-game-assets/collision/..."
  }
}
```

Bad:

```json
{
  "collision": {
    "shape": "cylinder",
    "size": [14, 76, 14],
    "sourceAssetFingerprint": "old hash"
  }
}
```

Exact JSON shape may differ, but ownership must be clear.

## Validation Requirements

Validation must fail for:

- old scene-authored collider geometry fields
- enabled collision with no generated product
- generated product from wrong source mesh
- generated product from wrong transform/policy
- generated product over triangle budget
- missing required walkable collision for spawn
- overlay/playtest/runtime product mismatch

Validation may warn for:

- expensive but allowed trimesh products
- visual-only object count
- low-quality primitive collision chosen for complex mesh

## Acceptance Criteria

- `cook:runtime-assets` or publish build regenerates collision products.
- Runtime scene manifest contains generated collision product references.
- Old collider metadata cannot pass as current generated collision.
- Yggdrasil publishes collision products for enabled meshes through the new
  manager path.
- Existing graphics budget failures are reported separately from collision
  correctness.

## Tests

Add/update tests for:

- stale product rejection
- mesh URL change invalidates product
- policy change invalidates product
- scale change invalidates product when geometry is baked at scale
- `mode: none` omits product and passes as explicit visual-only
- publish fails when required generated collision is missing
