# Agent 17: Agent 16 Retry Certification

## Mission

Retry the Agent 16 certification work now that the build precondition is no
longer blocking. This is not a new architecture packet. It is a narrow
continuation of `AGENT_16_GENERATED_DRIFT_AND_FINAL_CERTIFICATION.md`.

The previous Agent 16 attempt stopped because `pnpm --dir apps/game build`
reported a manual chunk cycle. The live workspace has since been verified to
build successfully. Do not stop on that stale blocker without rerunning the
build yourself.

## Current Verified State

These checks were verified after the stale Agent 16 report:

- `pnpm --dir apps/game build` passes.
- `pnpm --dir apps/game type-check` passes.
- `pnpm --dir apps/game test:publish-pipeline` passes, 100/100.
- `pnpm --dir apps/game exec node scripts/audit-chunk-ownership.mjs` passes.
- `startNpcConversationFromComponent` exists and is exported from the NPC
  barrel.
- `RuntimeNpcInteractionTarget.svelte` is generic and no longer imports firefly
  presentation helpers.
- `RuntimeFireflyNpc.svelte` owns firefly motion and passes the same
  `motionOffset` to `ManagedLight`, `StarSprite`, and
  `RuntimeNpcInteractionTarget`.

The remaining blockers are generated/certification blockers, not Agent 14/15
source repair blockers.

## Read First

Read these files before editing:

- `apps/game/AGENTS.md`
- `apps/game/docs/npc-firefly-system/AGENT_13_POST_AUDIT_REPAIR_COORDINATION.md`
- `apps/game/docs/npc-firefly-system/AGENT_16_GENERATED_DRIFT_AND_FINAL_CERTIFICATION.md`
- this file

## Ownership

Primary scope:

- `apps/game/src/threlte/editor/scenes/miranda.scene.json`
- `apps/game/src/threlte/editor/scenes/sci-fi-room.scene.json`
- generated collision products referenced by Miranda and sci-fi-room
- `apps/megameal/public/generated/runtime-game-assets/scenes/miranda.runtime-scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/sci-fi-room.runtime-scene.json`
- `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`

Dependency churn classification:

- `apps/game/package.json`
- `pnpm-lock.yaml`

Do not hand-edit generated runtime scene JSON, generated collision fingerprints,
cache keys, or generated build-report fields. Use the owning bake/cook scripts.

## Required Work

### 1. Reconfirm Preconditions

Run:

```bash
pnpm --dir apps/game build
pnpm --dir apps/game type-check
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game exec node scripts/audit-chunk-ownership.mjs
```

If any of these fail, report the current failure with file-level ownership. Do
not reuse the older manual chunk-cycle result unless it still reproduces.

### 2. Repair Miranda And Sci-Fi Collision Drift

`check:generated-drift` and `audit:runtime-assets` currently fail because
Miranda and sci-fi-room reference stale generated collision products made by
`mesh-collision-manager-v1`.

Use the owning bake/cook path. Inspect script help/source before broad writes.
Candidate commands to evaluate:

```bash
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=miranda
pnpm --dir apps/game bake:scene-mesh-colliders -- --level=sci-fi-room
pnpm --dir apps/game cook:runtime-assets -- --level=miranda
pnpm --dir apps/game cook:runtime-assets -- --level=sci-fi-room
pnpm --dir apps/game cook:runtime-assets
```

If the script interface differs, use the actual script-owned interface and
document the command.

### 3. Recook Runtime Manifests

After collision products are repaired, recook the runtime manifests through the
owning runtime asset cook. The final checked runtime scene manifests must have
explicit NPC counters:

- `npcActorCount`
- `fireflyNpcActorCount`

For Miranda and sci-fi-room these should be explicit zeroes unless NPC actors
are added later.

### 4. Remove Or Resolve Temporary Counter Compatibility

Agent 10 added temporary compatibility for non-NPC runtime scene manifests
missing NPC counters.

Once all checked runtime scene manifests contain explicit counters:

- remove the temporary defaulting path from
  `apps/game/src/threlte/engine/runtimeSceneManifest.ts`
