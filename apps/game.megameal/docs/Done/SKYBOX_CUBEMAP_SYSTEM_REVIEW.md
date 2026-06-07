# Skybox Cubemap System Review

Source engine: `/home/greggles/Merkin/apps/game`
Target engine: `/home/greggles/Merkin/apps/game.megameal`
Status: cubemap foundation implemented; review and remaining target notes active
Last reviewed: 2026-06-06

## Purpose

This document describes the old engine skybox system so it can be rebuilt in the
new contract-first engine architecture. The old implementation is reference
material only. Do not import it, copy the Svelte/Threlte component, or make the
renderer own scene state directly.

The system the user described as loading images in chunks is a cubemap skybox:
one sky environment is split into six square image faces and loaded as a single
cube texture.

```text
px = positive X face
nx = negative X face
py = positive Y face
ny = negative Y face
pz = positive Z face
nz = negative Z face
```

Those six files are the "chunks" for the skybox. This is not the same as the old
terrain GLB chunk streaming system.

## Old System Evidence

Relevant source files in `apps/game`:

- `src/threlte/systems/Skybox.svelte`
- `src/threlte/levels/skyboxPresets.ts`
- `src/threlte/levels/SceneDocumentLevel.svelte`
- `src/threlte/editor/editorSceneDocumentValidation.ts`
- `src/threlte/editor/EditorEnvironmentPanel.svelte`
- `src/threlte/engine/sceneDocumentTypes.ts`
- `src/threlte/stores/runtimeRenderProfileStore.ts`

Runtime assets are currently served from `apps/megameal/public`:

- `/assets/hdri/skywip4-cubemap/px.webp`
- `/assets/hdri/skywip4-cubemap/nx.webp`
- `/assets/hdri/skywip4-cubemap/py.webp`
- `/assets/hdri/skywip4-cubemap/ny.webp`
- `/assets/hdri/skywip4-cubemap/pz.webp`
- `/assets/hdri/skywip4-cubemap/nz.webp`
- `/assets/skyboxes/px.webp`
- `/assets/skyboxes/nx.webp`
- `/assets/skyboxes/py.webp`
- `/assets/skyboxes/ny.webp`
- `/assets/skyboxes/pz.webp`
- `/assets/skyboxes/nz.webp`

Observed asset shape:

- Both checked skybox sets use six `1024x1024` WebP faces.
- `/assets/hdri/skywip4-cubemap/*.webp` is about `396K` total.
- `/assets/skyboxes/*.webp` is about `456K` total.

## What The Old Runtime Does

`Skybox.svelte` owns a `THREE.CubeTextureLoader` inside a Svelte/Threlte
component. It accepts:

- a folder path,
- six ordered face filenames,
- background intensity,
- background blurriness,
- environment intensity.

It builds a key from the path and filenames. If the key changes, it starts a new
cube-texture load. A monotonically increasing load serial prevents stale async
loads from replacing a newer skybox. If an older request resolves after a newer
request started, the old texture is disposed.

On successful load, the component:

- detaches the previous texture from `scene.background` and `scene.environment`,
- disposes the previous `THREE.CubeTexture`,
- stores the newly loaded cube texture,
- writes the cube texture into `scene.background` when background intensity is
  greater than zero,
- writes the same cube texture into `scene.environment` when environment
  intensity is greater than zero,
- writes `scene.backgroundIntensity`,
  `scene.backgroundBlurriness`, and `scene.environmentIntensity`.

On destroy, the component:

- increments the load serial to invalidate pending callbacks,
- clears `scene.background` and `scene.environment` if they point to its loaded
  texture,
- disposes the loaded texture.

## Old Data Flow

The old level document carries a skybox preset:

```text
level settings
  -> settings.level.skyboxPreset
  -> skybox preset resolver
  -> cubemap path + six face files
  -> Skybox.svelte
  -> THREE.CubeTextureLoader
  -> scene.background / scene.environment
```

The preset registry has two known preset IDs:

- `observatory`: `/assets/hdri/skywip4-cubemap/`
- `classic`: `/assets/skyboxes/`

The level also carries visual tuning fields:

```text
settings.level.skybox.backgroundIntensity
settings.level.skybox.backgroundBlurriness
settings.renderProfile.reflections.environmentIntensity
```

