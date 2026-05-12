# AAA Audit Fix 06 - Editor Cruft Reduction Not Complete

## Finding

The editor cruft-reduction work did not materially reduce the largest editor ownership surfaces:

- `apps/game/src/threlte/editor/EditorPanel.svelte` remains about 3313 lines.
- `apps/game/src/threlte/editor/editorPublishReadiness.ts` remains about 1164 lines.

Adding readiness UI without reducing ownership is not enough to close the editor cleanup finding.

## Mission

Extract one meaningful editor workflow slice from the largest files into focused modules/components. The goal is not to finish the entire editor cleanup in one pass; it is to prove the pattern and reduce concrete file size/ownership.

## Primary Files

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadinessController.ts`
- Any nearby editor modules touched by the selected slice.
- `apps/game/CRUFT_TODO.md` for proposed disposition updates only after validation.

## Recommended Slice

Extract publish-readiness orchestration first.

Target shape:

- `editorPublishReadiness.ts`: pure shared rules and data types.
- `editorPublishReadinessController.ts`: orchestration and command/action state.
- `EditorPublishReadinessPanel.svelte`: display and user actions.
- `EditorPanel.svelte`: only wires inputs and receives events.

If that slice is already partially extracted, continue it until measurable ownership leaves `EditorPanel.svelte` and `editorPublishReadiness.ts`.

## Work Steps

1. Measure current file sizes:

```bash
wc -l apps/game/src/threlte/editor/EditorPanel.svelte apps/game/src/threlte/editor/editorPublishReadiness.ts
```

2. Pick one workflow slice and define module boundaries before editing.

3. Move logic with minimal behavior change.

Use `apply_patch` for manual edits. Do not rewrite the entire editor.

4. Keep UI styles local only when already consistent with existing editor CSS.

Do not add large page-level style blocks.

5. Verify the editor still compiles and the selected workflow renders.

6. Propose `CRUFT_TODO.md` updates in handoff unless explicitly asked to edit tracker docs.

## Acceptance Criteria

- `EditorPanel.svelte` loses a meaningful amount of workflow logic.
- `editorPublishReadiness.ts` is split into clearer contracts if it remains large.
- No gameplay runtime depends on editor-only modules.
- Type-check and lint pass.
- New CSS surface is reported.

## Avoid

- Do not move code into a new giant catch-all file.
- Do not duplicate runtime audit logic in Svelte UI.
- Do not couple gameplay boot to editor APIs.
- Do not make unrelated editor style refactors in the same patch.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If CSS or Megameal frontend surface is touched:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- Workflow slice extracted.
- Before/after line counts.
- Files changed.
- CSS surface area.
- Commands run.
- Remaining editor cruft.
