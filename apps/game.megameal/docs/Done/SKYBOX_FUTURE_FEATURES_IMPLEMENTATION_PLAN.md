# Skybox Portal Arena Equirectangular Implementation Record

Status: portal arena equirectangular production opt-in implemented on
2026-06-06; weather, clouds, import UI, cooked environment products, richer
probe enhancements, and quality tiers remain future work

This file records the saved skybox backlog as the portal arena implementation
slice plus remaining future work. The filename is retained for existing doc
links.

The goal is not to ship a full weather, cloud, and environment-editor stack in
one pass. The goal is to prove the production scene-environment pipeline beyond
cubemaps by moving one real runtime scene to a non-cubemap environment through
the existing `SkyboxEnvironmentContract`, with validation and cleanup strong
enough that later AAA-tier sky work has a durable foundation.

## Implemented Goal

Ship one production-authored non-cubemap scene environment through the current
manifest-backed architecture.

Target scene: `portal_arena_runtime`

Target environment mode: `equirectangular-environment`

Reason:

```text
portal_arena_runtime is the default scene and the navigation hub. Moving it
first proves the authored environment path where users land, without coupling
the work to Observatory, Miranda, Sci Fi Room, or old-engine migration churn.
```

Implemented state:

- `portal_arena_runtime` no longer uses `cubemap_classic_sky` as its production
  render-profile environment.
- A content-owned equirectangular environment asset is registered through the
  game asset manifest path, preloaded by the selected runtime scene, and listed
  in readiness when required.
- The asset ID is `texture_portal_arena_equirectangular_sky`.
- The environment is projected only by the Three adapter through
  `Scene.background` and `Scene.environment`.
- The runtime-scene and scene-environment contract tests cover the new
  production opt-in and at least one negative readiness/projection failure.
- Docs and the contract register state that one production scene now uses a
  non-cubemap environment, while other advanced sky/weather features remain
  planned.

## Architecture Rules

- Extend `RenderProfileData.environment`, asset manifests, rendering module
  contracts, and renderer adapters only where the current contract requires it.
- Runtime scenes must reference stable environment asset IDs. No Svelte,
  gameplay system, page shell, or renderer fallback may choose hidden sky media.
- Visible background and environment lighting remain explicit authored data.
- Required environment media must participate in preload and readiness when a
  scene depends on it for first playable render.
- Video sky audio remains outside this packet and must stay owned by audio
  manifests and audio events.
- Renderer-side resource mutation must be tracked and restored on scene unload
  or adapter disposal.
- Do not import old `apps/game` skybox, Threlte, editor, or generated runtime
  code.

## Packet 0: Verify Baseline

Owner files to inspect before editing:

- `src/game/assets/skyboxAssets.ts`
- `src/game/assets/portalArenaAssets.ts`
- `src/game/levels/renderProfiles.ts`
- `src/game/levels/runtimeSceneManifests.ts`
- `src/engine/data/schemas/index.ts`
- `src/engine/modules/rendering/index.ts`
- `src/engine/adapters/three/index.ts`
- `scripts/test-scene-environment-contract.ts`
- `scripts/test-runtime-scene-contract.ts`

Baseline before the production opt-in:

- Runtime scenes used `cubemap-skybox` before this packet. After completion,
  `portal_arena_runtime` uses `equirectangular-environment`, while other
  current production scenes remain on their authored cubemap environments unless
  explicitly changed.
- The schema already accepts `equirectangular-environment`.
- Texture assets can declare `projection: "equirectangular"`.
- The Three adapter already projects equirectangular textures and PMREM
  environment lighting.
- `test:scene-environment-contract` already has positive and negative coverage
  for equirectangular projection validation.

Stop condition:

- If any baseline point is false, repair the contract foundation first and do
  not continue into production scene opt-in.

## Packet 1: Add Production Environment Asset

Implemented work:

- Add a production-owned portal arena environment texture under a content-owned
  path:

```text
public/assets/environment/portal-arena/portal-arena-sky-equirectangular.png
```

- Register it in `src/game/assets/skyboxAssets.ts` with:

```ts
id: "texture_portal_arena_equirectangular_sky"
kind: "texture"
projection: "equirectangular"
colorSpace: "srgb"
tags: ["skybox", "environment", "portal-arena"]
```

- Add the asset to `portalArenaAssetManifest`.
- Keep the existing sample equirectangular and sample video assets as contract
  test fixtures only. Do not use sample assets as the production scene sky.
- Asset provenance: copied from the existing checked-in 2:1 panorama
  `public/assets/skyboxes/170645ae-3f1f-47db-b920-226e61838ab7.png` into
  `public/assets/environment/portal-arena/portal-arena-sky-equirectangular.png`.
  No generated runtime artifact, cook output, or conversion command owns this
  asset.

