# Agent 08: Audit Completion Coordination

## Read First

This file coordinates the post-audit completion work. Read it before starting
packets 9-12.

Also read:

- `apps/game/AGENTS.md`
- `apps/game/docs/npc-firefly-system/AGENT_00_COORDINATION.md`
- `apps/game/docs/npc-firefly-system/AGENT_09_RUNTIME_NPC_INTERACTION_COMPLETION.md`
- `apps/game/docs/npc-firefly-system/AGENT_10_RUNTIME_MANIFEST_RECOOK_AND_DRIFT.md`
- `apps/game/docs/npc-firefly-system/AGENT_11_EDITOR_BUDGET_AND_PROFILE_VALIDATION.md`
- `apps/game/docs/npc-firefly-system/AGENT_12_FINAL_ARCHITECTURE_CERTIFICATION.md`

## Audit Findings To Close

The first NPC/firefly implementation moved the engine in the correct direction,
but the audit found remaining blockers:

1. Runtime NPC clicks can start conversation twice because
   `RuntimeNpcSystem.svelte` starts conversation and `Game.svelte` starts it
   again from the forwarded NPC event.
2. Firefly NPC click targets are fixed at the actor origin while visible
   firefly sprites move through hover/wander offsets.
3. The new runtime manifest contract requires `npcActorCount` and
   `fireflyNpcActorCount`, but not all checked runtime scene manifests have
   been recooked with those fields.
4. The editor performance panel still reports legacy `gameplayFireflyActorCount`
   instead of `fireflyNpcActorCount`.
5. Conversation profile validation has hard-coded profile ids while the
   character registry discovers profile definition files dynamically.

## Completion Order

Do the packets in this order:

1. Agent 09 fixes runtime interaction ownership and synchronized hit targets.
2. Agent 10 recooks or migrates runtime scene manifests for the new NPC build
   report contract.
3. Agent 11 cleans editor reporting and profile validation ownership.
4. Agent 12 performs final searches, gates, and certification.

Agent 10 can start inventory work while Agent 09 is running, but it must not
claim final generated-state certification until Agent 09 and Agent 11 land.

## Non-Negotiable Completion Rules

- Conversation startup has exactly one runtime owner.
- Click hit targets must match the visible interactive object or share the same
  motion source.
- Runtime manifest validation must not break levels merely because they were
  not recooked after a contract extension.
- Editor performance UI must report the active NPC firefly budget, not a
  retired gameplay counter.
- Conversation profile validation must not require manually updating two
  unrelated lists whenever a profile file is added.
- Generated runtime files must be produced by owning scripts, not hand edits.
- No packet may hide unrelated collision or budget drift by weakening audits.

## Required Handoff

Each packet must report:

- exact files changed
- which audit finding it closes
- validation commands run
- commands not run and why
- whether payload size, collision, required assets, streaming, LOD, and manifest
  validation were considered

The final packet must state whether the NPC firefly system is certified or not.

