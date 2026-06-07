# Game Engine Architecture

This document defines the architectural rules and visual flow for a browser-based game engine using Astro, Svelte, Three.js, and Rapier. Threlte remains a possible future presentation/editor integration, but the current runtime does not keep a placeholder Threlte adapter.

The core principle:

> Astro owns pages. Svelte owns UI. The runtime owns the game loop. The engine core owns state. Systems transform state. Adapters talk to external libraries.

---

## 1. High-level Engine Architecture

```mermaid
flowchart TD
    A[Astro App Shell] --> B[Svelte UI Layer]
    A --> C[Game Runtime]

    B -->|Commands / UI events| C
    C -->|State snapshots / events| B

    C --> D[Engine Core]

    D --> E[World / ECS]
    D --> F[Scheduler]
    D --> G[Command Bus]
    D --> H[Event Bus]
    D --> I[Scene Manager]
    D --> J[Asset Manager]

    D --> K[Rendering Module]
    D --> L[Physics Module]
    D --> M[Input Module]
    D --> N[Audio Module]
    D --> O[Camera Module]
    D --> P[Debug Module]
    D --> S[Networking Module]
    D --> T[Future Animation Module]

    K --> K1[Three.js Adapter]
    L --> L1[Rapier Adapter]
    M --> M1[Browser Input Adapter]
    N --> N1[Web Audio Adapter]

    K1 --> Q[Canvas / WebGL / WebGPU]
    L1 --> R[Rapier World]
```

The important idea here is that **Astro and Svelte sit outside the engine**. They launch it, observe it, and send commands to it, but they do not own runtime state.

---

## 2. Dependency Direction Diagram

This is one of the most important diagrams for preventing fragmentation.

```mermaid
flowchart BT
    App[Astro App] --> UI[Svelte UI]
    App --> Game[Game Layer]

    UI --> ClientAPI[Engine Client API]
    Game --> EngineAPI[Engine Public API]

    ClientAPI --> Core[Engine Core]
    EngineAPI --> Core

    Modules[Engine Modules] --> Core
    Adapters[Third-party Adapters] --> Core

    ThreeAdapter[Three Adapter] --> Adapters
    RapierAdapter[Rapier Adapter] --> Adapters
    BrowserAdapter[Browser Platform Adapter] --> Adapters
    AudioAdapter[Web Audio Adapter] --> Adapters

    ThreeLib[Three.js] --> ThreeAdapter
    RapierLib[Rapier] --> RapierAdapter
    BrowserAPI[Browser APIs] --> BrowserAdapter
```

Rule this diagram enforces:

```text
Dependencies point inward toward the engine core.
The core does not import Astro, Svelte, Three, Threlte, or Rapier.
```

If you ever see this:

```ts
// engine/core/World.ts
import * as THREE from 'three'
```

That is an architecture violation.

---

## 3. Runtime Update Loop

This shows how a AAA-style fixed simulation loop fits inside a browser render loop.

```mermaid
flowchart TD
    A[requestAnimationFrame] --> B[Calculate frame delta]
    B --> C[Add delta to accumulator]

    C --> D{accumulator >= fixedDelta?}

    D -->|Yes| E[Input System]
    E --> F[Command Processing]
    F --> G[Gameplay Systems]
    G --> H[AI Systems]
    H --> I[First-Person Look + Character Controller]
    I --> J[Physics Pre-Sync]
    J --> K[Rapier Physics Step]
    K --> L[Physics Post-Sync]
    L --> M[Future Animation Update]
    M --> N[Camera Update]
    N --> O[Subtract fixedDelta]
    O --> D

    D -->|No| P[Render Sync]
    P --> Q[Three.js Render]
    Q --> R[Debug Overlay]
    R --> A
```

Target flow:

```text
Browser frame is variable.
Game simulation is fixed.
Rendering happens after simulation catches up.
```

Current first-person runtime slice:

