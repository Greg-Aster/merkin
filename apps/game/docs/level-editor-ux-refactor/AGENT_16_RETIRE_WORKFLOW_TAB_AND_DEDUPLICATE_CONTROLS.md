# Agent 16: Retire Workflow Tab And Deduplicate Controls

## Mission

Remove the old `Workflow` tab as a user-facing surface and redistribute its
contents to the correct workspaces. This is the concrete cleanup that stops the
editor from feeling like a pile of unrelated features.

## Current Workflow Tab Contents

The current `Workflow` tab includes:

- workflow template selector
- selection summary
- merge descriptor
- outliner-on-right command
- select similar
- add firefly to selection
- clear selection
- hide selected
- hide unselected
- show all
- merge selection to asset
- generate from prefab
- retexture selected
- open AI details
- refresh backend
- edit generate workflow
- edit texture workflow
- open generated assets
- add latest generated
- apply latest to selection
- open asset library
- save local recovery
- save level
- load current level
- open level file tools
- refresh jobs
- open AI jobs panel

This is not one workflow. It is a command junk drawer.

## Destination Map

Move or expose commands as follows:

- Workflow template selector -> AI Lab advanced settings.
- Merge descriptor / merge selection to asset -> Create or AI Lab, depending on
  implementation status from Agent 13.
- Select similar -> Scene selection commands / command palette.
- Add firefly to selection -> Create gameplay helper.
- Clear selection -> Scene toolbar/menu/command palette.
- Hide selected / hide unselected / show all -> Outliner/view commands.
- Generate from prefab / retexture selected -> AI Lab.
- Open AI details / refresh backend / edit workflows -> AI Lab.
- Open generated assets / add latest / apply latest -> Create content browser or
  AI Lab output review.
- Open asset library -> Create/content browser.
- Save local recovery / save level / load current / level file tools -> Build.
- Refresh jobs / open AI jobs panel -> AI Lab or Output.
- Outliner on right -> Window/layout menu only, not a workflow action.

## Primary Files

Likely ownership:

- `EditorWorkflowTabHost.svelte`
- `EditorWorkflowPanel.svelte`
- `editorPanelTabs.ts`
- `EditorPanel.svelte`
- `editorPanelPropBuilders.ts`
- destination tab hosts/panels

## Implementation Guidance

1. First move commands without deleting behavior.
2. Leave temporary aliases only if needed, but hide them from default view.
3. Remove `workflow` from `EditorPanelTab` after all references are gone.
4. If removing the tab is too risky in one pass, replace it with a temporary
   redirect/empty state that says commands moved and links to destinations.
5. Use Agent 13 inventory to decide whether questionable commands should be
   hidden as experimental.

## Acceptance Criteria

- No visible `Workflow` tab.
- Initial editor load does not render `EditorWorkflowTabHost`.
- Every command formerly in Workflow has a destination or is documented as
  retired/experimental.
- Search/command palette can still find moved commands if Agent 12 exists.
- AI commands only appear in AI Lab or explicit AI output review contexts.
- Save/load commands only appear in Build/menu contexts.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game smoke:editor-ux -- --no-server
```

Use Playwright or manual inspection to verify the text `Workflow Template` is not
visible on initial editor load.
