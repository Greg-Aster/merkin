# Agent 03: Asset Browser And Create Flow

## Mission

Make assets and object creation first-class editor regions. The current create
flow is overloaded and hides project/library browsing inside task panels.

## Problem To Solve

`Create` currently exposes quick primitives, gameplay helpers, prefab groups, AI
generation, imported models, generated assets, and browser navigation in one
scrolling panel. The audit measured 40 buttons and 1520px scroll height inside a
598px panel.

AAA editors keep a clear difference between:

- scene hierarchy: what exists in the current level
- project/content browser: what assets are available
- creation tools: add a new scene object

## Primary Files

Own these files:

- `src/threlte/editor/EditorCreateTabHost.svelte`
- `src/threlte/editor/EditorCreatePanel.svelte`
- `src/threlte/editor/editorCreateCatalog.ts`
- `src/threlte/editor/editorCreateController.ts`
- `src/threlte/editor/editorAssetController.ts`
- `src/threlte/editor/EditorAssetPreview.svelte`
- relevant asset browser props in `editorPanelPropBuilders.ts`

Coordinate with Agent 01 for dock placement and Agent 05 for AI/job actions.

## Desired UX

Split the current create flow into:

- Quick Add: primitives, lights, markers, gameplay helpers.
- Prefab Library: curated scene/game prefabs grouped by category.
- Content Browser: imported models and generated assets, with search/filter.
- Asset Preview: focused selected asset preview and add/apply actions.
- AI Generate: link to the AI workflow surface, not inline default controls.

The Content Browser should be a durable region or dock, not only a panel section.

## Implementation Guidance

1. Preserve existing asset loading and controller behavior.
2. Extract a reusable browser component if the same directory browsing is used
   for models, generated assets, textures, and workflows.
3. Do not change asset paths or generated output conventions.
4. Avoid putting long AI prompt forms in the normal create surface.
5. Keep quick create compact and predictable.
6. Make search/filter always visible for browser regions.
7. Use selected asset preview to reduce blind add/apply actions.

## Acceptance Criteria

- A user can clearly find existing assets without opening AI or save workflows.
- Quick creation does not require scrolling through generated asset controls.
- Imported assets and generated assets have obvious filters and selected-state
  preview.
- AI generation remains accessible but no longer dominates basic object creation.
- Asset URLs and scene node creation behavior are unchanged.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
```

Manual/Playwright checks:

- open editor
- open content/create surface
- filter asset names
- select an imported or generated asset
- verify add/apply controls remain reachable at `1280x800`