The render profile treats the skybox as a static environment reflection source.
The old default render profile describes reflections as:

```text
mode: static-environment
source: skybox
intent: Default skybox environment response for authored PBR surfaces.
```

## Old Validation Behavior

The old publish validation requires deployed scene documents to declare a valid
`settings.level.skyboxPreset`. This guardrail exists because older behavior could
fall back to an Observatory skybox when the preset was missing or invalid.

Important migration lesson:

```text
Missing skybox authoring should fail validation for runtime scenes.
Do not silently fall back to Observatory.
```

Editor templates can use a neutral placeholder, but production runtime manifests
should declare the intended skybox explicitly.

## Problems To Avoid In The New Engine

- Do not copy `Skybox.svelte` into `apps/game.megameal`.
- Do not make a Svelte component own `scene.background`, `scene.environment`, or
  texture lifecycle for runtime gameplay.
- Do not make generic runtime code pick Observatory as a fallback.
- Do not scatter skybox paths in gameplay systems.
- Do not treat skybox loading as optional if the runtime scene declares it as
  required for visual readiness.
- Do not let skybox, fog, ocean, and post-processing each invent unrelated
  atmosphere policy.
- Do not add level-id branches such as `if level === "observatory"`.

## Target New Architecture

The new engine should model this as a renderer/asset contract, not a UI
component.

Recommended contract name:

```text
SkyboxEnvironmentContract
```

Recommended ownership:

```text
RuntimeSceneManifest / RenderProfile
  -> declares skybox environment asset ID, readiness intent, and tuning

AssetManifest
  -> declares one cubemap asset with six face URLs

AssetManager
  -> loads, caches, reference-counts, and disposes cubemap source data

Rendering module
  -> defines framework-neutral skybox/environment settings

ThreeRendererAdapter
  -> applies loaded cubemap assets to Three scene background/environment
```

The engine core should know only that a runtime scene has a skybox environment
contract. It should not import Three, Svelte, Threlte, browser image APIs, or
hardcoded asset paths.

## Suggested Data Shape

Use stable IDs, not loose paths, inside level and runtime data.

```ts
type SkyboxCubemapFace = "px" | "nx" | "py" | "ny" | "pz" | "nz";

type SkyboxEnvironmentDefinition = {
  readonly id: string;
  readonly kind: "cubemap";
  readonly url: string;
  readonly faces: Record<SkyboxCubemapFace, string>;
  readonly colorSpace?: "srgb";
};

type RenderProfileSkyboxSettings = {
  readonly kind: "cubemap-skybox";
  readonly assetId: string;
  readonly backgroundIntensity: number;
  readonly backgroundBlurriness: number;
  readonly environmentIntensity: number;
  readonly requiredForReadiness: boolean;
};
```

In manifests, the values should resolve to asset IDs:

```json
{
  "environment": {
    "kind": "cubemap-skybox",
    "assetId": "cubemap_observatory_sky",
    "backgroundIntensity": 1,
    "backgroundBlurriness": 0,
    "environmentIntensity": 1.1,
    "requiredForReadiness": true
  },
  "assets": {
    "id": "cubemap_observatory_sky",
    "kind": "cubemap",
    "url": "/assets/hdri/skywip4-cubemap/",
    "faces": {
      "px": "px.webp",
      "nx": "nx.webp",
      "py": "py.webp",
      "ny": "ny.webp",
      "pz": "pz.webp",
      "nz": "nz.webp"
    }
  }
}
```

The exact schema can differ, but the invariant should not:

```text
Runtime scenes reference a skybox by stable ID.
The cubemap asset owns the six required image faces.
The asset manager owns loaded texture disposal.
The renderer adapter owns Three scene projection.
```

## Current Target Implementation Progress

Current foundation status:

- `RenderProfileData.environment` is required and currently supports the
  explicit `cubemap-skybox` mode.
- Asset manifests support `kind: "cubemap"` entries with exactly six face URLs.
- `src/game/assets/skyboxAssets.ts` owns `cubemap_classic_sky` and
  `cubemap_observatory_sky` as checked-in target-engine cubemap assets.
