# Agent 09: Legacy System Audit And Modernization

## Goal

Find collision-adjacent legacy systems that are not simply deleted and modernize
them to the new mesh-derived Collision Manager contract.

This agent exists because deleting the obvious old pipeline is not enough.
Legacy assumptions can remain in validators, UI summaries, generated-asset
flows, bake scripts, runtime adapters, and tests.

## Ownership

Primary write scope:

- legacy-system audit notes
- small modernization patches in still-needed systems
- tests that prove legacy assumptions are gone
- coordination log blocker entries for systems owned by other agents

Coordinate before editing:

- source contracts with Agent 01
- manager internals with Agent 02
- Rapier adapter with Agent 03
- editor UX with Agent 04
- publish pipeline with Agent 05
- deletion work with Agent 06

## Systems To Audit

Search and classify:

- editor collision lifecycle helpers
- editor inspector collision controls
- generated asset and variant application paths
- style/Blender reimport paths
- runtime actor collision adapters
- publish readiness summaries
- scene document validation
- level validation/build reports
- collision review tables
- mesh collider bake scripts
- runtime manifest builders
- architecture audits
- tests that assert old collider preservation
- docs that still tell agents to preserve primitive collision

## Modernization Rules

Still-needed systems must consume:

```txt
collision policy
manager generated products
Rapier live state
publish baked products
```

They must not consume:

```txt
manual collision.size as source truth
originalCollision
preserved primitive colliders
stale colliderUrl/sourceAssetFingerprint
fake overlay geometry
proxy collision authoring metadata
```

## Required Search

Run repeatedly until remaining hits are accounted for:

```bash
rg "originalCollision|preserveCollisionForVisualReplacement|collision\\.size|colliderUrl|sourceAssetFingerprint|proxy collision|EditorCollisionOverlay|CollisionBodyOverlay|MeshColliderHelper|PrimitiveTrimeshHelper" apps/game/src apps/game/scripts apps/game/docs
```

Each remaining hit must be classified:

- deleted
- modernized
- archived obsolete doc
- test that rejects legacy input
- generated artifact contract owned by Agent 05

## Acceptance Criteria

- No active system silently maintains old collider geometry.
- No old preservation behavior remains in variant, reimport, or mesh-replace
  flows.
- Diagnostics describe manager policy/products, not manual collider drift.
- Tests fail if old collider fields re-enter active source scene data.
- Agent 07 can certify no active old collision pipeline remains.

## Handoff Requirements

Report:

```txt
Search command:
Initial hit count:
Deleted systems:
Modernized systems:
Remaining hits and classification:
Files changed:
Tests added/updated:
Blockers for other agents:
```