```text
BrowserInputAdapter
  -> InputSnapshot
  -> held-look pointer gate + click candidates
  -> mobile touch controls through MobileInputControlsPort
	  -> PlayerInput component
	  -> MoveEntity / JumpEntity / InteractAtScreenPoint / InteractWithActiveTarget commands
	  -> ActiveInteractionTarget selected from proximity candidates
	  -> HUD projects only the selected ActiveInteractionTarget
	  -> MovementIntent component
	  -> FirstPersonController yaw/pitch
	  -> CharacterMotor component
	  -> KinematicCharacterController system
	  -> CharacterController movement, sprint, gravity, jump state
	  -> Transform
	  -> CameraTarget
	  -> camera:activePose resource
	  -> ThreeRendererAdapter camera
	  -> ChargedAction component and semantic charge/release events
	  -> PlayerLightFeedback updates the player Light component while held
	  -> LightSyncSystem projects player-light changes through the renderer adapter
	  -> AudioManifestAndEvents charge-release SFX mapping
```

The default browser mouse path is hold-drag look. The browser input adapter owns
look activation and emits pointer delta only while held look is active. The
canvas may support pointer lock as a future explicit mode, but Svelte does not
own movement, camera state, or mouse-down state. Pointer delta enters through
the browser input adapter and is consumed by engine systems. When focus,
visibility, UI capture, or scene readiness disables gameplay input, the input
module clears stale keyboard, mouse, touch, gamepad, pointer delta, and click
state instead of replaying it after input is re-enabled.
Mobile controls are a UI input surface only; they call the engine-facing mobile
input port with semantic action IDs, and gameplay systems turn those actions
into commands/events. Raw browser touch identifiers are not a parallel gameplay
input surface. Mobile controls do not own player transform, camera, charge,
portal, or physics state.
Scene unload cleanup removes player, portal, story-note, open reader, and
selected `ActiveInteractionTarget` resources so HUD and activation state cannot
point at unloaded entities.

The portal player light follows the same ownership rule. It is an authored
`Light` component on the stable `player` entity and is required through
`RuntimeSceneManifest.readiness.requiredLightStableIds`. Held charge updates
game-owned `PlayerLightFeedback` and engine `Light` component state; the
`LightSyncSystem` is the only path that projects those changes into the Three
adapter. UI, Svelte, and renderer objects do not own player-light brightness,
range, or release behavior.

The app layer creates browser, Three, Rapier, audio, and asset adapters, then
delegates gameplay system registration and scene loading to the game runtime
factory. The game runtime composes engine ports and game systems, but it does
not import browser APIs or third-party framework packages directly.

---

## 4. Engine Data Ownership

This diagram shows who owns what.

```mermaid
flowchart LR
    World[Engine World / ECS] --> Transform[Transform Components]
    World --> Renderable[Renderable Components]
    World --> Rigidbody[RigidBody Components]
    World --> Gameplay[Gameplay Components]
    World --> UIState[UI-facing State]

    Transform --> RenderSystem[Render Sync System]
    Renderable --> RenderSystem
    RenderSystem --> ThreeObjects[Three.js Objects]

    Transform --> PhysicsSystem[Physics Sync System]
    Rigidbody --> PhysicsSystem
    PhysicsSystem --> RapierBodies[Rapier Bodies]

    Gameplay --> GameplaySystems[Gameplay Systems]
    UIState --> SvelteStores[Svelte Stores / HUD]

    SvelteStores --> UI[Svelte UI]
    ThreeObjects --> Canvas[Canvas]
    RapierBodies --> PhysicsWorld[Rapier World]
```

This diagram's rule:

```text
The entity/component world owns the truth.
Three, Rapier, and Svelte mirror parts of that truth.
```

For first-person play, the player remains an entity. The local view is a camera pose derived from `Transform + FirstPersonController + CameraTarget`; it is not owned by a Svelte component or by a Three camera object.

---

## 5. Event and Command Flow

This is useful for stopping systems from directly calling each other.

