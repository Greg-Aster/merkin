# Agent 10: Runtime Product Mount Replacement

## Current Blocker

The overlay renderer is now Rapier debug output, but runtime actors still create
Rapier colliders through the legacy scene-collision adapter.

Current evidence:

- `src/threlte/levels/RuntimeActorNode.svelte` imports
  `createLegacySceneCollisionRapierProduct`.
- `RuntimeActorNode.svelte` creates a product from `actor.physics.collision`
  fields instead of from `actor.physics.collision.generatedProduct`.
- Runtime scene manifests now contain `generatedProduct`, but this product is
  not the live collider authority.

## Goal

Make runtime gameplay mount Rapier colliders only from generated Collision
Manager products.

## Ownership

Primary write scope:

- `src/threlte/levels/RuntimeActorNode.svelte`
- `src/threlte/levels/runtimeActorCollision.ts`
- `src/threlte/collision/collisionManagerProduct.ts`
- focused runtime product adapter tests

Coordinate with:

- Agent 11 for editor/playtest parity.
- Agent 12 before deleting shared legacy adapter code.
- Agent 13 for artifact-backed generated product validation.

## Required Contract

Runtime path must be:

```txt
ActorDefinition.physics.collision.generatedProduct
  -> manager product to Rapier descriptor adapter
  -> CollisionBody
  -> Rapier
  -> RapierCollisionOverlay debugRender
```

Runtime path must not be:

```txt
ActorDefinition.physics.collision shape/size/colliderUrl
  -> createLegacySceneCollisionRapierProduct
  -> Rapier
```

## Required Implementation Work

1. Add or replace an adapter that converts `GeneratedCollisionProduct` plus
   actor transform/body policy into `CollisionManagerRapierProduct`.
2. Support artifact-backed generated products:
   - `shape: 'trimesh'`, `convexHull`, or `simplifiedMesh` products with
     `artifactUrl` should mount as asset-backed collider products.
3. Support valid primitive products:
   - primitive/cuboid/capsule products may mount as shape products only when
     the product itself is current and manager-approved.
4. Update `RuntimeActorNode.svelte` to use only the generated product adapter.
5. If collision is enabled but no valid generated product exists, do not fall
   back to legacy collider geometry. Surface missing/failed collision state.
6. Remove runtime dependency on `getRuntimeActorColliderArgs(...)` if it only
   exists to compute legacy collider args.

## Acceptance Criteria

- `RuntimeActorNode.svelte` has no import or call to
  `createLegacySceneCollisionRapierProduct`.
- Runtime colliders are created from `generatedProduct`.
- Runtime actor collision does not use old `collision.size`,
  `collision.colliderUrl`, or `collision.assetLocalTransform` as source truth.
- Missing/stale generated products produce a visible diagnostic/failure, not a
  fallback collider.
- Existing player collision still works for levels with valid generated
  products.

## Tests

Add or update tests that prove:

- a generated artifact product becomes an asset Rapier collider descriptor.
- a generated primitive product becomes a shape Rapier collider descriptor.
- missing generated product returns no runtime collider and records a failure.
- old scene collision fields alone do not create a runtime collider.

## Required Searches Before Handoff

```bash
rg "createLegacySceneCollisionRapierProduct|legacy-scene-collision" apps/game/src/threlte/levels apps/game/src/threlte/collision
rg "getRuntimeActorColliderArgs" apps/game/src/threlte/levels
```

Remaining hits must be explained and owned by Agent 12.
