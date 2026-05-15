# Agent 04: Runtime Asset Cook And Publish Validation

## Mission

Make style-baked assets first-class publish/runtime products. Publish must fail
or warn clearly when a style-baked product is missing, stale, oversized, or not
cooked for runtime.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishBakePlan.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessContracts.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessWorkflow.ts`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`

Secondary files if needed:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/editor/editorSceneDocumentValidation.ts`
- `apps/game/scripts/editor-tools/sceneRoutes.cjs`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`

## Requirements

Publish validation must understand style bake products.

Add checks for:

- generated style asset exists
- generated style metadata exists
- source asset fingerprint matches metadata
- style settings fingerprint matches metadata
- generated GLB has no unused texture payload after prune/optimize
- texture count and texture dimensions fit the selected output tier
- runtime asset cook has processed the style-baked GLB
- required render asset lists reference the cooked product

Add readiness output that tells the user:

- which objects have clean style-baked products
- which objects need style bake
- which products are stale because source mesh changed
- which products are stale because bake settings changed
- which products exceed budget

## Runtime Cook Requirements

The runtime cook pipeline should process style-baked GLBs like other generated
runtime assets:

- optimize
- prune
- dedupe
- texture resize/compression where supported
- tiered output selection if appropriate
- runtime manifest metadata

Do not make runtime load raw authoring outputs when a cooked runtime product is
required.

## Non-Goals

- Do not build editor controls.
- Do not implement Blender baking.
- Do not migrate every existing level.
- Do not relax existing collision, terrain, or spawn validation.

## Acceptance Criteria

- Publish readiness includes style bake state.
- Publish blocks stale required style-baked assets.
- Runtime asset audit can inspect style-baked products.
- Cooked runtime manifest records style-baked asset provenance.
- Tests cover clean, stale source, stale settings, missing generated GLB, and
  oversized texture cases.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:runtime-assets
```

If generated runtime products are changed, report the command used and the
runtime payload impact.