```mermaid
flowchart TD
    Input[Browser Input] --> InputSystem[Input System]
    UI[Svelte UI] --> CommandBus[Command Bus]
    InputSystem --> CommandBus

    CommandBus --> GameplaySystem[Gameplay Systems]

    GameplaySystem --> EventBus[Event Bus]
    PhysicsSystem[Physics System] --> EventBus
    SceneSystem[Scene System] --> EventBus

    EventBus --> AudioSystem[Audio System]
    EventBus --> ParticleSystem[Particle System]
    EventBus --> UISystem[UI Bridge System]
    EventBus --> QuestSystem[Quest System]
    EventBus --> SaveSystem[Save System]

    UISystem --> SvelteStores[Svelte Stores]
    SvelteStores --> UI
```

Good pattern:

```text
UI and input create commands.
Gameplay consumes commands.
Systems emit events.
Other systems react to events.
```

Bad pattern:

```text
PlayerController directly calls AudioSystem, UISystem, QuestSystem, SaveSystem, and ParticleSystem.
```

---

## 6. Scene Lifecycle

This diagram is useful for preventing cleanup bugs.

```mermaid
stateDiagram-v2
    [*] --> Boot

    Boot --> Loading
    Loading --> Active
    Active --> Paused
    Paused --> Active

    Active --> Unloading
    Paused --> Unloading

    Unloading --> Loading
    Unloading --> [*]

    Loading: Load assets
    Loading: Create world
    Loading: Spawn entities
    Loading: Register systems

    Active: Fixed update
    Active: Render update
    Active: Handle events

    Paused: UI active
    Paused: Simulation stopped or slowed

    Unloading: Destroy entities
    Unloading: Remove listeners
    Unloading: Destroy physics bodies
    Unloading: Dispose render objects
    Unloading: Release asset references
```

The key scene rule:

```text
Anything created during load must be destroyed during unload.
Scene cleanup must attempt every registered cleanup before reporting aggregate
failure.
```

### Runtime Scene Catalog And Load Path

Playable scenes use explicit runtime scene manifests and a central checked-in
scene catalog during `Loading`. This keeps scene composition data-driven,
supports a declared default scene, and prevents gameplay from starting because
an entity happened to mount.

```mermaid
flowchart TD
    A[RuntimeSceneManifest data] --> B[Manifest validator]
    B --> C[Runtime manifest loader]
    C --> D[LevelLoader.loadDefinition]
    D --> E[Scene scope owns entities and cleanup]
    E --> F[Readiness evaluator]
    F --> G{Ready?}
    G -->|Yes| H[Expose player resource]
    H --> I[Scene becomes active]
    G -->|No| J[Fail load and cleanup scope]

    F --> F1[Required assets present]
    F --> F2[Player spawn present]
    F --> F3[Collision prefabs present]
    F --> F4[Required collision stable IDs present]
    F --> F5[Required light stable IDs present]
    F --> F6[Physics adapter ready]
    F --> F7[Player entity ready]
    F --> F8[Required scene environment assets present]
```

Current rule:

```text
Game scenes load through RuntimeSceneManifest-owned assets and prefabs,
LevelLoader, and readiness evaluation before player-controlled gameplay is
exposed.
Runtime scene transitions resolve target scenes by manifest ID from the game
runtime catalog, not by level-specific branches in the app shell or engine core.
The current checked-in playable catalog contains `portal_arena_runtime`,
`prototype_arena_runtime`, `miranda_deck_runtime`, `observatory_runtime`,
`sci_fi_room_runtime`, `solitude_runtime`, and `yggdrasil_runtime`;
`portal_arena_runtime` remains the default.
`YggdrasilLevelContract` and `PrimitiveSceneContentContract` own the direct
primitive-parity Yggdrasil playable foundation; old GLB asset parity, cooked
collision products, water, particle/firefly, lighting, post-processing, and
partition parity remain future contracts.
Render profiles also declare the scene environment. Required environment
assets are manifest-owned, preloaded with the selected scene, included in
readiness when required, and projected by the renderer adapter only after the
scene preload succeeds.
The default `portal_arena_runtime` render profile now uses the manifest-owned
`equirectangular-environment` asset
`texture_portal_arena_equirectangular_sky`. That asset is preloaded by the
selected portal arena manifest and required for readiness. It is a checked-in
copy of the existing 2:1 panorama
`public/assets/skyboxes/170645ae-3f1f-47db-b920-226e61838ab7.png`, copied to
`public/assets/environment/portal-arena/portal-arena-sky-equirectangular.png`
with no generated runtime artifact. Other current production scenes remain on
their authored `cubemap-skybox` environments unless explicitly changed. The
scene environment contract also accepts equirectangular texture skies, muted
video skies, procedural atmosphere, bounded dynamic capture, and authored
reflection probes for authored scenes. Completed sky/environment packets live
in `docs/Done/SCENE_ENVIRONMENT_FEATURE_PLAN.md` and
`docs/Done/SKYBOX_CUBEMAP_SYSTEM_REVIEW.md`; portal arena opt-in history and
remaining future sky/weather/import/probe work are tracked in
`docs/Done/SKYBOX_FUTURE_FEATURES_IMPLEMENTATION_PLAN.md`.
Readiness also checks exact required collision stable IDs and exact required
light stable IDs, so authored scene-critical collision and lighting cannot be
accidentally skipped by spawning only a matching prefab family.
```

