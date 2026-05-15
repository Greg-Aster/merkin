# Agent 01: Style Bake Contract And Manager

## Mission

Create the formal style bake contract and manager surface. This agent owns the
system architecture that other agents will build on.

The current selected-object bake path works, but it is routed directly through
Style Studio, `editorStyleController`, and `/api/style/bake-procedural`. Replace
that loose ownership with a clear editor service/manager contract.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/editorStyleApi.ts`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`
- `apps/game/scripts/editor-tools/styleRuntimeContext.cjs`

Create new files if appropriate:

- `apps/game/src/threlte/editor/editorStyleBakeManager.ts`
- `apps/game/src/threlte/editor/editorStyleBakeTypes.ts`
- `apps/game/scripts/lib/styleBakeProducts.mjs`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

Define a contract for style bake inputs, settings, products, and stale state.
The contract must include:

- source asset URL
- source asset fingerprint
- level ID
- node ID
- source node transform snapshot or local bounds reference
- bake mode
- bake settings
- generated asset URL
- generated metadata URL
- generated timestamp
- generator name and version
- stale/dirty/missing/failed state

Add one manager API that handles:

- resolving the selected node source asset
- computing the source fingerprint
- computing a stable bake cache key
- calling the selected backend
- applying the generated product back to the node
- saving enough metadata for publish validation

The manager must not know about Svelte UI details. It may be called by the
controller, but the logic must not live in the component.

## Current Code To Preserve

The first slice should be absorbed, not thrown away blindly:

- `bakeProceduralStyleAsset` in `editorStyleApi.ts`
- `bakeSelectedAssetProceduralStyle` in `editorStyleController.ts`
- `/api/style/bake-procedural` in `styleRoutes.cjs`
- `bake-style-asset.mjs`

Move or wrap these behind the manager as needed.

## Non-Goals

- Do not implement Blender Python baking.
- Do not add batch processing.
- Do not add publish blockers beyond small helper functions.
- Do not rewrite the AI/Hunyuan workflow.

## Acceptance Criteria

- Editor code calls a manager/service for style bake operations.
- Generated nodes record style bake product metadata in a structured location.
- Source fingerprint and settings fingerprint are available for stale checks.
- Existing selected-object procedural bake still works.
- The API route response and editor state use the same product shape.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game bake:style-asset -- --input <source.glb> --output /tmp/style-bake-contract-test.glb --texture-size 64
```

Report any tests that should exist but do not yet.
