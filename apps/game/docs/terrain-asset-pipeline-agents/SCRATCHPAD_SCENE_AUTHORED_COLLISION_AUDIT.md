# Scene-Authored Collision Audit

Date: 2026-05-13

Scope: Yggdrasil scene-authored terrain and per-object collision. This audit is focused on the current failure mode where visible objects can have incorrect, stale, missing, or confusing collision in the editor/playtest loop.

## Current Yggdrasil Collision Contract

Yggdrasil is not using chunked GLB terrain or a baked heightfield as its authoritative ground.

Current source scene settings:

- `settings.level.collision.workflow.actorCollision`: `authored-only`
- `settings.level.collision.defaults.solidObjectsByDefault`: `false`
- `settings.level.collision.terrain.source`: `scene-authored`
- `settings.level.ground.terrainRuntimeMode`: `scene-authored`
- `settings.level.ground.terrainVisualSource`: `scene-actors`
- `settings.level.ground.collisionSource`: `scene-colliders`
- `settings.level.ground.fallbackSurfacePolicy`: `disabled`

This means the level depends on individual scene nodes for collision. If a visible node lacks explicit collision, runtime physics will usually ignore it.

## Audit Snapshot

Manual audit of `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`:

- Total nodes: 173
- Geometry nodes: 115
- Nodes with effective collision: 102
- Geometry nodes without effective collision: 13
- Asset nodes: 17
- Missing render asset files: 0
- Trimesh colliders: 16
- Missing collider files: 0
- Missing collider metadata files: 0
- Stale trimesh `assetLocalTransform.sourceAssetUrl` vs `asset.url`: 0
- Editor proxy or stale colliders in checked-in source: 0
- Duplicate node ids: 0
- Missing parents: 0
- Empty groups: 46

Root Mound specifically has a checked-in baked trimesh collider:

- node id: `yggdrasil-mound`
- render asset: `/generated/style-lab/sources/root-mound-2026-04-26T01-47-59-418Z/root-mound.glb`
- collider: `/generated/runtime-game-assets/collision/yggdrasil/yggdrasil-mound.collider.glb`
- collider metadata: `/generated/runtime-game-assets/collision/yggdrasil/yggdrasil-mound.collider.meta.json`
- world visual bounds: approximately `59.17 x 4.37 x 59.17`
- world collider bounds: approximately `59.17 x 4.37 x 59.17`

So the checked-in Root Mound data is not missing a collider. If the editor/playtest session allows walking through it after mesh replacement, the likely failure is in live editor state, stale local scene state, or post-replacement collision lifecycle/bake flow.

## Findings

### 1. Source Scene Contains Generated Runtime Payload

`yggdrasil.scene.json` contains a top-level `engine.levelDefinition` payload in addition to the authoring `nodes`.

Measured size:

- full file: ~533 KB
- `nodes`: ~142 KB
- `settings`: ~6.5 KB
- `engine`: ~162 KB

This is generated runtime cache data inside the authoring scene source. It duplicates actor/settings data, can go stale, makes diffs noisy, and creates confusion about which copy is authoritative.

Engine data should be generated in memory or written to runtime manifests, not persisted in source scene documents.

### 2. Existing Collision Audit Is Too Weak

`pnpm --dir apps/game audit:collision` currently reports:

- `yggdrasil.scene.json errors=0 warnings=0 info=0`

But a stricter scene-authored audit finds:

- 13 geometry nodes without effective collision
- 46 empty groups
- persisted generated engine data
- `solidObjectsByDefault=false` combined with `actorCollision=authored-only`

Some no-collision nodes may be intentionally visual-only or gameplay/lore triggers, but the audit should require that intent to be explicit and visible. Silent no-collision geometry is the exact class of bug we are trying to eliminate.

### 3. Scene-Authored Collision Is Brittle By Design Unless Fully Explicit

Yggdrasil’s current model is per-object scene collision. That can work, but only if every geometry node has one of these explicit states:

- `blocker`
- `walkable`
- `trigger`
- `detailMesh`
- `none` / `visualOnly`, with an explicit reason