Forbidden shortcuts:

```text
Do not load playable scenes from loose component lists.
Do not repair missing authored data at runtime.
Do not expose player resources until the manifest readiness gate passes.
Do not register playable scene assets or prefabs from prototype defaults when
the selected runtime manifest declares its own content.
Do not preload hidden boot asset groups outside the selected manifest's level
preload contract.
Do not pre-register assets from the full runtime scene catalog as a substitute
for selected-manifest asset ownership.
Do not let a renderer, UI component, or runtime fallback choose a skybox that is
not declared by the selected runtime scene manifest.
```

Current migrated content slice:

```text
portal_arena_runtime
  -> default navigation room
  -> eight authored portal slots on a large generated GLB moor field
  -> one real GLB portal gate asset referenced through mesh_portal_gate
  -> one real GLB field asset referenced through mesh_portal_field
  -> equirectangular scene environment referenced through texture_portal_arena_equirectangular_sky
  -> explicit large flat collision proxy owned by portal_arena_floor
  -> required player-carried point light with held-charge feedback
  -> one real portal-deck scene music asset referenced through audio_ambient_portal_deck
  -> portal activation SFX referenced through audio_portal_activate
  -> spatial portal loop SFX referenced through audio_portal_cycle on portal_gate emitters
  -> player charge-release SFX referenced through audio_player_charge_release
  -> manifest-owned music/sfx/spatial mixer buses projected only by the audio adapter
  -> Portal components contribute proximity candidates for active target selection
  -> active portals target prototype_arena_runtime, miranda_deck_runtime,
     observatory_runtime, solitude_runtime, and sci_fi_room_runtime

	miranda_deck_runtime
	  -> old Miranda spawn as authored player transform
	  -> miranda_floor_main, miranda_floor_upper, and
	     miranda_floor_cargo_hold static walkable render/physics prefabs
  -> miranda cockpit glow panels and command console as static render/physics prefabs
  -> miranda crew bunks and locker bank as static render/physics prefabs
  -> miranda Captain's Office desk, chair, and safe as static render/physics prefabs
  -> miranda Engine Room core and columns as static render/physics prefabs
  -> miranda Medbay pods, Mess Hall blockers, Chapel altar, Chapel monoliths,
     Brig blockers, Cargo Hold stacks, and Archive server banks as static
     render/physics prefabs
  -> Miranda primitive material assets preserve authored base color, emissive,
     metalness, roughness, and Medbay opacity parameters through manifest data
  -> Miranda scene music referenced through audio_ambient_wicked_shadows_whisper
  -> old Miranda airlock return portal as a Portal entity targeting
     observatory_runtime through the shared portal_gate prefab
  -> portal activation SFX referenced through audio_portal_activate
  -> spatial portal loop SFX referenced through audio_portal_cycle on the
     shared portal_gate emitter
  -> player charge-release SFX referenced through audio_player_charge_release
  -> nine Miranda StoryNote markers with trigger colliders, authored note data,
     nearest-target HUD prompts, and gameplay-owned reader open/close state
  -> three authored Miranda point lights as Transform + Light entities
  -> AuthoredLightContract supports point, spot, and rectangle area-light
     projection through LightSyncSystem and the renderer adapter
  -> explicit render-profile light budget plus editor-only light draft
     validation for authored lights
  -> readiness requires player, material/audio/environment assets, collision
     prefabs, exact collision stable IDs, exact walkable floor stable IDs, and
     exact authored light stable IDs

observatory_runtime
  -> target-engine recreation from old Observatory source art and scene
     evidence only
  -> implemented foundation packet in docs/OBSERVATORY_PLAYABLE_FOUNDATION_PLAN.md
  -> source GLB visual owned as mesh_observatory_environment
  -> consumes engine-wide CollisionPolicy, WalkableCollisionContract, and
     LevelReadinessContract for collision
  -> mesh_observatory_environment stays visual-only
  -> required observatory:walkable-mesh:chunk:x*-z* walkable/worldStatic
     mesh collision chunks
  -> player opts into engine-owned kinematic character collision through
     CharacterController.kinematicCollision
  -> four required observatory_boundary_blocker perimeter colliders; no render
     mesh collision inference
  -> observatory:water visual through WaterSurfaceContract with authored
     animation/reflection parameters, renderer-safe projection data, and no
     collider/gameplay volume
  -> cubemap_observatory_sky through the selected render profile
  -> scene music uses shared audio_ambient_portal_deck from the old
     courtyard-breeze preset evidence
  -> required player-carried Transform + Light entity
  -> three required firefly Transform + Renderable + Light entities authored
     from deterministic population data
  -> firefly flicker preview/cook samples are derived from authored
     seed/phase/frequency/amplitude data, while live renderer animation remains
     future work
  -> portal transition from portal_arena_runtime by runtime manifest ID
  -> readiness requires player, exact collision stable IDs, exact walkable
     stable IDs, exact light stable IDs, required assets, and physics/player
     readiness
  -> no old runtime JSON, terrain chunk runtime, generated collision binary,
     Svelte/Threlte light owner, hidden renderer default, or point-light
     budget/controller path; light budgets are authored profile validation,
     not runtime controller clipping

sci_fi_room_runtime
  -> target-engine playable foundation from old Sci Fi Room scene evidence only
  -> primitive target-owned assets/materials in sciFiRoomAssets
  -> three required walkable/worldStatic floor colliders with stable IDs:
     sci-fi-room:floor:interior, sci-fi-room:floor:courtyard, and
     sci-fi-room:floor:wasteland
  -> old source spawn as the stable player instance with player-carried Light
     and CharacterController.kinematicCollision settings
  -> five StoryNote markers with trigger colliders and authored note data
  -> shared portal_gate prefab targets observatory_runtime by manifest ID
  -> player and portal SFX are scene-scoped through sciFiRoomAudioContentManifest
  -> cubemap_observatory_sky through the selected render profile
  -> disabled/off post-processing profile data until renderer adapter support exists
  -> portal transition from portal_arena_runtime by runtime manifest ID
  -> no old generated runtime scene JSON, generated collider binaries, app-shell
     branches, or render-floor collision inference

solitude_runtime
  -> target-owned playable foundation under SolitudeLevelContract
  -> old Solitude scene JSON, generated runtime scene JSON, and world partition
     are provenance only
  -> uses target-owned primitive/current assets, prefabs, level data, render
     profile, manifest-owned audio/environment data, and a compact no-streaming
     level representation
  -> explicitly owns the old plateau and dais surfaces as
     walkable/worldStatic collision with stable IDs and readiness requirements
  -> closes the old missing solitude-ground-plateau collision-manifest
     blocker through target-owned collider/readiness data and negative
     validation
  -> portal transition from portal_arena_runtime is admitted after
     runtime-scene and content-graph validation
  -> full old generated GLB/cooked collision parity, twelve pillar-firefly NPC
     groups, large ambient particle field, post-processing/reflections,
     production light tuning, and partition/streaming behavior remain future
     contracts

yggdrasil_runtime
  -> target-owned primitive-parity playable foundation under
     YggdrasilLevelContract and PrimitiveSceneContentContract
  -> old Yggdrasil scene backups, generated runtime scene JSON, and world
     partition are provenance only
  -> uses checked-in content data for all old primitive nodes, reusable
     primitive helpers for manifest assets/prefabs/level instances,
     render profile, audio/environment manifest data, explicit primitive
     collision/walkable readiness, story/portal identity markers, and focused
     validation before any portal-arena transition is added
  -> old GLB asset parity, cooked collision products, water
     rendering/gameplay volumes, ambient particle/firefly parity, production
     lighting, post-processing, reflections, editor import/cook/write tooling,
     and partition/streaming behavior remain future contracts
```

