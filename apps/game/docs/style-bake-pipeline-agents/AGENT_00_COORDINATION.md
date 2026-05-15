# Agent 00: Style Bake Pipeline Coordination

## Read First

Read this file before starting any style bake pipeline task.

Also read:

- `apps/game/AGENTS.md`
- `apps/game/src/threlte/editor/EditorStyleStudio.svelte`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/scripts/bake-style-asset.mjs`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`

## Goal

Build a AAA-quality editor-owned style bake pipeline for stylized game assets.
The final system must let the level editor apply a high-quality art direction to
objects and bake the result into normal runtime assets, without depending on
runtime post-processing, manual per-mesh painting, or hidden one-off scripts.

Target pipeline:

```txt
editor scene object
  -> source asset resolution
  -> StyleBakeManager job contract
  -> deterministic style bake backend
  -> Blender headless geometry-aware bake
  -> glTF optimize / prune / texture budget pass
  -> generated style product metadata
  -> editor apply / preview / revert
  -> publish validation
  -> runtime asset cook / manifest
```

## Current State

A first vertical slice exists:

- `apps/game/scripts/bake-style-asset.mjs` creates deterministic procedural
  PBR-style textures and embeds them into a generated GLB.
- `apps/game/scripts/editor-tools/styleRoutes.cjs` exposes
  `/api/style/bake-procedural`.
- `apps/game/src/threlte/editor/editorStyleApi.ts` exposes
  `bakeProceduralStyleAsset`.
- `apps/game/src/threlte/editor/editorStyleController.ts` can bake the selected
  asset and apply the generated GLB to the selected node.
- `apps/game/src/threlte/editor/EditorStyleStudio.svelte` has a
  `Bake Procedural Style` button.

This is not the finished system. It is a functional seed path that must be
formalized behind a manager, metadata contract, publish validation, and a
Blender headless bake backend.

## Non-Negotiable Architecture Rules

- Do not add runtime post-process effects as the solution.
- Do not make users manually paint or edit every mesh.
- Do not special-case level IDs in generic style bake systems.
- Do not create hidden side effects in Svelte components.
- Do not let publish use stale style-baked assets when the source asset or bake
  settings changed.
- Do not let generated GLBs become untracked loose outputs without metadata.
- Do not weaken runtime asset budgets to hide expensive style products.
- Do not retain temporary bridge code without an owner and removal condition.
- Do not make AI texture generation the authoritative deterministic bake path.
  AI can remain an optional art-source workflow only.

## Target Contracts

The system needs a shared style bake product contract. Use names consistent with
the existing codebase, but the contract must represent:

```ts
type StyleBakeMode =
  | 'procedural-material'
  | 'blender-geometry'
  | 'ai-texture-source'

type StyleBakeStatus =
  | 'clean'
  | 'dirty'
  | 'missing'
  | 'failed'

interface StyleBakeSourceRef {
  assetUrl: string
  assetFingerprint: string
  nodeId: string
  levelId: string
}

interface StyleBakeSettings {
  profileId: string
  textureSize: number
  lineStrength: number
  brushStrength: number
  aoStrength: number
  cavityStrength: number
  curvatureStrength: number
  geometrySimplification: number
  outputTier: 'preview' | 'runtime' | 'hero'
}

interface StyleBakeProduct {
  assetUrl: string
  metadataUrl: string
  source: StyleBakeSourceRef
  settings: StyleBakeSettings
  generator: string
  generatedAt: string
  status: StyleBakeStatus
}
```

Do not copy this exact shape blindly if the existing scene/runtime contracts
already have a better place for the fields. Preserve local architecture.

## Agent Boundaries

### Agent 01: Style Bake Contract And Manager

Owns the shared product contract, stale detection, job state, and a manager
surface that editor controllers can call.

### Agent 02: Blender Headless Bake Backend

Owns Blender Python automation for geometry-aware AO, cavity, curvature, bevel,
normal cleanup, optional line geometry, and export.

### Agent 03: Editor UX And Controls

Owns editor controls, preview/revert/apply workflow, status text, and keeping
Style Studio focused on baked asset generation.

### Agent 04: Runtime Asset Cook And Publish Validation

Owns publish readiness, stale product blockers, runtime asset cooking, texture
budget checks, and manifest/audit integration.

### Agent 05: Batch, Cache, And Level-Wide Bake

Owns multi-object bake, job queueing, cache keys, resumability, and avoiding
duplicate generated products.

### Agent 06: Tests, Audit, And Cruft Removal

Owns test coverage, drift checks, legacy path removal, and final integration
verification.

## Shared Files To Watch

High-conflict files:

- `apps/game/src/threlte/editor/EditorStyleStudio.svelte`
- `apps/game/src/threlte/editor/EditorStyleTabHost.svelte`
- `apps/game/src/threlte/editor/editorStyleApi.ts`
- `apps/game/src/threlte/editor/editorStyleController.ts`
- `apps/game/src/threlte/editor/editorPanelPropBuilders.ts`
- `apps/game/src/threlte/editor/EditorPanel.svelte`
- `apps/game/scripts/editor-tools/styleRoutes.cjs`
- `apps/game/scripts/editor-tools/styleRuntimeContext.cjs`
- `apps/game/scripts/bake-style-asset.mjs`
- `apps/game/scripts/cook-runtime-assets.mjs`
- `apps/game/scripts/lib/runtimeAssetCookManifest.mjs`
- `apps/game/scripts/lib/runtimeAssetManifestAudit.mjs`
- `apps/game/scripts/test-publish-pipeline.ts`
- `apps/game/src/threlte/editor/scenes/*.scene.json`
- `apps/megameal/public/generated/style-lab/**`

Agents must announce changes to these files in their final report.

## Coordination Rules

- Contract work should land before broad editor or publish changes.
- Backend agents should return generated products through the StyleBakeManager
  contract, not through ad hoc route-specific payloads.
- Editor agents should not duplicate bake logic in Svelte components.
- Publish/audit agents should not relax validation just because current
  generated products are incomplete.
- Batch agents should use the same single-object path for each object. Do not
  create a second batch-only bake implementation.
- Generated assets must be produced by scripts or API routes, not hand-edited.
- If an agent finds a current field or helper is obsolete, it must prove no live
  imports, scene data, or tests still depend on it before deleting it.

## Required Verification

Every code-changing agent should run:

```bash
pnpm --dir apps/game type-check
```

Agents touching style bake scripts or API routes should also run a focused bake:

```bash
pnpm --dir apps/game bake:style-asset -- --input <source.glb> --output /tmp/style-bake-test.glb --texture-size 64
pnpm --dir apps/game exec gltf-transform inspect /tmp/style-bake-test.glb --format md
```

Agents touching publish or runtime asset cooking should run:

```bash
pnpm --dir apps/game test:publish-pipeline
pnpm --dir apps/game audit:runtime-assets
```

Agents touching editor UX should run a smoke check when feasible:

```bash
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If a command cannot be run, report why and identify the remaining risk.

## Final Report Format

Each agent must report:

- files changed
- contract fields added or removed
- generated assets changed, if any
- commands run
- runtime payload impact
- publish/readiness impact
- remaining validation gaps
- compatibility or legacy paths deleted
