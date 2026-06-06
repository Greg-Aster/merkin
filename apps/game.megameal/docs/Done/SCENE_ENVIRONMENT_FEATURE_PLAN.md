# Scene Environment Feature Plan

Status: implemented foundation; editor/import tooling and richer atmospheric
features remain future work

This packet expands the current cubemap-only skybox foundation into a compact
AAA-style scene environment contract for browser runtime use. The target is a
contract-owned system for static skies, panoramic skies, video skies,
procedural atmosphere, dynamic environment capture, and authored reflection
probes.

## Summary

Scene environment data remains authored in runtime scene manifests and render
profiles. Asset manifests own all media references. Engine modules define
framework-neutral contracts. The Three adapter owns texture/video creation,
environment projection, GPU capture, and cleanup.

The runtime must not choose hidden sky fallbacks, repair missing authored
environment data, or let Svelte/Threlte/gameplay code mutate Three scene
backgrounds, environment maps, or probe resources.

## Target Capabilities

- [x] Keep the existing `cubemap-skybox` support for six-face static skyboxes.
- [x] Add `equirectangular-environment` support for single panoramic/HDRI-style
  image assets.
- [x] Add `video-skybox` support for muted `equirectangular-360` panoramic video
  backgrounds.
- [x] Add `procedural-atmosphere` support for a compact sun/sky atmosphere mode.
- [x] Add bounded dynamic environment capture for video/procedural modes.
- [x] Add authored local reflection probes with simple nearest/highest-priority
  application to render objects.
- [x] Add small checked-in sample environment assets for contract validation and
  future prototype scenes.

## Contract Rules

- `RenderProfileData.environment` is the scene environment source of truth.
- Environment assets must be declared in the selected runtime scene asset
  manifest and preload/readiness sets when required.
- Visible sky/background and lighting/reflection contribution are separate
  settings.
- Dynamic capture is explicit, quality-limited, and never unrestricted per
  frame by default.
- Video sky audio is not owned by the environment contract; audio remains owned
  by audio manifests and audio events.
- Reflection probes are authored components, not renderer-side hidden defaults.
- Probe material mutations must be tracked and restored on detach or dispose.

## Implementation Changes

- [x] Expand data/schema and asset contracts with environment variants, video asset
  metadata, equirectangular texture metadata, and reflection probe validation.
- [x] Expand `src/engine/modules/rendering` with framework-neutral environment,
  dynamic capture, and reflection probe types plus a probe sync system.
- [x] Expand `src/engine/adapters/three` with texture/video loaders, PMREM/global
  environment projection, bounded cube capture, procedural sky projection, and
  local reflection probe handling.
- [x] Add small sample panoramic and video environment assets under
  `public/assets/environment/samples/` and register them through game asset data.
- [x] Add focused scene-environment contract validation instead of growing unrelated
  catch-all tests.
- [x] Update `GAME_ENGINE_DESIGN_DOCUMENT.md`, `ARCHITECTURE.md`,
  `ENGINE_CONTRACT_REGISTER.md`, and `docs/GAME_ENGINE_MIGRATION_PLAN.md` as
  the packet moves from active to implemented foundation.

## Implemented Foundation

- Runtime schema accepts `solid-color`, `cubemap-skybox`,
  `equirectangular-environment`, `video-skybox`, and
  `procedural-atmosphere`.
- Asset manifests support `texture` assets with `projection:
  "equirectangular"` and muted `video` assets for sky media.
- The Three adapter owns texture/video creation, PMREM projection, bounded cube
  capture, procedural sky projection, and probe material restore on detach.
- Game runtime composition registers reflection probe sync during render sync.
- Sample assets are checked in as
  `public/assets/environment/samples/sample-equirectangular-sky.png` and
  `public/assets/environment/samples/sample-video-sky.webm`.

## Test Plan

- [x] Add `pnpm --dir apps/game.megameal test:scene-environment-contract`.
- [x] Validate accepted environment variants:
  - cubemap skybox,
  - equirectangular environment,
  - video skybox with dynamic capture,
  - procedural atmosphere,
  - local reflection probe components.
- [x] Validate rejected cases:
  - required environment asset not preloaded,
  - required environment asset missing readiness entry,
  - environment asset kind mismatch,
  - malformed cubemap faces,
  - invalid equirectangular projection metadata,
  - invalid video metadata,
  - dynamic capture resolutions outside `64`, `128`, or `256`,
  - invalid reflection probe shape, mode, or resolution.
- [x] Run the standard cleanup reminder validation gate before handoff.

## Defaults

- Dynamic capture default resolution: `128`.
- Allowed dynamic capture resolutions: `64`, `128`, `256`.
- Default dynamic capture mode: `on-load`.
- Supported video sky mapping for authored data: explicit
  `equirectangular-360`; no implicit mapping inference.
- Local reflection probe application: nearest/highest-priority probe first,
  scene environment fallback second.

## Remaining Future Work

- Editor/import controls for authoring environment assets and reflection probes.
- Higher quality probe blending, probe debug visualization, 180/strip video sky
  mappings, fog/cloud/weather integration, and generated/cooked environment
  pipelines.
- Production content can opt into the new modes after assets are explicitly
  declared in the selected runtime scene manifest preload/readiness sets.
- Future skybox and scene-environment feature packets are tracked in
  `docs/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`.