Full Miranda is not treated as ready until remaining terrain, cooked collision,
generated GLB content, and importer/editor coverage beyond the current
cook-drafted walkable floor footprint are authored in the new architecture.

AAA-scale content must flow through an import/validation graph before runtime
playback. Authored assets, prefabs, levels, render profiles, audio manifests,
and transitions are source data. A content graph validator/importer derives or
drift-checks the runtime manifest and readiness requirements from that source
data before the scene is considered playable.

```text
Authored Content
  -> assets, prefabs, levels, render profiles, audio, transitions
  -> content graph import/validation
  -> checked-in RuntimeSceneManifest and readiness data
  -> runtime load gate
  -> engine world projection into render, physics, audio, and UI adapters
```

The runtime scene manifest remains the runtime contract, but long
hand-maintained readiness arrays must not become the level authoring system.
Current readiness arrays are transitional checked-in data; the content graph
validation gate derives or compares required assets, prefab IDs, collision
stable IDs, walkable IDs, light IDs, and portal target manifest IDs from
authored content. Missing source data fails the validator, not the renderer,
physics adapter, UI, or app shell.

The engine data contract modules are split by responsibility. Public imports
should use the package barrels, but ownership lives in focused files:

```text
src/engine/data/schemas/
  -> explicit public barrel plus type, schema, component, render-profile,
     runtime-scene, terrain-package, helper, and validation modules
src/engine/data/contentGraph/
  -> content graph types, runtime scene requirement derivation, and generated
     GLB import parity validation
src/engine/data/collisionCook/
  -> collision draft/message validation, preview/bake plan creation, runtime
     scene validation, and write-plan serialization
src/engine/data/terrainCook/
  -> terrain cook manifest validation, shape validation, plan creation,
     runtime scene validation, stable hashing, and write-plan serialization
```

