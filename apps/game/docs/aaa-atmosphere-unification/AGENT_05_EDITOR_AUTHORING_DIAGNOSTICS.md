# Agent 05: Editor Authoring And Diagnostics

## Mission

Make the level editor author and preview the unified atmosphere contract, and
surface diagnostics when a render path does not participate.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/EditorEnvironmentPanel.svelte`
- `apps/game/src/threlte/editor/EditorEnvironmentTabHost.svelte`
- editor style controller/store files if needed
- runtime diagnostics panel/store files

Secondary files only if needed:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- runtime atmosphere store/types

## Requirements

The existing Atmosphere FX controls must write into the same data path consumed
by runtime atmosphere. Controls must update the viewport live.

Diagnostics must expose:

- active atmosphere source level/profile
- distance fog enabled and density
- height fog enabled, floor, ceiling, density
- sky participation
- ocean participation
- material participant/bypass counts
- post-processing participation for bloom and color grading

Do not hide quality-policy disables. If a pass is disabled by performance tier,
say that.

## Non-Goals

- Do not redesign the whole editor layout.
- Do not create editor-only atmosphere state.
- Do not add more controls unless the runtime contract already supports them.

## Acceptance Criteria

- User can adjust Haze Floor/Ceiling/Density and immediately see the height band
  move.
- User can tell from diagnostics whether ocean and sky are participating.
- Saved scene data reloads into the same runtime atmosphere.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/editor src/threlte/atmosphere
```

Run editor browser smoke and capture diagnostics open with atmosphere values
visible.
