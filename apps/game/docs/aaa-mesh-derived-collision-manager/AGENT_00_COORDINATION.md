# Agent 00 Coordination: Mesh-Derived Collision Manager

## Mission

Coordinate a full replacement of the current collision pipeline with a
mesh-derived Collision Manager. The finished system must not retain the old
independent-collider authoring model.

## Shared Target

```txt
mesh source + node transform + collision policy
  -> manager-generated collision
  -> Rapier live state
  -> publish-time generated artifact
```

If an implementation keeps a manually authored collider object as source truth,
it is not aligned with this project.

## Required Impact Map For Every Agent

Each agent must start its handoff with:

```txt
Core contract:
Runtime consumers:
Editor / authoring consumers:
Manifest / generated data:
Validation and audits:
Compatibility code to delete:
Compatibility code intentionally retained:
Out of scope:
```

`Compatibility code intentionally retained` should normally be `none`. If not,
the agent must state the exact owner and deletion condition. This project is not
allowed to become a bridge layer around the old collision system.

## Workstream Ownership

### Agent 01: Contract And Types

Owns:

- scene document collision policy type
- runtime actor collision generation contract
- generated collision manifest/schema
- naming and lifecycle state

Avoids:

- Svelte component rewrites
- editor layout changes
- bake implementation

### Agent 02: Collision Manager Core

Owns:

- manager service/store
- dirty tracking
- generation requests
- cache keys/fingerprints
- transform/mesh/policy invalidation

Avoids:

- final publish gate rewrites
- broad editor UI

### Agent 03: Rapier Runtime And Overlay

Owns:

- live Rapier collider creation from manager products
- editor playtest parity
- overlay sourced from Rapier only
- removal of fake overlay paths

Avoids:

- scene data migration
- inspector layout

### Agent 04: Editor UX And Controls

Owns:

- object properties controls
- Collision Manager panel/status
- collision enabled/mode/quality/budget controls
- dirty/regenerating/error display

Avoids:

- manager internals
- publish bake internals

### Agent 05: Publish Bake And Validation

Owns:

- publish-time bake step
- generated runtime collision artifacts
- audits and release gates
- manifest validation

Avoids:

- live editor UX
- broad scene migration

### Agent 06: Migration And Deletion

Owns:

- data migration from old scene collision fields
- deletion of superseded files/helpers/tests/docs
- Yggdrasil repair under the new contract
- removal of legacy preservation/restoration behavior

Avoids:

- creating compatibility adapters
- changing manager behavior except through agreed contract

### Agent 07: Integration Certification

Owns:

- final end-to-end verification
- regression matrix
- code search for old concepts
- final docs update

Avoids:

- feature work unless fixing integration blockers

### Agent 08: Level Content Migration

Owns:

- active scene-by-scene conversion to mesh-derived collision policy
- Yggdrasil collision content repair under the new model
- visual-only/trigger/walkable/blocker classification grunt work
- level-specific traversal and spawn validation notes

Avoids:

- manager implementation
- broad engine contract edits
- preserving old collider geometry as source truth

### Agent 09: Legacy System Audit And Modernization

Owns:

- finding legacy collision assumptions outside the deleted pipeline
- modernizing still-needed systems to consume Collision Manager policy/products
- removing renamed compatibility paths and duplicate concepts
- documenting any system that must be deleted by another agent

Avoids:

- level data migration
- adding bridge layers
- leaving old behavior behind feature flags

### Agent 10: Runtime Product Mount Replacement

Owns:

- replacing `RuntimeActorNode.svelte` legacy collision mounting
- generated product to Rapier runtime adapter
- runtime tests proving old scene collision fields do not mount colliders

Avoids:

- editor overlay implementation
- deleting shared legacy adapter before Agents 11 and 12 are ready

### Agent 11: Editor Overlay And Playtest Product Mount Replacement

Owns:

- replacing `EditorNodePhysicsBody.svelte` legacy collision mounting
- edit overlay and playtest parity with runtime generated products
- manual Yggdrasil overlay/playtest verification notes

Avoids:

- runtime adapter ownership
- publish artifact validation

### Agent 12: Legacy Adapter Deletion And Test Rewrite

Owns:

- deleting `createLegacySceneCollisionRapierProduct`
- deleting `legacy-scene-collision` source values
- rewriting tests that assert legacy scene collision can mount Rapier
- final search proof that the adapter is gone

Avoids:

- deleting symbols still imported by Agent 10 or Agent 11 work in progress
- replacing deletion with a compatibility bridge

### Agent 13: Generated Product Artifact And Shape Verification

Owns:

- proving generated products are real manager products, not fallback cuboids
- artifact URL/metadata/bounds/fingerprint validation
- Yggdrasil root/mound/tree generated product verification

Avoids:

- runtime/editor mount wiring unless needed for product shape compatibility
- level content classification outside product validation

## Coordination Log Template

Each agent updates this section or copies the same format into their final
handoff.

```txt
Agent:
Branch/worktree:
Status: not-started | in-progress | blocked | ready-for-review | integrated
Owned files:
Files touched outside ownership:
Contract changes made:
Deletion completed:
Generated files changed:
Commands run:
Known blockers:
Next handoff needed:
```

## Shared Terms

- **Source mesh**: the render source for a node: primitive, GLB asset, prefab
  GLB, or terrain/chunk mesh.
- **Collision policy**: authored data that says whether/how collision should be
  generated.
- **Generated collider**: manager product derived from the source mesh and
  policy.
- **Live collider**: Rapier object currently in the editor/playtest/game world.
- **Baked collider**: publish-time artifact used by the shipped runtime.

## Architecture Rules

- The manager is the only owner of generated collider geometry.
- Scene nodes do not own collider geometry.
- Object transforms belong to the actor/node and are applied consistently to
  render and collision.
- Mesh changes invalidate generated collision.
- Transform changes update or regenerate collision immediately.
- Overlay uses live Rapier state only.
- Publish uses manager-generated artifacts only.

## Required Search Before Final Integration

Agent 07 must search for these concepts and classify each remaining occurrence:

```bash
rg "originalCollision|preserveCollisionForVisualReplacement|collision\\.size|colliderUrl|sourceAssetFingerprint|proxy collision|EditorCollisionOverlay|CollisionBodyOverlay|MeshColliderHelper|PrimitiveTrimeshHelper" apps/game/src apps/game/scripts apps/game/docs
```

Remaining occurrences are allowed only when:

- they are part of the new generated collision artifact schema, or
- they are in archived docs, or
- they are in migration tests that assert the old fields are rejected.

## Required Checks

Run as relevant during development:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:collision
pnpm --dir apps/game audit:engine
pnpm --dir apps/game cook:runtime-assets
```

`audit:engine` or `cook:runtime-assets` may still fail known graphics budgets.
Do not hide those failures. Report them separately from collision correctness.