The `index.ts` files in those folders are API barrels only. They must preserve
documented public exports and should not become the place where contract logic
accumulates again.

Generated GLB parity also belongs to the content graph layer. Legacy generated
GLB candidates must be represented by checked-in import parity manifests that
either resolve to target asset, prefab, and stable level IDs or remain planned
with owner metadata and removal conditions. Runtime scenes must not load old
generated GLBs until an explicit import/generation owner has produced target
manifest data. Imported target-generated GLBs must also declare the generator
ID, checked-in provenance metadata path, and generated GLB SHA-256 in the
import parity manifest so drift fails in contract validation instead of at
runtime.

Editor and cook tooling must stay outside normal game runtime ownership. The
planned level editor is a separate dev-only window/tooling surface, not an
in-game HUD mode. It may author collision drafts, send temporary preview
patches to a running game window, and run explicit bake commands, but shipped
runtime behavior must still load validated `RuntimeSceneManifest`,
`LevelDefinition`, and `PrefabDefinition` data. Normal builds validate cooked
outputs and drift; they must not silently rebake or rewrite level files.

```text
Level Editor Window
  -> authors collision/source level data
  -> sends dev-only preview patches
  -> runs explicit cook/bake commands
  -> writes durable checked-in runtime data

Game Window
  -> loads validated runtime scene manifests
  -> previews temporary editor patches only in dev mode
  -> reloads baked scene data on request
```

