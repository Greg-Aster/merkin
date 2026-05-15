# Implementation Plan: Mesh-Derived Collision Manager

## Executive Summary

The current pipeline fails because collision can drift away from the render
mesh. The replacement removes independent collider geometry from source scene
truth and introduces a Collision Manager that generates collision from the
current mesh, transform, and policy.

The finished engine behavior:

```txt
mesh changes -> collision regenerates
transform changes -> collision updates immediately
collision off -> no Rapier collider
overlay -> actual Rapier state
playtest -> same collision as editor
publish -> baked manager-generated collision products
```

## Current System To Retire

These concepts are considered obsolete:

- primitive collision preservation after mesh replacement
- `generation.originalCollision`
- manual restore of primitive collision
- source scene collider geometry as truth
- stale collider URLs and fingerprints inside source nodes
- fake collision overlays
- separate editor/runtime collision interpretations
- manual collision bake as the normal workflow

Manual collision controls can remain only as policy controls. They cannot author
the geometry that Rapier uses.

## Phase 1: Contract Replacement

Owner: Agent 01

Deliverables:

- New authored collision policy type.
- New generated collision product type.
- Validation that rejects old source-truth collider geometry.
- Updated runtime actor/scene manifest contract.

Exit criteria:

- Types compile.
- Source scenes can express `auto`, `none`, and `trigger`.
- Generated products can be fingerprinted for source mesh, transform, policy,
  and generator version.

## Phase 2: Collision Manager Core

Owner: Agent 02

Deliverables:

- Collision Manager service/store.
- Actor registration/update/unregistration.
- Dirty-state tracking.
- Generation request queue.
- Generated product cache and diagnostics.

Exit criteria:

- Manager detects mesh, primitive, transform, and policy changes.
- Manager can create/update/remove a product for an actor.
- Tests prove stale products are rejected.

## Phase 3: Live Rapier Integration

Owner: Agent 03

Deliverables:

- One adapter from manager product to Rapier collider.
- Editor and playtest use the same adapter.
- Runtime uses the same product shape from baked manifests.
- Rapier-only overlay.

Exit criteria:

- Overlay updates from Rapier state after transform and mesh changes.
- No fake overlay path remains active.
- Player collision matches overlay in playtest.

## Phase 4: Editor Controls

Owner: Agent 04

Deliverables:

- Collision Manager controls in object properties.
- Collision mode/intent/quality/budget controls.
- Regenerate button.
- Manager status panel.
- User-facing errors for generation failures.

Exit criteria:

- Users can disable collision explicitly.
- Users can choose generation quality.
- Users can see dirty/generating/ready/failed state.
- Users cannot edit independent collider geometry.

## Phase 5: Publish Bake And Validation

Owner: Agent 05

Deliverables:

- Publish asks manager/generator for current products.
- Missing/dirty products are generated before runtime manifests are written.
- Runtime manifests reference generated products.
- Audits fail stale/missing products.

Exit criteria:

- Publish blocks collision drift.
- Runtime manifests validate.
- Generated products have source/policy/transform provenance.

## Phase 6: Migration, Level Content Conversion, And Deletion

Owners: Agent 06 and Agent 08

Deliverables:

- Active scenes migrated to collision policy.
- Yggdrasil migrated to mesh-derived collision.
- Other active levels migrated to mesh-derived collision policy.
- Level-specific visual-only, trigger, walkable, and blocker classifications
  corrected.
- Old helpers/components/tests deleted or rewritten.
- Old docs marked obsolete or superseded.

Exit criteria:

- No active source scene depends on old collider geometry.
- Root/mound/tree meshes generate collision from their current meshes.
- Search finds no active imports of old preservation/overlay helpers.

## Phase 7: Legacy-System Modernization

Owner: Agent 09

Deliverables:

- Inventory legacy collision-adjacent systems that are not directly deleted.
- Modernize systems that still need to exist under the new manager contract.
- Remove duplicate concepts and renamed-but-still-legacy abstractions.
- Confirm old collision assumptions are gone from runtime, editor, publish, and
  tests.

Exit criteria:

- No active subsystem assumes scene-authored collider geometry.
- No old compatibility path remains under a new name.
- Remaining collision systems all consume manager policy/products.

## Phase 8: Integration Certification

Owner: Agent 07

Deliverables:

- Full verification matrix.
- Manual Yggdrasil certification.
- Final code search and drift check.
- Final handoff summary.

Exit criteria:

- Edit overlay, playtest, and gameplay agree.
- Applying variants regenerates mesh-derived collision.
- Scaling/moving objects updates collision in real time.
- Publish output matches editor behavior.
- No compatibility layer retained.

