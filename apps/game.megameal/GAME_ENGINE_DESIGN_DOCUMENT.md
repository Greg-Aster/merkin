# Browser Game Engine Design Document

Status: Draft
Scope: Browser-based 3D game engine for a website
Target stack: Astro, Svelte, Three.js, Threlte, Rapier, browser platform APIs
Target year: 2026

## 1. Purpose

This document defines the architecture for a reusable browser game engine. The engine should support a website-hosted game experience without letting the website framework, UI framework, renderer, or physics library become the engine itself.

The central rule is:

```text
Astro hosts the page.
Svelte owns UI and editor presentation.
Threlte/Three own rendering resources.
Rapier owns physics solving.
The engine world owns gameplay identity and canonical runtime state.
The game layer owns meaning and rules.
Adapters synchronize subsystem state at explicit scheduler stages.
```

Short form:

```text
Frameworks display the game.
The engine runs the game.
```

## 2. Goals

- Keep runtime game state out of Astro, Svelte stores, Three objects, Threlte components, and Rapier objects.
- Make the engine core framework-agnostic and mostly deterministic.
- Use explicit ownership boundaries so each subsystem has one clear reason to change.
- Separate data from behavior through entities, components, prefabs, scenes, and asset manifests.
- Use a fixed simulation timestep with a variable render loop.
- Make scene loading and unloading reliable, testable, and leak-resistant.
- Keep browser platform APIs behind a platform layer.
- Allow future renderer, physics, UI, or hosting changes without rewriting gameplay code.

## 3. Non-Goals

- Do not build a full AAA engine clone.
- Do not abstract every third-party API before there is a real need.
- Do not force every feature into pure ECS if a simpler engine service is clearer.
- Do not make Threlte, Svelte, Astro, Three, or Rapier responsible for canonical gameplay state.
- Do not optimize for multiplayer lockstep until deterministic replay requirements are explicit.

## 4. Architecture Overview

Recommended dependency shape:

```text
app
  -> ui
  -> game
  -> engine

ui
  -> engine/client-api

game
  -> engine

engine/modules
  -> engine/core

engine/adapters
  -> engine/core
  -> third-party libraries
  -> browser APIs

engine/core
  -> no app, ui, game, Three, Threlte, Rapier, DOM, or Svelte dependencies
```

Recommended source layout:

```text
src/
  app/
    astro pages, routing, layout, site shell

  ui/
    svelte menus, HUD, editor panels, debug panels

  game/
    game-specific rules, actors, levels, objectives, abilities, encounters

  engine/
    core/
      World.ts
      Entity.ts
      Component.ts
      System.ts
      Scheduler.ts
      Time.ts
      Events.ts
      Commands.ts

    math/
      Vec2.ts
      Vec3.ts
      Quat.ts
      Mat4.ts
      Bounds.ts
      Ray.ts

    modules/
      rendering/
      physics/
      input/
      audio/
      assets/
      animation/
      camera/
      scene/
      debug/

    adapters/
      three/
      threlte/
      rapier/
      browser/

    data/
      schemas/
      loaders/
      serializers/
      manifests/
```

## 5. Layer Responsibilities

### App Layer

Astro is the web shell.

Allowed responsibilities:

- Routing.
- Static and content pages.
- SEO and metadata.
- Embedding the game client.
- Loading the browser client entry point.
- Creating browser/adapter instances and passing them into the game runtime factory.

Forbidden responsibilities:

- Owning runtime game state.
- Running physics or rendering logic.
- Owning scene lifecycle beyond mounting and unmounting the client.
- Encoding gameplay rules.
- Registering gameplay systems directly.

Current cutover status:

- The normal root game scripts target `@merkin/game-megameal`.
- The deployed game static output comes from `apps/game.megameal/dist`.
- Legacy `@merkin/game` root aliases are retired; any remaining local old app
  folder is historical/reference material only, not a normal script target.
- Blender scene bridge packaging is owned by `apps/blender`, not the old app.
- `audit:legacy-game-references` fails active old-app references while allowing
  checked-in historical docs and generated provenance metadata.
- Old `apps/game` runtime code must not be imported, wrapped, or mounted as the
  normal website runtime.

### UI Layer

Svelte is the presentation and tooling layer.

Allowed responsibilities:

- Main menu.
- Pause menu.
- Settings.
- HUD.
- Inventory UI.
- Dialogue UI.
- Debug inspector.
- Editor panels.
- Asset browser.

Forbidden responsibilities:

- Owning player transform, physics state, AI, combat state, or authoritative inventory.
- Creating runtime entities directly outside engine commands.
- Owning scene lifecycle.
- Mutating canonical engine state through stores.

Recommended pattern:

```ts
engine.observe(selectHudState, value => {
  hudStore.set(value);
});

engine.commands.dispatch({
  type: 'PauseGame'
});
```

### Game Layer

The game layer owns meaning and rules.

Allowed responsibilities:

- What an entity means in the game.
- Gameplay systems.
- Abilities.
- Interactions.
- Objectives.
- Level-specific rules.
- Entity and prefab definitions.
- Runtime composition through engine ports supplied by the app layer.

Forbidden responsibilities:

- Direct mutation of Three meshes.
- Direct mutation of Rapier bodies.
- Direct DOM or browser event handling.
- Direct dependency on Astro or Svelte.
- Direct dependency on Three, Threlte, Rapier, or browser adapter implementations.

### Engine Core

The engine core owns the canonical runtime model.

Allowed dependencies:

- Plain TypeScript.
- Engine math.
- Engine data structures.
- Serialization-safe primitives where practical.

Forbidden dependencies:

```ts
import * as THREE from 'three';
import { writable } from 'svelte/store';
import { Canvas } from '@threlte/core';
import RAPIER from '@dimforge/rapier3d-compat';
```

Core concepts:

- World.
- Entities.
- Components.
- Resources.
- Systems.
- Scheduler.
- Time.
- Events.
- Commands.
- Queries.

### Engine Modules

Engine modules define engine concepts in framework-neutral terms.

Examples:

- Rendering module defines renderable components, camera components, light/environment components, render queues, and visibility state.
- Physics module defines rigid body, collider, sensor, character motor, character controller, and physics query concepts.
- Audio module defines listener, emitter, music, and one-shot sound events.
- Input module defines actions, bindings, devices, and command generation.
- Scene module defines load, activate, deactivate, unload, and ownership scopes.

### Adapters

Adapters contain implementation details for third-party libraries and browser APIs.

Examples:

- Three renderer adapter owns `THREE.Scene`, `THREE.Mesh`, `THREE.Material`, render targets, and renderer disposal.
- Rapier physics adapter owns `RAPIER.World`, rigid bodies, colliders, character controllers, and physics handles.
- Browser platform adapter owns `requestAnimationFrame`, pointer lock, fullscreen, keyboard, mouse, touch, gamepad, resize, storage, workers, and visibility events.
- Threlte adapter may expose editor or visualization integration, but should not define runtime entity ownership.

## 6. Canonical State Model

The engine world is the canonical source for gameplay identity and state.

Bad ownership model:

```text
The Three mesh is the player.
The Rapier body is the player.
The Svelte component is the player.
```

Good ownership model:

```text
The entity is the player.

Entity: player_001
Components:
- Transform
- Renderable
- RigidBody
- CharacterController
- Health
- PlayerInput
```

Subsystem projections:

```text
Renderer reads Transform + Renderable.
Physics reads/writes Transform + RigidBody through sync systems.
Audio reads Transform + SoundEmitter and consumes audio events.
UI observes selected state and dispatches commands.
Game systems interpret components as gameplay meaning.
```

Important nuance:

The engine world is the canonical gameplay model, but not the owner of every low-level resource. Physics bodies, GPU buffers, audio nodes, DOM handles, and loaded assets remain owned by their respective subsystems. The world owns identity, semantic state, and synchronization contracts.

## 7. Entity Component Model

Use an ECS-like model, but keep it pragmatic.

Entity:

```ts
type Entity = number;
```

Example components:

```ts
type Transform = {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
};

type Renderable = {
  meshId: string;
  materialId: string;
  visible: boolean;
};

type RigidBody = {
  type: 'dynamic' | 'fixed' | 'kinematic';
  mass: number;
  bodyHandle?: PhysicsBodyHandle;
};

type PlayerController = {
  speed: number;
  jumpForce: number;
};
```

System examples:

```text
InputSystem:
  reads platform input
  writes PlayerInput and commands

CharacterControllerSystem:
  reads PlayerInput, CharacterController, Transform
  writes MovementIntent

PhysicsSystem:
  reads RigidBody, Collider, Transform, MovementIntent
  writes Transform through post-step sync

RenderSyncSystem:
  reads Transform, Renderable
  writes renderer adapter objects
```

Do not require every service to be a component. Asset registries, scheduler, event bus, profiler, scene manager, renderer, and physics world can be engine resources/services.

## 8. Commands And Events

Use commands for intent. Use events for facts that already happened.

Command examples:

```ts
engine.commands.dispatch({
  type: 'MoveEntity',
  entity,
  direction
});

engine.commands.dispatch({
  type: 'UseItem',
  entity,
  itemId
});
```

Event examples:

```ts
eventBus.emit({
  type: 'EntityDamaged',
  entity,
  amount,
  source
});
```

Guidelines:

- UI sends commands, not direct mutations.
- Input systems generate commands or input components.
- Gameplay systems may emit domain events.
- Audio, UI, particles, and objective systems can react to events.
- Hot-path systems should avoid excessive event chatter when direct component reads are clearer.
- Events must have explicit scheduler timing so ordering bugs do not hide in the event bus.
- Navigation interactions should be world-owned game components. For example, a portal is an entity with `Transform`, `Renderable`, `Collider`, and `Portal`; UI only observes the selected prompt, and scene transitions go through a runtime scene transition port.

## 9. Runtime Loop

Use a fixed simulation timestep and a variable render loop.

Browser rendering uses `requestAnimationFrame`. The callback rate generally follows display refresh rate and can be paused or reduced in background tabs, so simulation must not assume one render frame equals one game tick.

Default model:

```text
Render frame: variable, requestAnimationFrame
Simulation tick: fixed, default 60 Hz
```

Loop shape:

```ts
accumulator += frameDelta;
accumulator = Math.min(accumulator, maxAccumulatedTime);

while (accumulator >= fixedDelta) {
  scheduler.run('input', fixedDelta);
  scheduler.run('commands', fixedDelta);
  scheduler.run('gameplay', fixedDelta);
  scheduler.run('ai', fixedDelta);
  scheduler.run('character', fixedDelta);
  scheduler.run('physics-pre-sync', fixedDelta);
  scheduler.run('physics-step', fixedDelta);
  scheduler.run('physics-post-sync', fixedDelta);
  scheduler.run('animation', fixedDelta);
  scheduler.run('audio', fixedDelta);
  scheduler.run('camera', fixedDelta);

  accumulator -= fixedDelta;
}

const interpolation = accumulator / fixedDelta;
scheduler.run('render-sync', interpolation);
scheduler.run('render', interpolation);
scheduler.run('debug', interpolation);
```

Required protections:

- Clamp large frame deltas after tab resume.
- Cap catch-up work to avoid a spiral of death.
- Pause or reduce simulation when the page is hidden unless background simulation is explicitly required.
- Store previous and current transforms for interpolation.

## 10. Scheduler Order

System order must be explicit.

Recommended stages:

```text
1. input
2. commands
3. gameplay
4. ai
5. character
6. physics-pre-sync
7. physics-step
8. physics-post-sync
9. animation
10. audio
11. camera
12. render-sync
13. render
14. debug
```

Rules:

- No system should depend on accidental registration order.
- Systems declare read/write access where practical.
- Stage dependencies should be testable.
- The event bus should define when deferred events flush.

## 11. Rendering Architecture

Three.js is the rendering implementation, not the engine.

The engine expresses rendering as data:

```ts
entity.add(Renderable, {
  meshId: 'crate_01',
  materialId: 'painted_metal',
  visible: true
});
```

The Three adapter decides:

- How to load the mesh.
- Whether to use instancing.
- How materials are created.
- How shadows and render layers work.
- How objects are pooled or disposed.
- How render targets and post-processing are managed.

Renderer sync:

```text
Transform + Renderable -> Three object
```

Current primitive mesh contract:

- Built-in primitive mesh assets are adapter-owned render resources referenced through stable asset IDs.
- The Three adapter may support parameterized built-in mesh URLs for primitive shapes, such as a tapered cylinder/frustum render mesh.
- Built-in mesh URL parameters are render implementation details, not gameplay state.
- Gameplay meaning remains in prefabs, components, colliders, and stable level instance IDs.
- A render mesh must not become the source of collision truth; colliders must be explicit component data.

### Scene Environment, Sky, And Atmosphere

The sky is part of scene environment rendering, not a Svelte component, gameplay system, or generic runtime fallback. Modern engines treat it this way:

- Unreal Engine exposes a Sky Atmosphere component as a physically based sky and atmosphere renderer with time-of-day and aerial-perspective behavior.
- Unity treats a skybox as scene background that can also contribute environment lighting and reflections through scene lighting settings.
- Godot puts sky/background, ambient light, fog, glow, and related post-processing under `WorldEnvironment` / `Environment` resources, with both procedural and physical sky materials.
- Three.js exposes separate `Scene.background` and `Scene.environment` properties, which is the adapter-level projection target for a browser renderer.

Reason:

```text
The sky affects more than pixels behind the level.
It can also drive ambient lighting, reflections, fog/aerial perspective, mood,
time of day, and distant-scene continuity.
```

Therefore the engine contract should be a scene environment contract with a cubemap skybox as the first implementation mode, not a hardcoded "Skybox.svelte" port.

Recommended target ownership:

```text
RuntimeSceneManifest / RenderProfile
  -> declares scene environment asset ID, mode, readiness intent, and tuning

AssetManifest
  -> declares cubemap assets with six faces, equirectangular maps, LUTs,
     or future atmosphere assets

Engine data/schema layer
  -> validates required sky/environment assets and readiness rules

Rendering module
  -> defines framework-neutral environment settings

ThreeRendererAdapter
  -> creates/disposes THREE textures and writes Scene.background,
     Scene.environment, fog, and future atmosphere projections
```

Target environment modes for the active scene-environment packet should be
explicit data variants:

```ts
type SceneEnvironment =
  | {
      kind: 'solid-color';
      color: string;
    }
  | {
      kind: 'cubemap-skybox';
      assetId: string;
      backgroundIntensity: number;
      backgroundBlurriness: number;
      environmentIntensity: number;
      requiredForReadiness: boolean;
    }
  | {
      kind: 'equirectangular-environment';
      assetId: string;
      backgroundIntensity: number;
      environmentIntensity: number;
      requiredForReadiness: boolean;
    }
  | {
      kind: 'procedural-atmosphere';
      sunDirection: Vec3;
      turbidity: number;
      exposure: number;
      dynamicCapture?: DynamicEnvironmentCapture;
      requiredForReadiness: boolean;
    }
  | {
      kind: 'video-skybox';
      assetId: string;
      mapping: 'equirectangular-360';
      dynamicCapture?: DynamicEnvironmentCapture;
      requiredForReadiness: boolean;
    };
```

