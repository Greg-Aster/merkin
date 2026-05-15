# Agent 05: Batch, Cache, And Level-Wide Bake

## Mission

Extend style baking from a selected-object action to a production workflow that
can operate on selected batches, visible objects, or a whole level without
duplicating work or producing stale generated assets.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/editorStyleBatchSession.ts`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/EditorStyleStudio.svelte`
- `apps/game/src/threlte/editor/editorPersistence.ts`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`

Create new files if appropriate:

- `apps/game/src/threlte/editor/editorStyleBakeQueue.ts`
- `apps/game/src/threlte/editor/editorStyleBakeCache.ts`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/scripts/lib/styleBakeProducts.mjs`

## Requirements

Batch bake must:

- use the same manager path as single-object bake
- support selected objects
- support all visible bakeable objects
- support whole-level bakeable object pass
- skip clean cached products unless forced
- show per-object queued/running/succeeded/failed status
- support pause/cancel/resume where practical
- keep local scene checkpointing safe
- avoid duplicate generated assets for identical source/settings fingerprints

Cache keys must include:

- source asset fingerprint
- style settings fingerprint
- backend identity and version
- texture size/output tier
- source transform only if the baked output depends on transform

## Generated Product Rules

- Do not overwrite a generated product that is still referenced by another
  object unless the cache contract proves it is equivalent.
- Do not create timestamp-only duplicates when source/settings are identical.
- Do not delete old generated products in this agent unless the coordination
  file is updated with a cleanup rule.
- Do not make batch jobs bypass publish validation.

## Non-Goals

- Do not implement Blender internals.
- Do not change runtime asset cook rules.
- Do not rewrite Hunyuan job queues unless needed to share resume patterns.

## Acceptance Criteria

- Batch style bake runs through the same manager as selected-object bake.
- Clean products are reused.
- Dirty products are regenerated.
- Per-object status is visible in Style Studio.
- Failed objects do not corrupt successful baked products.
- The scene can be saved after partial batch completion.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
```

If browser interaction is changed, run:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```
