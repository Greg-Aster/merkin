# Coordination Log: Mesh-Derived Collision Manager

Use this file as the shared communication surface while agents work. Do not use
it for long design essays; link to agent docs or final handoffs when needed.

## Current Project State

Status: planning

Authoritative plan:

- `README.md`
- `IMPLEMENTATION_PLAN.md`
- `AGENT_00_COORDINATION.md`

Superseded docs:

- `../aaa-collision-authoring-workflow/*`
- `../aaa-asset-collision-pipeline/*`
- older collision system agent docs that preserve independent collider geometry

## Global Decisions

```txt
Decision:
Date:
Owner:
Reason:
Impacted agents:
```

## Agent Status Board

### Agent 01: Contract And Types

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 02: Collision Manager Core

```txt
Status: implemented
Owner: Codex
Branch/worktree: /home/greggles/Merkin
Owned files: src/threlte/collision/CollisionManager.ts, scripts/test-collision-manager.ts, package.json script
Current blocker: None for the core manager boundary. Runtime Rapier integration still needs to consume live manager products instead of legacy adapters.
Last update: 2026-05-14
```

### Agent 03: Rapier Runtime And Overlay

```txt
Status: implemented legacy bridge; awaiting live manager product source
Owner: Codex
Branch/worktree: /home/greggles/Merkin
Owned files: src/threlte/collision/collisionManagerProduct.ts, src/threlte/collision/CollisionBody.svelte, src/threlte/collision/RuntimeCollisionBody.svelte, src/threlte/collision/RuntimeCollisionCollider.svelte, src/threlte/levels/RuntimeActorNode.svelte, src/threlte/editor/EditorNodePhysicsBody.svelte, scripts/test-collision-manager-product.ts
Current blocker: Runtime/editor callers still build legacy-scene products until Agent 02 live manager products are wired into these boundaries.
Last update: 2026-05-14
```

### Agent 04: Editor UX And Controls

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 05: Publish Bake And Validation

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 06: Migration And Deletion

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 07: Integration Certification

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 08: Level Content Migration

```txt
Status: migrated; needs generated-product recook/manual playtest
Owner: Codex
Branch/worktree: /home/greggles/Merkin
Owned files: apps/game/src/threlte/editor/scenes/*.scene.json
Current blocker: Manual playtest and generated runtime recook were not run in this pass.
Last update: 2026-05-14
```

### Agent 09: Legacy System Audit And Modernization

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 10: Runtime Product Mount Replacement

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 11: Editor Overlay And Playtest Product Mount Replacement

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

### Agent 12: Legacy Adapter Deletion And Test Rewrite

```txt
Status: implemented
Owner: Codex
Branch/worktree: /home/greggles/Merkin
Owned files: src/threlte/collision/collisionManagerProduct.ts; src/threlte/engine/generatedCollisionProductRuntime.ts; scripts/test-collision-manager-product.ts; src/threlte/levels/RuntimeActorNode.svelte; src/threlte/editor/EditorNodePhysicsBody.svelte; src/threlte/levels/runtimeActorCollision.ts; package.json
Current blocker: Remaining colliderUrl/assetLocalTransform hits are generated artifact metadata, validation/rejection paths, terrain pipeline metadata, or source scene data awaiting Agent 05/13 recook; no legacy Rapier adapter symbols remain.
Last update: 2026-05-14
```

### Agent 13: Generated Product Artifact And Shape Verification

```txt
Status: not-started
Owner:
Branch/worktree:
Owned files:
Current blocker:
Last update:
```

## Handoff Notes

Append dated notes here.

```txt
Date:
Agent:
Summary:
Files changed:
Commands run:
Blockers:
Next owner:
```

```txt
Date: 2026-05-14
Agent: Agent 02 Collision Manager Core
Summary: Added a standalone Collision Manager boundary with actor registration, policy normalization, generation keys, cache, dirty regeneration, live product state, diagnostics, and publish product access. Added focused manager tests for mesh URL changes, scale changes, mode none, primitive args changes, unchanged actor caching, and source fingerprint invalidation.
Files changed: src/threlte/collision/CollisionManager.ts; scripts/test-collision-manager.ts; package.json
Commands run: pnpm --dir apps/game test:collision-manager; pnpm --dir apps/game exec biome check src/threlte/collision/CollisionManager.ts scripts/test-collision-manager.ts; pnpm --dir apps/game exec tsc --noEmit --strict --moduleResolution bundler --module ESNext --target ES2022 --lib ES2022,DOM --allowImportingTsExtensions src/threlte/collision/CollisionManager.ts; pnpm --dir apps/game type-check
Blockers: None for the core manager boundary. Runtime Rapier integration still needs to consume live manager products instead of legacy adapters.
Next owner: Agent 01 for contract cleanup, Agent 03 for Rapier runtime adapter integration.
```

