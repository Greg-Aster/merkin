import { runtimeSettings } from "../app/levelPackageDiscovery.js";
import type { RuntimeSceneManifestData } from "../engine/index.js";

export type MasterControlGraphNodeGroup =
	| "app"
	| "global"
	| "engine"
	| "game"
	| "levels"
	| "adapters"
	| "editor";

export type MasterControlGraphNodeStatus = "implemented" | "partial" | "future";
export type MasterControlGraphEdgeKind =
	| "runtime"
	| "data"
	| "editor"
	| "future";

export type MasterControlGraphNode = {
	readonly id: string;
	readonly label: string;
	readonly group: MasterControlGraphNodeGroup;
	readonly owner: string;
	readonly contract: string;
	readonly status: MasterControlGraphNodeStatus;
	readonly statusNote: string;
	readonly removable: boolean;
	readonly runtimeSceneId?: string;
	readonly isActiveRuntimeScene?: boolean;
	readonly isConfigurable?: boolean;
	readonly isDataSource?: boolean;
	readonly details?: readonly MasterControlGraphNodeDetail[];
};

export type MasterControlGraphNodeDetail = {
	readonly label: string;
	readonly value: string;
};

export type MasterControlGraphEdge = {
	readonly id: string;
	readonly from: string;
	readonly to: string;
	readonly label: string;
	readonly kind: MasterControlGraphEdgeKind;
};

export type MasterControlGraph = {
	readonly nodes: readonly MasterControlGraphNode[];
	readonly edges: readonly MasterControlGraphEdge[];
};

export type MasterControlGraphMermaidOptions = {
	readonly selectedNodeId?: string;
};

const routedRuntimeSceneManifests = runtimeSettings.runtimeSceneManifests
	.slice()
	.sort((left, right) => left.level.id.localeCompare(right.level.id));

export type MasterControlGraphOptions = {
	readonly activeRuntimeSceneId?: string;
};

export const masterControlGraph: MasterControlGraph =
	createMasterControlGraph();