Rules:

- Runtime scenes reference an environment by stable ID; they do not hardcode paths in gameplay systems.
- A cubemap skybox asset must declare exactly six face URLs and their orientation.
- Visible background and environment lighting are separate settings even when they use the same source texture.
- Required environment assets participate in runtime-scene readiness validation.
- The asset manager owns loaded cubemap assets and disposal; the renderer adapter owns `Scene.background`, `Scene.environment`, fog/atmosphere projection, and clearing stale scene references before scene unload.
- Svelte, Threlte, and gameplay systems do not mutate Three scene background/environment directly.
- Missing authored environment data must fail validation for production runtime scenes; the runtime must not silently choose an Observatory/default fallback.
- Future volumetric clouds, sky atmosphere, weather, reflection probes, and image-based-lighting preprocessing should extend this contract instead of creating unrelated atmosphere policies.

Current implementation status:

- `src/engine/data/schemas` requires `renderProfile.environment` and validates environment references against the selected runtime scene asset manifest, level preload set, readiness assets, asset kind, and projection metadata.
- `src/game/assets/skyboxAssets.ts` declares manifest-owned cubemap assets plus small checked-in sample equirectangular and video environment assets.
- `src/engine/modules/rendering` defines framework-neutral scene-environment variants, bounded dynamic capture settings, and the authored `ReflectionProbe` sync contract.
- `src/engine/adapters/three` loads cubemap, texture, and muted video assets through `AssetManager`, projects scene environments into `Scene.background` and `Scene.environment`, supports PMREM/cube capture where required, and clears/restores scene references and probe material mutations during unload.
- `portal_arena_runtime`, `prototype_arena_runtime`, and `miranda_deck_runtime` still declare required cubemap environments. The new equirectangular, video, procedural, and reflection-probe modes are contract-ready for future authored scenes but are not used by the default scene yet.
- Focused validation now includes `test:scene-environment-contract` for accepted environment variants, invalid projection/video/dynamic-capture data, and reflection-probe shape/resolution failures. `test:runtime-scene-contract` continues to cover current cubemap preload/readiness failures.
- Active sky/environment work: `docs/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md` now tracks the same-day portal arena equirectangular production opt-in. Remaining deferred work includes editor/import controls, richer probe blending/debugging, 180/strip video sky mappings, fog/cloud/weather integration, generated/cooked environment pipelines, and broader production content authoring for the new modes.

### Water Surface Environmental Assets

Water is a reusable environment primitive, not a level-local Observatory mesh. Modern engines treat water as a shared rendering/environment system: Unreal has a Water System for oceans, lakes, rivers, islands, meshing, rendering, and editing, while Unity HDRP exposes water as render-pipeline-owned water surfaces with configurable body/rendering/simulation behavior. The target engine should follow the same ownership shape at a smaller scale.

Initial ownership:

```text
src/game/assets/waterAssets.ts
  -> shared reusable water mesh/material assets

src/game/prefabs/waterPrefabs.ts
  -> shared reusable water surface prefabs and default WaterSurface data

src/game/levels/<level>.ts
  -> per-level water instances and customization

RuntimeSceneManifest / AssetManifest
  -> selected water assets, preload groups, and readiness assets when required

ThreeRendererAdapter
  -> renderer-specific material/transparency/render-order behavior and future
     shader wave/reflection/refraction projections from renderer-safe water data
```

Rules:

- The current slice is visual water plus contract-owned animation/reflection/refraction data only: no collider, no trigger volume, no buoyancy, no rising-water behavior, and no shader simulation implementation yet.
- A level may own a stable instance ID such as `observatory:water`, but reusable mesh/prefab ownership belongs to `WaterSurfaceContract`.
- Render water must never imply collision; water volumes or traversal effects require explicit components/contracts. The current `WaterSurface.gameplayVolume.enabled` value is explicitly `false` until that contract exists.
- Material color, opacity, roughness, emissive, and future shader parameters must be authored through manifest-owned material data or explicit prefab/level overrides, not hidden renderer defaults.
- Runtime scenes include water assets in preload/readiness when the water surface is required for first playable presentation.
- Svelte, Threlte, browser code, and old `apps/game` water/editor/runtime systems do not own target-engine water state.

Observatory is the first implemented consumer: it places `observatory:water` as a shared water prefab instance at `y = -2`, size `4000 x 4000`, with authored scrolling-wave and environment-reflection parameters, disabled refraction, no collider, and no gameplay volume. `docs/WATER_SURFACE_SYSTEM_PLAN.md` tracks the implementation plan and future packets for shader animation, visual reflections/refraction, rising water, underwater state, buoyancy, and water-body authoring.

Do not store gameplay state in `mesh.userData`.

Allowed `userData` use:

```ts
mesh.userData.entityId = entity;
```

Forbidden `userData` use:

```ts
mesh.userData.health = 100;
mesh.userData.inventory = inventory;
mesh.userData.aiState = state;
```

Cleanup requirements:

- Removing a Three object from the scene is not enough.
- Geometries, materials, textures, render targets, skeletons, controls, and post-processing passes may need explicit disposal.
- Shared resources require reference tracking or ownership rules.

## 12. Threlte Usage

Threlte is a declarative Svelte binding to Three.js. It is useful, but it can blur runtime boundaries.

Use Threlte for:

- Editor views.
- Debug visualization.
- Tooling panels.
- Small interactive scenes.
- UI-connected 3D previews.

Prefer raw Three adapter sync for:

- High-entity runtime rendering.
- Instancing-heavy scenes.
- Streaming scenes.
- Custom render pipelines.
- Worker or OffscreenCanvas experiments.
- Runtime objects owned by the engine world.

If Threlte is used in runtime, it should observe engine state or host adapter output. It should not be the canonical owner of game entities.

## 13. Physics Architecture

Rapier is the physics solver, not the gameplay world.

Engine component:

```ts
type RigidBody = {
  type: 'dynamic' | 'fixed' | 'kinematic';
  mass: number;
  bodyHandle?: PhysicsBodyHandle;
};
```

Adapter resource:

```text
PhysicsBodyHandle -> RAPIER.RigidBody
ColliderHandle -> RAPIER.Collider
```

Sync model:

```text
Before physics:
Transform + RigidBody -> Rapier body

Physics step:
Rapier world.step()

After physics:
Rapier body -> Transform
```

Important nuance:

For dynamic bodies, Rapier is authoritative during the physics step. The engine owns identity and semantic state, but Rapier owns constraint solving. Post-sync commits solver results back to engine components.

Rules:

- Gameplay code should not hold raw Rapier objects.
- Physics handles are adapter details.
- Collision events are translated into engine events.
- Physics queries go through engine physics APIs.
- Fixed timestep defaults to Rapier's practical game-oriented 1/60 second step unless a specific scene requires otherwise.
- Collider shapes are authored data. Current schema-owned shapes are box, sphere, capsule, cylinder, and mesh.
- Mesh colliders must include explicit vertices and triangle indices, and schema validation must reject malformed indices before runtime.
- Render meshes are not collision sources unless a contract explicitly authors equivalent collider data.
- Rapier mesh collider use belongs behind the Rapier adapter; game systems and prefabs never hold raw Rapier collider objects.
- Kinematic player traversal uses `CharacterController.kinematicCollision` and
  `PhysicsAdapterPort.computeKinematicCharacterMovement`; Rapier's kinematic
  character controller stays behind the Rapier adapter. Movement obstacle
  filtering is authored through collision channels on the controller settings
  and collider policies, not adapter-local level branches.

### Level Authoring And Import Validation