Right now the source scene still allows implicit gaps:

- gameplay nodes often have no collision
- visual-only role overrides can suppress collision
- source file settings say solid objects are not automatic by default
- editor lifecycle now materializes some collisions in live state, but the checked-in scene source still has gaps until saved/migrated

### 4. Empty Groups Are High

There are 46 empty groups. Some may be harmless organizational nodes, but at this count they are likely editor cruft. They increase outliner noise and make parent/transform auditing harder.

The cleanup path should distinguish:

- intentional organizational groups
- empty groups with no children and no gameplay purpose
- generated import leftovers

### 5. Root Mound Checked-In Bounds Look Consistent

The checked-in Root Mound collider bounds match visual bounds. That means the current “walk through Root Mound after replacement” problem is probably not the source file’s baked collider. It is more likely:

- editor local state still has a replaced mesh without a baked collider
- the replacement path created proxy collision but did not save/publish it
- the runtime/playtest path is reading stale localStorage or stale runtime scene output
- collision overlay is showing source/editor collision but playable runtime is using a different cooked scene

## Required Fix Plan

### Stage 1: Strip Generated Engine Data From Source Scenes

Add a migration/audit that removes top-level `engine` from `*.scene.json` source files before save/commit.

Rules:

- source scene documents contain authoring data only
- runtime `levelDefinition` is generated by `withEditorSceneEngineData`
- published runtime data lives in `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`
- audit fails if a source scene contains top-level `engine`

### Stage 2: Add Strict Scene-Authored Collision Audit

Create or extend an audit that checks every scene-authored level:

- no missing render asset files
- no missing collider files
- no stale `asset.url` vs `collision.assetLocalTransform.sourceAssetUrl`
- no editor `proxy`, `needsBake`, or `stale` collision in publishable source
- every geometry node has explicit collision or explicit visual-only/no-collision role
- every ground actor has active `walkable` or valid blocker/walkable collision
- every required runtime actor exists
- empty group count is reported and optionally failed above threshold
- top-level generated `engine` is forbidden

This audit should fail Yggdrasil until the missing-collision nodes are either given collision or explicitly marked visual-only/no-collision with a reason.

### Stage 3: Migrate Yggdrasil Collision Intent

For all 115 geometry nodes, explicitly author one of:

- walkable ground/platform
- blocker
- trigger
- detail mesh
- visual only

Do not rely on `solidObjectsByDefault=false` plus missing collision. The level should become readable from data alone.

### Stage 4: Make Editor Replacement State Unambiguous

After a mesh replacement or variant conversion:

- preserve collision intent/channel
- invalidate stale baked collider URLs
- create an editor proxy collider immediately for playtest
- show `needsBake` in the inspector
- prevent publish until baked collider is generated or the object is explicitly visual-only

This is partly implemented by `editorCollisionLifecycle.ts`, but the Yggdrasil source scene still needs migration and the strict audit needs to enforce it.

### Stage 5: Separate Editor Preview From Runtime Truth

The editor collision overlay must clearly label:

- authored baked collider
- editor proxy collider
- visual-only/no collision
- missing collider asset
- stale collider after mesh replacement

If the overlay and actual playtest physics differ, that is an engine bug. The overlay should represent the same collision data used by playtest.

## Current Commands Run

```bash
pnpm --dir apps/game audit:collision
```

Result: passes, but too weak for this issue.

Manual Node audits were run to inspect:

- scene contract
- node counts
- missing render assets
- missing collider assets
- stale source/collider links
- proxy/stale collision flags
- embedded generated engine payload
- Root Mound visual/collider bounds

## Bottom Line

Yggdrasil’s checked-in assets and baked colliders are mostly present, but the scene-authored collision system is still too implicit and too easy to desynchronize. The biggest technical debt is not one missing collider file. It is that source scene documents can contain generated runtime payloads, implicit no-collision nodes, and editor/runtime state that is not being audited strictly enough.

The next pass should not add another collision fallback. It should strip generated scene cruft, make every geometry node’s collision intent explicit, and make the audit fail before runtime whenever scene-authored collision is missing or stale.