export function createMasterControlGraph(
	options: MasterControlGraphOptions = {},
): MasterControlGraph {
	const runtimeSceneLevelNodes: readonly MasterControlGraphNode[] =
		routedRuntimeSceneManifests.map((manifest) =>
			runtimeSceneManifestToNode(manifest, options),
		);

	return {
		nodes: [
			{
				id: "astro-shell",
				label: "Astro Shell",
				group: "app",
				owner:
					"astro.config.mjs, src/pages/index.astro, src/pages/editor.astro, and src/pages/editor/level.astro",
				contract:
					"Hosts browser routes and mounts the game or editor client without owning gameplay state.",
				status: "implemented",
				statusNote:
					"Astro owns route documents, Svelte hydration, site/base config, trailing slash policy, and the DEV editor API plugin.",
				removable: false,
				details: [
					{
						label: "Config File",
						value:
							"astro.config.mjs enables @astrojs/svelte, sets site/base from SITE_URL and SITE_BASE, forces trailingSlash: 'always', and installs megamealEditorDevApi() as a Vite plugin.",
					},
					{
						label: "Runtime Route",
						value:
							"src/pages/index.astro is the normal game page. It mounts src/app/GameClient.svelte with client:only='svelte'.",
					},
					{
						label: "Editor Routes",
						value:
							"src/pages/editor.astro mounts MasterControlMap; src/pages/editor/level.astro mounts LevelEditorWorkspace.",
					},
					{
						label: "Runtime Handoff",
						value:
							"After hydration, GameClient.svelte calls createBrowserGameClient(), which calls mountGameClient() and then levelPackageDiscovery.runtimeSettings.",
					},
					{
						label: "Configuration Inputs",
						value:
							"SITE_URL controls Astro site, SITE_BASE controls Astro base, and the editor DEV API is available through the Vite plugin in local development.",
					},
				],
			},
			{
				id: "runtime-client",
				label: "Game Client",
				group: "app",
				owner:
					"src/app/GameClient.svelte, src/app/browserGameClient.ts, src/app/dev-bridge/gameDevBridge.ts",
				contract:
					"Owns the browser game host lifecycle: canvas mount, selected runtime-scene query params, Svelte state mirroring, frame-loop startup, UI command dispatch, and DEV bridge exposure.",
				status: "implemented",
				statusNote:
					"Delegates adapter construction to mountGameClient and gameplay system registration to src/game/runtime.",
				removable: false,
				isConfigurable: true,
				details: [
					{
						label: "Composed Files",
						value:
							"GameClient.svelte is the Svelte host; browserGameClient.ts owns BrowserPlatform and requestAnimationFrame; src/app/dev-bridge owns DEV-only bridge snapshots and commands.",
					},
					{
						label: "DOM Owned",
						value:
							"Creates the full-window canvas, attaches RuntimeHud, and conditionally attaches MobileControls.",
					},
					{
						label: "Configurable Inputs",
						value:
							"Persistent HUD visibility is saved in src/levels/global/settings.ts as hudVisible. URL query params runtimeScene or scene can select the starting runtime scene. The default scene comes from levelPackageDiscovery, not this component.",
					},
					{
						label: "State Mirrored",
						value:
							"Mirrors RuntimeSnapshot, mounted/startup error state, dispatch function, mobile input port, and DEV bridge session state for UI/editor visibility.",
					},
					{
						label: "Cleanup",
						value:
							"On destroy it disposes the DEV bridge, unsubscribes runtime observation, clears UI input capture, disposes the browser client, and releases mobile/dispatch references.",
					},
				],
			},
			{
				id: "game-client-mount",
				label: "Game Client Mount",
				group: "app",
				owner: "src/app/mountGameClient.ts",
				contract:
					"Builds browser adapters, reads runtimeSettings, chooses the default runtime scene manifest, and creates the game runtime.",
				status: "implemented",
				statusNote:
					"This is the normal game startup consumer of levelPackageDiscovery.runtimeSettings.",
				removable: false,
				isConfigurable: true,
				details: [
					{
						label: "Default Scene",
						value:
							"Uses runtimeSettings.defaultRuntimeSceneManifest unless a manifest is explicitly passed.",
					},
					{
						label: "Runtime Catalog",
						value:
							"Passes runtimeSettings.runtimeSceneManifests and audioContentManifestForRuntimeScene into createMegamealGameRuntime().",
					},
					{
						label: "Config Owner",
						value:
							"Audio master volume is saved in src/levels/global/settings.ts as audioMasterVolume and consumed during BrowserAudioManager creation.",
					},
				],
			},
			{
				id: "level-package-discovery",
				label: "Level Package Discovery",
				group: "app",
				owner: "src/app/levelPackageDiscovery.ts",
				contract:
					"Eagerly imports the installed src/levels/global package entry and exposes runtimeSettings to game startup and editor tooling.",
				status: "implemented",
				statusNote:
					"Uses import.meta.glob('../levels/global/index.ts') as the app-owned bridge from browser startup to the installed level package.",
				removable: false,
				isConfigurable: true,
				details: [
					{
						label: "Runtime Path",
						value:
							"mountGameClient reads runtimeSettings.defaultRuntimeSceneManifest and runtimeSettings.runtimeSceneManifests.",
					},
					{
						label: "Editor Path",
						value:
							"masterControlGraph reads runtimeSettings.runtimeSceneManifests to list scene nodes.",
					},
					{
						label: "Config Owner",
						value:
							"Package ID and default runtime scene are saved in src/levels/global/settings.ts and consumed by the global level package router.",
					},
				],
			},
			{
				id: "ui-projection",
				label: "HUD / UI Projection",
				group: "app",
				owner: "src/ui/RuntimeHud.svelte and src/ui/MobileControls.svelte",
				contract:
					"Displays selected runtime state and dispatches input commands without mutating ECS storage.",
				status: "implemented",
				statusNote:
					"RuntimeHud and mobile controls project game state and semantic input only.",
				removable: true,
				isConfigurable: true,
				details: [
					{
						label: "Config Owner",
						value:
							"Persistent HUD visibility is saved in src/levels/global/settings.ts as hudVisible and read through levelPackageDiscovery.runtimeSettings.",
					},
					{
						label: "HUD Data",
						value:
							"Displays mounted/startup state, RuntimeSnapshot, player position, movement/input display state, charge, health, collectibles, and story-note UI.",
					},
					{
						label: "Input Projection",
						value:
							"MobileControls receives the browser input port and MOBILE_TOUCH_ACTION_IDS; UI dispatches commands but does not mutate engine state directly.",
					},
				],
			},
			{
				id: "master-control",
				label: "Master Control",
				group: "editor",
				owner:
					"src/editor/MasterControlMap.svelte and src/editor/masterControlGraph.ts",
				contract:
					"Optional editor surface that visualizes current architecture flow and live DEV diagnostics.",
				status: "implemented",
				statusNote:
					"Interactive map, node inspector, Mermaid export, global settings, player package, and performance panels exist.",
				removable: true,
				details: [
					{
						label: "Normal Runtime",
						value:
							"Normal gameplay does not import src/editor and does not depend on this tool.",
					},
					{
						label: "Mermaid Source",
						value:
							"graphAsMermaid() exports this same source graph as grouped flowchart LR Mermaid.",
					},
				],
			},
			{
				id: "level-editor-workbench",
				label: "Level Editor Workbench",
				group: "editor",
				owner:
					"src/editor/level/LevelEditorWorkspace.svelte and scripts/editor-dev-api.mjs",
				contract:
					"DEV-only source authoring for approved level package files through validated file-owner APIs.",
				status: "partial",
				statusNote:
					"Edits level data, skybox/environment, collision, NPCs, player overrides, and performance config without owning runtime state.",
				removable: true,
				isConfigurable: true,
			},
			{
				id: "editor-dev-api",
				label: "Editor DEV API",
				group: "editor",
				owner: "scripts/editor-dev-api.mjs",
				contract:
					"DEV-only file read/write bridge for approved source owners under src/levels.",
				status: "implemented",
				statusNote:
					"Validates writes before touching checked-in package data; not a production API.",
				removable: true,
			},
			{
				id: "live-dev-bridge",
				label: "External DEV Bridge",
				group: "editor",
				owner: "src/app/dev-bridge/* and src/levels/global/settings.ts",
				contract:
					"Optionally exposes the current player through the centralized DEV bridge folder and routes generic commands back through runtime ports.",
				status: "implemented",
				statusNote:
					"Global settings control enablement, broadcast location, and data categories. The relay rejects connections when the bridge is disabled.",
				removable: true,
				isConfigurable: true,
				details: [
					{
						label: "Privacy Control",
						value:
							"src/levels/global/settings.ts devBridge.enabled gates bridge emission and relay access.",
					},
					{
						label: "Network Relay",
						value:
							"src/app/dev-bridge/server/game-dev-bridge-relay.mjs owns the dev-only WebSocket relay at /__megameal-dev-bridge.",
					},
					{
						label: "Data Categories",
						value:
							"Configured channels reserve text, location, state, snapshots, and level map separately.",
					},
				],
			},
			{
				id: "global-settings",
				label: "Global Settings",
				group: "global",
				owner: "src/levels/global/settings.ts",
				contract:
					"Owns package ID, default runtime scene selection, and app-level UI defaults consumed by runtime discovery and the level router.",
				status: "implemented",
				statusNote:
					"This is not the startup root; it is one checked-in config input to the installed package router.",
				removable: false,
				isConfigurable: true,
				isDataSource: true,
			},
			{
				id: "installed-package-entry",
				label: "Installed Package Entry",
				group: "levels",
				owner: "src/levels/global/index.ts",
				contract:
					"Exports the installed level package router, settings, shared package data, and runtime scene catalog entrypoints.",
				status: "implemented",
				statusNote:
					"App discovery imports this entry; normal runtime does not start from an individual settings file.",
				removable: false,
				isDataSource: true,
			},
			{
				id: "level-router",
				label: "Level Router",
				group: "levels",
				owner: "src/levels/global/router.ts",
				contract:
					"Owns the runtime scene catalog, package-level routing, and scene audio lookup.",
				status: "implemented",
				statusNote:
					"All runtime scenes visible to the editor and app come through this router.",
				removable: true,
				isDataSource: true,
			},
			{
				id: "global-package",
				label: "Global Package Data",
				group: "levels",
				owner: "src/levels/global",
				contract:
					"Owns shared assets, prefabs, NPC archetypes, skybox assets, water assets, collision defaults, and performance defaults.",
				status: "partial",
				statusNote:
					"Shared package data is composed into scenes; richer import/generated ownership remains future.",
				removable: true,
				isDataSource: true,
			},
			{
				id: "player-package",
				label: "Player Package",
				group: "levels",
				owner: "src/levels/player",
				contract:
					"Owns configurable player prefab, assets, movement/camera defaults, audio defaults, readiness, and player light defaults.",
				status: "implemented",
				statusNote:
					"Levels import the player package and own only per-level spawn/override config.",
				removable: true,
				isConfigurable: true,
				isDataSource: true,
			},
			{
				id: "level-package",
				label: "Level Package",
				group: "levels",
				owner: "src/levels/<level>",
				contract:
					"Owns per-level data.json, assets, prefabs, audio, render profile, skybox/environment, runtime manifest, NPC data, collision, and performance overrides.",
				status: "partial",
				statusNote:
					"Portal arena, prototype, Miranda, and Observatory packages are checked-in product data.",
				removable: true,
				isConfigurable: true,
				isDataSource: true,
			},
			{
				id: "runtime-scene-catalog",
				label: "Runtime Scene Catalog",
				group: "levels",
				owner: "src/levels/global/router.ts and src/levels/levelPackageData.ts",
				contract:
					"Composes selected runtime scene manifests from level, global, player, audio, render, and performance data.",
				status: "implemented",
				statusNote:
					"Manifest IDs, preload assets, readiness requirements, scene audio, and render profile data are resolved before play.",
				removable: false,
				isDataSource: true,
			},
			...runtimeSceneLevelNodes,
			{
				id: "performance-config",
				label: "Performance Config",
				group: "levels",
				owner:
					"src/levels/global/performance.json and src/levels/<level>/performance.json",
				contract:
					"Owns saved LOD, culling, streaming, and collision-performance tuning that is composed into runtime scene resources.",
				status: "partial",
				statusNote:
					"Runtime reads the composed game:performanceConfig resource; editor saves the owning JSON files.",
				removable: true,
				isConfigurable: true,
				isDataSource: true,
			},
			{
				id: "data-contracts",
				label: "Data Contracts",
				group: "engine",
				owner: "src/engine/data and src/engine/data/schemas",
				contract:
					"Validates manifests, assets, prefabs, levels, render profiles, audio mappings, collision, lights, water, NPCs, and readiness before runtime load.",
				status: "partial",
				statusNote:
					"Invalid package data fails before play instead of being silently repaired by runtime systems.",
				removable: false,
				details: [
					{
						label: "Runtime Relationship",
						value:
							"Contracts validate source data; they are not ECS state and do not repair missing authored content.",
					},
				],
			},
			{
				id: "asset-manager",
				label: "Asset Manager",
				group: "engine",
				owner: "src/engine/modules/assets",
				contract:
					"Registers, preloads, exposes, and releases manifest-owned assets by stable ID.",
				status: "implemented",
				statusNote:
					"Asset IDs are manifest-owned; gameplay systems do not scatter direct file imports.",
				removable: false,
			},
			{
				id: "scene-manager",
				label: "Scene Manager",
				group: "engine",
				owner: "src/engine/modules/scene",
				contract:
					"Owns scene transitions, scene scopes, level loading, and unload cleanup.",
				status: "implemented",
				statusNote:
					"Scene unload clears scene-owned entities/resources and selected interaction state.",
				removable: false,
			},
			{
				id: "level-loader",
				label: "Level Loader",
				group: "engine",
				owner: "src/engine/modules/scene and src/game/scenes",
				contract:
					"Turns validated scene data into ECS entities, resources, asset registrations, and readiness-gated playable state.",
				status: "implemented",
				statusNote:
					"Loads prefabs, instances, player, resources, audio content, render profile, and performance resources.",
				removable: false,
			},
			{
				id: "game-runtime",
				label: "Game Runtime",
				group: "game",
				owner: "src/game/runtime",
				contract:
					"Composes engine ports, gameplay systems, scene transitions, diagnostics, and adapter sync into one runtime.",
				status: "implemented",
				statusNote:
					"System registration is centralized here; app/UI/editor do not register gameplay systems.",
				removable: false,
			},
			{
				id: "engine-core",
				label: "Engine Core",
				group: "engine",
				owner: "src/engine/core and src/engine/runtime",
				contract:
					"Owns World/ECS state, Scheduler, CommandBus, EventBus, fixed-step runtime, and runtime snapshots.",
				status: "implemented",
				statusNote:
					"The engine world is canonical state; Three, Rapier, audio, and Svelte mirror projections.",
				removable: false,
			},
			{
				id: "game-rules",
				label: "Game Rules",
				group: "game",
				owner: "src/game/systems and src/game/prefabs",
				contract:
					"Owns Merkin gameplay meaning: player control, interactions, portals, story notes, charge, NPCs, movement behavior, light modulation, collectibles, and prefab spawning.",
				status: "partial",
				statusNote:
					"Current runtime uses generic systems and components, not per-level or per-species branches.",
				removable: false,
			},
			{
				id: "input-stage",
				label: "Input Stage",
				group: "game",
				owner: "src/game/systems/input.ts and src/engine/modules/input",
				contract:
					"Reads BrowserInputAdapter snapshots and writes PlayerInput plus command intent.",
				status: "implemented",
				statusNote:
					"Hold-look, mobile action IDs, click candidates, movement, jump, sprint, interact, and charge enter here.",
				removable: false,
			},
			{
				id: "commands-stage",
				label: "Commands Stage",
				group: "game",
				owner: "src/game/systems/input.ts",
				contract:
					"Consumes command bus intent and writes MovementIntent or active interaction commands.",
				status: "implemented",
				statusNote:
					"Cross-system intent flows through commands instead of direct UI/system mutation.",
				removable: false,
			},
			{
				id: "gameplay-stage",
				label: "Gameplay Stage",
				group: "game",
				owner: "src/game/systems",
				contract:
					"Runs charged actions, player light feedback, collectibles, proximity, selected interaction target, story notes, NPC dialog, and portal activation.",
				status: "implemented",
				statusNote:
					"Gameplay systems write ECS components/resources/events consumed later in the fixed-step frame.",
				removable: false,
			},
			{
				id: "ai-stage",
				label: "AI / Moving Actors",
				group: "game",
				owner: "src/game/systems/npcs.ts",
				contract:
					"Runs generic movement behavior, follow-target, and light modulation for authored moving actors.",
				status: "implemented",
				statusNote:
					"Fireflies are data-driven NPC moving actors; no hidden population or player-distance light limits.",
				removable: false,
			},
			{
				id: "character-stage",
				label: "Character Stage",
				group: "game",
				owner: "src/game/systems/movement.ts and src/engine/modules/physics",
				contract:
					"Turns movement intent into first-person look, motor state, walkable grounding, and kinematic character movement.",
				status: "partial",
				statusNote:
					"Explicit walkable collision is sampled before character movement; broader Rapier character resolution remains future.",
				removable: false,
			},
			{
				id: "camera-stage",
				label: "Camera Stage",
				group: "game",
				owner: "src/game/systems/camera.ts",
				contract:
					"Projects player/camera target state to the active camera pose and anchors player-carried light state.",
				status: "implemented",
				statusNote:
					"Camera and player light state remain ECS-owned before adapter projection.",
				removable: false,
			},
			{
				id: "performance-systems",
				label: "Performance Runtime",
				group: "game",
				owner: "src/game/performance/runtime.ts",
				contract:
					"Reads composed performance config, applies active runtime performance policies through ECS/asset ports, and publishes scheduled runtime diagnostics.",
				status: "partial",
				statusNote:
					"Runtime state is scheduled; culling, authored LOD swaps, asset/visual/collider streaming residency, and collision spatial lookup are active. Entity spawn/despawn streaming and profiler systems remain future.",
				removable: false,
			},
			{
				id: "physics-stage",
				label: "Physics Stages",
				group: "game",
				owner: "src/engine/modules/physics",
				contract:
					"Syncs ECS rigid bodies/colliders to Rapier, steps physics, and syncs results back through engine components.",
				status: "implemented",
				statusNote:
					"Gameplay code does not hold raw Rapier bodies or colliders.",
				removable: false,
			},
			{
				id: "audio-stage",
				label: "Audio Stage",
				group: "game",
				owner: "src/engine/modules/audio and level audio mappings",
				contract:
					"Consumes semantic gameplay events and scene music declarations from manifest-owned audio content.",
				status: "implemented",
				statusNote:
					"Runtime selects manifest-owned scene playlists and event SFX; no folder scanning.",
				removable: false,
			},
			{
				id: "render-sync-stage",
				label: "Render Sync",
				group: "game",
				owner: "src/engine/modules/rendering and src/game/runtime",
				contract:
					"Projects Transform, Renderable, Light, reflection probes, camera pose, and diagnostics into renderer ports.",
				status: "implemented",
				statusNote:
					"LightSyncSystem is the path from authored/game-owned Light components to Three lights.",
				removable: false,
			},
			{
				id: "render-stage",
				label: "Render Stage",
				group: "game",
				owner: "src/game/runtime",
				contract:
					"Calls the renderer adapter after fixed-step simulation and render-sync projection.",
				status: "implemented",
				statusNote:
					"Rendering is a projection; it is not canonical gameplay state.",
				removable: false,
			},
			{
				id: "performance-lod",
				label: "LOD",
				group: "game",
				owner: "src/game/performance/lod",
				contract:
					"Evaluates distance/significance LOD policy for renderable candidates from performance config.",
				status: "implemented",
				statusNote:
					"Distance mode evaluates configured tiers and swaps authored PerformanceLod renderable payloads through ECS.",
				removable: false,
			},
			{
				id: "performance-culling",
				label: "Culling",
				group: "game",
				owner: "src/game/performance/culling",
				contract:
					"Owns renderable visibility policy for performance diagnostics and distance culling.",
				status: "implemented",
				statusNote:
					"Distance mode applies Renderable.visible and Light.visible through ECS.",
				removable: false,
			},
			{
				id: "performance-streaming",
				label: "Streaming",
				group: "game",
				owner: "src/game/performance/streaming",
				contract:
					"Plans asset/render/collision residency operations from authored streamable chunk data.",
				status: "implemented",
				statusNote:
					"Plan mode retains/loads/releases chunk assets through the asset manager, applies render/light visibility, and removes/restores opt-in colliders through ECS.",
				removable: false,
			},
			{
				id: "performance-collision",
				label: "Collision Perf",
				group: "game",
				owner: "src/game/performance/collision",
				contract:
					"Owns broadphase-friendly collision budget, spatial bucket, and walkable query diagnostics.",
				status: "partial",
				statusNote:
					"Spatial mode builds a cached bucket index from runtime mesh colliders for diagnostics and walkable-grounding candidate lookup; physics adapter mutation remains future.",
				removable: false,
			},
			{
				id: "performance-diagnostics",
				label: "Performance Diagnostics",
				group: "game",
				owner: "src/game/performance/diagnostics",
				contract:
					"Publishes read-only entity/render/light/collider/asset counts and scheduled performance domain status.",
				status: "implemented",
				statusNote:
					"Diagnostics observe runtime state and do not mutate gameplay state.",
				removable: false,
			},
			{
				id: "browser-input-adapter",
				label: "Browser Input Adapter",
				group: "adapters",
				owner: "src/engine/adapters/browser",
				contract:
					"Owns keyboard, mouse, touch, gamepad, focus, and browser input cleanup details.",
				status: "implemented",
				statusNote:
					"Emits framework-neutral InputSnapshot data consumed by the input stage.",
				removable: false,
			},
			{
				id: "rapier-adapter",
				label: "Rapier Adapter",
				group: "adapters",
				owner: "src/engine/adapters/rapier",
				contract:
					"Owns Rapier world/bodies/colliders behind engine physics contracts.",
				status: "implemented",
				statusNote:
					"Raw Rapier objects stay out of gameplay systems and level data.",
				removable: false,
			},
			{
				id: "web-audio-adapter",
				label: "Web Audio Adapter",
				group: "adapters",
				owner: "src/engine/adapters/browser/audio.ts",
				contract:
					"Owns browser audio unlock, playback, node cleanup, and platform behavior.",
				status: "implemented",
				statusNote: "Audio content remains manifest-owned and event-driven.",
				removable: false,
			},
			{
				id: "three-renderer-adapter",
				label: "Three Renderer Adapter",
				group: "adapters",
				owner: "src/engine/adapters/three",
				contract:
					"Owns Three scene objects, renderer, camera projection, lights, sky/environment projection, water/material rendering, and debug overlay output.",
				status: "partial",
				statusNote:
					"Three mirrors ECS/manifest state; it does not own gameplay truth.",
				removable: false,
			},
			{
				id: "import-cook-tools",
				label: "Import / Cook Tools",
				group: "editor",
				owner:
					"future content pipeline owners and existing collision cook scripts",
				contract:
					"Would import/generate/cook durable assets, collision, terrain, sky/environment products, materials, prefabs, and scene manifests.",
				status: "future",
				statusNote:
					"Static environment collision cook/check exists; broader import/cook tooling remains planned.",
				removable: true,
			},
			{
				id: "material-light-tooling",
				label: "Material / Light Tools",
				group: "editor",
				owner: "future material and lighting workbench",
				contract:
					"Would author material parameters, authored lights, light tuning, shadows, spot/area lights, and cooked scene manifests.",
				status: "future",
				statusNote:
					"Current runtime supports material parameters and stable point lights; richer authoring remains planned.",
				removable: true,
			},
			{
				id: "sky-environment-tooling",
				label: "Sky / Environment Tools",
				group: "editor",
				owner: "future sky/environment editor and import pipeline",
				contract:
					"Would author/import cubemaps, equirectangular environments, video skies, procedural atmosphere, reflection probes, fog, weather, clouds, and generated environment products.",
				status: "future",
				statusNote:
					"Scene-environment schema/renderer foundation exists; advanced sky/weather tooling remains planned.",
				removable: true,
			},
			{
				id: "water-behavior-systems",
				label: "Water Behavior",
				group: "game",
				owner: "future WaterSurfaceContract runtime packets",
				contract:
					"Would add explicit water volumes, waves, refraction/reflections, underwater state, buoyancy, quality tiers, and gameplay effects.",
				status: "future",
				statusNote:
					"Current water support is static visual only and must not imply collision or gameplay volume.",
				removable: true,
			},
			{
				id: "animation-module",
				label: "Animation Module",
				group: "engine",
				owner: "future engine animation module",
				contract:
					"Would own animation clips, skeletal/morph playback, animation IDs, blending, and runtime animation sync.",
				status: "future",
				statusNote:
					"Architecture and asset docs reserve animation; no production animation module is active yet.",
				removable: true,
			},
			{
				id: "networking-module",
				label: "Networking",
				group: "engine",
				owner: "src/engine/modules/networking",
				contract:
					"Owns future transport/session-ready command and snapshot foundations without trusting local-only state.",
				status: "partial",
				statusNote:
					"Foundation exists for readiness; no multiplayer runtime is active.",
				removable: true,
			},
			{
				id: "save-replay-tools",
				label: "Save / Replay",
				group: "engine",
				owner: "src/engine/data/serializers and src/engine/data/replay",
				contract:
					"Serializes engine state, command logs, and deterministic snapshots without serializing Three/Rapier/DOM/audio objects.",
				status: "partial",
				statusNote:
					"Serializer/replay foundations exist; full product save/load UI is future.",
				removable: true,
			},
			{
				id: "debug-tooling",
				label: "Debug Tooling",
				group: "engine",
				owner: "src/engine/modules/debug and src/game/diagnostics",
				contract:
					"Owns inspectors, scheduler view, profiling, traces, scene leak reports, physics debug draw, render counts, and runtime diagnostics.",
				status: "partial",
				statusNote:
					"Scheduler inspection, profiling foundation, collision overlay, and performance diagnostics exist; broader tooling is planned.",
				removable: true,
			},
		],
		edges: [
			{
				id: "shell-mounts-game-client",
				from: "astro-shell",
				to: "runtime-client",
				label: "mounts",
				kind: "runtime",
			},
			{
				id: "runtime-client-calls-mount",
				from: "runtime-client",
				to: "game-client-mount",
				label: "calls mount",
				kind: "runtime",
			},
			{
				id: "mount-imports-discovery",
				from: "game-client-mount",
				to: "level-package-discovery",
				label: "imports runtimeSettings",
				kind: "runtime",
			},
			{
				id: "runtime-client-projects-ui",
				from: "runtime-client",
				to: "ui-projection",
				label: "mirrors state",
				kind: "runtime",
			},
			{
				id: "ui-dispatches-runtime-input",
				from: "ui-projection",
				to: "runtime-client",
				label: "commands",
				kind: "runtime",
			},
			{
				id: "runtime-client-uses-browser-input",
				from: "runtime-client",
				to: "browser-input-adapter",
				label: "input port",
				kind: "runtime",
			},
			{
				id: "mount-creates-runtime",
				from: "game-client-mount",
				to: "game-runtime",
				label: "creates",
				kind: "runtime",
			},
			{
				id: "discovery-loads-installed-entry",
				from: "level-package-discovery",
				to: "installed-package-entry",
				label: "import.meta.glob",
				kind: "runtime",
			},
			{
				id: "installed-entry-exports-router",
				from: "installed-package-entry",
				to: "level-router",
				label: "exports router",
				kind: "runtime",
			},
			{
				id: "installed-entry-exports-settings",
				from: "installed-package-entry",
				to: "global-settings",
				label: "exports settings",
				kind: "data",
			},
			{
				id: "global-settings-router",
				from: "global-settings",
				to: "level-router",
				label: "selects default",
				kind: "data",
			},
			{
				id: "level-router-catalog",
				from: "level-router",
				to: "runtime-scene-catalog",
				label: "lists scenes",
				kind: "data",
			},
			{
				id: "global-package-catalog",
				from: "global-package",
				to: "runtime-scene-catalog",
				label: "shared data",
				kind: "data",
			},
			{
				id: "player-package-catalog",
				from: "player-package",
				to: "runtime-scene-catalog",
				label: "player data",
				kind: "data",
			},
			{
				id: "level-package-catalog",
				from: "level-package",
				to: "runtime-scene-catalog",
				label: "level data",
				kind: "data",
			},
			{
				id: "performance-config-catalog",
				from: "performance-config",
				to: "runtime-scene-catalog",
				label: "resource",
				kind: "data",
			},
			...routedRuntimeSceneManifests.map((manifest) => ({
				id: `runtime-scene-catalog-${manifestNodeId(manifest.id)}`,
				from: "runtime-scene-catalog",
				to: manifestNodeId(manifest.id),
				label: "manifest",
				kind: "data" as const,
			})),
			{
				id: "catalog-validates",
				from: "runtime-scene-catalog",
				to: "data-contracts",
				label: "validates",
				kind: "data",
			},
			{
				id: "data-preloads-assets",
				from: "data-contracts",
				to: "asset-manager",
				label: "registers/preloads",
				kind: "data",
			},
			{
				id: "data-loads-level",
				from: "data-contracts",
				to: "level-loader",
				label: "validated scene",
				kind: "data",
			},
			{
				id: "level-loader-scene-manager",
				from: "level-loader",
				to: "scene-manager",
				label: "scene scope",
				kind: "runtime",
			},
			{
				id: "scene-manager-runtime",
				from: "scene-manager",
				to: "game-runtime",
				label: "active scene",
				kind: "runtime",
			},
			{
				id: "runtime-core",
				from: "game-runtime",
				to: "engine-core",
				label: "drives",
				kind: "runtime",
			},
			{
				id: "runtime-rules",
				from: "game-runtime",
				to: "game-rules",
				label: "registers systems",
				kind: "runtime",
			},
			{
				id: "rules-input",
				from: "game-rules",
				to: "input-stage",
				label: "systems",
				kind: "runtime",
			},
			{
				id: "input-commands",
				from: "input-stage",
				to: "commands-stage",
				label: "fixed step",
				kind: "runtime",
			},
			{
				id: "commands-gameplay",
				from: "commands-stage",
				to: "gameplay-stage",
				label: "intent",
				kind: "runtime",
			},
			{
				id: "gameplay-ai",
				from: "gameplay-stage",
				to: "ai-stage",
				label: "state",
				kind: "runtime",
			},
			{
				id: "ai-character",
				from: "ai-stage",
				to: "character-stage",
				label: "transforms",
				kind: "runtime",
			},
			{
				id: "character-camera",
				from: "character-stage",
				to: "camera-stage",
				label: "player pose",
				kind: "runtime",
			},
			{
				id: "camera-performance",
				from: "camera-stage",
				to: "performance-systems",
				label: "observer",
				kind: "runtime",
			},
			{
				id: "performance-physics",
				from: "performance-systems",
				to: "physics-stage",
				label: "then",
				kind: "runtime",
			},
			{
				id: "physics-audio",
				from: "physics-stage",
				to: "audio-stage",
				label: "events",
				kind: "runtime",
			},
			{
				id: "audio-render-sync",
				from: "audio-stage",
				to: "render-sync-stage",
				label: "then",
				kind: "runtime",
			},
			{
				id: "render-sync-render",
				from: "render-sync-stage",
				to: "render-stage",
				label: "projection",
				kind: "runtime",
			},
			{
				id: "input-adapter-stage",
				from: "browser-input-adapter",
				to: "input-stage",
				label: "InputSnapshot",
				kind: "runtime",
			},
			{
				id: "physics-rapier",
				from: "physics-stage",
				to: "rapier-adapter",
				label: "sync/step",
				kind: "runtime",
			},
			{
				id: "audio-web-audio",
				from: "audio-stage",
				to: "web-audio-adapter",
				label: "playback",
				kind: "runtime",
			},
			{
				id: "render-sync-three",
				from: "render-sync-stage",
				to: "three-renderer-adapter",
				label: "objects/lights/camera",
				kind: "runtime",
			},
			{
				id: "render-three",
				from: "render-stage",
				to: "three-renderer-adapter",
				label: "draw",
				kind: "runtime",
			},
			{
				id: "performance-diagnostics-source",
				from: "performance-systems",
				to: "performance-diagnostics",
				label: "reports",
				kind: "runtime",
			},
			{
				id: "performance-runtime-lod",
				from: "performance-systems",
				to: "performance-lod",
				label: "evaluates",
				kind: "runtime",
			},
			{
				id: "performance-culling-edge",
				from: "performance-systems",
				to: "performance-culling",
				label: "applies",
				kind: "runtime",
			},
			{
				id: "performance-streaming-edge",
				from: "performance-systems",
				to: "performance-streaming",
				label: "plans",
				kind: "runtime",
			},
			{
				id: "performance-collision-edge",
				from: "performance-systems",
				to: "performance-collision",
				label: "diagnoses",
				kind: "runtime",
			},
			{
				id: "master-control-observes-bridge",
				from: "master-control",
				to: "live-dev-bridge",
				label: "observes/commands",
				kind: "editor",
			},
			{
				id: "master-control-reads-discovery",
				from: "master-control",
				to: "level-package-discovery",
				label: "imports runtimeSettings",
				kind: "editor",
			},
			{
				id: "live-bridge-runtime",
				from: "live-dev-bridge",
				to: "game-runtime",
				label: "configured runtime port",
				kind: "editor",
			},
			{
				id: "global-settings-live-bridge",
				from: "global-settings",
				to: "live-dev-bridge",
				label: "enables/categories",
				kind: "data",
			},
			{
				id: "master-control-edits-api",
				from: "master-control",
				to: "editor-dev-api",
				label: "DEV saves",
				kind: "editor",
			},
			{
				id: "level-workbench-edits-api",
				from: "level-editor-workbench",
				to: "editor-dev-api",
				label: "DEV saves",
				kind: "editor",
			},
			{
				id: "editor-api-level-package",
				from: "editor-dev-api",
				to: "level-package",
				label: "writes owner files",
				kind: "editor",
			},
			{
				id: "editor-api-global-settings",
				from: "editor-dev-api",
				to: "global-settings",
				label: "writes owner files",
				kind: "editor",
			},
			{
				id: "editor-api-player-package",
				from: "editor-dev-api",
				to: "player-package",
				label: "writes owner files",
				kind: "editor",
			},
			{
				id: "editor-api-performance",
				from: "editor-dev-api",
				to: "performance-config",
				label: "writes owner files",
				kind: "editor",
			},
			{
				id: "future-import-catalog",
				from: "import-cook-tools",
				to: "runtime-scene-catalog",
				label: "future emits",
				kind: "future",
			},
			{
				id: "future-material-light-catalog",
				from: "material-light-tooling",
				to: "level-package",
				label: "future authoring",
				kind: "future",
			},
			{
				id: "future-sky-catalog",
				from: "sky-environment-tooling",
				to: "level-package",
				label: "future authoring",
				kind: "future",
			},
			{
				id: "future-water-runtime",
				from: "water-behavior-systems",
				to: "game-rules",
				label: "future systems",
				kind: "future",
			},
			{
				id: "future-animation-runtime",
				from: "animation-module",
				to: "render-sync-stage",
				label: "future stage",
				kind: "future",
			},
			{
				id: "future-networking-core",
				from: "networking-module",
				to: "engine-core",
				label: "future snapshots",
				kind: "future",
			},
			{
				id: "future-save-replay-core",
				from: "save-replay-tools",
				to: "engine-core",
				label: "serializes",
				kind: "future",
			},
			{
				id: "future-debug-runtime",
				from: "debug-tooling",
				to: "engine-core",
				label: "inspects",
				kind: "future",
			},
			{
				id: "debug-editor",
				from: "debug-tooling",
				to: "master-control",
				label: "future views",
				kind: "future",
			},
		],
	};
}