The first data/check foundation is implemented for Observatory collision:
`src/engine/data/collisionCook` owns reusable draft validation and the
checked-in collision draft data lives under `src/game/editor/collisionDrafts`.
The former Observatory-only cook/drift commands were retired because editor and
cook tooling must be generic and manifest-driven, not one script per level.
Editor bake data is derived in memory for diagnostics until a generic generated
artifact owner exists. Normal runtime data does not import editor bake
artifacts. The checked-in
generated collision runtime module at
`src/game/generated/observatoryCollisionRuntime.ts` is retained as current
runtime data until a generic cook owner replaces it; Observatory prefab, level,
and manifest owners import that module instead of duplicating cooked collision
values. The dev-only
game-window preview/reload protocol is implemented as an app-layer
`BroadcastChannel` transport plus callback port; it validates collision preview
patches before send/application and applies temporary transform/collider
updates only in dev mode for the active runtime scene. Basic preview clearing
is explicit and reversible through the same dev-only protocol; richer reload
lifecycle diagnostics remain planned. The `/editor/` route exposes editable
collision controls and a top-down collision gizmo surface for current
Observatory draft entries; persisted spatial drag handles and generalized
multi-level editing remain planned. The generalized terrain import/cook
contract is implemented through engine data terrain cook validation, checked-in
generated terrain provenance, and focused contract tests. Cooked terrain chunks
are implemented as a foundation through 16 deterministic
Observatory walkable terrain chunks derived from the authored 17x17 height
grid, plus four boundary blockers. Render terrain and collision terrain are
separate products: the Observatory terrain GLB stays visual-only, and runtime
traversal stays on explicit collider data. Production editor import UI,
material/shader import, terrain LOD/streaming, and multi-level terrain packages
remain future packets tracked in
`docs/LEVEL_EDITOR_COLLISION_COOK_PLAN.md`. The normal runtime must not import
editor modules or rely on editor state.
The first dev-only boundary shell exists at `/editor/`, backed by
`src/app/editor/levelEditorSession.ts`; it lists the current Observatory
editor session, preview metadata, and derived dry-run bake hash without
mounting through the normal game HUD.

Runtime character traversal must use engine physics abstractions, not renderer
geometry or raw adapter objects. `CharacterController.kinematicCollision`
declares gameplay movement settings; `PhysicsAdapterPort` exposes the
framework-neutral movement query; adapters such as Rapier implement the actual
sliding, slope, snap-to-ground, and autostep behavior behind that port.
Controller obstacle filtering is authored through collider policy/channel data,
not renderer object membership or level-specific adapter branches. Collision
shape dimensions and mesh vertices are final physics data; import/cook tools
must bake source-art scale into collider data instead of relying on runtime
`Transform.scale` as a hidden physics multiplier.

The app layer may select a checked-in runtime manifest and pass it into the
client mount. If it does not, the game layer's `defaultRuntimeSceneManifest`
selects `portal_arena_runtime`. Selection and runtime scene transition rules
must stay outside generic engine code; the engine still consumes only validated
`RuntimeSceneManifest` data.

---

## 7. Suggested Project Map

```mermaid
flowchart TD
    Root[src/] --> App[app/]
    Root --> UI[ui/]
    Root --> Game[game/]
    Root --> Engine[engine/]

    App --> AstroPages[Astro pages]
    App --> AppShell[App shell]
    App --> GameMount[Game mount]

    UI --> HUD[HUD]
    UI --> Menus[Menus]
    UI --> EditorPanels[Editor panels]
    UI --> DebugUI[Debug UI]

    Game --> Levels[levels/]
    Game --> GameplaySystems[gameplay systems/]
    Game --> Prefabs[prefabs/]
    Game --> GameData[game data/]

    Engine --> Core[core/]
    Engine --> Modules[modules/]
    Engine --> Adapters[adapters/]
    Engine --> Data[data/]

    Core --> World[World]
    Core --> ECS[ECS]
    Core --> Scheduler[Scheduler]
    Core --> Events[Events]
    Core --> Commands[Commands]
    Core --> Time[Time]

    Modules --> Rendering[rendering/]
    Modules --> Physics[physics/]
    Modules --> Input[input/]
    Modules --> Assets[assets/]
    Modules --> Audio[audio/]
    Modules --> Camera[camera/]
    Modules --> Debug[debug/]
    Modules --> Networking[networking/]
    Modules --> Scene[scene/]

    Adapters --> Three[three/]
    Adapters --> Rapier[rapier/]
    Adapters --> Browser[browser/]
```

