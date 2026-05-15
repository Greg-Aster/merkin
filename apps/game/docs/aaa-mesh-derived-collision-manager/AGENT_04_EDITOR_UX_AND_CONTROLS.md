# Agent 04: Editor UX And Controls

## Goal

Expose Collision Manager controls in the level editor without exposing
independent collider geometry as an authored object.

## Ownership

Primary write scope:

- editor inspector collision controls
- collision manager panel/status
- toolbar overlay toggle wiring
- editor diagnostics messages

Coordinate before editing:

- manager state shape with Agent 02
- Rapier overlay with Agent 03
- validation messages with Agent 05

## Required Controls

For selected geometry:

- Collision: `Auto`, `Trigger`, `Off`
- Intent: `Walkable`, `Blocker`, `Trigger`, `Detail`
- Quality: `Primitive`, `Convex Hull`, `Simplified Mesh`, `Trimesh`
- Max triangles / simplification budget
- LOD source tier
- Friction and restitution where useful
- Force regenerate
- Show generation status
- Show last error

Controls must not expose:

- manual collider size as source truth
- original collider restore
- preserve primitive collider after mesh replacement
- stale collider URL editing
- proxy collision objects

## Collision Manager Panel

Add a focused panel or section that shows:

- total collision-enabled actors
- ready/generated actors
- dirty actors
- generating actors
- failed actors
- disabled/visual-only actors
- selected actor product status
- publish readiness status

This should be operational, not decorative. It should help a level designer
diagnose why collision exists or does not exist.

## UX Rules

- Collision is on by default for new geometry.
- Turning collision off is explicit and visible.
- Mesh replacement shows regeneration progress.
- Failed generation should explain the source mesh/policy problem.
- Save can preserve work in progress.
- Publish must block failed/stale generated collision.

## Acceptance Criteria

- User can select root southwest, apply a variant, and see collision regenerate
  from the new mesh without manual baking.
- User can turn collision off for a visual-only object.
- User can force regenerate if a source mesh was externally changed.
- User can see whether the selected actor has ready, dirty, generating, failed,
  or disabled collision.
- No UI offers legacy collider preservation or restore controls.

## Verification

- `pnpm --dir apps/game type-check`
- focused editor controller tests where available
- browser smoke/manual check for:
  - create mesh
  - move/scale mesh
  - apply variant
  - overlay updates
  - playtest collision matches overlay
