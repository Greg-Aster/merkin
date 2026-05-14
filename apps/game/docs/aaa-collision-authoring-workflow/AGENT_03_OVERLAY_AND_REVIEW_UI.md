# Agent 03 - Collision Overlay And Review UI

## Mission

Make the editor show the real collision state used by playtest, and make missing
or intentionally absent collision obvious.

## Current State

- Scene-node overlay is rendered by `EditorNodePhysicsBody.svelte` when
  `collisionOverlayEnabled` is true.
- That overlay resolves collision through `resolveNodeCollision(...)`, which is
  the editor-side path for authored scene-node collision.
- `EditorCollisionOverlay.svelte` is terrain-heightmap-only and only shows when
  the terrain workflow is heightmap.
- The UI label "Collision Overlay" does not clearly distinguish scene-node
  overlay from terrain-heightmap overlay.
- Collision status exists in inspector helpers, but there is no complete level
  collision review table.

## Required Contract

The overlay must answer these questions in edit mode:

- What collision exists right now?
- What will playtest collide with?
- What is visual-only?
- What visible geometry has no collision and no visual-only classification?
- What is collision-only proxy geometry?
- Which actors are walkable, blockers, triggers, detail mesh, or disabled?

## Implementation Scope

- Keep scene-node overlay tied to `resolveNodeCollision(...)`.
- Rename or split terrain overlay concepts so heightmap overlay is not mistaken
  for the whole collision overlay.
- Add labels or color legends for:
  - walkable
  - blocker
  - trigger
  - detail mesh
  - disabled
  - visual-only
  - missing collision
- Add a Collision Review panel/table fed by the same collision policy data used
  by runtime adaptation and audits.
- Make batch actions available from the review table:
  - set blocker
  - set walkable
  - set trigger
  - mark visual-only
  - disable collision
  - fit collider
  - bake mesh collider

## Tests And Verification

- Add component or integration tests where practical.
- Add smoke coverage for overlay toggle not hiding selected objects.
- Verify in Yggdrasil that hidden `yggdrasil-spawn-pad` and authored ground
  colliders are visible in overlay.
- Verify visible no-collision objects appear as visual-only or missing.

## Out Of Scope

- Do not change collision policy semantics.
- Do not use overlay-only geometry as runtime collision.
- Do not make the terrain overlay responsible for scene-authored collider
  visualization.

