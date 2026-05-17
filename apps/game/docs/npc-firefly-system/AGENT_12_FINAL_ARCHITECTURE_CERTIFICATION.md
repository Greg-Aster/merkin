# Agent 12: Final Architecture Certification

## Mission

Perform the final certification pass after Agents 09-11 land. This packet
decides whether the NPC firefly system is actually finished.

## Ownership

This is a review/certification packet. It may make small fixes, but if it finds
large issues it should report blockers rather than silently broadening scope.

Inspect at minimum:

- `apps/game/src/threlte/features/npc/**`
- `apps/game/src/threlte/levels/RuntimeActorNode.svelte`
- `apps/game/src/threlte/levels/RuntimeGameplayRenderer.svelte`
- `apps/game/src/threlte/levels/SceneFireflyField.svelte`
- `apps/game/src/threlte/engine/npcTypes.ts`
- `apps/game/src/threlte/engine/npcValidation.ts`
- `apps/game/src/threlte/engine/npcValidationCore.mjs`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

## Required Searches

Run and classify every result:

```bash
rg -n "gameplay\\.type === ['\\\"]firefly|gameplay\\.type.*firefly|type: ['\\\"]firefly['\\\"]|type === ['\\\"]firefly['\\\"]" apps/game/src apps/game/scripts
rg -n "gameplayFireflyActorCount|maxGameplayFireflyCount|legacyFirefly|LEGACY_FIREFLY" apps/game/src apps/game/scripts
rg -n "startNpcConversation\\(|startNpcConversationFromComponent\\(" apps/game/src/threlte
rg -n "npcActorCount|fireflyNpcActorCount" apps/megameal/public/generated/runtime-game-assets/scenes
```

Allowed remaining references:

- `npc.presentation.type === 'firefly'` and `npc.archetype === 'firefly'`
  under the NPC system.
- Ambient `SceneFireflyField` settings and renderer.
- Publish-pipeline tests that intentionally assert legacy firefly rejection.

Everything else must be deleted, migrated, or reported as a blocker.

## Required Structural Checks

Run a JSON scan that confirms:

- source scenes contain zero `gameplay.type === "firefly"` actors
- runtime scenes contain zero legacy gameplay firefly actors
- Observatory has 3 firefly NPCs
- Solitude has 13 firefly NPCs
- Yggdrasil has 32 firefly NPCs
- all runtime scene build reports include `npcActorCount` and
  `fireflyNpcActorCount`

## Required Validation

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

Run focused Biome on changed source/script files:

```bash
pnpm --dir apps/game exec biome check <changed files>
```

Run browser smoke if the local server/harness is healthy:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

Do not claim whole-system certification if `check:generated-drift` or
`audit:runtime-assets` fails. If those fail only on unrelated collision or
budget debt, report scoped NPC certification and whole-repo blockers
separately.

## Certification Criteria

The NPC firefly system can be certified only when:

- conversation startup has one owner
- NPC cooldown acceptance has one owner
- firefly hit targets follow visible firefly presentation
- editor budget reporting uses NPC firefly counts
- conversation profile validation has one canonical source of truth
- checked runtime manifests satisfy the NPC counter contract
- no source/runtime scene has legacy firefly gameplay actors
- no live runtime/editor path creates or renders legacy firefly gameplay
- all required validation commands pass, or failures are explicitly outside the
  NPC/firefly scope and documented as whole-repo blockers

## Final Report Format

Use this exact shape:

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

Certification:
- NPC firefly scoped certification:
- Whole-repo certification:
- Remaining blockers:

Risk:
- Known gaps:
- Follow-up work:
```

State clearly whether runtime payload size, collision, required assets,
streaming, LOD, and manifest validation were considered.

