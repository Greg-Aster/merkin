# AAA Next 09: Physics And Collision Authoring

## Goal

Make collision authoring a first-class engine pipeline with visible editor tools, separate collision assets, validation, and automated walkability/blocker checks.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns collision authoring and physics contracts. Coordinate with streaming/world partition before changing readiness gates and with editor UX before changing collision panels.

## Agent Assignment

Make collision authoring deliberate and visible. Your job is to improve one level or asset family so render, collision, spawn, walkability, and blocker intent are validated together rather than inferred from visible meshes.

Priority target: spawn/walkable validation and collision overlay clarity for a deployed level.

## Current Baseline

- Terrain collision is baked and audited.
- Render/collision parity checks exist.
- `collision.colliderUrl` exists for authored asset-trimesh collision.
- Collision overlay exists in editor tools.

## Target Architecture

Collision should be authored as separate intent:

- Walkable surfaces.
- Blockers.
- Triggers.
- Interaction volumes.
- Camera blockers if needed.
- Editor-only helpers.
- Physics material metadata.

Visible render meshes should never be assumed to be correct colliders.

## Work Packages

1. Define collision asset conventions.
   - Naming rules for collider GLBs.
   - Layer/channel conventions.
   - Physics material naming and defaults.

2. Improve editor overlay.
   - Show collision layer colors.
   - Show missing collider warnings.
   - Show invisible blocker/walkable parity failures.

3. Add walkability checks.
   - Spawn point must land on valid walkable collision.
   - Required path/area samples should not fall through.
   - Slopes above player policy should warn or fail.

4. Add blocker checks.
   - Visible large blockers need collision.
   - Invisible blockers need explicit intent.
   - Interaction volumes need trigger classification.

5. Connect streaming.
   - Required collision must load before player activation.
   - Streamed collision must update safely as cells load/unload.

## Key Files

- `apps/game/src/threlte/collision/AssetTrimeshCollider.svelte`
- `apps/game/src/threlte/collision/CollisionBody.svelte`
- `apps/game/src/threlte/engine/collisionPolicy.ts`
- `apps/game/src/threlte/engine/levelCollisionWorkflow.ts`
- `apps/game/scripts/bake-terrain-collision.mjs`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`
- `apps/game/src/threlte/editor/EditorCollisionOverlay.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`

## Validation

Run:

```bash
pnpm --dir apps/game bake:terrain-collision
pnpm --dir apps/game audit:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
pnpm --dir apps/game type-check
```

If changing collision visuals or overlays:

```bash
pnpm --dir apps/game smoke:visual
```

## Do Not

- Do not use render mesh as collider by default.
- Do not add invisible walls without explicit collision intent.
- Do not bypass level-ready gates for collision.
- Do not hide missing collider errors as warnings for required gameplay surfaces.

## Done Means

- Selected level has explicit collision authoring coverage.
- Spawn and walkable checks pass.
- Editor displays collision state clearly.
- Runtime boot smoke confirms collision readiness before gameplay activation.
