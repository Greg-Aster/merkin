# Agent 12: Legacy Adapter Deletion And Test Rewrite

## Current Blocker

The codebase still contains and tests a legacy scene-collision adapter:

- `createLegacySceneCollisionRapierProduct`
- `source: 'legacy-scene-collision'`
- `scripts/test-collision-manager-product.ts` assertions that legacy products
  are valid

This directly conflicts with the new contract. Keeping this adapter lets old
collision paths survive under the new overlay.

## Goal

Delete the legacy adapter and rewrite tests so the codebase cannot silently
mount old authored scene collision as live Rapier collision.

## Ownership

Primary write scope:

- `src/threlte/collision/collisionManagerProduct.ts`
- `scripts/test-collision-manager-product.ts`
- tests that still assert old collider preservation or legacy runtime mounting
- cleanup docs/status notes

Coordinate with:

- Agent 10 before deleting functions runtime still imports.
- Agent 11 before deleting functions editor still imports.
- Agent 13 for generated product adapter coverage.

## Required Deletions

Delete or rewrite:

- `createLegacySceneCollisionRapierProduct`
- `LegacySceneCollisionProductInput`
- `source: 'legacy-scene-collision'`
- tests that expect cuboid/cylinder/trimesh products from old scene fields
- passing tests that prove old `collision.size` or old `colliderUrl` can mount
  Rapier colliders without a generated product

## Replacement Tests

Tests should assert:

- generated products can mount Rapier descriptors.
- old scene collision fields alone cannot create live Rapier products.
- missing generated product is a failure/no-collider state.
- stale generated product is rejected.
- overlay/playtest/runtime cannot fall back to old authored collider geometry.

## Required Search

Run before and after cleanup:

```bash
rg "legacy-scene-collision|createLegacySceneCollisionRapierProduct|LegacySceneCollisionProductInput" apps/game/src apps/game/scripts
rg "collision\\.size|colliderUrl|assetLocalTransform" apps/game/src/threlte/levels apps/game/src/threlte/editor apps/game/scripts/test-*.ts apps/game/scripts/test-*.mjs
```

Remaining hits are allowed only when:

- rejecting legacy input in validation tests, or
- handling generated collision artifact metadata owned by Agent 13.

## Acceptance Criteria

- No active source file imports or calls the legacy adapter.
- No test asserts `legacy-scene-collision` is valid runtime behavior.
- Runtime and editor tests fail if old authored collision fields mount Rapier.
- Agent 07 can search the repo and confirm the old adapter is gone.

## Handoff Requirements

Report:

```txt
Deleted symbols:
Tests rewritten:
Remaining search hits:
Reason each remaining hit is allowed:
Commands run:
```
