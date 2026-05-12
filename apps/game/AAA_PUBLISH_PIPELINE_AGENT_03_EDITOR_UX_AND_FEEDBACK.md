# AAA Publish Pipeline Agent 03 - Editor UX And Feedback

## Goal

Upgrade the editor Publish experience so the user can see what will be baked,
what is running, what passed, and what failed. The UX should make Publish feel
like a production build pipeline, not an opaque button.

## Current Concern

Publish currently shows short save messages while it saves and cooks runtime
manifests. It does not preview the full bake plan, show per-step progress, or
distinguish scene save, terrain bake, world partition, runtime cook, audit, and
registry deployment.

## Primary Files

- `apps/game/src/threlte/editor/editorLevelController.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/src/threlte/editor/EditorPanelHeader.svelte`
- `apps/game/src/threlte/editor/EditorPublishReadinessPanel.svelte`
- `apps/game/src/threlte/editor/editorPublishReadinessPresentation.ts`
- New small presentational component if needed.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_COORDINATION.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_01_BAKE_PLAN_CONTRACT.md`
- `apps/game/AAA_PUBLISH_PIPELINE_AGENT_02_BACKEND_ORCHESTRATION.md`

## Work Steps

1. Display the computed bake plan before Publish runs.
2. Show the reason each step is included.
3. Add clear per-step states:
   - pending
   - running
   - passed
   - failed
   - skipped
4. Disable duplicate Publish clicks while a publish build is running.
5. Keep existing Save, Overwrite, Save As, and Draft behavior intact.
6. Show a summary after success:
   - level id/title
   - steps run
   - generated artifacts touched if backend returns them
   - registry deployed state
7. On failure, show:
   - failed step
   - concise error message
   - stdout/stderr details if available behind an expandable area or existing
     diagnostics surface
8. Make sure the text differentiates "scene saved" from "runtime published."

## Guardrails

- Do not add large page-level style blocks.
- Prefer existing editor panel classes and patterns.
- Do not create overlapping panels/controllers.
- Do not hide failures behind generic "Publish failed" only.
- Do not mark UI deployed until backend build and registry update pass.
- Do not couple UI to level ids.

## Acceptance Criteria

- User can tell before publishing whether terrain/world partition/runtime/audit
  steps will run.
- User can tell during publishing which step is active.
- User gets actionable failure feedback.
- Successful publish clearly says the level is deployed.
- Editor remains usable after success or failure.

## Validation

```bash
pnpm --dir apps/game lint
pnpm --dir apps/game type-check
pnpm --dir apps/game check:generated-drift
```

If CSS or Megameal frontend style files are touched, also run:

```bash
pnpm --dir apps/megameal audit:css
```

Use the local editor manually:

```txt
http://127.0.0.1:4322/?editor=1&level=yggdrasil
```

Verify Publish progress and failure states.

## Handoff

Report:

- UI surfaces changed
- publish states added
- screenshots or manual verification notes
- CSS surface area
- commands run
- remaining UX risks
