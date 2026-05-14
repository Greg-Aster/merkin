# AAA Target 04 - Editor Production UX

## Goal

Make the level editor feel like a production tool for the new runtime pipeline: fewer overlapping panels/controllers, clearer publish readiness, visible validation failures, and editing flows that naturally produce cooked runtime-ready levels.

## Current Evidence

- The editor now participates in the cooked runtime pipeline.
- `EditorPanel.svelte`, inspector/property panels, scene tools, style tools, and controllers still have overlapping responsibilities.
- Publish readiness exists, but the normal UX should make errors and required actions more obvious before cooking or publishing.

## Primary Files

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorOutliner*.svelte`
- `apps/game/src/threlte/editor/EditorViewportControls.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessWorkflow.ts`
- `apps/game/src/threlte/editor/editorSceneDocumentValidation.ts`
- `apps/game/src/threlte/editor/editorPanelTabs.ts`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`

## Work Steps

1. Read `apps/game/AGENTS.md`, `ENGINE_ARCHITECTURE.md`, and, only for historical context, `docs/archive/aaa/AAA_GAP_06_EDITOR_PIPELINE_UX.md`.
2. Map current editor panels/controllers that duplicate publish, validation, inspector, or scene-tool ownership.
3. Pick one UX flow and make it production-grade. Recommended first flow: edit scene -> validate -> cook -> publish readiness -> runtime smoke.
4. Surface validation state from existing audit/build data. Do not create a parallel validation system in Svelte components.
5. Reduce overlapping controls by moving repeated logic to existing controller/helper modules.
6. Keep UI dense, utilitarian, and editor-like. Avoid marketing panels, large explanatory copy, or decorative layout.
7. Add accessible controls and avoid non-interactive elements with click handlers.

## Guardrails

- Do not duplicate audit logic in editor components.
- Do not hide validation failures behind success messaging.
- Do not add large page-level style blocks.
- Do not make the editor depend on runtime-only globals when the same data exists in editor stores.
- Do not change runtime scene contracts unless coordinated with a runtime/manifest owner.

## Acceptance Criteria

- One editor production flow is clearer and less duplicated.
- Publish readiness shows actionable failures from canonical validation.
- Panel/controller ownership is simpler than before.
- Editor changes do not break runtime cooking or generated drift.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4345 pnpm --dir apps/game smoke:boot
```

If styles changed:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- UX flow improved.
- Panels/controllers simplified.
- Validation source used.
- CSS surface area.
- Commands run.
- Remaining editor overlap.