- remove the temporary normalizer from
  `apps/game/scripts/check-generated-drift.mjs`
- update tests so missing NPC counters are rejected for every runtime scene
  manifest, including non-NPC scenes

If a real blocker prevents this removal, keep the compatibility but report the
owner, reason, and exact deletion condition.

### 5. Remove Stale Legacy Report Shape

No checked runtime scene build report should contain:

- `gameplayFireflyActorCount`
- `maxGameplayFireflyCount`

NPC reporting should use:

- `npcActorCount`
- `fireflyNpcActorCount`
- `maxFireflyNpcCount` where a budget field is needed

### 6. Classify Dependency Churn

The worktree still contains dependency churn removing `postprocessing` and
`threlte-postprocessing` from `apps/game/package.json` and `pnpm-lock.yaml`.

Classify it before final certification:

- If the removal belongs to NPC/firefly work, explain why and verify no runtime
  import depends on those packages.
- If it is unrelated dirty-tree work, leave it alone and report it as outside
  this packet.
- If the packages are still required, restore them with a minimal package and
  lockfile change and document why.

Do not expand this packet into unrelated rendering cleanup.

### 7. Do Not Hide Yggdrasil Budget Warnings

`audit:runtime-assets` has reported Yggdrasil triangle budget warnings:

- combined triangles over budget
- mobile certification triangles over budget
- desktop certification triangles over budget
- tv certification triangles over budget

Either resolve these, explicitly accept them with evidence, or report them as
remaining whole-repo certification blockers. Do not suppress the warnings.

## Required Searches

Run and classify:

```bash
rg -n "gameplayFireflyActorCount|maxGameplayFireflyCount|legacyFirefly|LEGACY_FIREFLY" apps/game/src apps/game/scripts apps/megameal/public/generated/runtime-game-assets/scenes
rg -n "gameplay\\.type === ['\\\"]firefly|gameplay\\.type.*firefly|type: ['\\\"]firefly['\\\"]|type === ['\\\"]firefly['\\\"]" apps/game/src apps/game/scripts
rg -n "npcActorCount|fireflyNpcActorCount" apps/megameal/public/generated/runtime-game-assets/scenes
rg -n "postprocessing|threlte-postprocessing" apps/game/src apps/game/scripts apps/game/package.json
```

Allowed firefly references:

- NPC archetype and NPC presentation references
- ambient `SceneFireflyField` references
- tests that intentionally assert legacy firefly rejection

## Required Structural Scan

Run a JSON scan that confirms:

- source scenes contain zero `gameplay.type === "firefly"` actors
- runtime scenes contain zero legacy gameplay firefly actors
- Observatory has 3 firefly NPCs
- Solitude has 13 firefly NPCs
- Yggdrasil has 32 firefly NPCs
- Miranda has explicit `npcActorCount: 0` and `fireflyNpcActorCount: 0`
- sci-fi-room has explicit `npcActorCount: 0` and `fireflyNpcActorCount: 0`
- no runtime scene build report contains `gameplayFireflyActorCount`

## Required Validation

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game build
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game check:generated-drift
pnpm --dir apps/game audit:runtime-assets
```

Run focused Biome on changed source/script files:

```bash
pnpm --dir apps/game exec biome check <changed source/script files>
```

Run browser smoke if the shared server and harness are healthy:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If browser smoke fails because the server or harness is unhealthy, report that
separately from runtime manifest certification.

## Certification Criteria

Whole-repo certification is allowed only when:

- `type-check`, `build`, `test:publish-pipeline`, `check:generated-drift`, and
  `audit:runtime-assets` pass
- generated runtime manifests are current and produced by the owning cook script
- Miranda and sci-fi-room no longer report stale v1 collision products
- all checked runtime manifests include explicit NPC counters
- temporary NPC-counter compatibility is removed, or its remaining blocker is
  explicitly documented with a deletion condition
- stale legacy firefly report fields are gone from generated manifests
- dependency churn is owned and explained
- Yggdrasil budget warnings are resolved, explicitly accepted with evidence, or
  reported as blockers

Do not call the NPC firefly system fully certified while generated drift or
runtime asset audit fails.

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
