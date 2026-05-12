# AAA Web Engine 02 - Editor Modularity Cleanup

## Goal

Make the level editor maintainable without breaking level editability. The editor should be a set of focused tools and controllers, not one giant ownership surface.

This work should reduce complexity in the largest editor files and establish a repeatable extraction pattern for future cleanup.

## Current Concern

The previous cleanup extracted a real publish-readiness slice, but the editor remains large:

```txt
EditorPanel.svelte: 3216 lines
editorPublishReadiness.ts: 980 lines
```

That is still too large for a maintainable production editor.

## Primary Files To Inspect

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/editorInspectorController.ts`
- `apps/game/src/threlte/editor/editorAssetController.ts`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/editorPublishReadiness*.ts`
- `apps/game/CRUFT_TODO.md`

## Work Steps

1. Read `apps/game/AGENTS.md`.
2. Measure current line counts:

```bash
wc -l apps/game/src/threlte/editor/EditorPanel.svelte apps/game/src/threlte/editor/editorPublishReadiness.ts
```

3. Pick one meaningful editor workflow slice. Good candidates:

- inspector/properties overlap
- environment hard-coded level branches
- style/profile controls
- asset import/create catalog UI
- publish-readiness rule groups inside `editorPublishReadiness.ts`

4. Define the new ownership boundary before editing.
5. Extract logic into focused controller, model, or component files.
6. Keep UI components thin: render state, emit actions, avoid baking audit logic in Svelte.
7. Do not create a new catch-all file.
8. Preserve existing editor workflows for level switching, object selection, scene editing, and publish readiness.

## Rules

- Prefer shared editor CSS/classes already present over new large style blocks.
- Do not couple gameplay runtime to editor-only modules.
- Do not duplicate validation logic that already lives in engine/audit helpers.
- Update `CRUFT_TODO.md` only if the file disposition actually changes; otherwise provide proposed tracker text in the handoff.

## Acceptance Criteria

- At least one large editor workflow loses meaningful ownership from `EditorPanel.svelte` or `editorPublishReadiness.ts`.
- New modules have clear names and narrow responsibilities.
- Editor still boots at both `/?editor=1` and `/?editor=1/`.
- Type-check and lint pass.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
GAME_DEV_PORT=4337 pnpm --dir apps/game smoke:boot
```

If CSS is changed:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- Workflow slice extracted.
- Before/after line counts.
- Files changed.
- New CSS surface area, if any.
- Commands run.
- Any editor workflows not manually verified.
- Remaining editor cleanup candidates.
