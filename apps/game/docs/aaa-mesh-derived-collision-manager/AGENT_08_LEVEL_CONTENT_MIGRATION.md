# Agent 08: Level Content Migration

## Goal

Do the level-by-level conversion work required by the new Collision Manager
contract. This is deliberate grunt work: every active level must stop depending
on independent collider geometry and must be classified for mesh-derived
collision.

## Ownership

Primary write scope:

- `apps/game/src/threlte/editor/scenes/*.scene.json`
- level-specific fixtures/tests needed for migration
- generated runtime collision outputs after the publish/bake path exists
- level migration notes in `COORDINATION_LOG.md`

Coordinate before editing:

- schema/contract changes with Agent 01
- manager product requirements with Agent 02
- publish artifact generation with Agent 05
- deletion timing with Agent 06

## Required Level Work

For each active level:

1. Inventory every geometry actor.
2. Classify collision policy:
   - `auto` for solid/walkable/blocking objects.
   - `trigger` for gameplay volumes and interaction triggers.
   - `none` for visual-only/detail/decorative objects.
3. Assign intent:
   - `walkable` for surfaces that support player traversal/spawn.
   - `blocker` for solid obstacles.
   - `trigger` for non-solid sensors.
   - `detailMesh` only for explicitly non-blocking detail behavior.
4. Remove old independent collider geometry fields.
5. Regenerate manager collision products through the owning generation path.
6. Validate spawn support.
7. Validate player traversal.
8. Record unresolved art/mesh issues.

## Active Levels To Migrate

At minimum:

- `yggdrasil.scene.json`
- `miranda.scene.json`
- `sci-fi-room.scene.json`
- `solitude.scene.json`
- any scene-backed Observatory runtime data that enters the scene pipeline

If more active runtime scenes exist, add them to this list in the coordination
log before migrating.

## Yggdrasil Specific Requirements

Yggdrasil is the primary regression level.

Required outcomes:

- World tree collision is generated from the world tree mesh.
- Roots generate collision from their current meshes.
- Mounds generate collision from their current meshes.
- Spawn pad/walkable support is generated/validated through the new policy.
- Lore markers and portals are classified as trigger or none.
- No root cylinder primitive collider remains as active source truth.
- Applying a variant to a root invalidates and regenerates collision.

## Acceptance Criteria

- Each active level has no old collider geometry as source truth.
- Every visible geometry actor is explicitly classified or defaults through the
  new policy normalization.
- Collision audit reports no errors for migrated levels.
- Publish validation reports no stale/missing generated collision products.
- Manual playtest confirms collision matches overlay for migrated levels.

## Handoff Requirements

For each level, report:

```txt
Level:
Actors migrated:
Auto collision actors:
Trigger actors:
Collision-off actors:
Walkable actors:
Spawn support actor/product:
Known mesh-generation failures:
Commands run:
Manual checks:
```