---

## 8. Primary Repo Diagram

This is the diagram to keep near the top of the repo.

```mermaid
flowchart TD
    UI[Astro / Svelte UI] <-->|Commands + State Snapshots| Runtime[Game Runtime]

    Runtime --> Core[Engine Core]
    Core --> World[World / ECS]
    Core --> Scheduler[Fixed-Step Scheduler]
    Core --> Events[Events / Commands]

    World --> Gameplay[Gameplay Systems]
    World --> Physics[Physics Module]
    World --> Rendering[Rendering Module]
    World --> Audio[Audio Module]
    World --> Input[Input Module]

    Physics --> Rapier[Rapier Adapter]
    Rendering --> Three[Three Adapter]
    Input --> Browser[Browser Input Adapter]
    Audio --> WebAudio[Web Audio Adapter]

    Rapier --> PhysicsSim[Rapier Simulation]
    Three --> Canvas[Canvas Output]

    style Core stroke-width:3px
    style World stroke-width:3px
    style Runtime stroke-width:3px
```

---

## 9. Core Architecture Rules

### Ownership Rules

```text
1. The engine world is the source of truth.
2. Svelte stores may mirror engine state but may not own runtime game state.
3. Three.js objects are render representations only.
4. Rapier objects are physics representations only.
5. Gameplay code must not directly mutate Three or Rapier objects.
6. All third-party libraries must be accessed through adapters.
7. Engine core must remain plain TypeScript.
```

### Dependency Rules

```text
1. engine/core imports nothing from app, ui, game, three, threlte, or rapier.
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
4. No system should rely on accidental execution order.
5. Cross-system communication uses commands/events, not direct calls.
```

### Data Rules

```text
1. Entities are composed from components.
2. Prefabs define reusable entities.
3. Levels define scene composition.
4. Assets are referenced by stable IDs.
5. Level instances must declare authored stable IDs.
6. Runtime scene manifests define the playable scene load contract and own the asset/prefab data registered for that scene.
7. Runtime scene readiness declares required assets, player spawn, collision prefabs, exact collision stable IDs, and exact light stable IDs.
8. The game runtime catalog declares available runtime scenes and the default runtime scene.
9. Runtime state must be serializable where practical.
```

### Cleanup Rules

```text
1. Every object created by a scene must be owned by that scene or an engine subsystem.
2. Every event listener must be removable.
3. Every physics body must be destroyed when its entity is destroyed.
4. Every Three object must be disposed or pooled.
5. Scene unload must leave no runtime objects behind.
6. Renderer-owned scene environment, reflection probe, and light projection state must be cleared or restored on scene unload.
```

---

## 10. Practical Architecture Summary

```text
Astro owns pages.
Svelte owns UI.
Three owns current runtime presentation.
Threlte is deferred until a real consumer exists.
Rapier owns simulation internals.
The engine owns game state.
The game layer owns meaning.
```

Current website cutover rule:

```text
Normal root game scripts target @merkin/game-megameal.
Legacy @merkin/game root aliases are retired; any remaining local old app
folder is historical/reference material only, not a normal script target.
Blender scene bridge packaging belongs to apps/blender.
Active old-app package/workspace/source references fail audit:legacy-game-references.
```

The normal game website must mount `apps/game.megameal/src/app/GameClient.svelte`
through the Astro app shell. It must not mount the old `apps/game`
`ThreltGame` runtime, import old runtime code, or bridge old Svelte/Threlte
state into the new engine.

Short version:

```text
Frameworks display the game.
The engine runs the game.
```