## Phase 7A: Runtime Product Mount Replacement

Owner: Agent 10

Deliverables:

- `RuntimeActorNode.svelte` no longer creates legacy scene-collision products.
- Runtime actors mount Rapier colliders only from generated collision products.
- Missing generated products fail visibly instead of falling back to old
  authored collider geometry.
- Runtime product adapter consumes artifact-backed products and primitive
  products through one manager-owned path.

Exit criteria:

- Runtime gameplay collision source is never `legacy-scene-collision`.
- `rg "createLegacySceneCollisionRapierProduct" apps/game/src/threlte/levels`
  returns no active runtime hits.

## Phase 7B: Editor Overlay And Playtest Product Mount Replacement

Owner: Agent 11

Deliverables:

- `EditorNodePhysicsBody.svelte` no longer creates legacy scene-collision
  products.
- Edit overlay collision-only mounts and playtest mounts use the same generated
  product contract as runtime.
- Collision overlay remains Rapier debug output and is fed only by manager
  products.

Exit criteria:

- Edit overlay, playtest, and gameplay mount the same generated product shape.
- `rg "createLegacySceneCollisionRapierProduct" apps/game/src/threlte/editor`
  returns no active editor hits.

## Phase 7C: Legacy Adapter Deletion And Test Rewrite

Owner: Agent 12

Deliverables:

- Delete `createLegacySceneCollisionRapierProduct` and related
  `legacy-scene-collision` source values.
- Rewrite or delete tests that assert legacy adapter behavior.
- Add tests that reject fallback to authored scene-collision geometry when a
  generated product is missing or stale.

Exit criteria:

- `rg "legacy-scene-collision|createLegacySceneCollisionRapierProduct" apps/game/src apps/game/scripts`
  returns no active implementation or passing legacy tests.

## Phase 7D: Generated Product Artifact And Shape Verification

Owner: Agent 13

Deliverables:

- Generated products for mesh-derived collision represent real generated
  artifacts or valid manager-approved primitive products.
- Simplified mesh/trimesh products do not silently become fallback unit cuboids.
- Artifact URLs, metadata, bounds, shape, and fingerprints match the current
  mesh/policy/transform.

Exit criteria:

- Yggdrasil roots/world tree/mound products are artifact-backed or explicitly
  valid under manager policy.
- Overlay shape matches generated products, not fallback `cuboid` placeholders.
- Publish validation fails any enabled mesh whose product is a placeholder.

## Grunt Work Policy

This migration requires dedicated grunt-work agents. It is not enough to build
the manager and leave content for later. Every active level must be converted,
validated, and playtested against the new contract.

The content migration agent owns repetitive but critical work:

- classify every visible actor as `auto`, `trigger`, or `none`
- assign walkable/blocker/detail intent where needed
- remove old collision geometry fields from scene data
- regenerate collision products through the manager/build path
- verify spawn support and player traversal
- record level-specific blockers in the coordination log

The legacy audit agent owns systems that are not being deleted but cannot keep
old assumptions:

- publish readiness summaries
- collision review tables
- level validation messages
- runtime actor adapters
- editor inspector controllers
- generated asset/variant application paths
- bake scripts and audits

These are modernization tasks, not compatibility patches.

## Required Architecture Decisions

### Collision Defaults

Default for renderable objects should be:

```txt
collision.policy.mode = auto
collision.policy.intent = blocker
collision.policy.quality = simplifiedMesh for mesh assets
collision.policy.quality = primitive for primitives
```

Terrain/walkable surfaces need explicit `intent = walkable`.

### Source Fingerprinting

For GLB assets, fingerprint source file content or metadata hash. For
primitives, fingerprint geometry and args. For prefabs, fingerprint resolved
asset URL plus variant and baked asset metadata.

### Transform Handling

Prefer local generated collision plus actor transform. Position/rotation should
not force artifact regeneration. Scale can be handled either by live collider
scale update or local product regeneration; the manager owns that choice.

### Simplification

Use existing LOD/retopology tooling where possible. The collision manager should
choose a simplified mesh under budget before falling back to high-triangle
trimesh.

### Save Versus Publish

Save may store dirty manager state and policy. Publish must produce clean,
current, baked products.

## Definition Of Done

- New collision source contract exists.
- Old collider source-truth fields are gone from active source data.
- Collision Manager owns generation and dirty state.
- Rapier overlay is the only collision overlay.
- Playtest and gameplay use the same product contract.
- Publish bakes and validates products.
- Yggdrasil demonstrates the new workflow.
- Tests and audits cover drift.
- No compatibility layer, old bridge, or legacy preservation behavior remains.
