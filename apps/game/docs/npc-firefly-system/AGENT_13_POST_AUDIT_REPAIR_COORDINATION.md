# Agent 13: Post-Audit Repair Coordination

## Mission

Coordinate the repair pass after the Agent 08-12 audit completion work. This
file is the source of truth for assigning the remaining NPC firefly blockers.

Do not claim final NPC firefly certification until packets 14-16 are complete
or their blockers are explicitly reported.

## Read First

Read these files before editing:

- `apps/game/AGENTS.md`
- `apps/game/docs/npc-firefly-system/AGENT_00_COORDINATION.md`
- `apps/game/docs/npc-firefly-system/AGENT_09_RUNTIME_NPC_INTERACTION_COMPLETION.md`
- `apps/game/docs/npc-firefly-system/AGENT_12_FINAL_ARCHITECTURE_CERTIFICATION.md`
- this file

## Verified Blockers

The previous review found these concrete problems in the current tree:

1. `pnpm --dir apps/game build` fails because `Game.svelte` imports
   `startNpcConversationFromComponent` from `features/npc`, but the NPC barrel
   does not export that symbol and no implementation exists.
2. Firefly click-target motion is not guaranteed to match the visible firefly.
   `RuntimeFireflyNpc.svelte` computes `motionOffset`, but
   `RuntimeNpcInteractionTarget.svelte` also resolves firefly presentation and
   recomputes motion using its own `animationTime`.
3. Whole-repo certification is still blocked by Miranda and sci-fi-room stale
   `mesh-collision-manager-v1` generated collision products and stale generated
   runtime report shape.
4. `apps/game/package.json` and the root lockfile have dependency churn around
   `postprocessing` and `threlte-postprocessing` that was not explained in the
   NPC handoff. This may be valid, but it needs ownership before merge.

## Packet Ownership

### Agent 14: Conversation Export And Build Gate

Owns the broken build and the public NPC conversation startup API used by
`Game.svelte`.

Primary write scope:

- `apps/game/src/threlte/features/npc/npcConversationController.ts`
- `apps/game/src/threlte/features/npc/index.ts`
- `apps/game/src/threlte/Game.svelte`
- focused tests or source guards needed to prevent the missing-export
  regression

Agent 14 should not change firefly presentation motion or generated runtime
assets.

### Agent 15: Firefly Hit Target Motion Ownership

Owns synchronization between the visible firefly and its hidden interaction
target.

Primary write scope:

- `apps/game/src/threlte/features/npc/RuntimeNpcInteractionTarget.svelte`
- `apps/game/src/threlte/features/npc/presentation/RuntimeFireflyNpc.svelte`
- `apps/game/src/threlte/features/npc/presentation/fireflyNpcPresentation.ts`
- focused tests or source guards needed to prevent target/presentation drift

Agent 15 should not change conversation startup ownership or generated runtime
assets.

### Agent 16: Generated Drift And Final Certification

Runs after Agents 14 and 15. Owns whole-repo certification, generated/collision
cleanup, the temporary NPC-counter compatibility removal decision, and the
unexplained dependency churn classification.

Primary write scope:

- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`
- generated collision products and runtime scene manifests, but only through
  owning bake/cook scripts
- `apps/game/package.json` and `pnpm-lock.yaml` only if dependency churn is
  confirmed to belong to this NPC/firefly repair pass

Agent 16 must not hand-edit generated runtime scene JSON.

## Ordering

Required order:

1. Agent 14 fixes the client build.
2. Agent 15 fixes firefly hit-target motion ownership.
3. Agent 16 runs final generated/collision certification after Agents 14 and 15
   land.

Agents 14 and 15 can run in parallel only if they keep to the write scopes
above. If either needs to touch the other packet's files, stop and coordinate.

## Shared Acceptance Criteria

- `pnpm --dir apps/game build` passes.
- Conversation startup has one owner.
- NPC click cooldown acceptance has one owner.
- Firefly interaction targets use the same motion source as the visible
  firefly.
- No source/runtime scene has legacy gameplay firefly actors.
- Checked runtime scene manifests include `npcActorCount` and
  `fireflyNpcActorCount`.
- No public active runtime report contract depends on `gameplayFireflyActorCount`
  or `maxGameplayFireflyCount`.
- Temporary compatibility code has an owner, reason, and removal condition, or
  is removed.
- Whole-repo certification failures are not hidden or normalized away.

## Required Final Report Shape

Every repair agent must report:

```md
Architecture impact:
- Contract changed:
- Runtime systems touched:
- Editor or authoring systems touched:
- Manifest, generated data, or source assets touched:
- Compatibility retained or deleted:
- Guardrail added or missing:

Validation:
- Commands run:
- Commands not run:
- Asset, collision, manifest, or readiness checks:
- Payload or budget impact:
- New CSS surface area:

Risk:
- Known gaps:
- Follow-up work:
```

Every report must state whether runtime payload size, collision, required
assets, streaming, LOD, and manifest validation were considered.