- Portal arena, prototype arena, and Miranda deck render profiles declare a
  required cubemap environment by stable asset ID.
- Runtime scene validation checks that the declared environment asset exists in
  the selected manifest, is a cubemap, is included in the level preload set,
  and is listed in readiness assets when required.
- `src/engine/modules/rendering` defines the framework-neutral
  `SceneEnvironmentRendererPort`.
- `src/engine/adapters/three` owns cubemap loading through
  `THREE.CubeTextureLoader`, projects the loaded texture into
  `Scene.background` and `Scene.environment`, and clears scene references on
  transition/dispose.
- Runtime scene loading clears the previous environment before transition,
  preloads the selected scene assets, applies the selected render profile, then
  applies the scene environment through the renderer adapter.
- Focused runtime-scene contract validation covers missing environment preload,
  missing readiness declaration, malformed cubemap faces, and the existing
  runtime-scene negative cases.

Latest watchdog validation on 2026-06-06:

- `pnpm --dir apps/game.megameal audit:engine-boundaries` passed.
- `pnpm --dir apps/game.megameal type-check` passed.
- `pnpm --dir apps/game.megameal lint` passed.
- `pnpm --dir apps/game.megameal test:runtime-scene-contract` passed when run
  outside the sandbox; the sandboxed run hit the known `tsx` IPC pipe
  permission failure.
- `pnpm --dir apps/game.megameal build` passed with the existing large
  Three/Rapier chunk warning.
- `git diff --check -- apps/game.megameal pnpm-lock.yaml` passed.

Current assessment:

```text
The foundation is contract-aligned for a first cubemap skybox packet.
It is not a complete AAA atmosphere, lighting, or reflection pipeline yet.
```

The implemented shape follows the plan because scene data owns sky selection,
schema validation rejects missing authored environment data, the asset manager
owns loaded cubemap assets, and only the Three adapter mutates
`Scene.background` / `Scene.environment`. This matches the way production game
engines separate authored scene environment data from renderer-specific GPU
projection.

The efficient parts of the packet:

- Existing six-face 1024px WebP cubemaps are compact enough for the current
  browser runtime foundation.
- Skybox assets are shared by stable asset ID instead of repeated loose paths.
- Preload/readiness keeps first playable render from racing an undeclared
  environment load.
- Runtime transition code clears previous scene environment references before
  applying the next scene.

Remaining AAA-grade gaps:

- No PMREM or equivalent prefiltered image-based-lighting preprocessing yet, so
  environment reflections are basic Three cubemap projection rather than a full
  physically based reflection pipeline.
- No HDR/equirectangular import pipeline, source hash metadata, or generated
  cubemap quality tiers.
- Muted `equirectangular-360` video skybox media now has schema, asset, and
  Three-adapter projection support; 180/strip video mappings and richer video
  readiness diagnostics remain future work.
- No mobile/desktop quality selection for 512px, 1024px, or higher-resolution
  sky assets.
- A compact procedural atmosphere mode now has schema and Three-adapter support;
  time-of-day scattering, volumetric clouds, fog integration, and weather
  contracts remain future work.
- Reflection probe schema, sync, Three-adapter cube capture, probe material
  application/restoration, and focused validation are implemented as a compact
  foundation; richer blending and debug tooling remain future work.
- No editor/import tooling for choosing or validating sky environment assets.
- No browser visual smoke evidence has been collected; that remains outside the
  default agent guardrails unless explicitly requested.

Active follow-on packet:

- `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` records the completed expansion
  of this cubemap foundation into equirectangular, video, procedural atmosphere,
  bounded dynamic capture, and authored reflection probe support.
- `docs/Done/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md` tracks the remaining
  future skybox and scene-environment feature packets.
- Runtime support can now be described as cubemap plus foundation support for
  equirectangular, muted `equirectangular-360` video, procedural atmosphere,
  bounded dynamic capture, and local reflection probes. Current playable scenes
  still use cubemap environments.

## Runtime Load Sequence

Target runtime sequence:

