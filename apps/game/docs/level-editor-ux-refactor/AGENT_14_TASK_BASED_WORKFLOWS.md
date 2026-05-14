# Agent 14: Task-Based Workflows

## Mission

Replace feature piles with guided workflows for the main jobs level designers
actually perform.

## Problem

The UI exposes implementation controls but does not support end-to-end jobs. A
designer should not need to know whether something lives in Workflow, Create,
Style, AI Mesh, Save, Collision, or Environment.

## Required Workflows

Design and implement focused flows for these jobs.

### 1. Add Something To The Level

Path:

```txt
Create -> choose primitive/prefab/imported/generated -> preview -> add to scene -> select new object -> details open
```

Must show:

- asset/prefab preview or summary
- add action
- placement behavior
- resulting selection

### 2. Edit Selected Object

Path:

```txt
Select object -> transform/visibility/material/collision/gameplay details
```

Must show:

- selected object name/type
- transform
- render/source asset
- collision summary
- gameplay component summary if present

### 3. Author Walkable Collision

Path:

```txt
Collision -> review blockers/warnings -> select relevant actor -> choose collision intent -> bake if needed -> verify overlay
```

Must show:

- current collision policy
- blockers/warnings
- required actions
- bake status
- overlay toggle

### 4. Build/Publish Level

Path:

```txt
Build -> validate -> required bakes/cooks -> save -> publish
```

Must show:

- readiness status
- missing required assets/collision/spawn
- last bake/cook result
- publish action
- output/errors

### 5. Generate Experimental Asset

Path:

```txt
AI Lab -> check service status -> choose generate/retexture -> provide prompt/reference -> run job -> review output -> add/apply
```

Must show:

- service status
- clear experimental label
- job progress/errors
- output preview
- add/apply action

## Primary Files

Likely ownership varies by workflow:

- `EditorCreatePanel.svelte`
- `EditorPropertiesShelf.svelte`
- `EditorCollisionTabHost.svelte`
- `EditorSavePanel.svelte`
- `EditorPublishReadinessPanel.svelte`
- `EditorAIMeshStudio.svelte`
- `EditorOutputTabHost.svelte`
- controllers used by those components

## Implementation Guidance

1. Do not expose every control in the first view.
2. Put primary action, current status, and next required action near the top.
3. Use progressive disclosure for advanced settings.
4. Preserve direct access for power users through command palette or advanced
   sections.
5. Label workflows that need external services.
6. After a successful action, move the user to the next useful state.

## Acceptance Criteria

- Each required workflow can be completed without visiting unrelated tabs.
- Each workflow has a clear start, current status, and next action.
- Errors and blockers are visible in the workflow, not only console/output.
- AI workflow is explicitly separate from core create/edit workflows.
- Build/publish workflow makes readiness obvious before publish.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Manual verification should document which workflows were exercised and which were
blocked by missing local services.