AAA-tier engines do not scale level readiness through long hand-maintained
arrays. They keep authored content, imported/cooked products, runtime catalogs,
and validation as separate contracts. For this engine, that means a content
graph layer must derive or drift-check runtime scene manifests from checked-in
source content before more levels scale out.

Target data flow:

```text
Authored level, prefab, asset, render, audio, and transition data
  -> content graph import/validation
  -> derived or drift-checked RuntimeSceneManifest readiness
  -> runtime load gate
```

The content graph validator should derive or verify:

- Required asset IDs from level preload data, prefab render/audio references,
  render-profile environment assets, shared portal/water/sky assets, material
  texture references, and scene music/SFX manifests.
- Required prefab IDs from level instances, transition endpoints, collision
  authoring products, and shared gameplay/environment prefabs.
- Required collision stable IDs from instances whose prefab or instance
  override declares required solid, trigger, or interaction collision.
- Required walkable stable IDs from authored `Collider.intent: "walkable"`
  data.
- Required light stable IDs from authored first-playable `Light` components.
- Runtime scene transitions from `Portal.targetRuntimeSceneId` values and the
  checked-in runtime scene catalog.
- Duplicate stable IDs, orphaned preload entries, missing asset definitions,
  missing prefab definitions, missing portal targets, and readiness values that
  drift from authored source.

Runtime scenes still consume `RuntimeSceneManifest` data; the runtime must not
scan visible meshes, repair missing readiness, or branch by level ID. Current
manual readiness arrays are transitional checked-in data and must be
drift-checked. The implemented foundation in
`src/engine/data/contentGraph/index.ts` and
`scripts/test-level-authoring-contract.ts` compares derived requirements with
the existing manifests before more playable levels are added.

Generated GLB parity and explicit target-generated assets use the same
ownership rule. Legacy generated GLB candidates are tracked in checked-in
import manifests, not copied into runtime paths ad hoc. Each generated
candidate must either resolve to current target asset, prefab, and level stable
IDs, or be marked as planned with owner, contract, reason, and
removal-condition metadata. Target-engine generated GLBs may be loaded by
runtime scenes only after a deterministic generator, manifest asset, prefab,
stable level instance, and provenance validation exist. Imported target-engine
generated GLB entries must declare the generator script, checked-in provenance
metadata path, and generated GLB SHA-256; the generated import contract test
verifies those values against the checked-in artifact. The implemented
foundation in `src/game/assets/generatedGlbImportParity.ts` and
`scripts/test-generated-glb-import-contract.ts` currently tracks Miranda
command-console, Chapel monolith, story-marker, and portal-apparatus generated
GLB candidates plus the imported Observatory field visual terrain GLB.

### Level Editor And Collision Cook Pipeline

The level editor is planned as a separate dev-only window/tooling surface. It
does not become the normal game HUD, and runtime game systems must not depend
on editor state.

Target data flow:

```text
Editor authoring data
  -> collision draft/source data
  -> explicit cook/bake command
  -> checked-in PrefabDefinition / LevelDefinition / RuntimeSceneManifest data
  -> runtime loading, readiness, physics sync, and Rapier adapter projection
```

The editor may run beside the game window, send temporary dev-only preview
patches, and request a scene reload after a successful bake. Preview patches
must stay separate from shipped data and must pass the same schema/contract
validation path before runtime preview. Normal builds validate that cooked data
is current; they do not silently bake or rewrite files.

Collision cooking should prefer cheap authored primitive data first: cuboids
and other simple shapes for most floors, blockers, walls, and trigger volumes;
compound primitive sets for architecture and traversal details; cooked trimesh
chunks only for static irregular geometry that needs precision; heightfields
only for future true heightmap terrain. The first Observatory slice now has a
non-UI data/check foundation: `src/engine/data/collisionCook/index.ts` validates
authored collision drafts, `src/game/editor/collisionDrafts/observatoryCollisionDraft.ts`
owns the current Observatory V1 draft, and `cook:observatory-collision` checks
the draft against runtime manifest data without writing files by default. The
first dev-only editor boundary shell now exists at `/editor/`, with
`src/app/editor/levelEditorSession.ts` projecting the current
`observatory_runtime` collision draft, terrain import/cook status, preview
patch metadata, and generated bake artifact hash outside the normal game HUD.
`--print-preview-patch`
exposes the temporary dev-only preview payload, and `--write-generated-bake`
writes the deterministic editor-owned generated artifact at
`src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json`.
`--write-runtime-collision` explicitly writes the generated checked-in runtime
collision module at `src/game/generated/observatoryCollisionRuntime.ts`, which
Observatory prefab, level, and manifest owners import for shipped collision
data. The bake does not mutate arbitrary TypeScript object literals; the
generated module is the structured runtime owner because broad TS rewrites are
riskier than an owned generated data module.
The dev-only game-window preview/reload protocol is implemented as an
app-layer browser channel and callback port that validates preview-patch
messages before send/application and applies temporary transform/collider
updates only in dev mode for the active runtime scene. Basic preview clearing
and component restoration are explicit through the same dev-only protocol;
richer reload lifecycle diagnostics remain planned. The `/editor/` route
exposes editable collision controls and a top-down collision gizmo surface for
current Observatory draft entries; persisted spatial drag handles and
generalized multi-level editing remain planned. The generalized terrain
import/cook contract is implemented through engine data terrain cook
validation, generated Observatory field GLB provenance, reusable write-plan
serialization, and runtime-drift checks. Cooked terrain chunks are implemented
as a foundation through 16 deterministic Observatory walkable terrain chunks
derived from the authored 17x17 height grid, plus four boundary blockers.
Render terrain and collision terrain are separate products: generated visual
terrain stays visual-only, and runtime traversal stays on explicit collider
data. Production editor import UI, material/shader import, terrain
LOD/streaming, and multi-level terrain packages remain future packets tracked
in
`docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md`.

Cooked collision shape dimensions and mesh vertices are final physics data.
Runtime `Transform.scale` is visual/spatial scene data and is not a hidden
physics scale multiplier; import and cook tools must bake any source-art scale
into collider dimensions or vertices before validation.

Determinism rules:

- Pin Rapier version for deterministic replay.
- Use fixed tick count, not elapsed wall time, for simulation replay.
- Use seeded RNG.
- Avoid unguarded `Math.random`.
- Be careful with `Math.sin`, `Math.cos`, and other operations that can vary cross-platform.
- Add/remove bodies and colliders in deterministic order when replay determinism matters.

## 14. Input Architecture

Input is collected from the platform layer and converted into engine actions.

Platform devices:

- Keyboard.
- Mouse.
- Pointer lock.
- Touch.
- Gamepad.
- Visibility/focus changes.

Engine concepts:

- InputDevice.
- ActionMap.
- InputBinding.
- InputSnapshot.
- MobileInputControlsPort.
- PlayerInput component.
- Command generation.

Rules:

- Browser event listeners live in the browser platform adapter.
- Systems consume input snapshots or commands.
- UI focus state must gate gameplay input.
- The default browser mouse path is hold-drag look; normal cursor movement over
  the canvas must not become camera input.
- Pointer lock is an optional browser capability for an explicit future mode,
  not the default owner of runtime look state.
- Pointer lock failures and exits are explicit events when that mode is used.
- Disabled gameplay input clears stale keyboard, mouse, touch, gamepad, pointer
  delta, and click state instead of replaying it when input is re-enabled.
- Mobile touch gameplay uses semantic `MobileInputControlsPort` action IDs;
  raw browser touch identifiers are not a second gameplay input path.
- Gamepad polling must account for connection, disconnection, and missing devices.

Implemented first-person input flow:

