# AAA Remaining 06 - Editor Cruft Reduction

## Mission

Make the level editor reflect the real runtime pipeline and reduce oversized editor ownership. The editor should guide authors through source assets, bake, validate, publish, and runtime readiness instead of duplicating audit logic in UI state.

## Baseline Evidence

`EditorPanel.svelte` and `editorPublishReadiness.ts` remain large refactor surfaces. The editor has many files in `CRUFT_TODO.md` marked as refactor. Existing editor controls should use shared runtime/audit contracts rather than parallel local interpretations.

## Ownership

Primary ownership:

- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- Editor readiness, inspector, properties, environment, and style studio modules.
- Editor API routes only when needed for UI workflow.

Coordinate with:

- Runtime boundary agent for schema changes.
- Streaming agent for readiness diagnostics.
- Material/import agents for asset bake status.
- CI agent if editor checks become release gate inputs.

## Work Packages

1. Split by workflow ownership.
   - Scene selection and document state.
   - Inspector/properties editing.
   - Runtime publish readiness.
   - Asset/style generation.
   - Bake and validation status.
   - Visual/environment authoring.

2. Use shared contracts.
   - Read cooked manifest status from shared validation output.
   - Read material/LOD/collision/readiness state from audits or typed adapters.
   - Do not duplicate audit calculations in Svelte markup.

3. Make publish readiness actionable.
   - Show blocking failures.
   - Show warnings separately from blockers.
   - Include commands or editor actions that resolve each class of issue.

4. Remove stale UI paths.
   - Delete unused panels, helpers, and duplicate state after extraction.
   - Update `CRUFT_TODO.md` proposed text in handoff if dispositions change.

5. Protect frontend style quality.
   - Use existing styles and components.
   - Avoid new large page-level style blocks.
   - Report new CSS surface area.

## Acceptance Criteria

- `EditorPanel.svelte` loses a meaningful workflow slice.
- Publish readiness uses shared validation contracts.
- No editor-only state is required by gameplay runtime.
- Editor still loads and can publish/bake the selected workflow.
- Relevant cruft dispositions are proposed for update.

## Avoid

- Do not move code into another giant file.
- Do not duplicate runtime audit logic in UI code.
- Do not make editor APIs required for gameplay boot.
- Do not add broad CSS blocks to paper over layout issues.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game audit:engine
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If Megameal frontend CSS is touched:

```bash
pnpm --dir apps/megameal audit:css
```

## Handoff

Report:

- Workflow slice extracted.
- Editor files reduced or deleted.
- Shared readiness source used.
- CSS surface area.
- Commands run.
- Proposed `CRUFT_TODO.md` updates.