function runtimeSceneManifestToNode(
	manifest: RuntimeSceneManifestData,
	options: MasterControlGraphOptions,
): MasterControlGraphNode {
	const isActiveRuntimeScene = manifest.id === options.activeRuntimeSceneId;

	return {
		id: manifestNodeId(manifest.id),
		label: manifest.level.id,
		group: "levels",
		owner: `routed runtime scene: ${manifest.id}`,
		contract: `Launchable runtime scene for ${manifest.source.kind} source ${manifest.source.id}.`,
		status: "partial",
		statusNote: isActiveRuntimeScene
			? "Current live runtime scene reported by the game dev bridge."
			: "Available checked-in runtime scene manifest.",
		removable: true,
		runtimeSceneId: manifest.id,
		isActiveRuntimeScene,
		isConfigurable: true,
		isDataSource: true,
	};
}

function manifestNodeId(manifestId: string): string {
	return `runtime-scene-${manifestId.replaceAll(/[^A-Za-z0-9]+/g, "-")}`;
}

const mermaidClassByStatus: Record<MasterControlGraphNodeStatus, string> = {
	implemented: "implemented",
	partial: "partial",
	future: "future",
};

const mermaidLinkStyleByKind: Record<MasterControlGraphEdgeKind, string> = {
	runtime: "stroke:#65d3c8,stroke-width:2px",
	data: "stroke:#f0b45d,stroke-width:2px",
	editor: "stroke:#b68cff,stroke-width:2px",
	future: "stroke:#9aa0a8,stroke-width:2px,stroke-dasharray:5 4",
};