```text
BrowserInputAdapter
  -> InputSnapshot
  -> held-look pointer gate + click candidates
  -> mobile touch controls through MobileInputControlsPort
  -> PlayerInput component
  -> MoveEntity / JumpEntity / InteractAtScreenPoint / InteractWithActiveTarget commands
  -> ActiveInteractionTarget selected from proximity candidates
  -> HUD projection from the selected ActiveInteractionTarget
  -> MovementIntent
  -> FirstPersonController yaw/pitch
  -> CharacterMotor
  -> KinematicCharacterController
  -> CharacterController movement state
  -> ChargedAction component and semantic charge/release events
```

The default canvas interaction is hold-drag look. The Svelte client does not own
look direction, movement, camera pose, click interaction, charge state, or
player state. Pointer-lock failures and input readiness are surfaced to the HUD
instead of being silently swallowed when pointer lock is enabled as an explicit
mode. Mobile controls are an engine-facing input surface; they feed action and
look intent through `MobileInputControlsPort` so gameplay systems can emit
commands/events instead of UI mutating runtime state directly.
`ActiveInteractionTarget` is the display and activation authority after
proximity arbitration. HUD projection does not re-read raw portal or story-note
proximity resources for selected-target details, and scene unload removes the
selected target alongside portal/story-note reader state.

## 14.1 First-Person Player Architecture

The first-person player is an entity composition, not a Svelte or Three object.

Current player components:

```text
Player entity
- Transform
- Renderable
- RigidBody
- Collider
- CharacterController
- FirstPersonController
- CameraTarget
- Health
- PlayerInput
- ChargedAction
- Light
- PlayerLightFeedback
```

System ownership:

```text
PlayerInputSystem:
  reads platform input
  writes PlayerInput and movement/jump commands

FirstPersonLookSystem:
  reads PlayerInput + FirstPersonController
  writes yaw/pitch and yaw-only player Transform rotation

CharacterMovementSystem:
  reads CharacterMotor + CharacterController + Transform
  writes Transform and grounded/vertical velocity state

CharacterMotorSystem:
  reads MovementIntent + FirstPersonController
  writes CharacterMotor

PlayerCameraSystem:
  reads Transform + FirstPersonController + CameraTarget
  writes camera:activePose

InteractionTargetSelectionSystem:
  reads active proximity candidates
  writes the single selected ActiveInteractionTarget for HUD and activation

ChargedActionSystem:
  reads PlayerInput
  writes ChargedAction and semantic charge events

PlayerChargeLightFeedbackSystem:
  reads ChargedAction + Light
  writes PlayerLightFeedback and updated Light intensity/range

LightSyncSystem:
  reads Transform + Light
  projects authored and gameplay-updated lights through the renderer adapter

ThreeRendererAdapter:
  reads camera:activePose through a camera port
  updates the Three camera
```

This is intentionally compact and hybrid-ready. If actor-style wrappers are added later, they should hold entity handles and dispatch commands; they must not become the authoritative player state.

## 15. Audio Architecture

Audio is an engine module with a browser implementation.

Engine concepts:

- AudioManager.
- Listener.
- SoundEmitter.
- MusicState.
- AudioEvent.

Rules:

- Gameplay emits semantic events.
- Audio systems decide which sounds to play.
- Browser audio unlock and autoplay restrictions are platform concerns.
- Audio nodes created for a scene must be stopped/disconnected on unload.
- Shipped music and SFX are referenced by stable manifest IDs, not direct imports
  from gameplay, UI, or runtime systems.
- Event-mapped sounds and scene music must be present in the owning runtime
  scene asset manifest, preload list, and readiness requirements.
- Scene music may declare either one `trackId` or an ordered `trackIds`
  playlist. Playlist tracks are selected by the game runtime on scene load from
  validated manifest-owned audio assets; the runtime must not scan folders.
- Scene music may declare bounded `fadeSeconds`. The browser audio adapter owns
  music fade-in, fade-out, and crossfade scheduling; gameplay and UI do not
  create or ramp Web Audio nodes directly.
- Audio content manifests may declare named mixer buses with bounded gain
  values. Scene music, mapped events, and `SoundEmitter` components may
  reference those buses by stable `busId`; the browser audio adapter owns the
  Web Audio gain graph and bus volume updates.
- Spatial audio uses engine-owned `SoundEmitter` components plus the active
  camera pose/listener resource. The browser audio adapter owns Web Audio
  listener, panner, gain, playback, and cleanup nodes; gameplay and UI never
  hold Web Audio objects.
- `public/audio/sfx/audition/` is source/audition material only; production
  runtime manifests must not reference it directly.
- `public/audio/ambient/AMBIENT_AUDIO_SOURCES.md` records production ambient
  tracks and candidate tracks. Candidate tracks in `public/audio/ambient/` are
  not runtime content until promoted to stable manifest IDs with provenance.

Current production audio IDs:

```text
audio_ambient_portal_deck -> public/audio/ambient/portal-deck.mp3
audio_ambient_wicked_shadows_whisper -> public/audio/ambient/Wicked Shadows Whisper.mp3
audio_ambient_dark_shadows_of_delight -> public/audio/ambient/Dark Shadows of Delight.mp3
audio_ambient_shadow_waltz -> public/audio/ambient/Shadow Waltz.mp3
audio_ambient_whistling_dreams -> public/audio/ambient/Whistling Dreams.mp3
audio_ui_collect -> public/audio/sfx/interface-click-tone.mp3
audio_player_jump -> public/audio/sfx/interface-sweep.mp3
audio_player_charge_release -> public/audio/sfx/22-kenney-forceField_001.mp3
audio_portal_activate -> public/audio/sfx/portal-activate.mp3
audio_portal_cycle -> public/audio/sfx/portal-cycle.mp3
```

## 16. Asset Architecture

Use an asset registry and manifest. Do not scatter random imports throughout gameplay code.

Core concepts:

```text
AssetManager
  load()
  unload()
  preload()
  get()
  retain()
  release()

AssetRegistry
  mesh IDs
  material IDs
  texture IDs
  audio IDs
  animation IDs
  prefab IDs
```

Manifest example:

```json
{
  "crate_01": "/assets/models/props/crate_01.glb",
  "material_painted_metal": "/assets/materials/painted_metal.json",
  "footstep_concrete_01": "/assets/audio/foley/footstep_concrete_01.ogg"
}
```

2026 browser asset requirements:

- Prefer glTF/GLB for 3D assets.
- Plan for texture compression.
- Plan for mesh compression where useful.
- Use cacheable, versioned URLs.
- Define preload groups per scene.
- Track shared GPU resources.
- Dispose or release scene-owned assets on unload.
- Keep checked-in authored primitive assets separate from future generated runtime assets.
- Do not reference generated GLB or collider products from runtime scenes until
  an import/generation owner validates them and the runtime manifest owns the
  resulting target asset, prefab, level, and readiness data.
- Scene manifests must declare the exact assets they need; runtime startup must not fall back to broad default registries or hidden boot preload groups.
- Renderable mesh/material references in prefabs or level-instance overrides must resolve inside the owning runtime scene manifest and level preload set before runtime.
- Browser-served authored game assets live under `public/assets/game/...` and are referenced through stable manifest IDs. The portal arena gate GLB is referenced as `mesh_portal_gate`; the level never imports the file directly.

## 17. Scene Architecture

Do not make one giant scene file.

Scene lifecycle:

```ts
type Scene = {
  load(): Promise<void>;
  activate(): void;
  update?(dt: number): void;
  deactivate(): void;
  unload(): Promise<void>;
};
```

Scene types:

```text
BootScene
MainMenuScene
LoadingScene
GameScene
EditorScene
PhysicsTestScene
CombatPrototypeScene
```

Scene ownership rule:

