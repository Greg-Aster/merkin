# Agent 11: Editor Overlay And Playtest Product Mount Replacement

## Current Blocker

The editor overlay button now enables Rapier debug rendering, but editor and
playtest paths can still feed Rapier with legacy scene-collision products.

Current evidence:

- `src/threlte/editor/EditorNodePhysicsBody.svelte` imports
  `createLegacySceneCollisionRapierProduct`.
- `EditorSceneLayer.svelte` uses runtime actor branches for collision-only
  overlay mounts. That is correct only after RuntimeActorNode consumes generated
  products.

## Goal

Make edit overlay, playtest mode, and gameplay display/use the same generated
Collision Manager products.

## Ownership

Primary write scope:

- `src/threlte/editor/EditorNodePhysicsBody.svelte`
- `src/threlte/editor/EditorSceneLayer.svelte`
- editor collision product selectors/adapters
- focused editor overlay/playtest tests if present

Coordinate with:

- Agent 10 for the runtime adapter.
- Agent 12 before deleting shared legacy adapter code.
- Agent 04 if editor UI status labels need adjustment.

## Required Contract

Editor and playtest path must be:

```txt
scene node / actor
  -> generated collision product
  -> same Rapier product adapter as runtime
  -> CollisionBody
  -> Rapier debugRender overlay
```

The overlay must never render from:

- `collision.size`
- old primitive collider args
- stale `colliderUrl`
- scene visual bounds pretending to be collision
- helper mesh overlays

## Required Implementation Work

1. Remove `createLegacySceneCollisionRapierProduct` from
   `EditorNodePhysicsBody.svelte`.
2. Use generated products for editor collision bodies, or remove
   `EditorNodePhysicsBody` if `EditorSceneLayer` now correctly uses runtime
   actor branches for both playtest and overlay.
3. Ensure `collisionOnly={true}` mounts the same generated products as playtest.
4. Ensure overlay toggle does not mount editor-only fake collision geometry.
5. Ensure selected-object transforms update generated product state or live
   product transform immediately.

## Acceptance Criteria

- `EditorNodePhysicsBody.svelte` has no legacy product adapter import.
- Edit overlay and playtest agree for the same actor.
- Applying a variant in edit mode removes/replaces old Rapier colliders.
- Moving/scaling an actor updates the overlay without page reload.
- If generated collision is missing/stale, overlay shows no fake fallback and
  editor diagnostics explain the missing product.

## Manual Verification

Use Yggdrasil:

1. Enable collision overlay.
2. Select `yggdrasil-root-southwest`.
3. Move it; overlay follows.
4. Scale it; overlay updates.
5. Apply a variant; old overlay disappears/rebuilds from generated product.
6. Enter playtest; player collision matches overlay.

## Required Searches Before Handoff

```bash
rg "createLegacySceneCollisionRapierProduct|legacy-scene-collision" apps/game/src/threlte/editor apps/game/src/threlte/collision
rg "EditorCollisionOverlay|CollisionBodyOverlay|MeshColliderHelper|PrimitiveTrimeshHelper|ColliderHelper" apps/game/src/threlte
```

Remaining hits must be explained and owned by Agent 12.
