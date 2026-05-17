# Agent 09: Runtime NPC Interaction Completion

## Mission

Fix runtime NPC interaction ownership and firefly hit-target alignment. This
packet closes the runtime blockers from the audit.

## Ownership

Primary files:

- `apps/game/src/threlte/features/npc/RuntimeNpcSystem.svelte`
- `apps/game/src/threlte/features/npc/runtimeNpcRegistry.ts`
- `apps/game/src/threlte/features/npc/runtimeNpcStores.ts`
- `apps/game/src/threlte/features/npc/runtimeNpcTypes.ts`
- `apps/game/src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte`
- `apps/game/src/threlte/features/npc/presentation/fireflyNpcPresentation.ts`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/Game.svelte`

Secondary files if needed:

- `apps/game/src/threlte/components/StarSprite.svelte`
- `apps/game/src/threlte/systems/InteractionSystem.svelte`
- `apps/game/src/threlte/features/npc/npcConversationController.ts`
- `apps/game/scripts/test-publish-pipeline.ts`

## Requirements

### One Conversation Owner

Conversation startup must happen exactly once per accepted NPC click.

Preferred ownership:

- `RuntimeNpcSystem.svelte` registers click targets and records accepted NPC
  interactions through `recordRuntimeNpcInteraction`.
- `RuntimeNpcSystem.svelte` dispatches the accepted `npcInteraction` event.
- `Game.svelte` receives that event and calls
  `startNpcConversationFromComponent`.
- `RuntimeNpcSystem.svelte` must not import or call `startNpcConversation`.

If you choose a different ownership model, document why it is better and remove
the other path. Do not leave both paths live.

### One Cooldown Owner

Avoid double cooldown state. The runtime currently has registry cooldown state
and conversation-state cooldown state. Choose a single cooldown owner for click
acceptance and make the other path read-only or remove it.

Recommended approach:

- `runtimeNpcRegistry.ts` decides whether an interaction event is accepted.
- `npcConversationController.ts` starts conversation for already accepted
  events and records conversation state, but does not reject the same event
  again for cooldown.

### Moving Hit Target

The clickable target for firefly NPCs must follow the visible firefly. Do not
leave a fixed invisible sprite at actor origin when the visible firefly wanders.

Acceptable solutions:

- Move the interaction sprite into the firefly presentation component and bind
  it to the same `motionOffset` as the visible `StarSprite`.
- Or expose a shared presentation anchor/motion transform that both
  `RuntimeNpcSystem` and `RuntimeFireflyNpc` consume.

The final design must keep interaction policy in the NPC system and firefly
motion/presentation in the presentation module. If the presentation component
owns the hit sprite, it should delegate event acceptance to the NPC runtime
registry rather than duplicating interaction policy.

### Runtime Selection Feedback

If a click starts a read-only or profile conversation, the visible firefly
should show activation/selection feedback through the existing
`activationStrength` or `selected` inputs. Do not add a separate local
firefly-only global state if the NPC state store can own it.

## Acceptance Criteria

- One click produces at most one conversation start.
- One click produces at most one game interaction event for the NPC.
- Firefly hit testing follows the visible firefly position during hover-wander.
- Disabled NPCs do not register click targets.
- Duplicate NPC ids do not register multiple active click targets.
- `RuntimeNpcSystem.svelte` no longer starts conversation if `Game.svelte`
  owns conversation startup.
- The implementation remains archetype-clean: generic NPC registry does not
  special-case firefly rendering details.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte/features/npc src/threlte/levels/RuntimeActorNode.svelte src/threlte/Game.svelte
pnpm --dir apps/game test:publish-pipeline
```

If feasible, run a browser smoke after the shared dev server is healthy:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff Notes

Report:

- the final owner of conversation startup
- the final owner of NPC cooldown acceptance
- how the moving firefly hit target is synchronized with visible presentation
- whether browser smoke was run

