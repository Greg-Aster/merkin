# Game Editor Refactor Checklist

Date started: 2026-04-27

## Goal

Reduce `apps/game/src/threlte/editor/EditorPanel.svelte` into smaller, behavior-preserving editor modules before changing editor logic.

## Guardrails

- Keep each refactor slice behavior-preserving.
- Run `pnpm --dir apps/game type-check` after each slice.
- Run `pnpm --dir apps/game smoke:engine` after UI boundary moves.
- Do not mix this work with terrain/collision, generated asset cleanup, or gameplay changes.
- Leave unrelated dirty worktree changes untouched.

## Completed

- [x] Captured baseline: `pnpm --dir apps/game type-check` passed.
- [x] Extracted editor header controls to `EditorPanelHeader.svelte`.
- [x] Extracted editor tab rail to `EditorPanelTabRail.svelte`.
- [x] Added shared editor panel tab types in `editorPanelTabs.ts`.
- [x] Extracted right-side outliner wrapper to `EditorOutlinerDock.svelte`.
- [x] Extracted properties shelf wrapper to `EditorPropertiesDock.svelte`.
- [x] Extracted tab viewport shell to `EditorPanelToolsDock.svelte`.
- [x] Extracted Style tab host to `EditorStyleTabHost.svelte`.
- [x] Extracted AI Mesh tab host to `EditorAiTabHost.svelte`.
- [x] Extracted Workflow tab host to `EditorWorkflowTabHost.svelte`.
- [x] Extracted Scene tab host to `EditorSceneTabHost.svelte`.
- [x] Extracted Environment tab host to `EditorEnvironmentTabHost.svelte`.
- [x] Extracted Player tab host to `EditorPlayerTabHost.svelte`.
- [x] Extracted Create tab host to `EditorCreateTabHost.svelte`.
- [x] Extracted Hierarchy tab host to `EditorHierarchyTabHost.svelte`.
- [x] Extracted Save tab host to `EditorSaveTabHost.svelte`.
- [x] Extracted Inspect tab host to `EditorInspectTabHost.svelte`.
- [x] Extracted right-side stack host to `EditorSideStackHost.svelte`.
- [x] Removed stale `EditorPanel.svelte` CSS left behind by extracted components.
- [x] Grouped side-stack prop and handler wiring behind `sideStackProps`.
- [x] Grouped Workflow tab prop and handler wiring behind `workflowTabProps`.
- [x] Grouped remaining tab prop and handler wiring behind tab-specific prop objects.
- [x] Moved tab and side-stack prop builder logic into `editorPanelPropBuilders.ts`.
- [x] Fixed build-only Svelte reactive cycle in coordinator setter wiring.
- [x] Fixed Windows boot-smoke process spawning for `pnpm`/`npx` and Playwright Chromium launch.
- [x] Fixed editor boot runtime reference for `resetSelectedWorkflowPath`.
- [x] Fixed scene-document player spawn timing so authored spawn positions are requested after `SpawnSystem` is available.
- [x] Re-ran `pnpm --dir apps/game type-check`: passed.
- [x] Re-ran `pnpm --dir apps/game smoke:engine`: passed after coordinator extraction.
- [x] Re-ran `pnpm --dir apps/game smoke:boot`: passed after editor boot fix.

## Next Slices

- [x] Extract remaining tab content routing from `EditorPanel.svelte`.
- [x] Move workflow orchestration glue into smaller coordinator modules or grouped bindings.
- [x] Review remaining local CSS in `EditorPanel.svelte` and move scoped styles with extracted components.
- [x] Re-run editor manual checks at `/?editor=1`.

## Coordinator Refactor Todo

- [x] Extract Workflow, AI, Style, Inspect, Save, Create, Hierarchy, Environment, Player, Scene, and SideStack prop builders.
- [x] Leave Svelte-owned bindings and mutable local state in `EditorPanel.svelte`.
- [x] Keep UI behavior unchanged and verify with `pnpm --dir apps/game type-check`.
- [x] Tighten builder context typing after manual editor verification.
- [ ] Split scene/terrain helpers into a smaller terrain coordinator if terrain work continues.

## Current Known Warnings

- Vite reports circular chunks involving `editor-core`, `editor-document`, and `editor-runtime`.
- Vite reports the existing large `three-vendor` chunk warning.
