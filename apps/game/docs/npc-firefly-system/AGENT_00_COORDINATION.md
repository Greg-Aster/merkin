# Agent 00: NPC Firefly System Coordination

## Read First

Read this file before starting any NPC or firefly work.

Also read:

- `apps/game/AGENTS.md`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/engine/sceneAdapter.ts`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/features/conversation/README.md`
- `apps/game/src/threlte/systems/InteractionSystem.svelte`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`

## Goal

Build a AAA-quality NPC system for the web game engine, then make authored
fireflies a first-class NPC archetype. Ambient firefly fields remain scene
atmosphere. Clickable or conversational fireflies must be authored NPCs.

Target pipeline:

```txt
editor scene NPC actor
  -> typed scene NPC component
  -> scene validation
  -> runtime scene manifest
  -> RuntimeNpcSystem registration
  -> interaction registration
  -> conversation / read-only response / state event
  -> archetype presentation renderer
  -> ManagedLight / render budget policy
```

## Current Problem

The current firefly revival work added too much behavior as loose optional
fields on generic gameplay data. That is not the final architecture.

Transitional surfaces that must be absorbed or deleted:

- `gameplay.type === 'firefly'` branches in runtime, editor, manifest, and
  validation code.
- Optional generic gameplay fields such as `interactionMode`, `dialogueMode`,
  `personalityId`, `proximityRadius`, and firefly light overrides when they are
  only meaningful for NPC/firefly actors.
- Editor controls that expose behavior the runtime does not actually implement.
- Silent runtime fallback from a broken conversation config to read-only
  dialogue unless that fallback is explicitly authored in the NPC contract.

Do not preserve these as compatibility cruft. They may exist briefly only as a
named migration bridge with an owner and a deletion condition.

## Final Architecture

Scene actors that represent interactive people, spirits, guides, fireflies, or
future creatures should use a typed NPC component. Fireflies are one NPC
archetype, not a special gameplay type.

Conceptual contract:

```ts
interface NpcComponent {
  id: string
  archetype: 'firefly' | 'character' | 'spirit' | string
  displayName?: string
  interaction: NpcInteractionConfig
  conversation?: NpcConversationConfig
  behavior?: NpcBehaviorConfig
  presentation: NpcPresentationConfig
  state?: NpcStateConfig
}

type NpcInteractionMode = 'disabled' | 'click'

interface NpcInteractionConfig {
  mode: NpcInteractionMode
  prompt?: string
  cooldownMs?: number
  eventKey?: string
}

type NpcConversationConfig =
  | { mode: 'none' }
  | { mode: 'read-only'; title?: string; excerpt?: string; body: string; durationMs?: number }
  | { mode: 'profile'; personalityId: string; fallback?: { body: string; durationMs?: number } }

type NpcBehaviorConfig =
  | { type: 'static' }
  | { type: 'hover-wander'; radius: number; speed: number; bobAmplitude?: number; bobSpeed?: number }

type NpcPresentationConfig =
  | { type: 'firefly'; color: string; secondaryColor?: string; size: number; spriteIntensity: number; lightIntensity: number; lightDistance: number; lightDecay?: number; twinkleSpeed?: number }
  | { type: 'character'; modelRef: string }
```

Do not copy this shape blindly if an existing local type has a better final
home, but preserve these ownership boundaries.

## Non-Negotiable Rules

- No editor field may be exposed unless runtime behavior exists.
- No unsupported interaction modes in source scenes or generated manifests.
- No level-id special cases in generic NPC, interaction, or conversation code.
- No duplicate NPC identity path split between `gameplay`, `interaction`, and
  ad hoc component state.
- No hidden Svelte component side effects owning core NPC lifecycle.
- No direct raw point lights for firefly NPCs; use `ManagedLight`.
- No hand-edited generated runtime files except by the owning cook script.
- No retained legacy fields or adapters without a removal condition.
- No final report may claim completion while `rg "gameplay.*firefly|type === 'firefly'|type: 'firefly'" apps/game/src apps/game/scripts` still finds live legacy code outside explicitly allowed migration tests.

## Agent Boundaries

### Agent 01: NPC Contract And Validation

Owns shared source/runtime NPC data shapes and validation. This agent must land
before broad runtime/editor migrations.

### Agent 02: Runtime NPC System And Interaction

Owns runtime NPC registration, interaction binding, click/cooldown behavior,
and the system boundary between actor manifests and presentation.

### Agent 03: NPC Conversation And State

Owns integration with the existing conversation feature, profile validation,
read-only dialogue semantics, interaction event recording, and NPC save/runtime
state.

### Agent 04: Firefly NPC Presentation And Migration

Owns the firefly NPC presentation renderer, `ManagedLight` emission, firefly
movement/twinkle behavior, Observatory authored fireflies, and migration away
from `gameplay.type === 'firefly'`.

### Agent 05: Editor NPC Authoring

Owns editor prefab creation, inspector/property controls, and clean authoring
UX for NPCs and firefly NPC archetypes.

### Agent 06: Manifest Cook And Publish Guardrails

Owns runtime scene cook, publish readiness, scene architecture audit,
generated drift expectations, and guardrails that reject invalid NPC data.

### Agent 07: Legacy Cleanup And Certification

Owns the final removal pass, dependency search, obsolete field deletion,
generated output recook, and certification checks.

## Shared Files To Watch

High-conflict files:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/engine/runtimeGameplayTypes.ts`
- `apps/game/src/threlte/engine/sceneAdapter.ts`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/SceneDocumentLevel.svelte`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/src/threlte/editor/editorPrefabFactory.ts`
- `apps/game/src/threlte/editor/editorCreateController.ts`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

Agents must announce changes to these files in their final report.

## Coordination Rules

- Agent 01 contract work goes first.
- Agent 02 and Agent 03 may proceed after Agent 01 establishes the NPC shape.
- Agent 04 and Agent 05 must not invent fields outside the Agent 01 contract.
- Agent 06 must enforce the same contract used by runtime and editor code.
- Agent 07 runs after all migration packets land.
- If a worker needs to retain compatibility, it must write the owner, reason,
  and removal condition into the code or packet handoff.
- If a worker finds a broader dependency, it must create a follow-up packet
  instead of slipping unrelated refactors into the patch.
- Scene source changes belong in `apps/game/src/threlte/editor/scenes`.
  Runtime scene JSON must be regenerated through `pnpm --dir apps/game
  cook:runtime-assets -- --level=<levelId>`.

## Required Verification

Every code-changing agent should run:

```bash
pnpm --dir apps/game type-check
```

Agents touching Svelte/TS source should run focused Biome checks on touched
files:

```bash
pnpm --dir apps/game exec biome check <changed files>
```

Agents touching scene data, manifests, publish readiness, or validation should
run:

```bash
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game cook:runtime-assets -- --level=observatory
```

Final certification should run or explicitly explain why it cannot run:

```bash
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

Known current risk: `check:generated-drift` may report unrelated collision
drift in other levels. Do not hide that. Report it as unrelated unless the NPC
work changes those levels.

## Final Report Format

Every agent must report:

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

Risk:
- Known gaps:
- Follow-up work:
```

Every report must also state whether runtime payload size, collision, required
assets, streaming, LOD, and manifest validation were considered.