```text
1. Parse RuntimeSceneManifest.
2. Validate skybox contract:
   - skybox ID exists,
   - exactly six cubemap faces are declared,
   - the cubemap asset exists in the selected manifest,
   - required skybox assets are in the preload/readiness group when required.
3. Preload the required cubemap asset with the selected scene assets.
4. Ask renderer adapter to apply the loaded cubemap asset.
5. Mark skybox environment ready through the existing required-asset readiness
   gate.
6. On scene unload or transition, clear renderer scene references before the
   scene scope releases the cubemap asset and the asset manager disposes it.
```

## Readiness Rules

For a runtime scene that declares a required skybox:

- Missing skybox ID fails validation.
- Unknown skybox ID fails validation.
- Missing face fails validation.
- Cubemap asset not present in the selected scene manifest fails validation.
- Cubemap asset omitted from required preload fails readiness validation if the
  skybox is required for first playable render.
- Failed image load should emit a renderer/asset diagnostic and keep the scene
  out of visual-ready state unless a documented non-production placeholder is
  allowed.

For an optional skybox:

- The manifest must still be valid.
- Load failure should degrade to a neutral authored background color only if the
  manifest explicitly allows that fallback.

## Renderer Adapter Responsibilities

The Three adapter should own:

- `THREE.CubeTextureLoader` or an equivalent image-to-cubemap path,
- texture color-space setup,
- applying the cube texture to `scene.background`,
- applying the cube texture to `scene.environment`,
- background intensity and blurriness,
- environment intensity,
- clearing scene references when a scene scope unloads.

The asset manager owns cubemap texture disposal after the scene scope releases
the cubemap asset. This prevents the renderer from disposing a shared asset
behind the asset manager's back.

This mirrors the useful parts of the old `Skybox.svelte` behavior while moving
ownership out of Svelte.

## Asset And Performance Notes

The old assets are already compact for a skybox:

- six 1024px WebP faces,
- roughly 400-460K per cubemap set,
- browser-friendly static files.

Future asset pipeline improvements:

- generate cubemap faces from a source equirectangular/HDRI image,
- produce quality tiers such as 512px mobile, 1024px default, 2048px hero,
- store source image hash and generated face metadata,
- optionally generate compressed GPU texture formats later,
- keep runtime faces separate from source HDRI/equirectangular authoring files.

## Interaction With Atmosphere

The old engine notes identify atmosphere fragmentation: skybox, fog, ocean,
mist, and post-processing can drift if each system owns separate visual math.

For the new engine:

- Skybox image loading belongs to `SkyboxEnvironmentContract`.
- Fog/haze/aerial perspective belongs to a broader atmosphere/render-profile
  contract.
- The skybox contract should expose the loaded environment to the renderer, but
  it should not invent independent fog policy.
- Any future skybox fog/aerial perspective should be data-driven through the
  render profile, then projected by the renderer adapter.

## Implementation Packet

Recommended first implementation packet:

1. Promote the planned `SkyboxEnvironmentContract` row in
   `ENGINE_CONTRACT_REGISTER.md` to active implementation status. Done.
2. Add schema fields for skybox environment settings in runtime scene/render
   profile data. Done.
3. Add asset manifest support for cubemap assets with six faces. Done.
4. Add validation for six required faces and manifest/preload references. Done.
5. Add a Three renderer adapter method for applying scene environments. Done.
6. Register the old `observatory` and `classic` cubemaps as target-engine asset
   manifest data. Done.
7. Wire runtime scene load/unload to apply and release the skybox through scene
   scope ownership. Done.
8. Add focused runtime-scene contract validation for required cubemap preload,
   readiness, and face validation. Done.

Do not implement editor controls in the first packet. The first goal should be
runtime correctness: manifest, preload, adapter ownership, scene cleanup, and
validation.

## Definition Of Done For Migration

- Runtime scene manifests can declare a skybox by stable ID.
- Valid cubemap manifests with six faces pass validation.
- Missing or invalid faces fail validation before runtime.
- The selected scene's asset manifest owns each required cubemap asset.
- The Three adapter applies the skybox as background/environment without Svelte
  owning Three scene state.
- Scene unload/transition clears renderer references before the scene scope
  releases the cubemap asset and the asset manager disposes the cube texture.
- There is no Observatory fallback in production runtime.
- Boundary audit still passes.
- Documentation and `ENGINE_CONTRACT_REGISTER.md` match the implemented state.
