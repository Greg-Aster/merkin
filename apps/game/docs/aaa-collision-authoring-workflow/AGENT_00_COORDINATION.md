# AAA Collision Authoring Workflow Coordination

## Goal

Make collision authoring a production workflow for the whole game engine, not a
Yggdrasil-only repair. The target workflow is:

1. Build level blockouts with primitives.
2. Primitives get explicit authored collision by default.
3. Replace primitive visuals with complex meshes while preserving the primitive
   collision contract.
4. Bake mesh collision only when a user explicitly chooses that path.
5. Allow explicit collision opt-out for visual-only objects.
6. Playtest against the same collision state shown in edit mode.
7. Save work in progress without publish-only gates blocking iteration.
8. Publish only after strict readiness, collision, spawn, asset, and manifest
   validation passes.

## Current State From Code

- Primitive collision materialization exists in
  `src/threlte/editor/editorCollisionLifecycle.ts`.
- `materializeEditorNodeCollision(...)` only creates default collision for
  primitive nodes. It returns unchanged for asset and prefab nodes.
- Agent 01 replaced the broad default-solid concept with
  `settings.level.collision.defaults.primitiveCollisionByDefault`, which only
  controls primitive authoring defaults.
- Runtime adaptation uses `resolveCollisionPolicy(...)` in
  `src/threlte/engine/collisionPolicy.ts`.
- Runtime policy does not create implicit physics for visible geometry with
  missing authored collision. It returns no collision plus a warning string.
- `convertSelectedNodeToMesh()` in
  `src/threlte/editor/editorAssetController.ts` preserves previous collision
  while replacing primitive or prefab visuals with an asset.
- Inspector collision controls exist in
  `src/threlte/editor/editorInspectorController.ts`: enable/disable, intent,
  shape, channel, fit collider, visual-only, and bake mesh collider.
- Scene-node collision overlay exists through
  `src/threlte/editor/EditorNodePhysicsBody.svelte` and resolves the same
  `resolveNodeCollision(...)` data used by editor scene nodes.
- `src/threlte/editor/EditorCollisionOverlay.svelte` is terrain-heightmap
  overlay only. It is not the complete scene collision overlay.
- Yggdrasil currently uses explicit `scene-authored` collision and
  `primitiveCollisionByDefault: true`.

## Non-Negotiables

- Do not add compatibility layers for legacy collision fields.
- Do not reintroduce implicit render-mesh physics.
- Do not patch around stale local editor data.
- Do not special-case Yggdrasil in generic engine code.
- Do not make runtime silently infer collision from complex visual meshes.
- Do not leave duplicate collision concepts with different meanings.
- Delete or migrate obsolete code paths when replacing them.

## Workstreams

1. Agent 01 owns the blockout collision contract.
2. Agent 02 owns visual replacement and collision preservation.
3. Agent 03 owns collision overlay and collision-state UI.
4. Agent 04 owns validation, audits, and publish/save gate separation.
5. Agent 05 owns Yggdrasil content review using the new contract.

Agents must coordinate through this file by updating status notes in their own
documents and avoiding overlapping writes unless a change is explicitly handed
off.

## Shared Acceptance Criteria

- A newly created primitive has explicit collision data in the scene document.
- Replacing a primitive visual with an asset preserves collision data.
- Disabling collision writes an explicit disabled or visual-only state.
- Baking mesh collision is opt-in and records collider asset provenance.
- Edit-mode overlay shows the same resolved collision that playtest uses.
- Visible no-collision geometry is either explicitly visual-only or reported by
  diagnostics.
- Save supports valid work in progress; publish enforces production readiness.
- `pnpm --dir apps/game type-check` passes.
- `pnpm --dir apps/game test:publish-pipeline` passes.
- `pnpm --dir apps/game audit:collision` passes.
- Runtime asset drift is clean after generated output changes:
  `pnpm --dir apps/game check:generated-drift`.

## Coordination Notes

- Keep `packages/blog-core` untouched.
- Generated runtime scene files may change only when a source scene or runtime
  manifest contract changes.
- If a task changes `apps/megameal/public/generated/runtime-game-assets`, run
  `pnpm --dir apps/game cook:runtime-assets` and drift checks.
- If `tsx` fails in sandbox with `/tmp/tsx-1000/*.pipe` `EPERM`, rerun the same
  command with approved escalation and report that.
