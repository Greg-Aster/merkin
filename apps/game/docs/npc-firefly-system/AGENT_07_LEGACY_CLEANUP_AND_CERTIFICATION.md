# Agent 07: Legacy Cleanup And Certification

## Mission

Remove legacy firefly/gameplay cruft after the NPC system is live, then certify
the final architecture. This packet is not optional.

## Ownership

Primary search surfaces:

- `apps/game/src/threlte`
- `apps/game/scripts`
- `apps/game/src/threlte/editor/scenes`
- `apps/megameal/public/generated/runtime-game-assets/scenes`

Likely files:

- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/engine/runtimeGameplayTypes.ts`
- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/sceneAdapter.ts`
- `apps/game/src/threlte/editor/EditorInspectorForm.svelte`
- `apps/game/src/threlte/editor/EditorPropertiesShelf.svelte`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/lib/sceneArchitectureAudit.mjs`

## Required Searches

Run targeted searches and remove or justify every result:

```bash
rg -n "gameplay\\.type === 'firefly'|gameplay\\.type === \"firefly\"|type === 'firefly'|type: 'firefly'" apps/game/src apps/game/scripts
rg -n "interactionMode|dialogueMode|proximityRadius|personalityId|readOnlyDurationMs|onInteractEvent" apps/game/src/threlte apps/game/scripts
rg -n "editor-firefly|editor_node|editor-node|firefly_conversation|editor_firefly" apps/game/src apps/game/scripts
```

Allowed remaining references:

- NPC archetype or presentation type checks under the new NPC system.
- Migration tests that explicitly document the legacy source and expected
  deletion condition.
- Ambient firefly field settings and renderer references.

Everything else must be removed, migrated, or documented as a blocker.

## Requirements

- Delete superseded generic firefly gameplay fields.
- Delete legacy editor controls that write gameplay firefly data.
- Delete or migrate legacy scene data.
- Re-run runtime scene cook for every migrated level.
- Ensure generated runtime scenes do not contain legacy firefly gameplay actors.
- Ensure final validation rejects new legacy firefly authoring.
- Remove compatibility adapters after the migration passes.

## Acceptance Criteria

- Authored interactive fireflies exist only as NPC actors.
- Ambient firefly fields remain scene settings, not NPC actors.
- No live runtime branch renders fireflies through `RuntimeGameplayRenderer`.
- No editor path creates legacy gameplay fireflies.
- No source scene uses `gameplay.type === 'firefly'`.
- Runtime generated scenes are recooked through the owning script.
- Final report lists all remaining references, or states there are none.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game cook:runtime-assets -- --level=observatory
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

If levels beyond Observatory were migrated, cook those levels too.

## Handoff Notes

The final handoff must include:

- Architecture impact section from `apps/game/AGENTS.md`.
- Validation section with every command result.
- Risk section with any remaining drift or budget issue.
- A concise list of deleted legacy files, fields, or references.
- Confirmation that runtime payload size, collision, required assets,
  streaming, LOD, and manifest validation were considered.

