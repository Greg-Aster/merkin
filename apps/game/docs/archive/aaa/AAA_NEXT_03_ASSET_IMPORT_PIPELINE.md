# AAA Next 03: Real Asset Import Pipeline

## Goal

Create a repeatable source-to-runtime asset import pipeline with conventions, validation, provenance, and cooked output rules. The engine should not depend on hand-managed generated artifacts.

## Coordination

Before starting, read `AAA_NEXT_AGENT_COORDINATION.md`. This agent owns import conventions and cooked asset provenance. Coordinate with material, LOD, CI, and editor agents before changing manifest schemas or generated output location.

## Agent Assignment

Turn loose asset drops into a reproducible source-to-runtime contract. Your job is to define and validate the first import slice so another agent can add assets without guessing folder names, metadata fields, or cooking expectations.

Priority target: pick one asset family already referenced by a deployed level and make its source ownership, material policy, collision policy, and runtime variants explicit.

## Current Baseline

- Runtime assets are cooked into `apps/megameal/public/generated/runtime-game-assets`.
- The manifest records source metadata, cooked variants, platform profiles, impostor entries, and content-build provenance.
- Generated assets exist, but the authoring source contract is still loose.

## Target Architecture

Asset import should be a defined pipeline:

```txt
source asset drop
  -> import manifest
  -> validation
  -> optimization and cooking
  -> runtime manifest
  -> level/editor readiness
```

Each runtime asset should answer:

- What source file produced it?
- Which build produced it?
- Which level requires or optionally streams it?
- Which platform variants exist?
- Which textures/material slots are authored or exempt?
- Which collision asset pairs with it, if any?

## Work Packages

1. Define source folders and naming.
   - Identify where raw source assets belong.
   - Separate source GLB, source textures, generated variants, and runtime cooked variants.
   - Add naming rules for hero assets, set dressing, prefabs, terrain, collision, and impostors.

2. Add an import manifest.
   - Track source path, authoring tool, license/source note, intended levels, material policy, collision policy, and target budgets.
   - Keep it human-editable and machine-validatable.

3. Add validation before cooking.
   - Fail missing source files.
   - Fail ambiguous duplicate asset ids.
   - Warn on oversized textures, missing material provenance, missing collision pairing, and missing owner/status.

4. Stabilize generated output.
   - Generated filenames should be deterministic when source and settings are unchanged.
   - Avoid timestamp churn unless the content hash changes.
   - Keep `manifest.previous.json` meaningful for rollback.

5. Connect editor readiness.
   - Editor publish UI should tell creators when a scene references an asset that lacks import metadata.

## Key Files

- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetVariantCooker.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/src/threlte/editor/editorPublishReadiness.ts`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`
- `apps/megameal/public/generated/runtime-game-assets/manifest.previous.json`

## Validation

Run:

```bash
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game report:graphics-backlog:write
pnpm --dir apps/game type-check
```

If generated artifacts changed, also run:

```bash
pnpm --dir apps/game smoke:boot
pnpm --dir apps/game smoke:visual
```

## Do Not

- Do not move large source assets into runtime public output.
- Do not make generated filenames randomly churn.
- Do not weaken manifest validation to accept incomplete source metadata.
- Do not mix collision source assets into render source ownership.

## Done Means

- Import metadata exists for the selected asset family.
- Cooked output is reproducible from source metadata.
- Runtime manifest provenance is clear.
- Editor readiness can report missing import metadata.
