# Agent 07: Release Gate And Generated Drift Fix

## Mission

Make the terrain pipeline pass the current integration gates without weakening
the contract.

The latest audit showed:

- `pnpm --dir apps/game audit:engine` fails for terrain/render profile issues.
- `pnpm --dir apps/game check:generated-drift` fails for observatory terrain
  manifest/runtime scene drift.
- Observatory runtime scene output is missing the render profile required by
  the audit.

## Read First

- `apps/game/AGENTS.md`
- `apps/game/docs/terrain-asset-pipeline-audit.md`
- `apps/game/docs/terrain-asset-pipeline-agents/AGENT_00_COORDINATION.md`

## Ownership

Primary files:

- `apps/game/scripts/audit-engine-architecture.mjs`
- `apps/game/scripts/check-generated-drift.mjs`
- `apps/game/scripts/lib/runtimeSceneManifest.mjs`
- `apps/game/scripts/lib/terrainContractAudit.mjs`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/generated/runtime-game-assets/scenes/*.runtime-scene.json`

Secondary files if needed:

- `apps/game/src/threlte/engine/sceneDocumentTypes.ts`
- `apps/game/src/threlte/engine/runtimeAssetManifest.ts`
- `apps/megameal/public/generated/runtime-game-assets/manifest.json`

## Requirements

1. Inspect the exact current failures from:

   ```bash
   pnpm --dir apps/game audit:engine
   pnpm --dir apps/game check:generated-drift
   ```

2. Fix real drift. Do not silence checks unless the check is demonstrably
   wrong.

3. Ensure every cooked runtime scene manifest includes the authored
   `renderProfile` expected by the architecture audit.

4. Ensure scene terrain settings, terrain manifests, and cooked runtime scene
   manifests agree on:

   - terrain runtime mode
   - authoritative visual source
   - fallback surface policy
   - render profile
   - terrain manifest URL

5. Regenerate runtime outputs using the existing cook command. Do not hand-edit
   generated runtime scene JSON unless the generator is broken and you also fix
   the generator.

## Non-Goals

- Do not migrate observatory to real source GLB chunks unless you also own the
  source GLB asset and cook path.
- Do not delete terrain chunks.
- Do not hard-code level IDs in generic audit/runtime code.

## Acceptance Criteria

- `audit:engine` passes or has only documented non-terrain failures.
- `check:generated-drift` passes or has only documented non-terrain failures.
- Runtime scene output is reproducible from source scene data.
- Any remaining terrain warning is tied to an explicit migration status.

## Verification

Run:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game cook:runtime-assets
pnpm --dir apps/game audit:engine
pnpm --dir apps/game check:generated-drift
```

Final report must include the exact commands run and whether generated files
were changed.
