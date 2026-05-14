# Agent 12: Command Registry And Discoverability

## Mission

Create a command ownership model so controls stop being duplicated across tabs,
menus, HUDs, and panels. Add a discoverability layer so users can find actions
without memorizing where a feature landed.

## Problem

The editor currently repeats or scatters commands:

- shading controls in header and HUD/tool areas
- transform controls in HUD and scene/tool areas
- AI actions in Workflow/Create/Style/AI
- save/load actions in Workflow/Save/menu
- visibility/isolation in Workflow/outliner

This makes the editor feel unreliable even when commands work.

## Primary Files

Likely ownership:

- new `src/threlte/editor/editorCommandRegistry.ts`
- `src/threlte/editor/EditorPanelHeader.svelte`
- `src/threlte/editor/EditorControlsOverlay.svelte`
- `src/threlte/editor/EditorPanel.svelte`
- `src/threlte/editor/editorPanelPropBuilders.ts`
- command callers in tab hosts

## Required Command Model

Each command should have:

- `id`
- `label`
- `description`
- `category`
- `ownerWorkspace`
- `enabled` or `disabledReason`
- `status`: `ready`, `needs-selection`, `offline`, `experimental`, `danger`
- `shortcut` if applicable
- `run`

Do not over-engineer. A typed local registry is enough.

## Initial Command Categories

- Selection
- Transform
- View
- Object
- Create
- Asset
- World
- Collision
- Build
- AI
- Diagnostics

## Discoverability UI

Add one of:

- Command palette opened from menu/shortcut.
- Searchable command list in the header.
- Help drawer that lists commands by active workspace.

Minimum acceptable version:

- A searchable command palette/modal.
- Shows disabled commands with reason.
- Shows owner workspace.
- Runs safe commands directly.
- For dangerous/long-running commands, navigates to owner workspace instead of
  blindly running.

## Acceptance Criteria

- No command exists primarily in `Workflow`.
- Header/menu actions call the same command definitions as panel buttons where
  practical.
- Duplicate controls are reduced or clearly secondary.
- Users can search for "save", "collision", "generate", "asset", "spawn",
  "publish", and find the right command.
- Disabled commands explain what is missing.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Manual checks:

- search for Save Level
- search for Bake Collision
- search for Generate Asset
- search for Frame Spawn
- search for Select Similar
- verify disabled state for selection-only commands with no selection
