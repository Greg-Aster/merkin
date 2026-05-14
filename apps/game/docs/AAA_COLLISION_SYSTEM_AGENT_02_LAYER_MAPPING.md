# AAA Collision System Agent 02 - Collision Layer Mapping

## Goal

Make authored collision channels map to real Rapier collision groups so editor
intent matches player physics.

The engine currently has collision metadata such as `worldStatic`, `trigger`,
and `detail`, but the runtime collider components do not consistently pass
actual `collisionGroups` to Rapier. A professional engine cannot let the editor
show collision layers that do not affect runtime behavior.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_COLLISION_SYSTEM_AGENT_COORDINATION.md`
- `apps/game/src/threlte/constants/physics.ts`
- `apps/game/src/threlte/engine/collisionChannels.ts`
- `apps/game/src/threlte/collision/CollisionBody.svelte`
- `apps/game/src/threlte/collision/AssetTrimeshCollider.svelte`
- `apps/game/src/threlte/collision/PrimitiveTrimeshCollider.svelte`
- `apps/game/src/threlte/features/player/Player.svelte`

## Primary Ownership

- Collision group constants and helpers
- `CollisionBody.svelte`
- Collider child components that need `collisionGroups`

Avoid changing editor UX controls. That belongs to Agent 03.

## Current Problem

`PLAYER_GROUP` collides only with group 2. Terrain passes `TERRAIN_GROUP`, but
authored actor colliders do not receive a group from their `channel`. This can
make editor-authored blockers, triggers, or detail meshes behave differently
than their labels imply.

## Work Steps

1. Replace ad hoc group constants with a documented collision layer contract:
   - player
   - world static
   - world dynamic
   - trigger
   - detail
   - terrain
   - optional editor/debug layer if needed
2. Add a typed helper such as `getRapierCollisionGroups(channel, intent)` or
   `getCollisionGroupsForRuntimeCollider(collision)`.
3. Ensure the player collides with the intended world and terrain layers.
4. Ensure triggers/sensors can detect the player if gameplay expects that, but
   do not physically block unless intended.
5. Ensure detail collision does not block the player unless explicitly designed.
6. Pass the resolved `collisionGroups` to:
   - cuboid colliders
   - cylinder colliders
   - primitive trimesh colliders
   - asset trimesh colliders
7. Keep terrain collider group compatible with the player.
8. Update validation to reject channels that cannot be mapped to runtime groups.

## Guardrails

- Do not rely on Rapier defaults for authored actor colliders.
- Do not make triggers physically block the player.
- Do not make detail meshes block the player by default.
- Do not break existing terrain collision.
- Do not encode level-specific collision behavior in the group helper.

## Acceptance Criteria

- Every runtime collider has intentional collision groups.
- Editor channel choices affect runtime physics.
- Player collides with walkable/blocker world collision and baked terrain.
- Triggers remain sensors.
- Detail meshes do not create invisible walls.

## Validation

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
pnpm --dir apps/game release:gate:quick
```

## Handoff

Report:

- collision group matrix
- files changed
- any gameplay systems that rely on trigger/contact behavior
- any remaining places using raw group constants
