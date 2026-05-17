# Agent 04: Firefly NPC Presentation And Migration

## Mission

Move authored fireflies onto the NPC system and make firefly visuals a
presentation archetype. Ambient firefly fields remain separate scene
atmosphere.

## Ownership

Primary files:

- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/levels/SceneFireflyField.svelte`
- `apps/game/src/threlte/editor/scenes/observatory.scene.json`

Create new files if appropriate:

- `apps/game/src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte`
- `apps/game/src/threlte/features/npc/presentation/fireflyNpcPresentation.ts`
- `apps/game/src/threlte/features/npc/presentation/index.ts`

Secondary files if needed:

- `apps/game/src/threlte/features/lighting/ManagedLight.svelte`
- `apps/game/src/threlte/editor/scenes/solitude.scene.json`
- `apps/game/src/threlte/editor/scenes/yggdrasil.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

## Requirements

Implement firefly as an NPC presentation:

- animated sprite/body
- hover-wander behavior from NPC behavior config
- twinkle and selection response
- `ManagedLight` point light emission
- render budget controls for light count/intensity/distance
- no raw point lights
- no conversation or interaction policy inside the presentation component

Migration rules:

- Convert Observatory authored fireflies from `gameplay.type === 'firefly'` to
  `npc.archetype === 'firefly'`.
- Search Solitude and Yggdrasil for existing authored firefly-like actors and
  either migrate them or document why a separate packet is required.
- Keep `SceneFireflyField.svelte` as ambient, non-clickable atmosphere.
- Ensure ambient fields do not duplicate authored firefly NPCs unless
  `fireflies.allowWithAuthored` is explicitly set.
- Remove firefly branches from `RuntimeGameplayRenderer.svelte` once the NPC
  renderer owns authored firefly rendering.

## Acceptance Criteria

- Observatory has authored firefly NPCs in source scene data.
- Cooked Observatory runtime scene has NPC components for those actors.
- Firefly NPCs render through the NPC presentation path.
- Firefly NPC lights route through `ManagedLight`.
- `RuntimeGameplayRenderer.svelte` no longer owns authored firefly behavior.
- Ambient firefly fields still work independently of authored NPCs.
- No fake proximity config remains in Observatory.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check apps/game/src/threlte/features/npc apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte apps/game/src/threlte/levels/SceneDocumentLevel.svelte
pnpm --dir apps/game cook:runtime-assets -- --level=observatory
```

If Solitude or Yggdrasil scene data changes, also cook those levels.

## Handoff Notes

Report authored firefly NPC ids, per-level firefly counts, payload impact, and
whether any legacy firefly gameplay branches remain for Agent 07.

