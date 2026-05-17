# Agent 05: Editor NPC Authoring

## Mission

Add clean level-editor support for NPCs and a Firefly NPC archetype. The editor
must author the same NPC contract the runtime and cook pipeline consume.

## Ownership

Primary files:

- `apps/game/src/threlte/editor/editorPrefabFactory.ts`
- `apps/game/src/threlte/editor/editorCreateController.ts`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/editorTypes.ts`

Create new files if appropriate:

- `apps/game/src/threlte/editor/editorNpcControls.ts`
- `apps/game/src/threlte/editor/EditorNpcSection.svelte`
- `apps/game/src/threlte/editor/editorNpcPrefabs.ts`

Secondary files if needed:

- `apps/game/src/threlte/editor/EditorSceneToolsPanel.svelte`
- `apps/game/src/threlte/editor/EditorOutliner.svelte`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`

## Requirements

Add an NPC authoring section that supports:

- NPC id
- display name
- archetype selector
- interaction mode selector with only implemented modes
- prompt
- conversation mode
- read-only body fields
- profile personality id selector or validated text input
- firefly presentation controls when archetype is firefly
- hover-wander behavior controls when behavior type supports them

Firefly prefab creation must create an NPC actor, not a generic gameplay
firefly actor.

Do not expose:

- proximity controls unless Agent 02 implemented proximity
- cooldown controls unless Agent 02 stores and enforces cooldowns
- raw implementation details such as legacy gameplay fields
- duplicated fields in both gameplay and NPC sections

## Acceptance Criteria

- The editor can create a valid Firefly NPC actor from a prefab/action.
- Inspector and property shelf edit the same NPC fields.
- Invalid or unsupported options are not shown.
- Editor UI does not write legacy `gameplay.type === 'firefly'` data.
- Existing non-NPC gameplay authoring still works.
- New UI uses existing editor styling/classes; no new page-level style block.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check apps/game/src/threlte/editor/editorPrefabFactory.ts apps/game/src/threlte/editor/editorCreateController.ts apps/game/src/threlte/editor/EditorInspectorForm.svelte apps/game/src/threlte/editor/EditorPropertiesShelf.svelte
```

Run a browser/editor smoke only if feasible:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff Notes

Report every editor entry point that can create an NPC. State explicitly
whether any legacy firefly editor controls remain.

