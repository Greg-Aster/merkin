# Agent 03: Editor UX And Controls

## Mission

Make style baking a clear, configurable level editor workflow rather than a
single experimental button.

The user should be able to select an object, choose a style bake profile, tune
the bake controls, run the bake, preview the output, apply or revert, and save
or publish only when the generated product is valid.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorStyleStudio.svelte`
- `apps/game/src/threlte/editor/EditorStyleTabHost.svelte`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`

Secondary files if needed:

- `apps/game/src/threlte/editor/editorStyleBatchSession.ts`
- `apps/game/src/threlte/editor/editorPersistence.ts`
- `apps/game/src/threlte/editor/editorGeneratedAssetApplication.ts`
- `apps/game/src/threlte/editor/editor-ui.css`

## Requirements

Add editor controls for:

- bake backend: procedural preview or Blender geometry bake
- style profile
- texture size
- line strength
- brush/noise strength
- AO strength
- cavity strength
- curvature strength
- geometry simplification
- output tier: preview/runtime/hero

Add workflow state for:

- current source asset
- current generated style product
- stale/dirty state
- last error
- last successful bake
- apply/revert availability

The UI must distinguish:

- deterministic procedural bake
- Blender geometry-aware bake
- AI texture source generation
- full mesh replacement

Do not present these as the same thing. Mesh replacement can change topology and
identity. Procedural/Blender style bake should preserve the selected object
identity.

## UX Rules

- Do not add another generic panel full of unclear buttons.
- Keep the selected-object path obvious.
- Make disabled states explain what is missing.
- Do not hide bake errors in console-only logs.
- Do not require a reference image for deterministic procedural or Blender
  style bake.
- Keep AI texture workflows available but secondary.
- Do not add large page-level CSS blocks. Use existing editor UI styles or
  small scoped additions only when necessary.

## Non-Goals

- Do not implement the Blender backend.
- Do not implement publish validation.
- Do not rewrite the whole AI lab.
- Do not change collision behavior.

## Acceptance Criteria

- Style Studio exposes deterministic style bake settings.
- The selected object can be baked through the manager.
- The generated product URL and metadata are visible.
- Users can revert to the previous asset after a bake.
- Users can tell whether the result is clean, dirty, missing, or failed.
- AI texture generation is clearly separated from deterministic bake.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If CSS is changed, report the new CSS surface area and why it was necessary.
