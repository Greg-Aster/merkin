# Agent 00: Coordination And Architecture Contract

## Mission

Own the refactor boundaries and keep the individual agent changes compatible.
This brief should be used by the integration agent or by any agent that needs to
understand the whole packet before taking a focused slice.

## Current Editor Surface

Main entry:

- `src/threlte/editor/EditorPanel.svelte`

Current region components:

- `EditorPanelHeader.svelte`
- `EditorPanelToolsDock.svelte`
- `EditorPanelTabRail.svelte`
- `EditorSideStackHost.svelte`
- `EditorOutlinerDock.svelte`
- `EditorPropertiesDock.svelte`
- `EditorControlsOverlay.svelte`
- `EditorViewportControls.svelte`
- `EditorViewportShadingOverlay.svelte`

Current tab hosts:

- `EditorWorkflowTabHost.svelte`
- `EditorSceneTabHost.svelte`
- `EditorCollisionTabHost.svelte`
- `EditorEnvironmentTabHost.svelte`
- `EditorPlayerTabHost.svelte`
- `EditorCreateTabHost.svelte`
- `EditorInspectTabHost.svelte`
- `EditorStyleTabHost.svelte`
- `EditorAiTabHost.svelte`
- `EditorSaveTabHost.svelte`

State and prop routing:

- `editorStore.ts`
- `editorPanelTabs.ts`
- `editorPanelPropBuilders.ts`

## Desired Region Model

The editor should resolve into these stable regions:

- Header/menu bar: file/edit/window/menu commands and layout toggles.
- Toolbar/tool settings: transform tools, interaction modes, snapping, viewport
  shading, collision overlay, terrain mode, current mode settings.
- Main viewport: dominant visual authoring area.
- Outliner: scene hierarchy and visibility/selectability/isolation controls.
- Inspector/details: selected object and scene properties.
- Content browser: project/runtime authoring assets and generated assets.
- Status/output: diagnostics, long-running job state, publish/bake results.

## Non-Goals

- Do not rewrite scene documents.
- Do not migrate level JSON unless a brief explicitly requires it.
- Do not replace controllers while moving UI.
- Do not introduce a new global state library.
- Do not merge runtime gameplay code with editor-only modules.

## Shared Refactor Rules

- Keep existing commands and controllers intact until their new surface is proven.
- Prefer extracting thin components over adding more logic to `EditorPanel.svelte`.
- Avoid duplicated controls across regions. A command should have one primary
  home and optional menu access.
- Preserve keyboard shortcuts.
- Preserve `Ctrl/Cmd+S`, undo/redo, selection, transform, bake, publish, and load
  flows during every stage.
- Do not edit generated runtime asset outputs as part of UX work.

## Proposed Intermediate Architecture

Do not attempt a full editor rewrite in one PR. Use these intermediate components:

- `EditorWorkspaceShell.svelte`: owns region placement and responsive docking.
- `EditorMainToolbar.svelte`: owns persistent tool/mode controls.
- `EditorContentBrowserDock.svelte`: owns asset/project browser placement.
- `EditorStatusDock.svelte`: owns diagnostics and job/output status.
- `editorCommandRegistry.ts`: optional thin registry for commands that currently
  appear in multiple tabs or menus.

These names are suggestions, not requirements. If agents choose different names,
they must update this packet or the PR summary so integration remains clear.

## Dependency Order

1. Shell region work can happen first because it moves containers.
2. Tool mode work should happen after or alongside shell work.
3. Asset browser and inspector work can be parallel if they do not touch the same
   host components.
4. Pipeline/status work should happen after command ownership is clear.
5. Verification should run after every slice and again after integration.

## Integration Checklist

- The editor opens to an editing-focused surface, not a mixed workflow dashboard.
- The viewport remains visible and usable at `1280x800`.
- Outliner and inspector are reachable without overlapping the main tool panel.
- Content browser is discoverable as an editor region.
- AI, bake, and publish jobs are not mixed into default object editing.
- All old commands still have an accessible home.
- Playwright screenshots show no incoherent text overlap.
