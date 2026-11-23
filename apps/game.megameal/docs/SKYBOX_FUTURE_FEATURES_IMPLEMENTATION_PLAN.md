# Skybox Future Features Implementation Plan

Status: future implementation plan; not required for the current implemented
scene-environment foundation

This plan records the future skybox and scene-environment work that remains
after `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` reached
implemented-foundation status. The word "skybox" is used here as the familiar
content feature name, but the engine owner remains the manifest-backed
`SkyboxEnvironmentContract` and the broader scene-environment pipeline.

## Current Baseline

- Runtime scene manifests and render profiles own scene environment selection.
- Asset manifests own cubemap, equirectangular texture, and muted video sky
  media references.
- The data/schema layer validates environment asset references, readiness,
  projection metadata, dynamic capture settings, and reflection probe data.
- The rendering module owns framework-neutral scene-environment and reflection
  probe contracts.
- The Three adapter owns `Scene.background`, `Scene.environment`, PMREM/runtime
  capture projection, video texture setup, procedural atmosphere projection,
  and reflection probe cleanup.
- Current production runtime scenes still use required `cubemap-skybox`
  environments.

## Architecture Rules

- Future sky, atmosphere, weather, and reflection features must extend
  `RenderProfileData.environment`, asset manifests, rendering module contracts,
  and renderer adapters.
- Runtime scenes must reference stable environment IDs and declared assets; no
  Svelte, gameplay system, page shell, or renderer fallback may choose hidden
  sky media.
- Visible background, environment lighting, fog/aerial perspective, reflection
  probes, and weather settings must remain explicit authored data instead of
  hidden adapter defaults.
- Required sky/environment media must participate in preload and readiness when
  a scene depends on them for first playable render.
- Video sky audio remains outside this contract and must stay owned by audio
  manifests and audio events.
- Renderer-side resource mutation must be tracked and restored on scene unload
  or adapter disposal.

## Future Feature Packets

### 1. Environment Authoring And Import

Goal: add durable authoring/import controls for sky, atmosphere, and reflection
probe assets without bypassing manifest ownership.

Expected work:

- Add an import path for cubemap, equirectangular, HDRI-style, and video sky
  assets that emits checked-in or cooked asset manifest entries.
- Store source metadata such as source path, content hash, projection, color
  space, intended quality tier, and generated-product references.
- Validate cubemap face orientation, projection type, video muting policy, and
  readiness intent before runtime use.
- Add editor-facing controls only after the underlying data contract and
  validation path are durable.

Completion criteria:

- Imported environment assets are manifest-owned and schema-validated.
- Invalid projection, missing readiness, missing generated products, or hidden
  renderer fallbacks fail focused tests.

### 2. Cooked Environment Products And Quality Tiers

Goal: move expensive sky and image-based-lighting products into generated or
cooked environment artifacts that scenes can select by quality tier.

Expected work:

- Define cooked products for prefiltered reflection data, lower-resolution sky
  variants, optional higher-quality source products, and browser-friendly media
  formats.
- Add explicit quality tiers for desktop, mobile, and low-memory runtime modes.
- Keep dynamic capture bounded; never introduce unrestricted per-frame capture
  as a default.
- Make generated product metadata reproducible and auditable.

Completion criteria:

- Runtime scene manifests can select an authored environment quality policy.
- Asset readiness can require the correct cooked product for the selected tier.
- Validation rejects scenes that reference missing or mismatched generated
  environment products.

### 3. Reflection Probe Quality Upgrade

Goal: evolve the current nearest/highest-priority reflection probe foundation
into a production-ready local reflection system.

Expected work:

- Add probe influence volumes, blending weights, priority rules, and debug
  visualization.
- Define capture/update budgets for static, on-load, interval, and manually
  triggered probes.
- Add diagnostics for probe assignment, material mutation/restoration, and
  expensive capture schedules.
- Keep probe behavior authored in components and synced through the rendering
  module rather than inferred by the renderer.

Completion criteria:

- Multiple local probes can blend predictably without stale material state.
- Debug views can identify active probes, influence volumes, and capture cost.
- Tests cover invalid volumes, invalid capture policies, and cleanup behavior.

### 4. Physical Atmosphere, Fog, Clouds, And Weather

Goal: extend the procedural atmosphere foundation into explicit authored
atmosphere and weather contracts.

Expected work:

- Add richer physical sky settings for sun/moon direction, exposure,
  scattering-style parameters, and time-of-day profiles.
- Add fog and aerial perspective settings under the scene-environment contract.
- Add cloud and weather profiles only after they have clear data ownership,
  runtime budgets, and renderer adapter projection rules.
- Keep atmosphere lighting influence separate from visible background settings.

Completion criteria:

- Atmosphere, fog, clouds, and weather are authored in render profiles or
  environment assets, not hidden renderer defaults.
- Current scenes can opt into the features without changing gameplay systems or
  UI ownership.
- Validation rejects partial atmosphere/weather data that would require runtime
  repair.

### 5. Expanded Video Sky Support

Goal: support more panoramic video formats while keeping browser performance and
audio ownership explicit.

Expected work:

- Add validated mappings beyond `equirectangular-360`, such as 180-degree or
  strip layouts, when content needs them.
- Add video readiness diagnostics for muted autoplay, decode readiness, and
  missing preload metadata.
- Add quality-tiered video sky assets for mobile and desktop.
- Keep video audio as a separate audio-manifest event path.

Completion criteria:

- Unsupported or mismatched video mappings fail schema validation.
- Runtime can report video-sky readiness failures without falling back to a
  hidden static sky.

### 6. Production Scene Opt-In

Goal: migrate selected production scenes from cubemap-only environments to the
newer modes only when their assets and readiness data are authored.

Expected work:

- Choose the first scene that benefits from equirectangular, video, procedural,
  or probe-enhanced environment behavior.
- Add the required media assets, preload groups, readiness entries, render
  profile data, and focused validation for that scene.
- Preserve the current cubemap paths until each replacement mode is authored and
  validated.

Completion criteria:

- The selected scene uses a non-cubemap environment mode through manifest-owned
  data.
- No app shell, UI component, gameplay system, or renderer fallback owns the
  selected sky.

## Validation Expectations

Future packets should add or update focused validation rather than expanding
catch-all tests. Depending on the packet, expected checks include:

```bash
pnpm --dir apps/game.megameal test:scene-environment-contract
pnpm --dir apps/game.megameal test:runtime-scene-contract
pnpm --dir apps/game.megameal audit:engine-boundaries
pnpm --dir apps/game.megameal type-check
pnpm --dir apps/game.megameal lint
pnpm --dir apps/game.megameal build
git diff --check -- apps/game.megameal pnpm-lock.yaml
```

Browser smoke checks, dev-server checks, and full app smoke harnesses remain out
of the default validation path unless explicitly requested.

## Handoff Rule

Do not mark any future skybox packet complete until docs, schema, source
ownership, renderer adapter behavior, cleanup, and focused validation all agree.
If a feature is only planned, mark it as planned. If it is runtime-supported but
not used by production scenes, say that directly.
