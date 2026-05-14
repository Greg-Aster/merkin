# Agent 05: Pipelines, Status, Jobs, And Output

## Mission

Move bake/publish/AI/job/status information into explicit pipeline and output
surfaces. Long-running or diagnostic workflows should not be mixed into the
default editing surface.

## Problem To Solve

Pipeline concerns are currently spread across:

- `Workflow` tab
- `Save` tab
- `AI Mesh` tab
- `Collision` tab
- `EditorPublishReadinessPanel.svelte`
- runtime diagnostics shown inside AI panel
- `saveMessage` status text

The audit found `AI Mesh` at 2747px scroll height and `Workflow` mixing save,
jobs, AI, asset, and selection commands.

## Primary Files

Own these files:

- `src/threlte/editor/EditorWorkflowTabHost.svelte`
- `src/threlte/editor/EditorWorkflowPanel.svelte`
- `src/threlte/editor/EditorAiTabHost.svelte`
- `src/threlte/editor/EditorAIMeshStudio.svelte`
- `src/threlte/editor/EditorSaveTabHost.svelte`
- `src/threlte/editor/EditorSavePanel.svelte`
- `src/threlte/editor/EditorPublishReadinessPanel.svelte`
- publish/readiness files:
  - `editorPublishReadiness.ts`
  - `editorPublishReadinessController.ts`
  - `editorPublishReadinessPresentation.ts`
  - `editorPublishReadinessWorkflow.ts`

Coordinate with Agent 02 on command ownership and Agent 03 on AI generation entry
points.

## Desired UX

Create clear workflow surfaces:

- Save/Publish: scene metadata, save local/disk, publish readiness, publish build.
- Bake/Cook: collision bake, terrain collision, visual chunks, world partition.
- AI Jobs: service status, queued jobs, generated outputs, retexture/generate.
- Output/Diagnostics: runtime diagnostics, validation messages, recent operation
  logs, errors/warnings.

The default editor should show concise status, not a long diagnostics dashboard.

## Implementation Guidance

1. Treat `saveMessage` as a status source, not a general UI architecture.
2. Consolidate runtime diagnostics into a status/output dock or drawer.
3. Keep publish readiness prominent only in save/publish context.
4. Keep destructive or expensive actions visibly grouped with status and
   preconditions.
5. Avoid auto-running heavy checks on every editor open unless already required.
6. Preserve current API endpoints and controller behavior.

## Acceptance Criteria

- AI service/job state is not shown in the default editing surface.
- Bake/cook/publish actions show readiness and result state in one workflow area.
- Runtime diagnostics are accessible but compact.
- Failed operations surface actionable errors without requiring console inspection.
- Existing save, publish, bake, cook, and AI actions remain reachable.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
```

If touching collision or terrain pipeline UI, also run the relevant audit or
bake smoke test where practical:

```bash
pnpm --dir apps/game audit:collision
pnpm --dir apps/game test:mesh-collider-bake
```