```txt
Date: 2026-05-14
Agent: Agent 02 Collision Manager Core
Summary: Fixed review findings. The default generator now fails closed for mesh-derived qualities unless a real generator is injected, and disabling or invalidating an actor cancels stale in-flight generation commits. Added regression coverage for both paths.
Files changed: src/threlte/collision/CollisionManager.ts; scripts/test-collision-manager.ts
Commands run: pnpm --dir apps/game test:collision-manager; pnpm --dir apps/game exec biome check src/threlte/collision/CollisionManager.ts scripts/test-collision-manager.ts; pnpm --dir apps/game exec tsc --noEmit --strict --moduleResolution bundler --module ESNext --target ES2022 --lib ES2022,DOM --allowImportingTsExtensions src/threlte/collision/CollisionManager.ts; pnpm --dir apps/game type-check
Blockers: None for the core manager boundary.
Next owner: Agent 03 for live Rapier adapter integration.
```

```txt
Date: 2026-05-14
Agent: Agent 03 Rapier Runtime And Overlay
Summary: Added an explicit collision product -> Rapier descriptor adapter and refactored CollisionBody/RuntimeCollisionBody/RuntimeCollisionCollider to consume CollisionManagerRapierProduct objects instead of independent collider source props. RuntimeActorNode and EditorNodePhysicsBody now build an explicitly named legacy-scene product at their boundary until Agent 02 live manager products are wired in. Runtime actor transform now lives in the product and RuntimeActorNode mounts collision as a sibling to the render group to avoid double-applying transforms. Rapier overlay remains world.debugRender()-based.
Files changed: src/threlte/collision/collisionManagerProduct.ts, src/threlte/collision/CollisionBody.svelte, src/threlte/collision/RuntimeCollisionBody.svelte, src/threlte/collision/RuntimeCollisionCollider.svelte, src/threlte/levels/RuntimeActorNode.svelte, src/threlte/editor/EditorNodePhysicsBody.svelte, scripts/test-collision-manager-product.ts
Commands run: pnpm --dir apps/game exec tsx ./scripts/test-collision-manager-product.ts; pnpm --dir apps/game exec biome check src/threlte/collision/collisionManagerProduct.ts scripts/test-collision-manager-product.ts; pnpm --dir apps/game type-check; pnpm --dir apps/game audit:collision
Blockers: None for the legacy bridge. Runtime/editor callers still need Agent 02 live manager product wiring to remove the legacy-scene builder.
Next owner: Agent 02/03 integration should replace the legacy product builder input with live manager products.
```

```txt
Date: 2026-05-14
Agent: Agent 08 Level Content Migration
Summary: Migrated active source scene collision authoring to policy-only collision. Removed collision shape/size/enabled/colliderUrl/colliderMetadataUrl/assetLocalTransform/sourceAssetUrl/triangleBudget/triangleCount and generation.originalCollision source-truth fields from scene nodes. Classified visible gameplay marker/portal prefabs as trigger policy. Classified Yggdrasil visual-only/detail meshes as mode none. Added Solitude walkability supportMaxDrop 3 so spawn validation tracks the generated plateau mesh support without reintroducing collider geometry. Observatory is settings/runtime-data only in the scene pipeline and has no geometry actors to migrate.
Files changed: apps/game/src/threlte/editor/scenes/yggdrasil.scene.json; apps/game/src/threlte/editor/scenes/miranda.scene.json; apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json; apps/game/src/threlte/editor/scenes/solitude.scene.json; apps/game/src/threlte/editor/scenes/observatory.scene.json; apps/game/docs/aaa-mesh-derived-collision-manager/COORDINATION_LOG.md
Level summaries: yggdrasil 115/115 geometry actors classified, auto=86, trigger=14, none=15, walkable=5, spawn support=yggdrasil-spawn-pad; miranda 53/53, auto=43, trigger=10, none=0, walkable=2, spawn support=miranda-floor-main; sci-fi-room 41/41, auto=35, trigger=6, none=0, walkable=3, spawn support=sci-fi-floor-interior-slab; solitude 16/16, auto=15, trigger=0, none=1, walkable=2, spawn support=solitude-ground-plateau; observatory 0/0 scene geometry actors, runtime terrain supports spawn.
Known mesh-generation failures: None found in source scene migration. Generated runtime collision products were not recooked in this pass; existing generated runtime files may still reflect pre-migration artifacts until Agent 05 publish/bake recook runs.
Commands run: JSON-aware legacy-field inventory; pnpm --dir apps/game audit:collision (rerun outside sandbox after tsx IPC EPERM); pnpm --dir apps/game test:publish-pipeline; pnpm --dir apps/game type-check.
Manual checks: Not run. No browser playtest or collision overlay traversal check was performed.
Blockers: Generated runtime collision products were not recooked in this pass; runtime asset audit still fails publish validation until manager artifacts are refreshed. Manual collision overlay/playtest still not run.
Next owner: Agent 05 for generated runtime collision product recook/publish validation; Agent 07 for manual Yggdrasil traversal and overlay certification.
```

