# AAA Mesh-Derived Collision Manager Replacement

## Purpose

This folder is the authoritative handoff package for replacing the current
collision authoring pipeline. It intentionally supersedes the older
`aaa-collision-authoring-workflow` and `aaa-asset-collision-pipeline` documents.

The target product is a production-grade game-engine collision workflow:

```txt
render mesh + object transform + collision policy
  -> Collision Manager
  -> live Rapier collider
  -> publish-time baked collision artifact
```

The scene document must no longer treat independent collider geometry as source
truth. Collision is generated from meshes and transforms. The editor can expose
controls for policy and quality, but not a second manually maintained collision
object that drifts away from the mesh.

## New Contract

Every geometry actor has one collision policy:

- `auto`: generate collision from the actor render source.
- `none`: no collision, explicit visual-only/non-solid object.
- `trigger`: generated trigger volume or generated trigger mesh.

Optional policy fields can tune generation:

- `intent`: `walkable`, `blocker`, `trigger`, `detailMesh`.
- `channel`: `worldStatic`, `worldDynamic`, `trigger`, `detail`.
- `quality`: `primitive`, `convexHull`, `simplifiedMesh`, `trimesh`.
- `lodTier`: source LOD used for generated collision.
- `maxTriangles`: collision simplification budget.
- `generation`: debounce, dirty state, and build diagnostics.

Policy is user-authored. Collider geometry is not.

## Non-Negotiables

- Delete the old collision pipeline instead of adding a compatibility layer.
- No independent collision objects as authoring truth.
- No preserved primitive collider after mesh replacement.
- No fake overlay.
- No Yggdrasil-specific branches in generic systems.
- No stale collider metadata as runtime truth.
- No hidden fallback that makes render meshes solid outside the manager.
- No scene save/publish path that can bypass Collision Manager validation.

Rapier colliders still exist internally. Generated collider assets still exist at
publish time. They are products owned by the Collision Manager, not authored
scene objects.

## Expected Editor Workflow

1. User creates a primitive, imported mesh, generated mesh, prefab, or terrain
   chunk.
2. Collision is on by default through `collision.policy = auto`.
3. Collision Manager generates a live collider from the render source.
4. User moves, rotates, or scales the object; Collision Manager updates the live
   collider immediately.
5. User changes mesh or applies a variant; Collision Manager invalidates the old
   generated collider and generates a new one from the new mesh.
6. User can set collision to `none`, `trigger`, or change quality/budget in the
   inspector.
7. The collision overlay shows Rapier debug geometry only.
8. Playtest uses the same live Collision Manager state as edit mode.
9. Publish bakes manager-generated collision artifacts into the runtime manifest.

## Required Final State

- The level editor has a `Collision Manager` service/store that owns collider
  generation, dirty tracking, live Rapier creation, diagnostics, and publish
  bake requests.
- Runtime and editor playtest build Rapier colliders through the same generated
  collision manifest path.
- Scene documents no longer store `collision.size`, manual primitive collider
  dimensions, `originalCollision`, stale `colliderUrl`, stale
  `sourceAssetFingerprint`, or proxy-collision authoring metadata as source
  truth.
- The overlay is directly based on Rapier `world.debugRender()` or an equivalent
  Rapier world inspection API.
- Publish fails when an enabled mesh has missing, stale, or invalid generated
  collision.
- Existing old components, helpers, validators, tests, and docs that preserve or
  repair independent collision geometry are deleted or rewritten.

## Agent Documents

- `AGENT_00_COORDINATION.md`: communication, ownership, and merge protocol.
- `AGENT_01_CONTRACT_AND_TYPES.md`: new source/runtime contracts.
- `AGENT_02_COLLISION_MANAGER_CORE.md`: manager service, invalidation, caching.
- `AGENT_03_RAPIER_RUNTIME_AND_OVERLAY.md`: live Rapier integration and overlay.
- `AGENT_04_EDITOR_UX_AND_CONTROLS.md`: inspector, toolbar, diagnostics UX.
- `AGENT_05_PUBLISH_BAKE_AND_VALIDATION.md`: publish artifacts, audits, gates.
- `AGENT_06_MIGRATION_AND_DELETION.md`: data migration and old-pipeline removal.
- `AGENT_07_INTEGRATION_CERTIFICATION.md`: final cross-system verification.
- `AGENT_08_LEVEL_CONTENT_MIGRATION.md`: level-by-level content conversion.
- `AGENT_09_LEGACY_SYSTEM_AUDIT_AND_MODERNIZATION.md`: find and modernize
  legacy systems that are not simply deleted.
- `AGENT_10_RUNTIME_PRODUCT_MOUNT.md`: replace runtime legacy collider mounts
  with generated manager products.
- `AGENT_11_EDITOR_OVERLAY_PLAYTEST_PRODUCT_MOUNT.md`: replace editor overlay
  and playtest mounts with generated manager products.
- `AGENT_12_LEGACY_ADAPTER_DELETION_AND_TESTS.md`: delete legacy adapter and
  tests that assert it still works.
- `AGENT_13_GENERATED_PRODUCT_ARTIFACT_SHAPES.md`: verify generated products
  represent real mesh-derived artifacts, not fallback cuboids.

## Integration Sequence

1. Contract and types first.
2. Collision Manager core second.
3. Runtime/editor Rapier integration third.
4. Editor controls fourth.
5. Publish bake and validation fifth.
6. Scene migration, level content conversion, and deletion sixth.
7. Runtime/editor live product mounting seventh.
8. Legacy adapter deletion and generated-product artifact verification eighth.
9. Certification last.

## Current Continuation Blocker

The overlay renderer now uses Rapier debug output, but Rapier is still populated
from legacy scene collision in active mount paths. This is not complete.

Current evidence to eliminate:

- `RuntimeActorNode.svelte` imports `createLegacySceneCollisionRapierProduct`.
- `EditorNodePhysicsBody.svelte` imports `createLegacySceneCollisionRapierProduct`.
- `collisionManagerProduct.ts` still exposes `source: 'legacy-scene-collision'`.
- `test-collision-manager-product.ts` still asserts legacy scene collision works.

The next continuation agents must make generated collision products the only
live collider source. Do not add another bridge around the legacy adapter.

Agents may work in parallel only when their write sets do not overlap. The
coordination document defines the allowed handoff points.
