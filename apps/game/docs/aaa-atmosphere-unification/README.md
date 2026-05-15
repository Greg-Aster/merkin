# AAA Atmosphere Unification

## Purpose

This packet is the authoritative handoff for replacing the fragmented
environment rendering paths with one runtime atmosphere system.

The problem is not just that a few editor controls were unwired. The current
game has separate fog, mist, skybox, ocean, underwater, bloom, and color grading
paths. Some participate in Three.js material fog, some are custom shaders, some
are post-processing, and some are transparent geometry. That makes the result
inconsistent: fog affects terrain but can miss ocean, the skybox needs special
handling, and mist can become a separate visual trick rather than part of the
same authored atmosphere.

The target is a renderer-owned atmosphere pipeline:

```txt
scene document atmosphere settings
  -> typed RuntimeAtmosphereDefinition
  -> runtime atmosphere store/service
  -> SceneAtmosphereSystem
  -> shared renderer uniforms / shader chunks / post-processing adapters
  -> terrain, props, sky, ocean, mist, fog volumes, underwater, diagnostics
```

If a solution adds another one-off overlay or local shader patch without moving
ownership into a shared atmosphere contract, it is not aligned with this work.

## Current Fragmentation

Known split paths:

- `SceneFogExp2.svelte`: owns `THREE.FogExp2` and tries to enable fog on scene
  materials.
- `sceneFogMaterialPatch.ts`: provisional shared shader patch for height fog.
  Treat this as bridge code, not the final architecture.
- `Skybox.svelte`: was changed from native `scene.background` toward a
  fog-aware mesh because native Three backgrounds do not receive scene fog.
- `OceanComponent.svelte`: creates its own material and optional reflector path.
  It must explicitly participate in any unified atmosphere contract.
- `GroundMistLayer.svelte`: transparent planes; useful as a visible mist layer,
  but not authoritative fog.
- `UnderwaterEffect.svelte` / `UnderwaterOverlay.svelte`: separate underwater
  effect path.
- `SimplePostProcessing.svelte`: separate bloom/color grading policy path.
- `GameplayStyleProfiles.ts`: maps editor style fields into runtime visual
  style, but does not define one atmosphere authority.

## Non-Negotiables

- One atmosphere contract is the source of truth.
- Do not make `THREE.FogExp2` the whole atmosphere system; it is only one
  implementation detail.
- Do not add skybox fog veils, screen overlays, or extra transparent planes as
  the main fix.
- Do not make ocean, skybox, terrain, and props each invent their own fog math.
- Do not special-case level ids such as `yggdrasil`.
- Do not leave editor controls writing to one structure while runtime reads
  another.
- Do not keep compatibility bridge code without an owner and deletion condition.
- Do not call work complete until diagnostics prove every major render path
  participates or is explicitly exempt.

## Target Contract

Create a typed runtime atmosphere contract that can be authored from scene
settings and consumed by renderer systems. Suggested shape:

```ts
type RuntimeAtmosphereDefinition = {
  enabled: boolean
  distanceFog: {
    enabled: boolean
    color: string
    density: number
    near?: number
    far?: number
  }
  heightFog: {
    enabled: boolean
    color: string
    density: number
    floor: number
    ceiling: number
    falloff?: number
    colorInfluence?: number
  }
  aerialPerspective: {
    enabled: boolean
    skyOcclusion: number
    horizonBoost: number
  }
  mist: {
    enabled: boolean
    opacity: number
    layers: number
    height: number
    spacing: number
    scale: number
    driftSpeed: number
  }
  grading: {
    saturation: number
    contrast: number
    brightness: number
    warmth: number
  }
  bloom: {
    intensity: number
    threshold: number
  }
}
```

Agents may refine names and exact fields, but the contract must support the
current editor controls:

- Bloom Intensity
- Bloom Threshold
- Haze Color
- Haze Density
- Haze Floor
- Haze Ceiling
- Mist Opacity
- Mist Layers
- Mist Scale
- Mist Drift
- Saturation
- Contrast
- Brightness
- Warmth

## Required Runtime Consumers

The final system must explicitly cover:

- regular scene props and imported GLTF materials
- terrain and chunked terrain
- skybox/background/aerial perspective
- ocean surface material
- planar reflection or reflector path, if enabled
- transparent mist layer, as secondary visual garnish
- local fog volumes
- underwater transition/effects
- bloom and color grading post-processing
- diagnostics and editor preview

## Expected User-Facing Behavior

The level editor Atmosphere FX panel must produce visible, predictable changes
without reloading the level:

- Haze Density increases ground-level occlusion.
- Haze Floor and Haze Ceiling move the vertical fog band.
- Looking across low ground shows denser fog than looking up.
- Tall mountains or high roots can push through the mist.
- Ocean participates in the same fog field as nearby terrain.
- Skybox/aerial perspective matches the same atmosphere instead of looking like
  a disconnected backdrop.
- Mist planes, if enabled, reinforce the same height band instead of replacing
  the actual fog.

## Verification Requirements

Every agent must run the checks relevant to their files. The final integration
agent must run at minimum:

```bash
pnpm --dir apps/game type-check
pnpm --dir apps/game exec biome check src/threlte
GAME_NO_SERVER=1 GAME_DEV_PORT=4322 pnpm --dir apps/game smoke:boot
```

If the smoke test is blocked by an existing unrelated failure, report the exact
failure and run a Playwright browser smoke against the running dev server,
capturing screenshots for:

- default level atmosphere
- low dense haze band
- high haze ceiling
- ocean horizon through fog
- skybox with aerial perspective

## Final Acceptance

The work is complete only when:

- `RuntimeAtmosphereDefinition` or equivalent is the single runtime authority.
- The editor, scene document, runtime store, sky, ocean, materials, mist, and
  post-processing all consume that authority.
- Provisional one-off bridge code is deleted or explicitly documented with an
  owner and deletion condition.
- Runtime diagnostics list all participating atmosphere consumers.
- A visual smoke proves ocean, skybox, terrain, and props respond consistently.
