# Agent 07: Integration Certification

## Goal

Certify that the old collision system has been replaced end to end and that the
new mesh-derived Collision Manager behaves like a production engine subsystem.

## Ownership

Primary write scope:

- integration tests
- smoke checks
- final documentation updates
- small integration fixes only

Coordinate before editing any feature-owned implementation file.

## Certification Matrix

### Editor Authoring

- Create primitive -> collision auto-generates.
- Import/generated mesh -> collision auto-generates.
- Apply variant -> old collider is removed, new collider is generated.
- Move actor -> collision moves with actor.
- Rotate actor -> collision rotates with actor.
- Scale actor -> collision updates in real time.
- Turn collision off -> Rapier collider removed.
- Turn collision back on -> generated collider returns.

### Overlay

- Overlay draws only Rapier state.
- Overlay updates after move/rotate/scale.
- Overlay updates after mesh replacement.
- Overlay shows no collider for `mode: none`.

### Playtest / Gameplay

- Playtest uses same generated collision as edit overlay.
- Gameplay uses same baked product contract as publish output.
- Player cannot walk through enabled blockers.
- Player can walk on generated walkable surfaces.
- Player spawn is validated against generated walkable collision.

### Publish

- Publish regenerates missing/dirty collision products.
- Publish rejects stale products.
- Runtime scene manifest validates.
- Old collider fields are rejected.

## Required Code Search

Run and classify:

```bash
rg "originalCollision|preserveCollisionForVisualReplacement|collision\\.size|colliderUrl|sourceAssetFingerprint|proxy collision|EditorCollisionOverlay|CollisionBodyOverlay|MeshColliderHelper|PrimitiveTrimeshHelper" apps/game/src apps/game/scripts apps/game/docs
```

No active implementation may rely on old independent collider geometry.

## Required Commands

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:collision
pnpm --dir apps/game audit:engine
pnpm --dir apps/game cook:runtime-assets
```

If browser smoke tools are available:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Manual Yggdrasil Certification

Use Yggdrasil as the test level because it exposed the failure:

1. Load Yggdrasil in editor.
2. Enable collision overlay.
3. Select `root-southwest`.
4. Apply a generated variant.
5. Confirm overlay disappears/rebuilds, then returns aligned to the new mesh.
6. Move the root.
7. Confirm overlay moves with it.
8. Scale the root.
9. Confirm overlay scales with it.
10. Enter playtest.
11. Confirm player collision matches the overlay.
12. Publish.
13. Reload gameplay.
14. Confirm runtime collision matches editor/playtest behavior.

## Final Handoff Requirements

Final handoff must state:

- old collision source-truth code deleted
- new manager owner files
- scene data migration completed
- generated outputs rebuilt
- checks run
- known graphics/content budget failures
- remaining non-collision warnings
- no compatibility layer retained
