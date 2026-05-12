# AAA Web Engine Agent 02 - Editor Production UX

## Goal

Make the level editor feel like a production tool for the runtime pipeline:
less overlap, clearer save/cook/publish state, safer feedback, and fewer
confusing control surfaces.

## Current Concern

The editor is functional, but it still has:

- overlapping panels/controllers
- unclear publish readiness state
- save/cook actions that need stronger feedback and failure handling
- dense controls that can compete with each other
- some UX flows that do not make the source-to-runtime pipeline obvious

## Primary Files

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorOutliner*.svelte`
- `apps/game/src/threlte/editor/EditorViewportControls.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishReadinessWorkflow.ts`
- `apps/game/src/threlte/editor/editorSceneDocumentValidation.ts`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`

## Read First

- `apps/game/AGENTS.md`
- `apps/game/ENGINE_ARCHITECTURE.md`
- `apps/game/AAA_TARGET_04_EDITOR_PRODUCTION_UX.md`
- `apps/game/AAA_WEB_ENGINE_AGENT_COORDINATION.md`

## Work Steps

1. Pick one complete editor flow to improve. Recommended flow:
   edit scene -> validate -> save -> cook runtime assets -> publish readiness.
2. Map which panels and controllers currently own each step in that flow.
3. Remove duplicated state or repeated messages by using existing controllers,
   stores, and publish-readiness helpers.
4. Surface canonical validation state. Do not create a second validation system
   inside Svelte components.
5. Make save/cook/publish feedback explicit:
   - pending
   - success
   - warning
   - failure
   - next required action
6. Reduce panel overlap where possible by consolidating repeated controls or
   clarifying tab ownership.
7. Keep the UI utilitarian and dense. This is an editor, not a landing page.
8. Avoid new global CSS. Use existing component patterns and Tailwind utilities
   where appropriate.

## Guardrails

- Do not duplicate audit or build logic in UI components.
- Do not hide validation failures behind success messaging.
- Do not make editor saves bypass generated drift checks.
- Do not change runtime scene contracts unless coordinated with the runtime
  architecture agent.
- Do not add large decorative panels or instructional page copy.

## Acceptance Criteria

- The selected editor flow has a clearer sequence and failure path.
- Save/cook/publish state is visible and actionable.
- One or more duplicated controls or controller responsibilities are removed or
  clearly reassigned.
- Editor changes do not break runtime cooking or drift checks.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4345 pnpm --dir apps/game smoke:boot
```

If CSS or Megameal frontend styles change:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- editor flow improved
- duplicated controls or ownership removed
- validation source used
- CSS surface area
- commands run
- remaining UX overlap