```text
When a scene unloads, it must destroy or release every entity, asset reference,
event listener, physics body, render object, audio node, timer, and worker
resource it created.
```

Recommended implementation:

- SceneScope tracks all scene-owned runtime objects.
- SceneManager owns transitions.
- AssetManager tracks retain/release.
- The game runtime owns a checked-in runtime scene catalog, a declared default runtime scene, and a scene transition port.
- World supports entity groups or scene ownership tags.
- Adapters expose explicit destruction APIs.

Current playable/runtime scenes:

```text
portal_arena_runtime
  -> default navigation room with eight portal slots
  -> active targets: prototype_arena_runtime, miranda_deck_runtime, and
     observatory_runtime, and sci_fi_room_runtime

prototype_arena_runtime
  -> first playable prototype slice

miranda_deck_runtime
  -> primitive foundation slice for migrated Miranda content

observatory_runtime
  -> playable foundation slice for migrated Observatory content

sci_fi_room_runtime
  -> playable foundation slice for migrated Sci Fi Room content
  -> owns three readiness-required walkable floor colliders, five StoryNote
     markers, a manifest-ID Observatory portal, and disabled/off
     post-processing profile data
```

## 18. Browser Platform Layer

The engine should not call browser APIs from random places.

Bad:

```ts
document.addEventListener('keydown', onKey);
localStorage.setItem(key, value);
window.innerWidth;
```

Better:

```ts
platform.input.onKey(onKey);
platform.storage.save(key, value);
platform.display.getSize();
```

Platform capabilities:

- Animation frame scheduling.
- Pointer lock.
- Fullscreen.
- Keyboard.
- Mouse.
- Touch.
- Gamepad.
- Resize.
- Visibility.
- Local/session storage.
- IndexedDB where needed.
- Workers.
- OffscreenCanvas experiments.

WebGPU/WebGL strategy:

- WebGPU is the forward-looking browser GPU API, but it is not universally available across all major browser/device combinations.
- The renderer layer should be designed so WebGL/Three remains viable while future WebGPU paths can be explored.
- Do not require WebGPU unless the target audience and browser support are explicit.

Workers and OffscreenCanvas:

- Browser workers can move expensive simulation or asset work off the main thread.
- Workers cannot directly manipulate the DOM.
- OffscreenCanvas can decouple canvas rendering from the DOM and can run in a worker where supported.
- Treat worker usage as an adapter/platform concern, not a gameplay dependency.

## 19. Data-Driven Content

Prefer prefabs and level data over hardcoded entity construction.

Prefab example:

```json
{
  "id": "crate_breakable",
  "components": {
    "Transform": {
      "position": [0, 0, 0],
      "rotation": [0, 0, 0, 1],
      "scale": [1, 1, 1]
    },
    "Renderable": {
      "meshId": "crate_01",
      "materialId": "wood_worn"
    },
    "RigidBody": {
      "type": "dynamic",
      "mass": 20
    },
    "Health": {
      "max": 30
    }
  }
}
```

Engine API:

```ts
world.spawnPrefab('crate_breakable', {
  position
});
```

Rules:

- Prefabs define reusable entity composition.
- Levels define scene composition.
- Assets are referenced by stable IDs.
- Runtime state should be serializable where practical.
- Data schemas should validate content before runtime.
- Runtime scene manifests own their asset, prefab, level, render profile, and readiness data for a playable scene.
- Readiness must fail before play when required assets, player spawn, collision prefabs, exact collision stable IDs, exact walkable stable IDs, or exact authored light stable IDs are missing.
- Content migration from the old game must rewrite source evidence into new contracts; it must not import old runtime code or copy old editor repair paths.
- When old authored parent transforms are simple enough, migration may flatten them into level instance transforms while keeping prefab geometry/collider/material as reusable archetype data.

Current migrated Miranda foundation:

- `miranda_deck_runtime` is checked-in target-engine data, not old runtime JSON.
- Migrated primitive content includes Miranda spawn, two deck floors plus a Cargo Hold floor/bounds extension as explicit `walkable` collision surfaces, cockpit glow panels, cockpit command console, crew bunks, locker bank, Captain's Office desk/chair/safe, Engine Core, Engine Room columns, Medbay pods, Mess Hall blockers, Chapel Altar, Chapel monoliths, Brig cells/desk, Cargo Hold stacks, and Archive server banks.
- The current Miranda walkable floor footprint is now represented by `src/game/editor/collisionDrafts/mirandaCollisionDraft.ts`; `test:miranda-collision-draft-contract` validates that the draft matches runtime readiness and covers the authored character bounds. This is a cook-draft foundation, not full Miranda terrain/cooked collision parity.
- Migrated interaction content includes nine Miranda story notes as authored `StoryNote` component data with reusable marker prefabs, trigger colliders, nearest active target selection, reader open/close state, and HUD prompts/reader projection. The UI observes selected/open interaction state and dispatches close intent; it does not own story text or decide gameplay targets.
- Migrated portal content includes the old Miranda airlock return portal as a
  checked-in `Portal` entity at `miranda:airlock:return-portal`, using the
  shared `portal_gate` prefab, `mesh_portal_gate`, and
  `audio_portal_activate`. It targets `observatory_runtime` by manifest ID; no
  old generated portal apparatus GLB, collider product, or editor/runtime code
  is loaded.
- Migrated authored lighting includes Miranda Command Gallery Beacon, Observation Light, and Archive Light as stable `Transform + Light` point-light entities. `LightSyncSystem` projects them through the renderer adapter; Svelte/Threlte lighting controllers and generated light IDs were not copied. `AuthoredLightContract` now includes spot-light schema/adapter support, rectangle area-light schema/adapter support, optional shadow settings for shadow-capable authored lights, explicit render-profile light budgets enforced by content-graph validation, and an editor-only Miranda light draft validator. The old point-light budget controller was not copied; budgets fail authoring validation instead of clipping runtime lights.
- The tapered Engine Core preserves old authored visual shape with a parameterized built-in cylinder/frustum render mesh and explicit mesh collider data.
- Current primitive material migration preserves stable material IDs plus authored base color, emissive color/intensity, metalness, roughness, and Medbay opacity through schema-owned material asset data. The cockpit center panel and wide Archive server bank use split material IDs because their old authored material values differ from sibling prefabs.
- Generated GLB parity is now tracked through
  `GeneratedGlbImportParityContract`: the old command-console, Chapel
  monolith, and used story-marker GLBs are validated as checked-in target-engine
  substitutions; the old green story marker and portal apparatus remain planned
  entries with owner metadata and removal conditions.
- Old Three/Svelte raycast interaction, production area-light tuning/editor controls,
  generated collider products,
  broader terrain/cooked-collision coverage beyond the current cook-drafted
  Miranda floor footprint, post-processing, reflections, material
  texture/shader import/generation, old held-charge oscillator audio, old
  shockwave VFX arrays, and old editor behavior remain future work until they
  have explicit contracts and owners.

Current portal arena foundation:

- `portal_arena_runtime` is the default runtime scene.
- Shared portal assets are content-owned through
  `src/game/assets/portalAssets.ts` and
  `public/assets/game/portals/portal_gate.glb`.
- Portal field terrain is content-owned through `mesh_portal_field` and
  `public/assets/game/terrain/portal_field_moor.glb`; `portal_arena_floor`
  keeps explicit solid/world collision as authored data instead of deriving
  collision from GLB render geometry.
