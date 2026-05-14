# Agent 04: Inspector And Properties Architecture

## Mission

Turn the inspector/properties shelf into a predictable Details panel. The selected
object should be the center of this region, with properties grouped by component
or system.

## Problem To Solve

The current inspector is split between:

- `EditorInspectTabHost.svelte`
- `EditorPropertiesDock.svelte`
- `EditorPropertiesShelf.svelte`
- object-related controls in workflow/create/style/AI panels

At desktop, the properties panel is independently fixed over the viewport. At
smaller widths it becomes part of a static stack and may be pushed below the
visible editor.

## Primary Files

Own these files:

- `src/threlte/editor/EditorInspectTabHost.svelte`
- `src/threlte/editor/EditorInspectorForm.svelte`
- `src/threlte/editor/EditorPropertiesDock.svelte`
- `src/threlte/editor/EditorPropertiesShelf.svelte`
- `src/threlte/editor/editorInspectorController.ts`
- selected-node sections in `editorPanelPropBuilders.ts`

Coordinate with Agent 01 on where the Details panel lives.

## Desired UX

Use a Details-panel model:

- Header: selected object name, type, visible/selectable state, duplicate/delete.
- Transform: position, rotation, scale, parent.
- Render/asset: mesh or primitive settings, material basics, preview.
- Gameplay: gameplay component settings.
- Collision/physics: collision component settings and bake actions.
- Style/AI hooks: compact links to dedicated workflow surfaces.

Scene-level settings should not appear in selected-object details unless no object
is selected or a clear `Scene Settings` mode is active.

## Implementation Guidance

1. Keep field behavior and controllers intact where possible.
2. Move repeated one-off style/AI actions out of the primary object details if
   they are long-running workflows.
3. Group fields by component-like sections rather than feature history.
4. Prefer collapsible sections for advanced material/collision controls.
5. Keep empty state useful but compact.
6. Avoid duplicating selected-object controls in both `Inspect` and properties
   dock. Choose one primary Details surface.

## Acceptance Criteria

- Selecting an object shows its details in one predictable place.
- No selection shows a compact empty state or scene summary.
- Details remain reachable at `1280x800` and `900x700`.
- Transform, render, gameplay, collision, and material sections are visually
  distinct.
- Style/AI workflow entry points exist but do not bury normal property editing.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
```

Manual/Playwright checks:

- select object from outliner
- edit transform value
- toggle visibility/selectability where supported
- inspect primitive and asset-backed nodes
- verify details panel scrolls internally only