Completion criteria:

- The asset is owned by game content, not by the renderer or app shell.
- The asset path exists under `public/assets`.
- The asset manifest validates without registering the full runtime catalog as
  a substitute for selected-scene ownership.

## Packet 2: Opt Portal Arena Into Equirectangular Environment

Implemented work:

- Update `portalArenaRenderProfile.environment` to:

```ts
{
  kind: "equirectangular-environment",
  assetId: "texture_portal_arena_equirectangular_sky",
  backgroundIntensity: 1,
  backgroundBlurriness: 0,
  environmentIntensity: 0.8,
  requiredForReadiness: true,
}
```

- Tune only the environment values needed for a stable first-pass visual
  result. Do not retune unrelated portal, terrain, lighting, audio, collision,
  or controls behavior in this packet.
- Replace `cubemap_classic_sky` with
  `texture_portal_arena_equirectangular_sky` in
  `portalArenaRuntimeSceneManifest.readiness.requiredAssetIds`.
- Keep other runtime scenes on their current cubemap environments unless this
  packet explicitly validates them.

Completion criteria:

- The default runtime scene is the first production non-cubemap consumer.
- Portal arena preload/readiness fails if the new environment asset is missing.
- No hidden renderer fallback chooses a cubemap when the authored environment is
  absent or invalid.

## Packet 3: Strengthen Focused Validation

Expected work:

- Keep `scripts/test-scene-environment-contract.ts` as the owner for accepted
  environment variants and invalid environment data.
- Keep `scripts/test-runtime-scene-contract.ts` as the owner for runtime scene
  preload/readiness failures.
- Add narrow coverage for the production portal arena opt-in:
  - portal arena render profile uses `equirectangular-environment`,
  - the referenced asset has `projection: "equirectangular"`,
  - the asset is in the selected scene asset manifest,
  - the required environment asset is in selected-scene readiness,
  - a missing or wrong-projection portal arena environment fails validation.
- Do not add broad catch-all tests or duplicate scene validation helpers if an
  existing focused owner can be extended cleanly.

Completion criteria:

- Positive and negative validation proves the production scene opt-in.
- Test failure messages identify the broken contract directly.

## Packet 4: Update Documentation And Register State

Implemented work:

- Update `ENGINE_CONTRACT_REGISTER.md` so `SkyboxEnvironmentContract` and the
  active migration status say the default portal arena scene uses a manifest
  owned equirectangular environment.
- Update `GAME_ENGINE_DESIGN_DOCUMENT.md` current implementation status so it
  says portal arena uses the equirectangular asset while non-portal production
  scenes remain on their authored cubemaps.
- Update `ARCHITECTURE.md` scene environment notes with the same current-state
  truth.
- Keep `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` and
  `docs/Done/SKYBOX_CUBEMAP_SYSTEM_REVIEW.md` as completed foundation records.
- Keep this file under `docs/Done/` as the completed portal opt-in record and
  future feature tracker unless a later cleanup intentionally moves it.

Completion criteria:

- Docs distinguish three states clearly:
  - completed cubemap/foundation work,
  - implemented portal arena equirectangular production opt-in,
  - deferred weather, clouds, import UI, cooked products, and richer probes.

## Packet 5: Cleanup And Handoff

Expected work:

- Remove unused imports, dead exports, scratch files, temporary probes, and
  generated artifacts that are not intentionally owned.
- Confirm no audio files were touched by this skybox packet.
- Confirm no old `apps/game` code was imported or copied.
- Record validation results in the final handoff.

Completion criteria:

- The changed-file list is scoped to sky/environment assets, manifests, render
  profile, focused tests, and docs.
- Any unrelated dirty files from other agents are left untouched and called out
  separately.

## Explicit Deferrals

These remain future unless the user explicitly expands scope:

- Environment editor/import UI.
- Generated or cooked environment product pipeline.
- Desktop/mobile/low-memory environment quality tiers.
- Reflection probe blending, influence-volume debug visualization, and capture
  cost dashboards.
- Fog, aerial perspective, physical atmosphere, volumetric clouds, weather, and
  time-of-day authoring.
- Expanded video sky mappings beyond `equirectangular-360`.
- Moving Observatory, Miranda, Sci Fi Room, or future migrated levels to
  non-cubemap environments.

## Validation Gate

Required before handoff:

```bash
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal test:level-authoring-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

Browser smoke checks, dev-server checks, and full app smoke harnesses remain out
of the default validation path unless explicitly requested.

## Handoff Rule

Do not call the portal arena opt-in complete unless source, assets, docs,
contract register, cleanup, and focused validation all agree. If only docs are
being reconciled, report that validation scope separately. If future
weather/cloud/import/cooked/probe work has not landed, keep it marked future.
