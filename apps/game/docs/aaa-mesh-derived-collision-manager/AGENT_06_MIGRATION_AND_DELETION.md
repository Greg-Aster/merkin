# Agent 06: Migration And Deletion

## Goal

Remove the old independent-collider authoring pipeline and migrate active
levels to mesh-derived collision policy.

## Ownership

Primary write scope:

- scene JSON migration
- deletion of superseded collision lifecycle/helpers
- deletion/rewrite of old docs/tests
- Yggdrasil collision policy cleanup
- drift cleanup after generated outputs are rebuilt

Coordinate before editing:

- source contract with Agent 01
- manager APIs with Agent 02
- Rapier component deletion with Agent 03
- publish manifest changes with Agent 05

## Migration Rules

Old authored collider geometry does not become source truth. It may guide the
initial policy choice, but it must not remain as active geometry data.

Suggested mapping:

```txt
collision.enabled false or intent none -> policy.mode none
trigger/sensor -> policy.mode trigger, intent trigger
walkable -> policy.mode auto, intent walkable
blocker -> policy.mode auto, intent blocker
detailMesh -> policy.mode auto, intent detailMesh
trimesh -> policy.quality simplifiedMesh or trimesh with budget
visual-only role -> policy.mode none
```

Do not preserve primitive collider shapes for mesh assets. After migration,
root objects, tree meshes, mounds, props, and variants generate collision from
their current mesh.

## Required Deletions Or Rewrites

Search and remove/rewrite live uses of:

- `preserveCollisionForVisualReplacement`
- `originalCollision`
- independent collider restore UI
- manual collider fit as source truth
- `collision.size` authoring controls
- stale collider URL authoring controls
- old fake overlay components
- proxy collision metadata
- old tests that assert primitive collision is preserved after mesh replacement

Archived docs may remain only under `archive/` or with explicit "obsolete"
status.

## Yggdrasil Requirements

Yggdrasil must become a normal user of the new contract:

- all mesh actors with collision enabled use `policy.mode auto`
- visual-only actors use `policy.mode none`
- story/portal actors are explicitly classified
- world tree collision is generated from the world tree mesh
- roots/mounds regenerate from their current meshes
- spawn walkability is validated from generated collision
- no hand-authored root cylinder colliders remain

## Acceptance Criteria

- Active scene files contain policy, not independent collider geometry.
- Old lifecycle preservation helpers are deleted or no longer imported.
- Yggdrasil no longer depends on preserved primitive collision for mesh assets.
- Search results for old concepts are either gone, archived, or in tests that
  reject legacy input.
- Generated runtime outputs are rebuilt through the owning script.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:collision
pnpm --dir apps/game cook:runtime-assets
```

Report known graphics budget failures separately.
