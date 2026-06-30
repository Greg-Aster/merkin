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
	readonly x: number;
	readonly y: number;
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
		routedRuntimeSceneManifests.map((manifest, index, manifests) =>
			runtimeSceneManifestToNode(manifest, index, manifests.length, options),
		);

	return {
		nodes: [
			{
				id: "astro-shell",
				label: "Astro Shell",
				group: "app",
				x: 50,
				y: 5,
				owner: "src/pages and src/app",
				contract:
					"Hosts the runtime or editor window without owning game state.",
				status: "implemented",
				statusNote: "Normal route and editor route shells exist.",
				removable: false,
			},
			{
				id: "runtime-client",
				label: "Game Client",
				group: "app",
				x: 50,
				y: 13,
				owner: "src/app/GameClient.svelte",
				contract: "Mounts canvas UI and dispatches engine-facing input.",
				status: "implemented",
				statusNote: "Browser client mount exists for the current runtime.",
				removable: false,
				details: [
					{
						label: "HUD Owner",
						value:
							"Mounts src/ui/RuntimeHud.svelte as the runtime UI projection.",
					},
					{
						label: "Trigger",
						value:
							"Subscribes to client.api.observeRuntime(), then refreshes snapshot and client.gameState().",
					},
					{
						label: "Telemetry Source",
						value:
							"Reads runtime tick from the engine snapshot and player HUD values from the game runtime state.",
					},
					{
						label: "Boundary",
						value:
							"Displays UI state and dispatches commands; it does not own gameplay state.",
					},
				],
			},
			{
				id: "global-settings",
				label: "Global Settings",
				group: "global",
				x: 50,
				y: 21,
				owner: "src/app/levelPackageDiscovery.ts",
				contract:
					"Discovers the installed level package router and exposes runtime settings.",
				status: "implemented",
				statusNote:
					"Runtime settings are loaded from the installed level package router.",
				removable: false,
				isConfigurable: true,
			},
			{
				id: "level-router",
				label: "Level Router",
				group: "levels",
				x: 78,
				y: 24,
				owner: "src/levels/global/router.ts",
				contract:
					"Owns the installed level package entries, runtime scene list, default scene, and per-scene audio lookup.",
				status: "partial",
				statusNote:
					"Current router lists checked-in level bundles; replacing the router changes what the editor and runtime see.",
				removable: true,
				isDataSource: true,
			},
			{
				id: "level-package",
				label: "Level Package",
				group: "levels",
				x: 78,
				y: 35,
				owner: "src/levels",
				contract:
					"Owns shipped data-first level packages and runtime wrapper exports.",
				status: "partial",
				statusNote:
					"Checked-in level packages now use data.json as the editor-owned source; import/cook tooling remains future.",
				removable: true,
				details: [
					{
						label: "Imports",
						value:
							"Composes reusable player data from Player Package with each level's local data.json.",
					},
					{
						label: "Editor Relationship",
						value:
							"Level Editor Workbench edits per-level data.json fields; it does not own reusable player source data.",
					},
					{
						label: "Runtime Relationship",
						value:
							"Runtime consumes the resolved package after validation; it does not repair missing authored level or player data.",
					},
				],
			},
			{
				id: "player-package",
				label: "Player Package",
				group: "levels",
				x: 66,
				y: 47,
				owner: "src/levels/player",
				contract:
					"Owns user-configurable player prefab, assets, audio defaults, readiness constants, and spawn helper data.",
				status: "implemented",
				statusNote:
					"Imported by level packages; the Player Package panel edits global defaults while level files own per-level overrides.",
				removable: true,
				isConfigurable: true,
				isDataSource: true,
				details: [
					{
						label: "Configurable Data",
						value:
							"src/levels/player/data.json owns prefab component defaults, mesh/material/audio asset URLs, default audio mappings, and player-light defaults.",
					},
					{
						label: "Level Override",
						value:
							"Each level owns only player spawn config such as position, groundY, light, and audio volumes.",
					},
					{
						label: "Editor Relationship",
						value:
							"The Player Package node edits global defaults; the level editor edits level data.json overrides.",
					},
					{
						label: "Boundary",
						value:
							"Runtime behavior stays in src/game/systems; this package owns authored player data only.",
					},
				],
			},
			...runtimeSceneLevelNodes,
			{
				id: "performance-config",
				label: "Performance Config",
				group: "levels",
				x: 64,
				y: 37,
				owner:
					"src/levels/global/performance.json and src/levels/<level>/performance.json",
				contract:
					"Owns saved global defaults and per-level overrides for game performance systems.",
				status: "partial",
				statusNote:
					"Stage one supports off/diagnostic modes and composes the effective config into runtime scene resources.",
				removable: true,
				isConfigurable: true,
				isDataSource: true,
				details: [
					{
						label: "Global Defaults",
						value:
							"src/levels/global/performance.json owns package-wide defaults.",
					},
					{
						label: "Level Overrides",
						value:
							"Each src/levels/<level>/performance.json owns that level's performance overrides.",
					},
					{
						label: "Runtime Resource",
						value:
							"defineLevelPackage() injects the effective config into game:performanceConfig.",
					},
					{
						label: "Boundary",
						value:
							"Config belongs to src/levels; runtime behavior belongs to src/game/performance.",
					},
				],
			},
			{
				id: "game-runtime",
				label: "Game Runtime",
				group: "game",
				x: 50,
				y: 69,
				owner: "src/game/runtime",
				contract:
					"Composes gameplay systems against engine ports and owns live runtime diagnostics.",
				status: "implemented",
				statusNote:
					"Runtime composition, scene loading, and non-saved collision overlay diagnostics are implemented.",
				removable: false,
				details: [
					{
						label: "Diagnostics Owner",
						value:
							"Runtime imports src/game/diagnostics and sends overlay shapes through the renderer port.",
					},
					{
						label: "Collision Overlay",
						value:
							"Game Runtime owns the live toggle; it is a diagnostic command, not saved level/global/player configuration.",
					},
					{
						label: "Editor Relationship",
						value:
							"The editor sends DEV bridge commands and displays runtime diagnostics from the live game snapshot.",
					},
				],
			},
			{
				id: "performance-systems",
				label: "Performance Systems",
				group: "game",
				x: 22,
				y: 80,
				owner: "src/game/performance",
				contract:
					"Owns game-level performance policy, diagnostics, and future optimization systems.",
				status: "partial",
				statusNote:
					"Stage one exposes diagnostics only; active LOD, culling, streaming, and collision optimizations remain future.",
				removable: false,
				details: [
					{
						label: "Config Source",
						value:
							"Reads game:performanceConfig from the active runtime scene resource.",
					},
					{
						label: "Boundary",
						value:
							"Must not import src/levels, src/editor, adapters, browser APIs, or framework packages.",
					},
				],
			},
			{
				id: "performance-lod",
				label: "LOD",
				group: "game",
				x: 10,
				y: 90,
				owner: "src/game/performance/lod",
				contract:
					"Reserved owner for runtime level-of-detail policy and systems.",
				status: "future",
				statusNote: "Config and diagnostics only; no active LOD system yet.",
				removable: false,
			},
			{
				id: "performance-culling",
				label: "Culling",
				group: "game",
				x: 24,
				y: 90,
				owner: "src/game/performance/culling",
				contract: "Reserved owner for runtime visibility and culling policy.",
				status: "future",
				statusNote:
					"Config and diagnostics only; no active culling system yet.",
				removable: false,
			},
			{
				id: "performance-streaming",
				label: "Streaming",
				group: "game",
				x: 10,
				y: 97,
				owner: "src/game/performance/streaming",
				contract:
					"Reserved owner for runtime asset, render, and collision residency policy.",
				status: "future",
				statusNote:
					"Config and diagnostics only; no active streaming system yet.",
				removable: false,
			},
			{
				id: "performance-collision",
				label: "Collision Perf",
				group: "game",
				x: 24,
				y: 97,
				owner: "src/game/performance/collision",
				contract:
					"Reserved owner for broadphase-friendly collision and walkable lookup policy.",
				status: "future",
				statusNote:
					"Config and diagnostics only; no active collision optimization yet.",
				removable: false,
			},
			{
				id: "performance-diagnostics",
				label: "Performance Diagnostics",
				group: "game",
				x: 22,
				y: 58,
				owner: "src/game/performance/diagnostics",
				contract:
					"Publishes read-only runtime performance counts through the game diagnostics surface.",
				status: "implemented",
				statusNote:
					"Reports effective config, entity/render/light/collider counts, mesh collision triangles, and loaded asset count.",
				removable: false,
			},
			{
				id: "game-rules",
				label: "Game Rules",
				group: "game",
				x: 22,
				y: 69,
				owner: "src/game/systems and src/game/prefabs",
				contract: "Owns Merkin-specific meaning, interactions, and prefabs.",
				status: "partial",
				statusNote:
					"Core movement, interaction, portal, story, charge, prefab, and content systems exist; broader game content remains future.",
				removable: false,
			},
			{
				id: "data-contracts",
				label: "Data Contracts",
				group: "engine",
				x: 50,
				y: 58,
				owner: "src/engine/data and src/engine/data/schemas",
				contract:
					"Checks composed game data before the runtime is allowed to load it.",
				status: "partial",
				statusNote:
					"Current validators cover shipped assets, prefabs, levels, render profiles, runtime manifests, and readiness.",
				removable: false,
				details: [
					{
						label: "What It Is",
						value:
							"Engine validation code, not a gameplay object or editable content package.",
					},
					{
						label: "Workflow Role",
						value:
							"Receives the resolved level package after level, player, global, audio, and render data have been composed.",
					},
					{
						label: "Pass Condition",
						value:
							"Assets, prefab components, level instances, render profile, audio mappings, runtime manifest references, and readiness requirements must agree.",
					},
					{
						label: "Failure Behavior",
						value:
							"Invalid data fails before play instead of being silently repaired by the runtime.",
					},
					{
						label: "Runtime Relationship",
						value:
							"Validated data feeds the game runtime; the contracts themselves do not become ECS state.",
					},
				],
			},
			{
				id: "engine-core",
				label: "Engine Core",
				group: "engine",
				x: 50,
				y: 79,
				owner: "src/engine/core and src/engine/runtime",
				contract: "Owns world state, scheduler, commands, and events.",
				status: "implemented",
				statusNote:
					"World, scheduler, command bus, event bus, and fixed-step runtime exist.",
				removable: false,
			},
			{
				id: "engine-modules",
				label: "Engine Modules",
				group: "engine",
				x: 50,
				y: 88,
				owner: "src/engine/modules",
				contract:
					"Defines renderer, physics, input, audio, scene, and data contracts.",
				status: "partial",
				statusNote:
					"Rendering, physics, input, audio, scene, assets, camera, debug, and networking foundations exist; some production systems remain future.",
				removable: false,
			},
			{
				id: "adapters",
				label: "Adapters",
				group: "adapters",
				x: 50,
				y: 97,
				owner: "src/engine/adapters",
				contract:
					"Owns Three, Rapier, Web Audio, and browser implementation details.",
				status: "partial",
				statusNote:
					"Three, Rapier, browser input, and browser audio adapter foundations exist; richer production adapter behavior remains future.",
				removable: false,
			},
			{
				id: "master-control",
				label: "Master Control",
				group: "editor",
				x: 13,
				y: 18,
				owner: "src/editor and src/pages/editor.astro",
				contract:
					"Visualizes architecture as an optional external tool window.",
				status: "implemented",
				statusNote: "Current /editor architecture map exists.",
				removable: true,
				details: [
					{
						label: "Route",
						value: "/editor",
					},
					{
						label: "Surface",
						value: "Interactive architecture map and selected-node inspector.",
					},
					{
						label: "Owner Files",
						value:
							"src/editor/MasterControlMap.svelte, src/editor/masterControlGraph.ts, src/pages/editor.astro",
					},
					{
						label: "Capabilities",
						value:
							"Displays graph data, observes the live game bridge, opens level workspaces from runtime scene nodes, and shows selected-node details.",
					},
					{
						label: "Data Bridges",
						value:
							"Game dev bridge, /__megameal-editor-api/global-settings, /__megameal-editor-api/levels.",
					},
					{
						label: "Configuration",
						value:
							"None on this node. Configuration belongs to Global Settings, Level Router, runtime scene nodes, and level workspace surfaces.",
					},
					{
						label: "Boundary",
						value:
							"Dev-only optional tooling; removable; self-referential graph node, not game runtime state.",
					},
				],
			},
			{
				id: "level-editor-workbench",
				label: "Level Editor Workbench",
				group: "editor",
				x: 13,
				y: 35,
				owner:
					"src/editor/level/LevelEditorWorkspace.svelte and scripts/editor-dev-api.mjs",
				contract:
					"Edits level package data documents through DEV-only validated file-owner saves.",
				status: "partial",
				statusNote:
					"Optional DEV tooling edits current runtime fields in data.json and can request live scene reloads; it is not part of game runtime flow.",
				removable: true,
				details: [
					{
						label: "Writes",
						value:
							"Per-level data.json only, through DEV-only validated saves.",
					},
					{
						label: "Player Data",
						value:
							"May edit a level's player override config, but reusable player prefab/assets/audio live in Player Package.",
					},
					{
						label: "Boundary",
						value:
							"Optional tooling; deleting the editor must not break the normal game runtime.",
					},
				],
			},
			{
				id: "import-cook-tools",
				label: "Import / Cook Tools",
				group: "editor",
				x: 13,
				y: 58,
				owner: "future content pipeline owners",
				contract:
					"Would import/generate/cook durable assets, terrain, collision, materials, and scene manifests.",
				status: "future",
				statusNote:
					"Several runtime contracts reserve this work, but the editor/import tooling is not implemented.",
				removable: true,
			},
		],
		edges: [
			{
				id: "shell-client",
				from: "astro-shell",
				to: "runtime-client",
				label: "mounts",
				kind: "runtime",
			},
			{
				id: "client-global",
				from: "runtime-client",
				to: "global-settings",
				label: "reads startup",
				kind: "runtime",
			},
			{
				id: "global-levels",
				from: "global-settings",
				to: "level-router",
				label: "loads router",
				kind: "data",
			},
			{
				id: "router-package",
				from: "level-router",
				to: "level-package",
				label: "lists entries",
				kind: "data",
			},
			{
				id: "player-package-levels",
				from: "player-package",
				to: "level-package",
				label: "imports player data",
				kind: "data",
			},
			{
				id: "levels-data",
				from: "level-package",
				to: "data-contracts",
				label: "validates package",
				kind: "data",
			},
			{
				id: "levels-performance-config",
				from: "level-package",
				to: "performance-config",
				label: "composes config",
				kind: "data",
			},
			{
				id: "performance-config-data",
				from: "performance-config",
				to: "data-contracts",
				label: "validates modes",
				kind: "data",
			},
			...routedRuntimeSceneManifests.map((manifest) => ({
				id: `level-package-${manifestNodeId(manifest.id)}`,
				from: "level-package",
				to: manifestNodeId(manifest.id),
				label: "contains",
				kind: "data" as const,
			})),
			{
				id: "data-runtime",
				from: "data-contracts",
				to: "game-runtime",
				label: "feeds playable scene",
				kind: "data",
			},
			{
				id: "runtime-performance",
				from: "game-runtime",
				to: "performance-systems",
				label: "reads resource",
				kind: "runtime",
			},
			{
				id: "performance-lod-edge",
				from: "performance-systems",
				to: "performance-lod",
				label: "future",
				kind: "future",
			},
			{
				id: "performance-culling-edge",
				from: "performance-systems",
				to: "performance-culling",
				label: "future",
				kind: "future",
			},
			{
				id: "performance-streaming-edge",
				from: "performance-systems",
				to: "performance-streaming",
				label: "future",
				kind: "future",
			},
			{
				id: "performance-collision-edge",
				from: "performance-systems",
				to: "performance-collision",
				label: "future",
				kind: "future",
			},
			{
				id: "performance-diagnostics-edge",
				from: "game-runtime",
				to: "performance-diagnostics",
				label: "reports",
				kind: "runtime",
			},
			{
				id: "rules-runtime",
				from: "game-rules",
				to: "game-runtime",
				label: "registers systems",
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
				id: "core-modules",
				from: "engine-core",
				to: "engine-modules",
				label: "runs contracts",
				kind: "runtime",
			},
			{
				id: "core-adapters",
				from: "engine-modules",
				to: "adapters",
				label: "ports",
				kind: "runtime",
			},
			{
				id: "editor-observes",
				from: "master-control",
				to: "global-settings",
				label: "observes",
				kind: "editor",
			},
			{
				id: "editor-levels",
				from: "master-control",
				to: "level-router",
				label: "observes catalog",
				kind: "editor",
			},
			{
				id: "editor-performance",
				from: "master-control",
				to: "performance-config",
				label: "edits global",
				kind: "editor",
			},
			{
				id: "editor-performance-diagnostics",
				from: "master-control",
				to: "performance-diagnostics",
				label: "observes live",
				kind: "editor",
			},
			{
				id: "future-editor-levels",
				from: "level-editor-workbench",
				to: "level-package",
				label: "DEV edits data.json",
				kind: "editor",
			},
			{
				id: "future-tools-data",
				from: "import-cook-tools",
				to: "data-contracts",
				label: "future emits",
				kind: "future",
			},
		],
	};
}

