# Agent 15: Firefly Hit Target Motion Ownership

## Mission

Make the firefly NPC interaction target use the same motion source as the
visible firefly. The current implementation is close but not architecturally
correct: the presentation component passes `motionOffset` to the target, while
the target independently resolves firefly presentation and recomputes motion
with its own `animationTime`.

This packet removes that drift risk.

## Ownership

Primary files:

- `apps/game/src/threlte/features/npc/RuntimeNpcInteractionTarget.svelte`
- `apps/game/src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte`
- `apps/game/src/threlte/features/npc/presentation/fireflyNpcPresentation.ts`

Read but avoid editing unless required:

- `apps/game/src/threlte/features/npc/RuntimeNpcSystem.svelte`
- `apps/game/src/threlte/features/npc/runtimeNpcRegistry.ts`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/systems/InteractionSystem.svelte`

Do not change conversation startup ownership or generated runtime assets in
this packet.

## Requirements

### Generic Target Stays Generic

`RuntimeNpcInteractionTarget.svelte` must be a generic hidden interaction
target. It should not know how fireflies move.

Remove firefly-specific presentation ownership from the target:

- no import from `presentation/fireflyNpcPresentation`
- no `resolveFireflyNpcPresentation` call
- no firefly-specific `animationTime`
- no `getFireflyTargetPosition` or equivalent duplicated firefly motion math

The target may still set the underlying sprite transform each frame, but it
must use the `position` and `scale` supplied by its owner.

### Firefly Presentation Owns Firefly Motion

`RuntimeFireflyNpc.svelte` should remain the firefly presentation owner. It
already computes `motionOffset` for:

- visible `StarSprite`
- `ManagedLight`
- hidden NPC interaction target

Keep that as one source of truth. The hidden target should consume the same
`motionOffset` value passed to the visible sprite and light.

If you extract a helper into `fireflyNpcPresentation.ts`, it must be a pure
math helper. Do not create two independent clocks. The presentation component
should pass the resulting transform into the target.

### Interaction Policy Remains In NPC Runtime

The presentation component may mount the hidden target because it owns the
moving transform, but it must not duplicate interaction acceptance policy.

Keep the existing policy boundary:

- `RuntimeNpcInteractionTarget.svelte` registers the interactive object.
- `runtimeNpcRegistry.ts` decides if a click is accepted and applies cooldown.
- `RuntimeFireflyNpc.svelte` forwards accepted `npcInteraction` events.
- `RuntimeFireflyNpc.svelte` may update hover/activation presentation state.

### Guardrail

Add a lightweight guard if practical. Acceptable guards:

- a publish-pipeline source guard that fails if
  `RuntimeNpcInteractionTarget.svelte` imports `fireflyNpcPresentation`
- a focused test/helper assertion if firefly motion math is extracted
- documented `rg` checks in the handoff if a code guard would be too brittle

Do not add broad visual-test infrastructure for this packet.

## Acceptance Criteria

- Firefly `StarSprite`, `ManagedLight`, and hidden NPC target consume the same
  motion offset from `RuntimeFireflyNpc.svelte`.
- `RuntimeNpcInteractionTarget.svelte` no longer computes firefly motion.
- Generic non-firefly NPC targets still register at their actor-local origin by
  default.
- Disabled NPCs do not register click targets.
- Duplicate NPC ids do not bind multiple active targets.
- No additional firefly-specific global state is added.
- No direct raw point lights are introduced; firefly lights still use
  `ManagedLight`.

## Required Searches

Run and classify:

```bash
rg -n "resolveFireflyNpcPresentation|getNpcPresentationAnimationPhase|getFireflyTargetPosition|animationTime" apps/game/src/threlte/features/npc/RuntimeNpcInteractionTarget.svelte apps/game/src/threlte/features/npc/presentation
rg -n "RuntimeNpcInteractionTarget" apps/game/src/threlte/features/npc apps/game/src/threlte/levels
```

Expected shape:

- firefly presentation helpers may appear under `presentation`
- `RuntimeNpcInteractionTarget.svelte` should not import or compute firefly
  presentation motion
- `RuntimeFireflyNpc.svelte` should pass `position={motionOffset}` to the target

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game exec biome check src/threlte/features/npc src/threlte/levels/RuntimeActorNode.svelte
```

After Agent 14 lands, also run:

```bash
pnpm --dir apps/game build
```

If the shared dev server and browser harness are healthy, run:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

## Handoff Notes

Report:

- exactly where firefly motion is computed
- exactly how the target receives that transform
- whether any guard was added against target/presentation drift
- whether browser smoke was run
- whether runtime payload size, collision, required assets, streaming, LOD, and
  manifest validation were affected
