# Agent 02: Runtime NPC System And Interaction

## Mission

Create the runtime NPC system that owns NPC lifecycle and interaction
registration. Runtime presentation components should consume NPC data, not own
NPC identity or interaction policy themselves.

## Ownership

Primary files:

- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/systems/InteractionSystem.svelte`

Create new files if appropriate:

- `apps/game/src/threlte/features/npc/RuntimeNpcSystem.svelte`
- `apps/game/src/threlte/features/npc/runtimeNpcRegistry.ts`
- `apps/game/src/threlte/features/npc/runtimeNpcStores.ts`
- `apps/game/src/threlte/features/npc/runtimeNpcTypes.ts`
- `apps/game/src/threlte/features/npc/index.ts`

Secondary files if needed:

- `apps/game/src/threlte/Game.svelte`
- `apps/game/src/threlte/GameCanvasStage.svelte`
- `apps/game/src/threlte/core/levelRuntimeReset.ts`

## Requirements

Add a system boundary that:

- receives runtime actors with `npc` components
- registers each NPC by stable NPC id
- binds click interaction through the existing `InteractionSystem`
- enforces interaction mode and cooldown
- emits a single NPC interaction event for Agent 03 to consume
- unregisters NPC interactions on actor unmount or level reset
- exposes diagnostics for duplicate ids, missing actors, or disabled NPCs

Do not put conversation startup, firefly rendering, or editor-specific logic in
the core registry. This packet owns interaction routing only.

The first supported runtime interaction mode is `click`. Do not keep
`proximity` in the public contract unless this packet implements:

- player/NPC distance measurement from the authoritative player transform
- enter/exit threshold handling
- cooldown state
- validation and tests
- clear UI behavior for prompt visibility

## Acceptance Criteria

- NPC click interaction is registered by a central NPC system.
- NPC interactions use stable ids, not `editor-node-*` legacy ids.
- Runtime reset clears NPC registrations.
- Disabled NPCs do not register with `InteractionSystem`.
- The NPC system does not special-case fireflies.
- The system can support multiple NPC archetypes without new generic branches.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check apps/game/src/threlte/features/npc apps/game/src/threlte/levels/SceneDocumentLevel.svelte apps/game/src/threlte/levels/RuntimeActorNode.svelte
```

If browser smoke is feasible against the shared dev server, run:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff Notes

Report the public runtime NPC API, the interaction event shape, and any
remaining runtime interaction mode gaps. If proximity is not implemented,
confirm it is not exposed in editor controls or source scenes.