- Portal arena scene music and scene-scoped audio mappings are content-owned through `src/game/assets/portalArenaAssets.ts`, shared ambient tracks in `src/game/assets/ambientAudioAssets.ts`, `AudioContentManifest.sceneMusic`, and event mappings. Shared portal gate/activation content is owned through `src/game/assets/portalAssets.ts`. Production paths are `public/audio/ambient/portal-deck.mp3` for `audio_ambient_portal_deck`, `public/audio/sfx/portal-activate.mp3` for `audio_portal_activate`, and `public/audio/sfx/22-kenney-forceField_001.mp3` for `audio_player_charge_release`. Runtime transitions stop previous scene music and apply selected scene music only after the scene preload/readiness path succeeds.
- Portal slots are authored data in `src/game/levels/portalArenaLevel.ts`.
- Portal interaction is handled by game systems that read world components/resources and request runtime scene transitions by manifest ID.
- The current connected portal slots target `prototype_arena_runtime`,
  `miranda_deck_runtime`, `observatory_runtime`, and
  `sci_fi_room_runtime`; each target exists in the checked-in runtime scene
  catalog and passes readiness/content-graph validation before admission.
- `PlayerCarriedLightContract` restores the useful legacy behavior where the
  player can read nearby dark ground. The current foundation uses the stable
  `player` entity itself as the light carrier: it has gameplay-owned
  `Transform` data plus instance-level `Light` data in
  `src/game/levels/portalArenaLevel.ts`, and `portal_arena_runtime` requires
  that stable light ID before the scene can be considered ready.
  `PlayerChargeLightFeedbackSystem` boosts the player `Light` intensity and
  range while `ChargedAction` is held, stores the authored base values in
  `PlayerLightFeedback`, and restores those values when charge ends.
  `LightSyncSystem` projects the moving `Transform + Light` state through the
  renderer adapter, and the Three adapter updates mutable light properties
  in-place. No Svelte/Threlte/Three-owned player light, render-profile
  stuffing, hidden renderer default, old point-light budget controller, or
  renderer-local mutation path is allowed.
- Future player-light work should stay inside the same contract. If the light
  needs a camera/hand offset, add an explicit stable child/follower
  relationship or a game-owned follow system. Release burst shockwaves, avatar
  glow, shadows, and richer pulse tuning remain future consumers of semantic
  gameplay events or ECS light state.
- Implemented Observatory playable foundation:
  - `ObservatoryLevelContract` recreates the old Observatory first slice as
    checked-in target-engine scene content, using old source art and scene
    evidence only. It does not load old generated runtime scene JSON, old
    terrain chunk runtime, generated collision binaries, editor repair paths,
    Svelte/Threlte lighting controllers, or point-light budget controllers.
  - The implemented slice is `observatory_runtime` / `observatory` /
    `observatory_game`, reached from the portal arena Observatory slot by
    manifest ID. It is a playable foundation, not full old-level parity.
  - The source Observatory GLB remains the owned target asset
    `mesh_observatory_environment` at
    `/assets/game/observatory/observatory-environment.glb`, transformed as
    authored scene data at scale 1. The generated visual field terrain is the
    owned target asset `mesh_observatory_field_micro_displacement` at
    `/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.glb`,
    produced by `scripts/generate-observatory-field-terrain.ts` with matching
    provenance JSON. It is rendered by `observatory_field_visual_terrain` /
    `observatory:terrain:visual-field` at scale 1 and records alignment with
    the collision draft sample heights. The engine-wide `CollisionPolicy`,
    `WalkableCollisionContract`, and `LevelReadinessContract` keep that GLB
    and generated visual terrain visual-only: the Observatory packet consumes
    them through 16 deterministic `observatory:walkable-mesh:chunk:x*-z*`
    `walkable/worldStatic` mesh collider chunks, and the current movement
    bounds are constrained by four required `observatory_boundary_blocker`
    instances.
    Render mesh geometry is not implicit collision.
  - The player spawn is authored as the stable `player` instance at
    `[-137.2, 1.8, -49.5]`, with `CharacterController.groundY` kept as the
    spawn/fallback scalar and `CharacterController.kinematicCollision`
    enabling adapter-owned slide, slope, snap-to-ground, autostep behavior,
    and `worldStatic` obstacle filtering over the explicit collision data.
    Movement bounds remain clamped to `x/z = -300..300`.
  - Lighting uses the existing contracts: a low ambient render profile with
    `cubemap_observatory_sky`, a player-carried `Transform + Light` through
    `PlayerCarriedLightContract`, and three firefly
    `Transform + Renderable + Light` entities generated from deterministic
    `FireflyPopulationContract` data. Fireflies and the player light are
    required readiness stable IDs, not renderer defaults. The current firefly
    contract also derives bounded deterministic flicker preview/cook samples
    from authored seed/phase/frequency/amplitude data; live runtime light
    animation remains a future renderer/system packet.
  - The water plane is a shared `WaterSurfaceContract` consumer:
    `observatory:water` carries authored scrolling-wave and
    environment-reflection parameters at `y = -2`, has no collider, and keeps
    gameplay volume disabled while reusable mesh/material/prefab/component
    ownership belongs to the shared water system. Shader animation,
    reflections/refraction rendering, water volumes, rising water,
    post-processing adapter implementation, terrain LOD/streaming, production
    editor import UI and material/shader pipeline, large firefly populations,
    live runtime flicker animation, and richer light/shadow behavior remain
    future contracts. The generated visual terrain is not collision, and the
    current collision product is a chunked terrain foundation, not a complete
    multi-level terrain package.
  - Observatory scene music is content-owned through
    `src/game/assets/observatoryAssets.ts`, `AudioContentManifest.sceneMusic`,
    and the shared production `audio_ambient_portal_deck` asset. The old
    Observatory `courtyard-breeze` editor preset resolved to
    `/audio/ambient/portal-deck.mp3` at volume `0.16`; the target engine keeps
    that as manifest-owned scene music with `fadeSeconds: 1.5` without copying
    the old Svelte/Howler runtime.
- Miranda scene music is content-owned through `src/game/assets/defaultAssets.ts`, `AudioContentManifest.sceneMusic`, and `public/audio/ambient/Wicked Shadows Whisper.mp3` as `audio_ambient_wicked_shadows_whisper`.

## 20. Save, Load, Replay

Save/load should be designed around engine state, not renderer or physics internals.

Serializable state:

- Entity IDs or stable save IDs.
- Components.
- Scene ID.
- Game resources.
- Game progression.
- Player state.

Usually not serialized directly:

- Three objects.
- GPU buffers.
- Rapier object references.
- DOM nodes.
- Audio nodes.

Replay requirements if needed:

- Seeded RNG.
- Fixed tick.
- Input command log.
- Pinned dependency versions.
- Deterministic spawn/despawn ordering.
- Snapshot checks for drift.

## 21. Networking Readiness

Multiplayer is not required by this document, but the architecture should not block it.

Helpful choices:

- Commands represent intent.
- State snapshots are selectable.
- Simulation can run from fixed ticks.
- Engine state is serializable.
- Renderer and UI are projections.

Potential future models:

- Server authoritative simulation.
- Client prediction.
- Snapshot interpolation.
- Replay-based debugging.

Avoid assuming local single-player state can always be trusted.

## 22. Debugging And Tooling

Required debug tools:

- Entity inspector.
- Component inspector.
- System timing profiler.
- Scheduler stage view.
- Physics debug draw.
- Render resource count.
- Asset registry view.
- Scene ownership/leak report.
- Event and command trace.
- Deterministic replay checker where needed.

Debug systems should observe engine state and adapters. They should not become required runtime dependencies for normal gameplay.

## 23. Validation And Guardrails

Architecture guardrails should be enforced by tests or lint rules where practical.

Recommended checks:

