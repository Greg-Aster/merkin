# Agent 15: Default Screen And Selection Model

## Mission

Rebuild the editor's first impression around scene editing and selection. The
default screen should answer "what am I editing?" and "what can I do next?"
without showing AI, publish, workflow templates, or implementation details.

## Problem

The active UI currently opens into `Workflow`, which exposes workflow templates,
AI actions, generated assets, save/load, recent jobs, selection helpers, and
visibility commands. This creates immediate confusion.

## Target Default Screen

On first editor load:

- Active workspace: `Scene` or `Edit`.
- Center: viewport.
- Right or side: outliner and details.
- Top/side toolbar: select/move/rotate/scale, snapping, view mode.
- Bottom/compact status: selected object, dirty/save status, validation summary.
- No AI controls.
- No publish controls.
- No workflow template controls.

## Selection Model

The selected object should drive the UI:

- No selection:
  - show scene summary
  - show "select an object" guidance
  - show create entry point
- Single selection:
  - show object name/type
  - show transform/details/collision summary
  - show relevant object actions
- Multi-selection:
  - show count
  - show shared actions
  - hide unsafe single-object controls

## Primary Files

Likely ownership:

- `EditorPanel.svelte`
- `EditorInspectTabHost.svelte`
- `EditorPropertiesDock.svelte`
- `EditorPropertiesShelf.svelte`
- `EditorControlsOverlay.svelte`
- `EditorOutlinerDock.svelte`
- `editorPanelTabs.ts`
- `editorSessionStore.ts` / editor state defaults if needed

## Implementation Requirements

1. Make the default active tab/workspace scene editing.
2. Remove AI/save/workflow-template controls from the first visible panel.
3. Make empty selection useful but compact.
4. Ensure selecting from outliner updates details immediately.
5. Ensure selecting in viewport updates outliner/details.
6. Keep command shortcuts working.
7. Keep object transform controls visible without relying on a giant HUD.

## Acceptance Criteria

- Initial visible button count is below 35.
- Initial screen shows no Comfy/Hunyuan/AI workflow template controls.
- Initial screen shows outliner and details or an obvious way to open them.
- No-selection state explains the scene state without taking over the viewport.
- Selection changes are reflected in one predictable details region.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Manual checks:

- load editor
- select object in outliner
- select object in viewport
- clear selection
- multi-select if supported
- verify details state each time