function runtimeSceneManifestToNode(
	manifest: RuntimeSceneManifestData,
	index: number,
	total: number,
	options: MasterControlGraphOptions,
): MasterControlGraphNode {
	const isActiveRuntimeScene = manifest.id === options.activeRuntimeSceneId;
	const centeredOffset = index - (total - 1) / 2;

	return {
		id: manifestNodeId(manifest.id),
		label: manifest.level.id,
		group: "levels",
		x: 92,
		y: 54 + centeredOffset * 7,
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

export function graphAsMermaid(graph: MasterControlGraph): string {
	const nodeLines = graph.nodes.map((node) => {
		return `  ${node.id.replaceAll("-", "_")}["${node.label}"]`;
	});
	const edgeLines = graph.edges.map((edge) => {
		return `  ${edge.from.replaceAll("-", "_")} -->|${edge.label}| ${edge.to.replaceAll("-", "_")}`;
	});
	const classLines = graph.nodes.map((node) => {
		return `  class ${node.id.replaceAll("-", "_")} ${mermaidClassByStatus[node.status]}`;
	});

	return [
		"flowchart TD",
		...nodeLines,
		...edgeLines,
		"  classDef implemented fill:#1c433c,stroke:#65d3c8,color:#f4f0e8",
		"  classDef partial fill:#293d55,stroke:#f0b45d,stroke-dasharray: 5 4,color:#f4f0e8",
		"  classDef future fill:#4b4f55,stroke:#9aa0a8,color:#d8dde4",
		...classLines,
	].join("\n");
}