- `engine/core` cannot import Three, Threlte, Rapier, Svelte, Astro, or DOM-only modules.
- `game` cannot import raw Three or Rapier except in explicitly allowed integration files.
- Svelte UI cannot mutate runtime ECS storage directly.
- Scene unload leaves no owned entities, listeners, physics bodies, render objects, or unreleased asset references.
- Scheduler stage order is covered by tests.
- Fixed timestep loop clamps large deltas.
- Renderer disposal paths are covered by focused tests.
- Replay tests compare deterministic snapshots for selected scenes.

## 24. Refactor Strategy

Do not refactor everything at once.

### Phase 1: Define Boundaries

Create the target folders:

```text
engine/core
engine/modules
engine/adapters/three
engine/adapters/rapier
engine/adapters/browser
game
ui
```

Move code only when ownership is clear.

### Phase 2: Minimal Engine Runtime

Build:

- World.
- Entity IDs.
- Component storage.
- System interface.
- Scheduler.
- Event bus.
- Command bus.
- Time management.

Keep it simple and typed.

### Phase 3: Move Player State Into The World

Make the player an entity:

```text
Player entity
- Transform
- PlayerInput
- CharacterController
- RigidBody
- Collider
- Renderable
- FirstPersonController
- CameraTarget
```

This is usually the key turning point because it proves the renderer, physics, UI, and gameplay can coordinate through the world.

Current implementation status:

- Player state lives in the world as a spawned `player` prefab.
- Input is collected by the browser adapter and mirrored into `PlayerInput`.
- Movement commands produce `MovementIntent`.
- First-person yaw/pitch and camera ownership live in engine systems.
- The local first-person body renderable is hidden while collision and gameplay state remain active.
- Kinematic character collision foundation is implemented through an engine
  physics-port query and the Rapier adapter's character controller. Remaining
  traversal polish such as moving platforms, crouch, ledge rules, richer stair
  tuning, and gameplay-specific collision masks should continue to talk to
  engine physics abstractions, not Rapier directly.

### Phase 4: Render Sync

Implement:

```text
Transform + Renderable -> Three object
```

Keep gameplay logic out of Three objects.

### Phase 5: Physics Sync

Implement:

```text
Transform + RigidBody <-> Rapier body
```

Restrict raw Rapier access to the adapter and physics module.

### Phase 6: Commands And Events

Replace cross-system direct calls with:

- Commands for intent.
- Events for facts.
- Queries for data access.

Do this incrementally so behavior stays understandable.

### Phase 7: Data-Driven Content

Move repeated objects and level composition into:

- Prefabs.
- Level data.
- Asset manifests.
- Schemas.

Current implementation status:

- Prototype and Miranda runtime scene manifests load through manifest-owned assets and prefabs.
- Miranda primitive content and story-note markers are migrated as explicit prefabs and level instances with stable IDs and readiness requirements.
- Miranda generated GLB parity candidates are tracked by
  `GeneratedGlbImportParityContract`; current substitutions validate against
  target assets, prefabs, and stable level instances, while unresolved generated
  candidates stay planned instead of entering runtime silently.
- Built-in primitive mesh support includes parameterized cylinders for authored frustum visuals; collision remains explicit data.
- Full Miranda is not complete until terrain/cooked collision, generated GLB content, render/VFX interaction polish, and editor tooling have durable owners.

### Phase 8: Browser Performance Hardening

Add:

- Visibility handling.
- Large delta clamp.
- Asset preload groups.
- GPU resource disposal checks.
- Worker candidates for expensive tasks.
- Renderer fallback strategy.

## 25. Architecture Rules To Enforce

### Ownership Rules

```text
1. The engine world owns gameplay identity and canonical runtime state.
2. Svelte stores may mirror selected engine state but may not own runtime gameplay state.
3. Three.js objects are render representations only.
4. Rapier objects are physics solver representations only.
5. Gameplay code must not directly mutate Three or Rapier objects.
6. Third-party libraries must stay out of engine/core.
7. Engine core must remain plain TypeScript.
```

### Dependency Rules

```text
1. engine/core imports nothing from app, ui, game, Three, Threlte, Rapier, Svelte, Astro, or browser DOM APIs.
2. engine/modules may import engine/core.
3. engine/adapters may import third-party libraries.
4. game may import engine APIs, but engine may not import game code.
5. ui may observe engine state and dispatch commands.
6. app initializes the runtime but does not contain gameplay logic.
```

### Update Rules

```text
1. Simulation uses a fixed timestep.
2. Render loop uses requestAnimationFrame.
3. System order is explicit.
4. No system relies on accidental execution order.
5. Cross-system communication uses commands, events, or declared queries.
```

### Data Rules

```text
1. Entities are composed from components.
2. Prefabs define reusable entities.
3. Levels define scene composition.
4. Assets are referenced by stable IDs.
5. Runtime state is serializable where practical.
```

### Cleanup Rules

```text
1. Every object created by a scene is owned by that scene or an engine subsystem.
2. Every event listener is removable.
3. Every physics body is destroyed when its entity is destroyed.
4. Every Three resource is disposed, released, or pooled according to ownership.
5. Scene unload leaves no scene-owned runtime objects behind.
```

## 26. Research Basis

This architecture is consistent with current engine and browser-platform guidance:

- Unreal Engine documents modules as the building blocks of engine/project architecture, with dependency graphs and runtime/editor separation.
- Unreal Gameplay Framework separates world, state, controllers, actors, components, HUD, and camera responsibilities.
- Unreal MassEntity and Unity Entities both validate data-oriented entity/component approaches for high-scale systems.
- Unity and Godot both document fixed timestep physics/game logic as the consistency-oriented model, with render frames running separately.
- Rapier's JavaScript/WASM documentation supports deterministic simulation under same-version, same-input, same-order, same-initial-condition constraints.
- Astro's islands architecture supports treating Astro as the web shell rather than the runtime game owner.
- Svelte stores are good for reactive UI streams, but Svelte 5 also encourages careful separation of shared reactive state; neither should become the engine database.
- Threlte is a declarative Svelte binding over Three.js, useful for UI-connected 3D and tooling, but risky as the owner of runtime entities.
- Three.js requires application-owned disposal of geometries, textures, materials, render targets, skeletons, controls, and post-processing resources.
- MDN documents browser game-relevant platform APIs including `requestAnimationFrame`, Pointer Lock, Gamepad, Web Workers, OffscreenCanvas, and WebGPU. WebGPU is forward-looking but not universal.

Reference links:

- Unreal Engine Modules: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-modules
- Unreal Gameplay Framework: https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine
- Unreal MassEntity: https://dev.epicgames.com/documentation/unreal-engine/overview-of-mass-entity-in-unreal-engine
- Unity Entities: https://docs.unity.cn/Packages/com.unity.entities%401.0/manual/index.html
- Unity Time and fixed timestep: https://docs.unity.cn/Manual/TimeFrameManagement.html
- Godot fixed timestep interpolation: https://docs.godotengine.org/en/stable/tutorials/physics/interpolation/physics_interpolation_introduction.html
- Rapier determinism: https://rapier.rs/docs/user_guides/javascript/determinism/
- Rapier integration parameters: https://rapier.rs/docs/user_guides/javascript/integration_parameters/
- Astro islands architecture: https://docs.astro.build/en/concepts/islands/
- Svelte stores: https://svelte.dev/docs/svelte/stores
- Threlte introduction: https://threlte.xyz/docs/learn/getting-started/introduction/
- Threlte Canvas: https://threlte.xyz/docs/reference/core/canvas/
- Three Object3D: https://threejs.org/docs/pages/Object3D.html
- Three disposal guide: https://threejs.org/manual/en/how-to-dispose-of-objects.html
- MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- MDN Pointer Lock: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
- MDN Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API
- MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- MDN WebGPU: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