```txt
Date: 2026-05-14
Agent: Agent 12 Legacy Adapter Deletion And Test Rewrite
Summary: Deleted the legacy scene-collision Rapier product adapter and rewrote product adapter tests around generated collision products only. RuntimeActorNode and EditorNodePhysicsBody now mount Rapier products only when collision.generatedProduct is present; old authored shape/size/colliderUrl fields cannot produce live colliders through this path. Deleted the unused runtimeActorCollision helper that computed collider args from legacy collision.size/assetLocalTransform. Added generated product runtime shape/artifact guards used by the adapter.
Files changed: src/threlte/collision/collisionManagerProduct.ts; src/threlte/engine/generatedCollisionProductRuntime.ts; scripts/test-collision-manager-product.ts; src/threlte/levels/RuntimeActorNode.svelte; src/threlte/editor/EditorNodePhysicsBody.svelte; src/threlte/levels/runtimeActorCollision.ts; package.json
Commands run: rg "legacy-scene-collision|createLegacySceneCollisionRapierProduct|LegacySceneCollisionProductInput" apps/game/src apps/game/scripts; rg "collision\\.size|colliderUrl|assetLocalTransform" apps/game/src/threlte/levels apps/game/src/threlte/editor apps/game/scripts/test-*.ts apps/game/scripts/test-*.mjs; pnpm --dir apps/game test:collision-manager-product; pnpm --dir apps/game type-check; pnpm --dir apps/game exec biome check src/threlte/collision/collisionManagerProduct.ts scripts/test-collision-manager-product.ts src/threlte/engine/generatedCollisionProductRuntime.ts src/threlte/levels/RuntimeActorNode.svelte src/threlte/editor/EditorNodePhysicsBody.svelte; pnpm --dir apps/game audit:collision; pnpm --dir apps/game test:collision-manager (failed in test-collision-policy-contract on Runtime ground contract is missing)
Blockers: No legacy adapter symbol hits remain. Remaining colliderUrl/assetLocalTransform search hits are generated collision artifact metadata, validation/rejection tests, terrain collision metadata, and source scene generated-product data for Agent 05/13. The aggregate test:collision-manager script currently fails in test-collision-policy-contract on a runtime ground contract assertion outside Agent 12.
Next owner: Agent 13 for generated product artifact/shape verification and Agent 05 for generated runtime recook.
```

```txt
Date: 2026-05-14
Agent: Review Fix
Summary: Fixed review findings in the adapter/runtime manifest/product-generation paths. Policy-only mesh actors now resolve mesh-derived collision from policy instead of inheriting the legacy cuboid fallback, runtime manifests carry generated collision product metadata, and validation recognizes mesh-derived products instead of requiring authored collider URL metadata for policy-owned products. Added regression coverage proving policy-only simplifiedMesh products produce trimesh, not cuboid.
Files changed: apps/game/src/threlte/engine/sceneAdapter.ts; apps/game/src/threlte/engine/collisionPolicy.ts; apps/game/src/threlte/engine/levelValidation.ts; apps/game/scripts/lib/runtimeSceneManifest.mjs; apps/game/scripts/lib/meshCollisionProducts.mjs; apps/game/scripts/test-publish-pipeline.ts
Commands run: pnpm --dir apps/game test:publish-pipeline; pnpm --dir apps/game type-check; pnpm --dir apps/game audit:collision (sandbox failed on tsx IPC EPERM, rerun outside sandbox); pnpm --dir apps/game audit:runtime-assets.
Blockers: pnpm --dir apps/game audit:runtime-assets still fails because migrated policy-only actors have stale generated collision product fingerprints and Yggdrasil remains over graphics budget; this is Agent 05 recook/budget work, not a cuboid fallback regression.
Next owner: Agent 05 for generated product recook and runtime asset audit cleanup; Agent 07 for manual collision overlay/traversal certification.
```

## Integration Blockers

```txt
Blocker:
Owner:
Blocking agents:
Required decision:
Status:
```

## Final Certification Checklist

- [ ] Source contract replaced.
- [ ] Collision Manager core integrated.
- [ ] Rapier overlay is actual Rapier state only.
- [ ] Editor controls expose policy, not independent geometry.
- [ ] Publish bake writes manager-generated products.
- [ ] Active scenes migrated.
- [ ] Each active level classified and validated under mesh-derived collision.
- [ ] Old collision pipeline deleted.
- [ ] Still-needed legacy systems modernized to the new manager contract.
- [ ] Runtime actors mount generated products, not legacy scene collision.
- [ ] Editor overlay/playtest mount generated products, not legacy scene collision.
- [ ] `legacy-scene-collision` adapter deleted.
- [ ] Complex mesh generated products are real artifacts, not placeholder cuboids.
- [ ] Yggdrasil manually certified.
- [ ] Type-check passes.
- [ ] Publish pipeline tests pass.
- [ ] Collision audit passes.
- [ ] Engine audit collision-related failures are clean.
- [ ] Known non-collision budget failures are documented.
