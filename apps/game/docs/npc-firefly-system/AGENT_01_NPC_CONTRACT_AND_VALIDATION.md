# Agent 01: NPC Contract And Validation

## Mission

Create the authoritative NPC data contract for source scenes and runtime
manifests. Fireflies must become one NPC archetype under this contract, not
loose generic gameplay fields.

This packet is the foundation for all other packets.

## Ownership

Primary files:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/types.ts`
- `apps/game/src/threlte/engine/levelValidation.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/src/threlte/engine/sceneAdapter.ts`

Create new files if appropriate:

- `apps/game/src/threlte/engine/npcTypes.ts`
- `apps/game/src/threlte/engine/npcValidation.ts`
- `apps/game/src/threlte/engine/npcValidationCore.mjs`

Secondary files if needed:

- `apps/game/src/threlte/engine/runtimeGameplayTypes.ts`
- `apps/game/scripts/test-publish-pipeline.ts`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`

## Requirements

Define a typed NPC component for editor scene nodes and runtime actors. The
contract must separate:

- identity: NPC id, display name, archetype
- interaction: enabled state, click mode, prompt, cooldown, event key
- conversation: none, read-only, or profile-backed conversation
- behavior: static or hover-wander for the first slice
- presentation: firefly presentation config for the first archetype
- state: optional runtime/save-state keys

Use a narrow first version. Do not add proximity unless Agent 02 implements a
real proximity trigger in the same staged change. If proximity is deferred, the
valid interaction modes are only:

- `disabled`
- `click`

Add validation for:

- duplicate NPC ids
- missing NPC id
- unsupported interaction mode
- `profile` conversation without `personalityId`
- `read-only` conversation without body text
- firefly presentation missing color, size, or light budget values
- hover-wander behavior with invalid radius or speed
- legacy `gameplay.type === 'firefly'` in source scenes once migration begins

Validation may start as warnings during migration, but the packet must document
the exact condition that turns each warning into an error.

## Current Code To Replace

Absorb and then remove these loose fields from generic gameplay types when
downstream packets are ready:

- `archetype`
- `interactionMode`
- `interactionPrompt`
- `proximityRadius`
- `interactionCooldownMs`
- `dialogueMode`
- `npcId`
- `personalityId`
- `readOnlyDurationMs`
- `onInteractEvent`
- firefly-specific light boost fields

Do not leave these fields as the long-term NPC API.

## Acceptance Criteria

- Source scene nodes can carry a typed `npc` component.
- Runtime actors can carry a typed `npc` component.
- Runtime scene cook preserves the NPC component.
- Validation reports invalid NPC data with actor ids and field names.
- The old firefly gameplay shape is marked as a migration-only legacy shape.
- No editor or runtime code needs to guess NPC behavior from generic gameplay
  fields.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check apps/game/src/threlte/engine/sceneDocumentTypes.ts apps/game/src/threlte/engine/types.ts apps/game/src/threlte/engine/levelValidation.ts apps/game/scripts/lib/runtimeSceneManifest.mjs
pnpm --dir apps/game test:publish-pipeline
```

If the publish-pipeline tests need new NPC fixtures, add them in this packet.

## Handoff Notes

Report the final NPC type names and the exact files other agents should import
from. Also report whether the old `gameplay.type === 'firefly'` path is still
temporarily accepted, and what packet is responsible for deleting it.

