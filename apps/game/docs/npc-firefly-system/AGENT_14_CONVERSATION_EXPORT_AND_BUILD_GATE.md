# Agent 14: Conversation Export And Build Gate

## Mission

Fix the broken NPC conversation startup API and make the client build catch the
runtime integration path.

The current tree imports `startNpcConversationFromComponent` in
`Game.svelte`, but `features/npc/index.ts` does not export it and no
implementation exists. `pnpm --dir apps/game type-check` passed, but
`pnpm --dir apps/game build` fails. This packet closes that gap.

## Ownership

Primary files:

- `apps/game/src/threlte/features/npc/npcConversationController.ts`
- `apps/game/src/threlte/features/npc/index.ts`
- `apps/game/src/threlte/Game.svelte`
- `apps/game/scripts/test-publish-pipeline.ts` or another focused guard if a
  better local test surface already exists

Read but avoid editing unless required:

- `apps/game/src/threlte/features/npc/runtimeNpcTypes.ts`
- `apps/game/src/threlte/features/npc/runtimeNpcRegistry.ts`
- `apps/game/src/threlte/engine/npcTypes.ts`
- `apps/game/src/threlte/features/conversation/runtime`

Do not change firefly presentation motion or generated runtime assets in this
packet.

## Requirements

### Public Conversation Bridge

Provide the API that `Game.svelte` is trying to use, or replace that import
with an equally clean public API. The preferred fix is to implement and export:

```ts
startNpcConversationFromComponent(input: {
  npc: NpcComponent
  actorId: string
  levelId: string
  context?: Partial<ConversationContext>
}): Promise<NpcConversationStartResult>
```

The bridge must:

- build the `NpcConversationIdentity` from `npc.id`, `actorId`, `levelId`,
  `npc.displayName`, and `npc.archetype`
- pass `npc.interaction` through to preserve `eventKey`
- use `npc.conversation` when present
- treat a missing `npc.conversation` as an explicit `mode: 'none'` result, not
  as a silent read-only fallback
- call the existing `startNpcConversation` path rather than duplicating
  conversation startup logic
- not perform click acceptance or cooldown checks

Cooldown acceptance belongs to `runtimeNpcRegistry.ts`. This bridge receives an
already accepted NPC click event from `Game.svelte`.

### One Conversation Owner

Keep the ownership model established by Agent 09:

- `RuntimeNpcInteractionTarget.svelte` records accepted NPC clicks through
  `recordRuntimeNpcInteraction`.
- `Game.svelte` receives the accepted event.
- `Game.svelte` calls the public conversation bridge exactly once.
- `RuntimeNpcSystem.svelte` and `RuntimeNpcInteractionTarget.svelte` do not
  start conversations directly.

Run and classify:

```bash
rg -n "startNpcConversation\\(|startNpcConversationFromComponent\\(" apps/game/src/threlte
```

Expected shape:

- `startNpcConversation` is defined in the controller and called by the bridge.
- `startNpcConversationFromComponent` is exported by the NPC public barrel.
- `Game.svelte` is the only runtime caller of the bridge unless a test imports
  it.

### Build Guard

Add or update a guard so the missing-export regression is less likely to pass
again. Acceptable options:

- a focused publish-pipeline source/import test that imports
  `startNpcConversationFromComponent` from `src/threlte/features/npc`
- another local test that exercises the public NPC barrel
- documenting why `pnpm --dir apps/game build` is the only practical guard

Do not rely on `tsc --noEmit` alone. It did not catch this Svelte/Rollup export
break.

## Acceptance Criteria

- `pnpm --dir apps/game build` passes.
- `Game.svelte` no longer imports a missing NPC symbol.
- One accepted NPC click starts at most one conversation.
- The public NPC barrel exports the bridge used by `Game.svelte`.
- No runtime NPC component other than `Game.svelte` starts conversations.
- No new cooldown state is added outside `runtimeNpcRegistry.ts`.
- No generated data changes are made.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game build
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game exec biome check src/threlte/features/npc src/threlte/Game.svelte
```

Also run:

```bash
rg -n "startNpcConversation\\(|startNpcConversationFromComponent\\(" apps/game/src/threlte
git diff --check
```

If browser smoke is healthy, run:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If it fails because the shared server or harness is unhealthy, report that
separately from the build fix.

## Handoff Notes

Report:

- the final public API signature
- why the bridge does not own cooldown acceptance
- exact command output status for `build`, `type-check`, and
  `test:publish-pipeline`
- whether any tests or guards were added
- any remaining Svelte build or browser-smoke risk