const mermaidGroupLabels: Record<MasterControlGraphNodeGroup, string> = {
	app: "App / UI Host",
	global: "Package Settings",
	levels: "Product Level Package",
	engine: "Engine Core / Modules",
	game: "Game Runtime Systems",
	adapters: "Adapters / External Libraries",
	editor: "Optional Editor Tooling",
};

const mermaidGroupOrder: readonly MasterControlGraphNodeGroup[] = [
	"app",
	"editor",
	"global",
	"levels",
	"engine",
	"game",
	"adapters",
];

export function graphAsMermaid(
	graph: MasterControlGraph,
	options: MasterControlGraphMermaidOptions = {},
): string {
	const lines = ["flowchart LR"];

	for (const group of mermaidGroupOrder) {
		const nodes = graph.nodes.filter((node) => node.group === group);

		if (nodes.length === 0) {
			continue;
		}

		lines.push(`  subgraph ${group}["${mermaidGroupLabels[group]}"]`);

		for (const node of nodes) {
			lines.push(
				`    ${mermaidId(node.id)}["${escapeMermaidLabel(node.label)}"]`,
			);
		}

		lines.push("  end");
	}

	for (const edge of graph.edges) {
		lines.push(
			`  ${mermaidId(edge.from)} -->|${escapeMermaidLabel(edge.label)}| ${mermaidId(edge.to)}`,
		);
	}

	lines.push(
		"  classDef implemented fill:#1c433c,stroke:#65d3c8,color:#f4f0e8",
		"  classDef partial fill:#293d55,stroke:#f0b45d,stroke-dasharray: 5 4,color:#f4f0e8",
		"  classDef future fill:#4b4f55,stroke:#9aa0a8,color:#d8dde4",
		"  classDef selected stroke:#ffffff,stroke-width:4px",
	);

	for (const node of graph.nodes) {
		lines.push(
			`  class ${mermaidId(node.id)} ${mermaidClassByStatus[node.status]}`,
		);
	}

	if (options.selectedNodeId) {
		lines.push(`  class ${mermaidId(options.selectedNodeId)} selected`);
	}

	graph.edges.forEach((edge, index) => {
		lines.push(`  linkStyle ${index} ${mermaidLinkStyleByKind[edge.kind]}`);
	});

	return lines.join("\n");
}

function mermaidId(id: string): string {
	return id.replaceAll(/[^A-Za-z0-9_]/g, "_");
}

export function graphNodeIdAsMermaidId(id: string): string {
	return mermaidId(id);
}

function escapeMermaidLabel(label: string): string {
	return label.replaceAll('"', '\\"');
}
