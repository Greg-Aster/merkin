# Agent 03: NPC Conversation And State

## Mission

Connect NPC interactions to the existing conversation feature and game state
without hiding broken authoring data. Conversation config must be explicit,
validated, and deterministic.

## Ownership

Primary files:

- `apps/game/src/threlte/features/conversation/conversationStores.ts`
- `apps/game/src/threlte/features/conversation/ConversationManager.ts`
- `apps/game/src/threlte/features/conversation/characters/CharacterRegistry.ts`
- `apps/game/src/threlte/features/conversation/characters/index.ts`

Create new files if appropriate:

- `apps/game/src/threlte/features/npc/npcConversationController.ts`
- `apps/game/src/threlte/features/npc/npcStateStore.ts`
- `apps/game/src/threlte/features/npc/npcConversationValidation.ts`

Secondary files if needed:

- `apps/game/src/threlte/features/conversation/types.ts`
- `apps/game/src/threlte/features/conversation/runtime.ts`
- `apps/game/src/threlte/stores/gameState.ts` or the current owning game-state
  store, after locating it

## Requirements

Implement conversation behavior for NPC configs:

- `mode: 'none'`: record interaction event only.
- `mode: 'read-only'`: open read-only conversation with authored body text.
- `mode: 'profile'`: load the configured personality and start a full
  conversation session.

Rules:

- Do not silently fall back from a broken profile conversation to read-only.
- If fallback text is desired, it must be explicitly authored under the profile
  config and validation must know about it.
- Missing or unknown `personalityId` must be caught by validation or publish
  readiness, not discovered only at runtime.
- NPC interactions should record a stable event key, NPC id, actor id, level id,
  and conversation mode.
- Runtime state should support per-NPC cooldowns and future save-state
  expansion without requiring firefly-specific code.

## Acceptance Criteria

- NPC conversation startup is owned by a service/controller, not by firefly
  presentation components.
- Profile-backed NPCs validate against the character registry.
- Read-only NPCs require authored body text.
- Runtime does not mask invalid profile configs.
- Interaction events are recorded through one NPC path.
- The implementation is archetype-agnostic.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check apps/game/src/threlte/features/conversation apps/game/src/threlte/features/npc
pnpm --dir apps/game test:publish-pipeline
```

Add or update focused tests if existing publish-pipeline tests do not cover
unknown NPC personality ids and read-only body validation.

## Handoff Notes

Report the validation behavior for missing profiles, whether fallback is
supported, and which runtime state store owns NPC cooldowns/events.

