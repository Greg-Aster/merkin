# Agent 16: Generated Drift And Final Certification

## Mission

After Agents 14 and 15 land, finish whole-repo certification or report the
remaining non-NPC blockers with exact ownership. This packet must not hide
generated drift or keep temporary compatibility longer than needed.

## Preconditions

Do not start this packet until:

- `pnpm --dir apps/game build` passes
- Agent 14 has fixed the public NPC conversation bridge
- Agent 15 has fixed firefly target motion ownership

If those are not true, stop and report that Agent 16 is blocked.

## Ownership

Primary files and generated products:

- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`
- `apps/game/src/threlte/editor/scenes/miranda.scene.json`
- `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json`
- generated collision products referenced by Miranda and sci-fi-room
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

Dependency churn classification:

- `apps/game/package.json`
- `pnpm-lock.yaml`

Do not hand-edit generated runtime scene JSON. Regenerate it through the owning
cook script.

## Requirements

### Repair Generated Collision Drift

`check:generated-drift` and `audit:runtime-assets` currently fail because
Miranda and sci-fi-room still reference stale generated collision products made
by `mesh-collision-manager-v1`.

Use the owning collision bake/cook scripts. Inspect the script options before
running broad writes. Candidate commands to evaluate include:

```bash
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=miranda
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=sci-fi-room
pnpm --dir apps/game cook:runtime-assets -- --level=miranda
pnpm --dir apps/game cook:runtime-assets -- --level=sci-fi-room
pnpm --dir apps/game cook:runtime-assets
```

If the actual scripts use different flags, use the script-owned interface and
document it. Do not patch fingerprints, cache keys, or generated build-report
fields by hand.

### Remove Temporary NPC Counter Compatibility When Possible

Agent 10 added temporary compatibility for non-NPC runtime manifests missing
`npcActorCount` and `fireflyNpcActorCount`.

Once all checked runtime scene manifests can be recooked successfully and
contain explicit zero counters for non-NPC scenes:

- remove the temporary defaulting path in
  `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- remove the temporary normalizer in
  `apps/game/scripts/check-generated-drift.mjs`
- update publish-pipeline tests that currently expect temporary defaulting
- make missing NPC counters a validation error for all runtime scene manifests

If collision blockers still prevent a full recook, do not delete the temporary
compatibility blindly. Report the exact blocker and keep the owner/reason/removal
condition visible.

### Remove Stale Legacy Report Shape

After successful recook, no checked runtime scene build report should include:

- `gameplayFireflyActorCount`
- `maxGameplayFireflyCount`

NPC firefly reporting should use:

- `npcActorCount`
- `fireflyNpcActorCount`
- `maxFireflyNpcCount` where a budget field is needed

### Classify Dependency Churn

The previous audit found unreported changes removing `postprocessing` and
`threlte-postprocessing` from `apps/game/package.json` and the lockfile.

Classify this before final certification:

- If the removal belongs to this NPC/firefly work, explain why it is required
  and verify no runtime import depends on those packages.
- If the removal is unrelated dirty-tree work, leave it alone but report it as
  outside this packet.
- If the packages are still required for the game build/runtime, restore them
  with a minimal package/lockfile change and document the owner.

Do not mix unrelated rendering cleanup into this packet.

### Yggdrasil Budget Warnings

`audit:runtime-assets` has reported Yggdrasil triangle budget warnings. Do not
hide these warnings.

Acceptable outcomes:

- optimize or recook assets so the warnings clear
- update a budget only with explicit rationale and evidence that the target is
  acceptable for the intended platform tier
- report the warnings as remaining whole-repo certification blockers

## Required Structural Checks

Run a JSON scan that confirms:

- source scenes contain zero `gameplay.type === "firefly"` actors
- runtime scenes contain zero legacy gameplay firefly actors
- Observatory has 3 firefly NPCs
- Solitude has 13 firefly NPCs
- Yggdrasil has 32 firefly NPCs
- every checked runtime scene build report includes `npcActorCount` and
  `fireflyNpcActorCount`
- no checked runtime scene build report includes `gameplayFireflyActorCount`

## Required Searches

Run and classify:

```bash
rg -n "gameplayFireflyActorCount|maxGameplayFireflyCount|legacyFirefly|LEGACY_FIREFLY" apps/game/src apps/game/scripts apps/megameal/public/generated/runtime-game-assets/scenes
rg -n "gameplay\\.type === ['\\\"]firefly|gameplay\\.type.*firefly|type: ['\\\"]firefly['\\\"]|type === ['\\\"]firefly['\\\"]" apps/game/src apps/game/scripts
rg -n "npcActorCount|fireflyNpcActorCount" apps/megameal/public/generated/runtime-game-assets/scenes
rg -n "postprocessing|threlte-postprocessing" apps/game/src apps/game/scripts apps/game/package.json
```

Allowed remaining firefly references:

- NPC archetype and NPC presentation references
- ambient `SceneFireflyField` references
- tests that assert legacy firefly rejection

## Required Validation

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game build
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

Run focused Biome on changed source/script files:

```bash
pnpm --dir apps/game exec biome check <changed source/script files>
```

Run browser smoke if the shared server/harness is healthy:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If browser smoke fails because the server or harness is unhealthy, report that
separately from runtime manifest certification.

## Certification Criteria

Whole-repo certification is allowed only when:

- `build`, `type-check`, `test:publish-pipeline`, `check:generated-drift`, and
  `audit:runtime-assets` pass
- generated runtime manifests are current and produced by the owning cook script
- temporary NPC-counter compatibility is removed, or its remaining blocker is
  explicitly outside this packet with a deletion condition
- Miranda and sci-fi-room no longer report stale v1 collision products
- Yggdrasil budget warnings are resolved or explicitly accepted with evidence
- package/lockfile dependency churn is owned and explained

If any required command fails, report scoped NPC status separately from
whole-repo status. Do not call the system done.

## Handoff Notes

Use this report shape:

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
