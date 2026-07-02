<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type {
	GameDevBridgeEditorEndpoint,
	GameDevBridgeSnapshot,
} from "../../app/gameDevBridge.js";
import PerformanceConfigEditor from "../PerformanceConfigEditor.svelte";
import NpcEditorPanel from "./NpcEditorPanel.svelte";
import StructuredValueEditor from "./StructuredValueEditor.svelte";

const LEVELS_API_PATH = "/__megameal-editor-api/levels";
const tabs = [
	"Overview",
	"Manifest",
	"Player",
	"Resources",
	"Instances",
	"Prefabs",
	"Assets",
	"Collision",
	"Performance",
	"Audio",
	"Skybox",
	"NPCs",
	"Lighting",
	"Render",
	"Source",
] as const;

type Tab = (typeof tabs)[number];
type TabFieldInfo = {
	readonly label: string;
	readonly description: string;
};
type TabInfo = {
	readonly summary: string;
	readonly fields: readonly TabFieldInfo[];
};

type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

type LevelSummary = {
	readonly folderName: string;
	readonly folderPath: string;
	readonly levelId: string;
	readonly sceneId: string;
	readonly runtimeSceneId: string;
	readonly sourceId: string;
};

type LevelFile = {
	readonly name: string;
	readonly path: string;
	readonly sourceHash: string;
	readonly source: string;
};

type LevelNpcSourceFile = {
	readonly name: string;
	readonly path: string;
	readonly sourceHash: string;
	readonly data: Record<string, JsonValue>;
};

type LevelNpcPackage = {
	readonly groups: readonly LevelNpcSourceFile[];
	readonly archetypes: readonly LevelNpcSourceFile[];
};

type LevelCollisionSourceFile = {
	readonly name: string;
	readonly path: string;
	readonly data: Record<string, JsonValue>;
};

type LevelCollisionDiagnostics = {
	readonly status: string;
	readonly message?: string;
	readonly sourceAssetUrl?: string;
	readonly currentSourceHash?: string;
	readonly generatedSourceHash?: string;
	readonly generatedAt?: string;
	readonly chunkCount?: number;
	readonly triangleCount?: number;
};

type LevelCollisionPackage = {
	readonly files: readonly LevelCollisionSourceFile[];
	readonly diagnostics?: LevelCollisionDiagnostics;
};

type PerformanceSystemId = "lod" | "culling" | "streaming" | "collision";
type PerformanceSystemMode =
	| "off"
	| "diagnostic"
	| "distance"
	| "plan"
	| "spatial";
type PerformanceConfig = {
	schemaVersion: 1;
	systems: Record<
		PerformanceSystemId,
		{
			mode: PerformanceSystemMode;
		}
	>;
};

type LevelPackageDocument = {
	id: string;
	runtimeScene: {
		schemaVersion: 1;
		id: string;
		generatedAt: string;
		source: {
			kind: "prototype" | "authored" | "cook";
			id: string;
		};
		readiness: Record<string, JsonValue>;
	};
	level: {
		id: string;
		sceneId?: string;
		preload?: string[];
		preloadGroups?: string[];
		resources?: Record<string, JsonValue>;
		instances: Record<string, JsonValue>[];
	};
	assets: {
		shared?: string[];
		local: Record<string, JsonValue>[];
		preloadGroups?: Record<string, string[]>;
	};
	prefabs: {
		shared?: string[];
		local: Record<string, JsonValue>[];
	};
	audio: {
		eventMappings: Record<string, JsonValue>[];
		sceneMusic?: Record<string, JsonValue>;
	};
	skybox: {
		schemaVersion: 1;
		environment: Record<string, JsonValue>;
		assets?: {
			shared?: string[];
			local?: Record<string, JsonValue>[];
			preload?: string[];
			preloadGroups?: Record<string, string[]>;
		};
		planned?: Record<string, JsonValue>;
	};
	renderProfile: Record<string, JsonValue>;
	player?: Record<string, JsonValue>;
};

type LevelWorkspace = LevelSummary & {
	readonly files: readonly LevelFile[];
	readonly npcPackage: LevelNpcPackage;
	readonly collisionPackage: LevelCollisionPackage;
	readonly performance: PerformanceConfig;
	readonly document: LevelPackageDocument;
	readonly diagnostics: readonly string[];
};

type EntityLightRow = {
	readonly key: string;
	readonly owner: "prefab" | "instance" | "npc-instance";
	readonly index: number;
	readonly groupIndex?: number;
	readonly label: string;
	readonly sourcePath: string;
	readonly light: Record<string, JsonValue>;
};

type MaterialEmissionRow = {
	readonly key: string;
	readonly label: string;
	readonly sourcePath: string;
	readonly color: string;
	readonly emissive: string;
	readonly emissiveIntensity: number;
};

const tabInfo = {
	Overview: {
		summary:
			"Basic identity for the level package. Change these only when renaming or reclassifying the level, because runtime links and router entries depend on these IDs.",
		fields: [
			{
				label: "Package ID",
				description:
					"Stable package name for this level folder and editor save target.",
			},
			{
				label: "Level ID / Scene ID",
				description:
					"Names used by level data and runtime systems to identify this playable scene.",
			},
			{
				label: "Runtime Scene ID",
				description:
					"Scene key used by portals, the router, live reload, and game scene switching.",
			},
			{
				label: "Source Kind / Source ID",
				description:
					"Marks whether the scene is prototype, authored, or cooked, and where the source data came from.",
			},
		],
	},
	Manifest: {
		summary:
			"Runtime manifest data describes what must be ready before the level is considered playable. This is where readiness requirements and package source metadata live.",
		fields: [
			{
				label: "schemaVersion",
				description:
					"Version of the runtime scene manifest format. Keep this at the current supported value unless the schema changes.",
			},
			{
				label: "source",
				description:
					"Tracks the source identity for this manifest so generated, cooked, and authored scenes can be distinguished.",
			},
			{
				label: "readiness",
				description:
					"Lists required assets, collision objects, lights, walkable objects, and player IDs that must exist before play starts.",
			},
		],
	},
	Player: {
		summary:
			"Player configuration controls where the shared player package appears in this level and how level-specific player requirements are applied.",
		fields: [
			{
				label: "transform",
				description:
					"Player spawn position, rotation, and scale for this level.",
			},
			{
				label: "firstPersonController",
				description:
					"Initial camera yaw and pitch for the player when this level loads.",
			},
			{
				label: "groundY",
				description:
					"Default ground height used by the player controller in this scene.",
			},
			{
				label: "light",
				description:
					"Optional level-specific player light settings used for readiness and rendering.",
			},
		],
	},
	Resources: {
		summary:
			"Level resources are shared data values loaded with the scene. Use them for level-scoped configuration that systems need but that is not a placed object.",
		fields: [
			{
				label: "resources",
				description:
					"Named data blocks available to scene systems while this level is active.",
			},
			{
				label: "preload / preloadGroups",
				description:
					"Asset IDs and asset groups that should be loaded before the level starts.",
			},
		],
	},
	Instances: {
		summary:
			"Instances are the placed objects in the level. Each instance selects a prefab, gives it a stable ID, and can override component values.",
		fields: [
			{
				label: "id",
				description: "Local instance name for editor display and diagnostics.",
			},
			{
				label: "prefabId",
				description:
					"Prefab this object uses as its starting component and asset definition.",
			},
			{
				label: "stableId",
				description:
					"Persistent runtime identity. Portals, readiness, and save data should use this instead of display names.",
			},
			{
				label: "components / transform",
				description:
					"Per-object gameplay, render, physics, and placement data.",
			},
		],
	},
	Prefabs: {
		summary:
			"Prefabs are reusable object definitions. Instances point to these so repeated objects share the same base assets and components.",
		fields: [
			{
				label: "shared",
				description:
					"References reusable global prefabs such as the player, portals, or water.",
			},
			{
				label: "local",
				description:
					"Level-owned prefab definitions that only this level package provides.",
			},
			{
				label: "assetIds / components",
				description:
					"Assets and default behavior attached to each prefab before instance overrides are applied.",
			},
		],
	},
	Assets: {
		summary:
			"Assets define files and materials the level can load. Add local assets here when the level owns a model, texture, audio file, skybox, or material.",
		fields: [
			{
				label: "shared",
				description: "References global assets that are reused across levels.",
			},
			{
				label: "local",
				description:
					"Level-owned asset entries with IDs, kind, URL, tags, material settings, or cubemap faces.",
			},
			{
				label: "preloadGroups",
				description:
					"Named groups of asset IDs loaded together before or during scene startup.",
			},
		],
	},
	Collision: {
		summary:
			"Static environment collision is cooked from level-owned source settings into generated collision products. The editor inspects this data while runtime consumes explicit Collider components.",
		fields: [
			{
				label: "source",
				description:
					"Cook source config: visual GLB, optional manual collision GLB, mode, and performance settings.",
			},
			{
				label: "generated",
				description:
					"Generated collision chunks, source hash, bounds, triangle counts, and readiness-owned stable IDs.",
			},
		],
	},
	Performance: {
		summary:
			"Performance settings are level-owned controls saved in performance.json. Runtime systems consume the composed config and report live state through diagnostics.",
		fields: [
			{
				label: "LOD",
				description:
					"Runtime distance/significance tier policy for renderable candidates.",
			},
			{
				label: "Culling",
				description:
					"Runtime visibility policy for renderable and light candidates. Distance mode applies visibility through ECS components.",
			},
			{
				label: "Streaming",
				description:
					"Runtime residency policy for assets, renderables, and collision chunks. Plan mode reports chunk operations from current scene data.",
			},
			{
				label: "Collision",
				description:
					"Broadphase-friendly collision and walkable lookup policy. Spatial mode builds runtime spatial query diagnostics from current colliders.",
			},
		],
	},
	Audio: {
		summary:
			"Audio content maps game events and scene music to sound assets. Use this when a level needs specific ambience, music, or interaction sounds.",
		fields: [
			{
				label: "eventMappings",
				description:
					"Rules that play a sound asset when a named game event happens.",
			},
			{
				label: "sceneMusic",
				description: "Autoplay or selectable music tracks for this level.",
			},
			{
				label: "volume / loop / sceneId",
				description: "Playback controls and scene scoping for each mapping.",
			},
		],
	},
	Skybox: {
		summary:
			"Skybox settings are level-owned environment data saved in skybox.json. These fields control the visible background, the environment lighting contribution, and whether sky media is required before play.",
		fields: [
			{
				label: "Environment Kind",
				description:
					"Runtime-supported sky mode: cubemap, equirectangular image, video sky, procedural atmosphere, or solid color.",
			},
			{
				label: "Asset ID",
				description:
					"The sky image, cubemap, or video asset loaded for this level.",
			},
			{
				label: "Blur / Intensities",
				description:
					"Visible sky softness, visible background brightness, and image-based lighting strength.",
			},
			{
				label: "Planned Features",
				description:
					"Starmap, chunked sky, and motion metadata are stored for planning but must stay disabled until runtime support exists.",
			},
		],
	},
	NPCs: {
		summary:
			"NPC package inputs are composed with the level package at runtime. Local NPC group files place NPC instances, while global archetypes provide reusable assets, prefabs, visual parts, movement defaults, lights, and interaction defaults.",
		fields: [
			{
				label: "Local Groups",
				description:
					"Level-owned files under src/levels/<level>/npcs that place NPC instances with stable IDs.",
			},
			{
				label: "Global Archetypes",
				description:
					"Reusable NPC definitions under src/levels/global/npcs referenced by local groups.",
			},
			{
				label: "Runtime Composition",
				description:
					"NPC assets, prefabs, visual parts, instances, and required light stable IDs are composed with the base level package before runtime readiness.",
			},
		],
	},
	Lighting: {
		summary:
			"Lighting Workbench consolidates level ambience, sky environment contribution, player light overrides, authored object lights, and read-only emissive material influences.",
		fields: [
			{
				label: "Level Ambience",
				description:
					"Ambient and directional lights stored in data.json under renderProfile.lighting.lights.",
			},
			{
				label: "Sky Environment",
				description:
					"Image-based environment lighting and visible background controls stored in skybox.json.",
			},
			{
				label: "Player / Object Lights",
				description:
					"Player light overrides and local prefab or instance Light components that render as runtime lights.",
			},
			{
				label: "Read-only Influences",
				description:
					"Material emissive values affect visual brightness but are not direct Light components in this workbench.",
			},
		],
	},
	Render: {
		summary:
			"Render profile settings control renderer options and scene lighting. Skybox and environment selection are edited in the Skybox tab.",
		fields: [
			{
				label: "renderer",
				description:
					"Clear color, alpha, antialiasing, pixel ratio, and fallback material behavior.",
			},
			{
				label: "lighting",
				description:
					"Scene light definitions, including position, color, intensity, distance, and visibility.",
			},
			{
				label: "environment",
				description:
					"Owned by skybox.json and shown in the Skybox tab, not in the base render profile.",
			},
		],
	},
	Source: {
		summary:
			"Read-only source inspection for the files that make up this level package. Use this to verify what will be written, not to edit code directly.",
		fields: [
			{
				label: "data.json",
				description:
					"Primary editable level package document saved by this workspace.",
			},
			{
				label: "wrapper files",
				description:
					"TypeScript files that expose the data package to the runtime without owning level-specific values.",
			},
		],
	},
} satisfies Record<Tab, TabInfo>;

const DEFAULT_LEVEL_PLAYER_LIGHT = {
	kind: "point",
	color: "#ffffff",
	intensity: 1,
	distance: 10,
	decay: 2,
	visible: true,
} satisfies Record<string, JsonValue>;
let levels: readonly LevelSummary[] = $state([]);
let workspace: LevelWorkspace | undefined = $state();
let selectedRuntimeSceneId = $state("");
let activeTab = $state<Tab>("Overview");
// biome-ignore lint/style/useConst: Svelte state is reassigned from template event handlers.
let selectedSourceFile = $state("data.json");
let draft: LevelPackageDocument | undefined = $state();
let savedDraft: LevelPackageDocument | undefined = $state();
let performanceDraft: PerformanceConfig | undefined = $state();
let savedPerformance: PerformanceConfig | undefined = $state();
let savedNpcPackage: LevelNpcPackage | undefined = $state();
let liveSnapshot: GameDevBridgeSnapshot | undefined = $state();
let bridgeEndpoint: GameDevBridgeEditorEndpoint | undefined = $state();
let statusMessage = $state("Loading levels.");
let uploadMessage = $state("");
let busy = $state(false);

const activeFile = $derived(
	workspace?.files.find((file) => file.name === selectedSourceFile),
);
const sourceFileOptions = $derived(
	workspace?.files.map((file) => file.name) ?? ["data.json"],
);
const collisionSource = $derived(
	workspace?.collisionPackage.files.find((file) =>
		file.name.endsWith("source.json"),
	)?.data,
);
const collisionGenerated = $derived(
	workspace?.collisionPackage.files.find((file) =>
		file.name.endsWith("generated.json"),
	)?.data,
);
const collisionSettings = $derived(
	hasRecordValue(collisionSource?.settings) ? collisionSource.settings : {},
);
const collisionSummary = $derived(
	hasRecordValue(collisionGenerated?.summary) ? collisionGenerated.summary : {},
);
const collisionGeneratedSource = $derived(
	hasRecordValue(collisionGenerated?.source) ? collisionGenerated.source : {},
);
const collisionDiagnostics = $derived(workspace?.collisionPackage.diagnostics);
const collisionIsStale = $derived(collisionDiagnostics?.status === "stale");
const collisionQualityLabel = $derived(
	Number(collisionSettings.sampleSpacingMeters ?? 0) <= 3
		? "high"
		: Number(collisionSettings.sampleSpacingMeters ?? 0) <= 5
			? "medium"
			: "coarse",
);
const collisionCompressionRatio = $derived(
	Number(collisionSummary.sourceTriangleCount ?? 0) > 0
		? `${
				Math.round(
					(Number(collisionSummary.triangleCount ?? 0) /
						Number(collisionSummary.sourceTriangleCount ?? 1)) *
						1000,
				) / 10
			}%`
		: "none",
);
const collisionBoundsLabel = $derived(
	boundsLabel(toRecord(collisionSummary.bounds)),
);
const sourceBoundsLabel = $derived(
	boundsLabel(toRecord(collisionSummary.sourceBounds)),
);
const walkableBoundsLabel = $derived(
	boundsLabel(toRecord(collisionSummary.walkableBounds)),
);
const collisionBoundsCoverageLabel = $derived(
	boundsCoverageLabel(
		toRecord(collisionSummary.walkableBounds),
		toRecord(collisionSummary.bounds),
		Number(
			collisionSummary.metersPerSample ??
				collisionSettings.sampleSpacingMeters ??
				0,
		),
	),
);
const dirty = $derived(
	(draft !== undefined &&
		savedDraft !== undefined &&
		JSON.stringify(draft) !== JSON.stringify(savedDraft)) ||
		(performanceDraft !== undefined &&
			savedPerformance !== undefined &&
			JSON.stringify(performanceDraft) !== JSON.stringify(savedPerformance)) ||
		(workspace !== undefined &&
			savedNpcPackage !== undefined &&
			JSON.stringify(workspace.npcPackage) !== JSON.stringify(savedNpcPackage)),
);
const selectedInstanceCount = $derived(draft?.level.instances.length ?? 0);
const localAssetCount = $derived(draft?.assets.local.length ?? 0);
const localPrefabCount = $derived(draft?.prefabs.local.length ?? 0);
const npcGroupCount = $derived(workspace?.npcPackage.groups.length ?? 0);
const npcInstanceCount = $derived(
	workspace?.npcPackage.groups.reduce((count, group) => {
		const instances = group.data.instances;
		return count + (Array.isArray(instances) ? instances.length : 0);
	}, 0) ?? 0,
);
const activeTabInfo = $derived(tabInfo[activeTab]);
const skyboxEnvironment = $derived(toRecord(draft?.skybox.environment));
const playerConfig = $derived(toRecord(draft?.player));
const playerTransform = $derived(toRecord(playerConfig.transform));
const playerFirstPersonController = $derived(
	toRecord(playerConfig.firstPersonController),
);
const playerSpawnPosition = $derived(
	vector3Value(playerTransform.position, [0, 0, 0]),
);
const playerYawDegrees = $derived(
	radiansToDegrees(numericField(playerFirstPersonController.yawRadians)),
);
const playerPitchDegrees = $derived(
	radiansToDegrees(numericField(playerFirstPersonController.pitchRadians)),
);
const hasPlayerLightOverride = $derived(hasRecordValue(playerConfig.light));
const playerLight = $derived(toRecord(playerConfig.light));
const renderLightRows = $derived(renderProfileLightRows(draft));
const prefabLightRows = $derived(
	entityLightRows(draft?.prefabs.local ?? [], "prefab"),
);
const instanceLightRows = $derived(
	entityLightRows(draft?.level.instances ?? [], "instance"),
);
const npcLightRows = $derived(
	npcGroupLightRows(
		workspace?.npcPackage.groups ?? [],
		workspace?.npcPackage.archetypes ?? [],
	),
);
const materialEmissionRows = $derived(levelMaterialEmissionRows(draft));
const skyboxAssetOptions = $derived(
	draft
		? [
				...(draft.assets.shared ?? []),
				...(draft.skybox.assets?.shared ?? []),
				...draft.assets.local.map((asset) => String(asset.id ?? "")),
				...(draft.skybox.assets?.local ?? []).map((asset) =>
					String(asset.id ?? ""),
				),
			].filter((id) => id.length > 0)
		: [],
);

onMount(() => {
	void initializeWorkspace();

	if (import.meta.env.DEV) {
		void import("../../app/gameDevBridge.js").then(
			({ createGameDevBridgeEditorEndpoint }) => {
				bridgeEndpoint = createGameDevBridgeEditorEndpoint({
					onSnapshot(snapshot) {
						liveSnapshot = snapshot;
					},
				});
			},
		);
	}
});

onDestroy(() => {
	bridgeEndpoint?.dispose();
});

async function initializeWorkspace(): Promise<void> {
	await loadLevels();
	const url = new URL(window.location.href);
	const requestedRuntimeSceneId =
		url.searchParams.get("runtimeScene") ?? url.searchParams.get("scene");
	const runtimeSceneId =
		requestedRuntimeSceneId ?? levels[0]?.runtimeSceneId ?? "";

	if (runtimeSceneId) {
		await loadLevel(runtimeSceneId);
	}
}

async function loadLevels(): Promise<void> {
	busy = true;
	statusMessage = "Loading levels.";
	try {
		const payload = await fetchJson<{
			readonly levels: readonly LevelSummary[];
		}>(LEVELS_API_PATH);
		levels = payload.levels;
		statusMessage = levels.length === 0 ? "No levels found." : "Levels loaded.";
	} catch (error) {
		statusMessage =
			error instanceof Error ? error.message : "Failed to load levels.";
	} finally {
		busy = false;
	}
}

async function loadLevel(runtimeSceneId: string): Promise<void> {
	if (!runtimeSceneId) {
		return;
	}
	busy = true;
	statusMessage = `Loading ${runtimeSceneId}.`;
	try {
		const payload = await fetchJson<LevelWorkspace>(
			`${LEVELS_API_PATH}/${encodeURIComponent(runtimeSceneId)}`,
		);
		workspace = payload;
		selectedRuntimeSceneId = payload.runtimeSceneId;
		draft = structuredClone(payload.document);
		savedDraft = structuredClone(payload.document);
		performanceDraft = structuredClone(payload.performance);
		savedPerformance = structuredClone(payload.performance);
		savedNpcPackage = structuredClone(payload.npcPackage);
		activeTab = "Overview";
		statusMessage = `Loaded ${payload.levelId}.`;
		history.replaceState(
			null,
			"",
			`/editor/level/?runtimeScene=${encodeURIComponent(payload.runtimeSceneId)}`,
		);
	} catch (error) {
		statusMessage =
			error instanceof Error ? error.message : "Failed to load level.";
	} finally {
		busy = false;
	}
}

async function saveLevel(sourceLabel = "level"): Promise<void> {
	if (!workspace || !draft) {
		return;
	}
	commitActiveEditorField();
	const shouldSaveDocument = documentChanged();
	const shouldSavePerformance = performanceChanged();
	const npcPackage = dirtyNpcPackageForSave();
	if (!shouldSaveDocument && !shouldSavePerformance && !npcPackage) {
		statusMessage = `No changes to save for ${sourceLabel}.`;
		return;
	}
	const previousRuntimeSceneId = workspace.runtimeSceneId;
	busy = true;
	statusMessage = `Saving ${sourceLabel}.`;
	try {
		const payload = await fetchJson<LevelWorkspace>(
			`${LEVELS_API_PATH}/${encodeURIComponent(workspace.runtimeSceneId)}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...(shouldSaveDocument ? { document: draft } : {}),
					...(shouldSavePerformance ? { performance: performanceDraft } : {}),
					...(npcPackage ? { npcPackage } : {}),
					sourceHashes: sourceHashesForSave(
						shouldSaveDocument,
						shouldSavePerformance,
						npcPackage,
					),
				}),
			},
		);
		workspace = payload;
		selectedRuntimeSceneId = payload.runtimeSceneId;
		draft = structuredClone(payload.document);
		savedDraft = structuredClone(payload.document);
		performanceDraft = structuredClone(payload.performance);
		savedPerformance = structuredClone(payload.performance);
		savedNpcPackage = structuredClone(payload.npcPackage);
		statusMessage = `Saved ${sourceLabel}.`;
		history.replaceState(
			null,
			"",
			`/editor/level/?runtimeScene=${encodeURIComponent(payload.runtimeSceneId)}`,
		);
		reloadGameIfActive(previousRuntimeSceneId, payload.runtimeSceneId);
	} catch (error) {
		statusMessage =
			error instanceof Error ? error.message : "Failed to save level.";
	} finally {
		busy = false;
	}
}

function documentChanged(): boolean {
	return (
		draft !== undefined &&
		savedDraft !== undefined &&
		JSON.stringify(draft) !== JSON.stringify(savedDraft)
	);
}

function performanceChanged(): boolean {
	return (
		performanceDraft !== undefined &&
		savedPerformance !== undefined &&
		JSON.stringify(performanceDraft) !== JSON.stringify(savedPerformance)
	);
}

function dirtyNpcPackageForSave(): LevelNpcPackage | undefined {
	if (!workspace || !savedNpcPackage) {
		return undefined;
	}
	const savedGroupsByName = new Map(
		savedNpcPackage.groups.map((group) => [group.name, group]),
	);
	const groups = workspace.npcPackage.groups.filter((group) => {
		const savedGroup = savedGroupsByName.get(group.name);
		return (
			savedGroup === undefined ||
			JSON.stringify(group.data) !== JSON.stringify(savedGroup.data)
		);
	});

	return groups.length > 0
		? {
				groups,
				archetypes: [],
			}
		: undefined;
}

function updateNpcPackage(npcPackage: LevelNpcPackage): void {
	if (!workspace) {
		return;
	}
	workspace = {
		...workspace,
		npcPackage,
	};
}

function sourceHashesForSave(
	includeDocument: boolean,
	includePerformance: boolean,
	npcPackage: LevelNpcPackage | undefined,
): Record<string, string> {
	if (!workspace) {
		return {};
	}
	const hashes: Record<string, string> = {};
	const requiredFiles = new Set<string>();

	if (includeDocument) {
		requiredFiles.add("data.json");
		requiredFiles.add("skybox.json");
	}
	if (includePerformance) {
		requiredFiles.add("performance.json");
	}
	for (const group of npcPackage?.groups ?? []) {
		requiredFiles.add(group.name);
	}

	for (const file of workspace.files) {
		if (requiredFiles.has(file.name)) {
			hashes[file.name] = file.sourceHash;
		}
	}
	for (const group of workspace.npcPackage.groups) {
		if (requiredFiles.has(group.name)) {
			hashes[group.name] = group.sourceHash;
		}
	}

	return hashes;
}

function reloadGameIfActive(
	previousRuntimeSceneId: string,
	nextRuntimeSceneId: string,
): void {
	if (!bridgeEndpoint || !liveSnapshot?.activeRuntimeSceneId) {
		return;
	}
	if (
		liveSnapshot.activeRuntimeSceneId !== previousRuntimeSceneId &&
		liveSnapshot.activeRuntimeSceneId !== nextRuntimeSceneId
	) {
		return;
	}
	bridgeEndpoint.sendLoadRuntimeScene(nextRuntimeSceneId);
	statusMessage = `Saved ${nextRuntimeSceneId}; requested live reload.`;
}

async function uploadAsset(event: Event): Promise<void> {
	const input = event.currentTarget as HTMLInputElement;
	const file = input.files?.[0];
	if (!file || !workspace || !draft) {
		return;
	}
	busy = true;
	uploadMessage = `Uploading ${file.name}.`;
	try {
		const contentBase64 = await fileToBase64(file);
		const payload = await fetchJson<{
			readonly fileName: string;
			readonly url: string;
		}>(
			`${LEVELS_API_PATH}/${encodeURIComponent(workspace.runtimeSceneId)}/assets/upload`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fileName: file.name,
					contentBase64,
				}),
			},
		);
		addLocalAsset(payload.fileName, payload.url);
		uploadMessage = `Uploaded ${payload.fileName}.`;
		input.value = "";
	} catch (error) {
		uploadMessage =
			error instanceof Error ? error.message : "Failed to upload asset.";
	} finally {
		busy = false;
	}
}

async function checkCollisionCook(): Promise<void> {
	if (!workspace) {
		return;
	}
	busy = true;
	statusMessage = "Checking static environment collision.";
	try {
		const payload = await fetchJson<{
			readonly status: string;
			readonly error?: string;
			readonly workspace: LevelWorkspace;
		}>(
			`${LEVELS_API_PATH}/${encodeURIComponent(workspace.runtimeSceneId)}/collision/check`,
			{
				method: "POST",
			},
		);
		workspace = payload.workspace;
		draft = structuredClone(payload.workspace.document);
		savedDraft = structuredClone(payload.workspace.document);
		performanceDraft = structuredClone(payload.workspace.performance);
		savedPerformance = structuredClone(payload.workspace.performance);
		savedNpcPackage = structuredClone(payload.workspace.npcPackage);
		statusMessage =
			payload.status === "current"
				? "Static environment collision is current."
				: payload.error ?? "Static environment collision is stale.";
	} catch (error) {
		statusMessage =
			error instanceof Error ? error.message : "Failed to check collision.";
	} finally {
		busy = false;
	}
}

async function cookCollision(): Promise<void> {
	if (!workspace) {
		return;
	}
	busy = true;
	statusMessage = "Cooking static environment collision.";
	try {
		const previousRuntimeSceneId = workspace.runtimeSceneId;
		const payload = await fetchJson<{
			readonly workspace: LevelWorkspace;
		}>(
			`${LEVELS_API_PATH}/${encodeURIComponent(workspace.runtimeSceneId)}/collision/cook`,
			{
				method: "POST",
			},
		);
		workspace = payload.workspace;
		selectedRuntimeSceneId = payload.workspace.runtimeSceneId;
		draft = structuredClone(payload.workspace.document);
		savedDraft = structuredClone(payload.workspace.document);
		performanceDraft = structuredClone(payload.workspace.performance);
		savedPerformance = structuredClone(payload.workspace.performance);
		savedNpcPackage = structuredClone(payload.workspace.npcPackage);
		statusMessage = "Cooked static environment collision.";
		reloadGameIfActive(
			previousRuntimeSceneId,
			payload.workspace.runtimeSceneId,
		);
	} catch (error) {
		statusMessage =
			error instanceof Error ? error.message : "Failed to cook collision.";
	} finally {
		busy = false;
	}
}

function addLocalAsset(fileName: string, url: string): void {
	if (!draft) {
		return;
	}
	const assetId = uniqueId(
		draft.assets.local.map((asset) => String(asset.id ?? "")),
		`${assetKindForFile(fileName)}_${slugify(fileName.replace(/\.[^.]+$/, ""))}`,
	);
	updateDocument({
		...draft,
		assets: {
			...draft.assets,
			local: [
				...draft.assets.local,
				{
					id: assetId,
					kind: assetKindForFile(fileName),
					url,
					tags: [],
				},
			],
		},
	});
}

function addInstance(): void {
	if (!draft) {
		return;
	}
	const prefabId =
		draft.prefabs.local[0]?.id ?? draft.prefabs.shared?.[0] ?? "player";
	const id = uniqueId(
		draft.level.instances.map((instance) => String(instance.id ?? "")),
		"new_instance",
	);
	updateDocument({
		...draft,
		level: {
			...draft.level,
			instances: [
				...draft.level.instances,
				{
					id,
					prefabId,
					stableId: id,
					transform: {
						position: [0, 0, 0],
						rotation: [0, 0, 0, 1],
						scale: [1, 1, 1],
					},
				},
			],
		},
	});
}

function addPrefab(): void {
	if (!draft) {
		return;
	}
	const id = uniqueId(
		draft.prefabs.local.map((prefab) => String(prefab.id ?? "")),
		"new_prefab",
	);
	updateDocument({
		...draft,
		prefabs: {
			...draft.prefabs,
			local: [
				...draft.prefabs.local,
				{
					id,
					assetIds: [],
					tags: [],
					components: {
						Transform: {
							position: [0, 0, 0],
							rotation: [0, 0, 0, 1],
							scale: [1, 1, 1],
						},
					},
				},
			],
		},
	});
}

function addAudioMapping(): void {
	if (!draft) {
		return;
	}
	const id = uniqueId(
		draft.audio.eventMappings.map((mapping) => String(mapping.id ?? "")),
		"new_audio_mapping",
	);
	const soundId =
		draft.assets.local.find((asset) => asset.kind === "audio")?.id ??
		draft.assets.shared?.find((assetId) => assetId.startsWith("audio_")) ??
		"audio_player_jump";
	updateDocument({
		...draft,
		audio: {
			...draft.audio,
			eventMappings: [
				...draft.audio.eventMappings,
				{
					id,
					eventType: "EntityJumpRequested",
					soundId,
					volume: 0.2,
					sceneId: draft.level.sceneId ?? "",
				},
			],
		},
	});
}

function addRenderLight(): void {
	if (!draft) {
		return;
	}
	const renderProfile = structuredClone(draft.renderProfile);
	const lighting = toRecord(renderProfile.lighting);
	const lights = Array.isArray(lighting.lights) ? lighting.lights : [];
	renderProfile.lighting = {
		...lighting,
		lights: [
			...lights,
			{
				kind: "ambient",
				color: "#ffffff",
				intensity: 0.2,
			},
		],
	};
	updateDocument({
		...draft,
		renderProfile,
	});
}

function updateRenderLightField(
	index: number,
	key: string,
	value: JsonValue,
): void {
	if (!draft) {
		return;
	}
	const renderProfile = structuredClone(draft.renderProfile);
	const lighting = toRecord(renderProfile.lighting);
	const lights = Array.isArray(lighting.lights)
		? ([...lighting.lights] as JsonValue[])
		: [];
	const current = toRecord(lights[index]);
	lights[index] = { ...current, [key]: value };
	renderProfile.lighting = {
		...lighting,
		lights,
	};
	updateDocument({
		...draft,
		renderProfile,
	});
}

function updateRenderLightPosition(
	index: number,
	axisIndex: number,
	value: number,
): void {
	const light = renderLightRows[index]?.light;
	const position = vector3Value(light?.position, [0, 1, 0]);
	position[axisIndex] = value;
	updateRenderLightField(index, "position", position);
}

function updatePlayerSpawnPosition(axisIndex: number, value: number): void {
	if (!draft) {
		return;
	}
	const player = toRecord(draft.player);
	const transform = toRecord(player.transform);
	const position = vector3Value(transform.position, [0, 0, 0]);
	position[axisIndex] = value;
	updateDocument({
		...draft,
		player: {
			...player,
			transform: {
				...transform,
				position,
			},
		},
	});
}

function updatePlayerGroundY(value: number): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		player: {
			...toRecord(draft.player),
			groundY: value,
		},
	});
}

function updatePlayerFacingDegrees(
	key: "yawRadians" | "pitchRadians",
	value: number,
): void {
	if (!draft) {
		return;
	}
	const player = toRecord(draft.player);
	const firstPersonController = toRecord(player.firstPersonController);
	updateDocument({
		...draft,
		player: {
			...player,
			firstPersonController: {
				...firstPersonController,
				[key]: degreesToRadians(value),
			},
		},
	});
}

function updatePlayerLightField(key: string, value: JsonValue): void {
	if (!draft) {
		return;
	}
	const player = toRecord(draft.player);
	const light = toRecord(player.light);
	updateDocument({
		...draft,
		player: {
			...player,
			light: {
				...light,
				[key]: value,
			},
		},
	});
}

function createPlayerLightOverride(): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		player: {
			...toRecord(draft.player),
			light: structuredClone(DEFAULT_LEVEL_PLAYER_LIGHT),
		},
	});
	statusMessage = "Created level player light override.";
}

function updateEntityLightField(
	owner: EntityLightRow["owner"],
	index: number,
	key: string,
	value: JsonValue,
	groupIndex?: number,
): void {
	if (!draft) {
		return;
	}
	if (owner === "npc-instance") {
		updateNpcInstanceLightField(groupIndex, index, key, value);
		return;
	}
	const section =
		owner === "prefab" ? draft.prefabs.local : draft.level.instances;
	const nextSection = section.map((entry, entryIndex) => {
		if (entryIndex !== index) {
			return entry;
		}
		const components = toRecord(entry.components);
		const light = toRecord(components.Light);
		return {
			...entry,
			components: {
				...components,
				Light: {
					...light,
					[key]: value,
				},
			},
		};
	});
	if (owner === "prefab") {
		updateDocument({
			...draft,
			prefabs: {
				...draft.prefabs,
				local: nextSection,
			},
		});
		return;
	}
	updateDocument({
		...draft,
		level: {
			...draft.level,
			instances: nextSection,
		},
	});
}

function updateNpcInstanceLightField(
	groupIndex: number | undefined,
	instanceIndex: number,
	key: string,
	value: JsonValue,
): void {
	updateNpcInstanceRecordField(groupIndex, instanceIndex, "light", key, value);
}

function updateNpcInstanceField(
	groupIndex: number | undefined,
	instanceIndex: number,
	key: string,
	value: JsonValue,
): void {
	if (!workspace || groupIndex === undefined) {
		return;
	}
	const groups = workspace.npcPackage.groups.map((group, currentGroupIndex) => {
		if (currentGroupIndex !== groupIndex) {
			return group;
		}
		const instances = Array.isArray(group.data.instances)
			? group.data.instances
			: [];
		return {
			...group,
			data: {
				...group.data,
				instances: instances.map((instance, currentInstanceIndex) => {
					if (
						currentInstanceIndex !== instanceIndex ||
						!hasRecordValue(instance)
					) {
						return instance;
					}
					return {
						...instance,
						[key]: value,
					};
				}) as JsonValue[],
			},
		};
	});
	workspace = {
		...workspace,
		npcPackage: {
			...workspace.npcPackage,
			groups,
		},
	};
}

function updateNpcInstanceRecordField(
	groupIndex: number | undefined,
	instanceIndex: number,
	recordKey: string,
	key: string,
	value: JsonValue,
): void {
	const instance = npcInstanceAt(groupIndex, instanceIndex);
	if (!instance) {
		return;
	}
	updateNpcInstanceField(groupIndex, instanceIndex, recordKey, {
		...toRecord(instance[recordKey]),
		[key]: value,
	});
}

function npcInstanceAt(
	groupIndex: number | undefined,
	instanceIndex: number,
): Record<string, JsonValue> | undefined {
	if (!workspace || groupIndex === undefined) {
		return undefined;
	}
	const group = workspace.npcPackage.groups[groupIndex];
	const instances = Array.isArray(group?.data.instances)
		? group.data.instances
		: [];
	const instance = instances[instanceIndex];
	return hasRecordValue(instance) ? instance : undefined;
}

function updateSkybox<K extends keyof LevelPackageDocument["skybox"]>(
	key: K,
	value: LevelPackageDocument["skybox"][K],
): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		skybox: {
			...draft.skybox,
			[key]: value,
		},
	});
}

function updateSkyboxEnvironmentField(key: string, value: JsonValue): void {
	if (!draft) {
		return;
	}
	updateSkybox("environment", {
		...draft.skybox.environment,
		[key]: value,
	});
}

function updateSkyboxEnvironmentKind(kind: string): void {
	if (!draft) {
		return;
	}
	updateSkybox("environment", {
		...defaultEnvironmentForKind(kind),
		...draft.skybox.environment,
		kind,
	});
}

function defaultEnvironmentForKind(kind: string): Record<string, JsonValue> {
	if (kind === "solid-color") {
		return {
			kind,
			color: "#05070c",
			backgroundIntensity: 1,
		};
	}
	if (kind === "procedural-atmosphere") {
		return {
			kind,
			skyColor: "#6aa6ff",
			horizonColor: "#f4d9aa",
			groundColor: "#17202c",
			sunDirection: [0.35, 0.82, 0.18],
			sunColor: "#fff1d0",
			sunIntensity: 1,
			turbidity: 2,
			backgroundIntensity: 1,
			environmentIntensity: 0,
		};
	}
	if (kind === "video-skybox") {
		return {
			kind,
			assetId: "",
			mapping: "equirectangular-360",
			backgroundIntensity: 1,
			backgroundBlurriness: 0,
			environmentIntensity: 0,
			requiredForReadiness: true,
		};
	}
	return {
		kind,
		assetId: "",
		backgroundIntensity: 1,
		backgroundBlurriness: 0,
		environmentIntensity: 1,
		requiredForReadiness: true,
	};
}

function numericField(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function radiansToDegrees(value: number): number {
	return Math.round((value * 180_000) / Math.PI) / 1000;
}

function degreesToRadians(value: number): number {
	return (value * Math.PI) / 180;
}

function readNonNegativeNumberInput(
	input: HTMLInputElement,
	fallback = 0,
): number {
	const value = Number(input.value);
	return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function readAlphaNumberInput(input: HTMLInputElement, fallback = 0): number {
	const value = Number(input.value);
	return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function readFiniteNumberInput(input: HTMLInputElement, fallback = 0): number {
	const value = Number(input.value);
	return Number.isFinite(value) ? value : fallback;
}

function environmentUsesAsset(environment: Record<string, JsonValue>): boolean {
	return (
		environment.kind === "cubemap-skybox" ||
		environment.kind === "equirectangular-environment" ||
		environment.kind === "video-skybox"
	);
}

function updateDocument(nextDocument: LevelPackageDocument): void {
	draft = nextDocument;
}

function updateSection<K extends keyof LevelPackageDocument>(
	section: K,
	value: JsonValue,
): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		[section]: value,
	} as LevelPackageDocument);
}

function updateRuntimeScene<
	K extends keyof LevelPackageDocument["runtimeScene"],
>(key: K, value: LevelPackageDocument["runtimeScene"][K]): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		runtimeScene: {
			...draft.runtimeScene,
			[key]: value,
		},
	});
}

function updateLevel<K extends keyof LevelPackageDocument["level"]>(
	key: K,
	value: LevelPackageDocument["level"][K],
): void {
	if (!draft) {
		return;
	}
	updateDocument({
		...draft,
		level: {
			...draft.level,
			[key]: value,
		},
	});
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...init,
		headers: {
			Accept: "application/json",
			...(init?.headers ?? {}),
		},
	});
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		throw new Error(
			"Level editor dev API is unavailable. Restart the game dev server so the editor middleware is loaded.",
		);
	}
	const payload = await response.json();
	if (!response.ok) {
		throw new Error(payload.error ?? `Request failed: ${response.status}`);
	}
	return payload as T;
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== "string") {
				reject(new Error("File upload did not produce text data."));
				return;
			}
			resolve(result.split(",")[1] ?? "");
		};
		reader.readAsDataURL(file);
	});
}

function commitActiveEditorField(): void {
	const active = document.activeElement;
	if (
		active instanceof HTMLInputElement ||
		active instanceof HTMLSelectElement ||
		active instanceof HTMLTextAreaElement
	) {
		active.blur();
	}
}

function assetKindForFile(fileName: string): string {
	const lowerName = fileName.toLowerCase();
	if (lowerName.endsWith(".glb") || lowerName.endsWith(".gltf")) {
		return "mesh";
	}
	if (
		lowerName.endsWith(".mp3") ||
		lowerName.endsWith(".wav") ||
		lowerName.endsWith(".ogg")
	) {
		return "audio";
	}
	if (lowerName.endsWith(".webm")) {
		return "video";
	}
	if (lowerName.endsWith(".json")) {
		return "data";
	}
	return "texture";
}

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_+|_+$/g, "") || "asset"
	);
}

function uniqueId(existingIds: readonly string[], preferredId: string): string {
	const existing = new Set(existingIds);
	if (!existing.has(preferredId)) {
		return preferredId;
	}
	let index = 2;
	while (existing.has(`${preferredId}_${index}`)) {
		index += 1;
	}
	return `${preferredId}_${index}`;
}

function toRecord(value: unknown): Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, JsonValue>)
		: {};
}

function hasRecordValue(value: unknown): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundsLabel(bounds: Record<string, JsonValue>): string {
	const min = Array.isArray(bounds.min) ? bounds.min : [];
	const max = Array.isArray(bounds.max) ? bounds.max : [];
	if (min.length < 3 || max.length < 3) {
		return "none";
	}
	return `x ${String(min[0])}..${String(max[0])}, y ${String(min[1])}..${String(max[1])}, z ${String(min[2])}..${String(max[2])}`;
}

function boundsCoverageLabel(
	sourceBounds: Record<string, JsonValue>,
	collisionBounds: Record<string, JsonValue>,
	sampleSpacingMeters: number,
): string {
	const sourceMin = vector3(sourceBounds.min);
	const sourceMax = vector3(sourceBounds.max);
	const collisionMin = vector3(collisionBounds.min);
	const collisionMax = vector3(collisionBounds.max);

	if (!sourceMin || !sourceMax || !collisionMin || !collisionMax) {
		return "none";
	}

	const gap = Math.max(
		Math.max(0, collisionMin[0] - sourceMin[0]),
		Math.max(0, sourceMax[0] - collisionMax[0]),
		Math.max(0, collisionMin[2] - sourceMin[2]),
		Math.max(0, sourceMax[2] - collisionMax[2]),
	);
	const tolerance = sampleSpacingMeters > 0 ? sampleSpacingMeters * 1.25 : 0;
	const roundedGap = Math.round(gap * 100) / 100;
	const roundedTolerance = Math.round(tolerance * 100) / 100;
	const status =
		tolerance > 0 && gap <= tolerance
			? "within tolerance"
			: "outside tolerance";
	return `${roundedGap}m max X/Z gap (${status}, ${roundedTolerance}m)`;
}

function vector3(
	value: JsonValue | undefined,
): readonly [number, number, number] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	const x = Number(value[0]);
	const y = Number(value[1]);
	const z = Number(value[2]);
	return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)
		? [x, y, z]
		: undefined;
}

function renderProfileLightRows(
	document: LevelPackageDocument | undefined,
): readonly EntityLightRow[] {
	if (!document) {
		return [];
	}
	const lighting = toRecord(document.renderProfile.lighting);
	const lights = Array.isArray(lighting.lights) ? lighting.lights : [];
	return lights.map((light, index) => {
		const record = toRecord(light);
		const kind = String(record.kind ?? "light");
		return {
			key: `render:${index}`,
			owner: "prefab",
			index,
			label: `${kind} ${index + 1}`,
			sourcePath: `data.json -> renderProfile.lighting.lights[${index}]`,
			light: record,
		};
	});
}

function entityLightRows(
	entries: readonly Record<string, JsonValue>[],
	owner: EntityLightRow["owner"],
): readonly EntityLightRow[] {
	return entries.flatMap((entry, index) => {
		const components = toRecord(entry.components);
		if (!hasRecordValue(components.Light)) {
			return [];
		}
		const labelId =
			String(entry.stableId ?? entry.id ?? `${owner}_${index + 1}`) ||
			`${owner}_${index + 1}`;
		return [
			{
				key: `${owner}:${index}:${labelId}`,
				owner,
				index,
				label: labelId,
				sourcePath:
					owner === "prefab"
						? `data.json -> prefabs.local[${index}].components.Light`
						: `data.json -> level.instances[${index}].components.Light`,
				light: components.Light,
			},
		];
	});
}

function npcGroupLightRows(
	groups: readonly LevelNpcSourceFile[],
	archetypes: readonly LevelNpcSourceFile[],
): readonly EntityLightRow[] {
	const archetypesById = new Map(
		archetypes.map((archetype) => [
			String(archetype.data.id ?? ""),
			archetype.data,
		]),
	);
	return groups.flatMap((group, groupIndex) => {
		const archetype = archetypesById.get(String(group.data.archetype ?? ""));
		const defaults = toRecord(toRecord(archetype?.defaults).light);
		const instances = Array.isArray(group.data.instances)
			? group.data.instances
			: [];
		return instances.flatMap((instance, index) => {
			if (!hasRecordValue(instance)) {
				return [];
			}
			const light = {
				...defaults,
				...toRecord(instance.light),
			};
			if (!hasRecordValue(light) || Object.keys(light).length === 0) {
				return [];
			}
			const labelId =
				String(instance.stableId ?? instance.id ?? `npc_${index + 1}`) ||
				`npc_${index + 1}`;
			return [
				{
					key: `npc-instance:${groupIndex}:${index}:${labelId}`,
					owner: "npc-instance",
					groupIndex,
					index,
					label: labelId,
					sourcePath: `${group.name} -> instances[${index}].light`,
					light,
				},
			];
		});
	});
}

function npcGroupInstances(
	group: LevelNpcSourceFile,
): readonly Record<string, JsonValue>[] {
	return Array.isArray(group.data.instances)
		? group.data.instances.filter(hasRecordValue)
		: [];
}

function levelMaterialEmissionRows(
	document: LevelPackageDocument | undefined,
): readonly MaterialEmissionRow[] {
	if (!document) {
		return [];
	}
	return document.assets.local.flatMap((asset, index) => {
		const material = toRecord(asset.material);
		const emissiveIntensity = numericField(material.emissiveIntensity);
		if (
			String(asset.kind ?? "") !== "material" ||
			(!material.emissive && emissiveIntensity <= 0)
		) {
			return [];
		}
		const label = String(asset.id ?? `material_${index + 1}`);
		return [
			{
				key: `material:${index}:${label}`,
				label,
				sourcePath: `data.json -> assets.local[${index}].material`,
				color: String(material.color ?? ""),
				emissive: String(material.emissive ?? ""),
				emissiveIntensity,
			},
		];
	});
}

function vector3Value(
	value: unknown,
	fallback: readonly [number, number, number],
): [number, number, number] {
	if (!Array.isArray(value)) {
		return [...fallback];
	}
	return [
		numericField(value[0], fallback[0]),
		numericField(value[1], fallback[1]),
		numericField(value[2], fallback[2]),
	];
}

function numberTuple2(
	value: unknown,
	fallback: readonly [number, number],
): [number, number] {
	if (!Array.isArray(value)) {
		return [...fallback];
	}
	return [
		numericField(value[0], fallback[0]),
		numericField(value[1], fallback[1]),
	];
}
</script>

<svelte:head>
	<title>Level Editor</title>
</svelte:head>

<main class="level-editor-shell">
	<header class="workspace-header">
		<a href="/editor/">Master Control</a>
		<div>
			<p>Level Editor</p>
			<h1>{draft?.level.id ?? "No level selected"}</h1>
		</div>
		<label>
			<span>Level</span>
			<select
				value={selectedRuntimeSceneId}
				disabled={busy || levels.length === 0}
				onchange={(event) => void loadLevel(event.currentTarget.value)}
			>
				{#each levels as level}
					<option value={level.runtimeSceneId}>
						{level.levelId} ({level.runtimeSceneId})
					</option>
				{/each}
			</select>
		</label>
	</header>

	<section class="workspace-grid" aria-label="Level editor workspace">
		<aside class="level-summary" aria-label="Level summary">
			<h2>Summary</h2>
			<dl>
				<div>
					<dt>Runtime Scene</dt>
					<dd>{draft?.runtimeScene.id ?? "none"}</dd>
				</div>
				<div>
					<dt>Scene ID</dt>
					<dd>{draft?.level.sceneId ?? "none"}</dd>
				</div>
				<div>
					<dt>Instances</dt>
					<dd>{selectedInstanceCount}</dd>
				</div>
				<div>
					<dt>Local Assets</dt>
					<dd>{localAssetCount}</dd>
				</div>
				<div>
					<dt>Local Prefabs</dt>
					<dd>{localPrefabCount}</dd>
				</div>
				<div>
					<dt>NPC Groups</dt>
					<dd>{npcGroupCount}</dd>
				</div>
				<div>
					<dt>NPC Instances</dt>
					<dd>{npcInstanceCount}</dd>
				</div>
				<div>
					<dt>Live Game</dt>
					<dd>{liveSnapshot?.activeRuntimeSceneId ?? "not connected"}</dd>
				</div>
				<div>
					<dt>Folder</dt>
					<dd>{workspace?.folderPath ?? "none"}</dd>
				</div>
			</dl>

			<section class="item-info" aria-label="Selected section information">
				<div>
					<p>Item Info</p>
					<h2>{activeTab}</h2>
				</div>
				<p>{activeTabInfo.summary}</p>
				<dl>
					{#each activeTabInfo.fields as field}
						<div>
							<dt>{field.label}</dt>
							<dd>{field.description}</dd>
						</div>
					{/each}
				</dl>
			</section>

			<div class="save-panel">
				<button
					type="button"
					disabled={!workspace || busy || !dirty}
					onclick={() => void saveLevel()}
				>
					Save
				</button>
				<button
					type="button"
					disabled={!workspace || busy}
					onclick={() => workspace && void loadLevel(workspace.runtimeSceneId)}
				>
					Revert
				</button>
				<p>{statusMessage}</p>
			</div>

			{#if workspace?.diagnostics.length}
				<div class="diagnostics">
					<h2>Diagnostics</h2>
					{#each workspace.diagnostics as diagnostic}
						<p>{diagnostic}</p>
					{/each}
				</div>
			{/if}
		</aside>

		<section class="editor-panel" aria-label="Level data sections">
			<nav class="file-tabs" aria-label="Level editor tabs">
				{#each tabs as tab}
					<button
						type="button"
						class:active={activeTab === tab}
						onclick={() => (activeTab = tab)}
					>
						{tab}
					</button>
				{/each}
			</nav>

			{#if draft}
				<div class="section-panel">
					{#if activeTab === "Overview"}
						<div class="overview-form">
							<label>
								<span>Package ID</span>
								<input
									value={draft.id}
									disabled={busy}
									oninput={(event) =>
										updateDocument({ ...draft, id: event.currentTarget.value })}
								/>
							</label>
							<label>
								<span>Level ID</span>
								<input
									value={draft.level.id}
									disabled={busy}
									oninput={(event) => updateLevel("id", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Scene ID</span>
								<input
									value={draft.level.sceneId ?? ""}
									disabled={busy}
									oninput={(event) =>
										updateLevel("sceneId", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Runtime Scene ID</span>
								<input
									value={draft.runtimeScene.id}
									disabled={busy}
									oninput={(event) =>
										updateRuntimeScene("id", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Source ID</span>
								<input
									value={draft.runtimeScene.source.id}
									disabled={busy}
									oninput={(event) =>
										updateRuntimeScene("source", {
											...draft.runtimeScene.source,
											id: event.currentTarget.value,
										})}
								/>
							</label>
							<label>
								<span>Source Kind</span>
								<select
									value={draft.runtimeScene.source.kind}
									disabled={busy}
									onchange={(event) =>
										updateRuntimeScene("source", {
											...draft.runtimeScene.source,
											kind: event.currentTarget.value as "prototype" | "authored" | "cook",
										})}
								>
									<option value="prototype">prototype</option>
									<option value="authored">authored</option>
									<option value="cook">cook</option>
								</select>
							</label>
						</div>
					{:else if activeTab === "Manifest"}
						<StructuredValueEditor
							value={draft.runtimeScene as JsonValue}
							label="Runtime Scene Manifest"
							disabled={busy}
							onChange={(value) => updateSection("runtimeScene", value)}
						/>
					{:else if activeTab === "Player"}
						<div class="player-workbench">
							<div class="section-actions">
								<button
									type="button"
									disabled={!workspace || busy}
									onclick={() => void saveLevel("player")}
								>
									Save Player
								</button>
							</div>

							<section class="lighting-group" aria-label="Player spawn">
								<div class="lighting-group-header">
									<div>
										<p>Player Spawn</p>
										<h2>Position And Grounding</h2>
									</div>
								</div>
								<div class="lighting-fields">
									{#each playerSpawnPosition as positionValue, axisIndex}
										<label>
											<span>Position {["X", "Y", "Z"][axisIndex]}</span>
											<input
												type="number"
												step="0.1"
												value={positionValue}
												disabled={busy}
												oninput={(event) =>
													updatePlayerSpawnPosition(
														axisIndex,
														readFiniteNumberInput(event.currentTarget),
													)}
											/>
										</label>
									{/each}
									<label>
										<span>Ground Y</span>
										<input
											type="number"
											step="0.1"
											value={numericField(playerConfig.groundY)}
											disabled={busy}
											oninput={(event) =>
												updatePlayerGroundY(
													readFiniteNumberInput(event.currentTarget),
												)}
										/>
									</label>
								</div>
							</section>

							<section class="lighting-group" aria-label="Player facing">
								<div class="lighting-group-header">
									<div>
										<p>Player Facing</p>
										<h2>Initial Camera Direction</h2>
									</div>
									<span class="lighting-badge">degrees</span>
								</div>
								<div class="lighting-fields">
									<label>
										<span>Yaw</span>
										<input
											type="number"
											step="1"
											value={playerYawDegrees}
											disabled={busy}
											oninput={(event) =>
												updatePlayerFacingDegrees(
													"yawRadians",
													readFiniteNumberInput(event.currentTarget),
												)}
										/>
									</label>
									<label>
										<span>Pitch</span>
										<input
											type="number"
											step="1"
											value={playerPitchDegrees}
											disabled={busy}
											oninput={(event) =>
												updatePlayerFacingDegrees(
													"pitchRadians",
													readFiniteNumberInput(event.currentTarget),
												)}
										/>
									</label>
								</div>
							</section>

							<section class="lighting-group" aria-label="Player level light">
								<div class="lighting-group-header">
									<div>
										<p>Player Light</p>
										<h2>Level-Owned Lighting</h2>
									</div>
									{#if hasPlayerLightOverride}
										<span class="lighting-badge">data.json</span>
									{:else}
										<button
											type="button"
											disabled={busy}
											onclick={createPlayerLightOverride}
										>
											Create Level Light
										</button>
									{/if}
								</div>
								<article class="lighting-source" class:readonly-source={!hasPlayerLightOverride}>
									<div class="lighting-source-header">
										<div>
											<h3>
												{hasPlayerLightOverride ? "Level Player Light" : "No Level Player Light"}
											</h3>
											<p>
												{hasPlayerLightOverride
													? "data.json -> player.light"
													: "Create a level-owned player.light entry to edit these values."}
											</p>
										</div>
										<span class="lighting-badge">
											{hasPlayerLightOverride ? "editable" : "not set"}
										</span>
									</div>
									<div class="lighting-fields">
										<label>
											<span>Color</span>
											<input
												type="color"
												value={String(playerLight.color ?? "#ffffff")}
												disabled={busy || !hasPlayerLightOverride}
												oninput={(event) =>
													updatePlayerLightField("color", event.currentTarget.value)}
											/>
										</label>
										<label>
											<span>Intensity</span>
											<input
												type="number"
												min="0"
												step="0.01"
												value={numericField(playerLight.intensity)}
												disabled={busy || !hasPlayerLightOverride}
												oninput={(event) =>
													updatePlayerLightField(
														"intensity",
														readNonNegativeNumberInput(event.currentTarget),
													)}
											/>
										</label>
										<label>
											<span>Distance</span>
											<input
												type="number"
												min="0"
												step="0.1"
												value={numericField(playerLight.distance)}
												disabled={busy || !hasPlayerLightOverride}
												oninput={(event) =>
													updatePlayerLightField(
														"distance",
														readNonNegativeNumberInput(event.currentTarget),
													)}
											/>
										</label>
										<label>
											<span>Decay</span>
											<input
												type="number"
												min="0"
												step="0.1"
												value={numericField(playerLight.decay)}
												disabled={busy || !hasPlayerLightOverride}
												oninput={(event) =>
													updatePlayerLightField(
														"decay",
														readNonNegativeNumberInput(event.currentTarget),
													)}
											/>
										</label>
										<label class="checkbox-control">
											<input
												type="checkbox"
												checked={playerLight.visible !== false}
												disabled={busy || !hasPlayerLightOverride}
												onchange={(event) =>
													updatePlayerLightField("visible", event.currentTarget.checked)}
											/>
											<span>Visible</span>
										</label>
									</div>
								</article>
							</section>
						</div>
					{:else if activeTab === "Resources"}
						<StructuredValueEditor
							value={(draft.level.resources ?? {}) as JsonValue}
							label="Level Resources"
							disabled={busy}
							onChange={(value) =>
								updateLevel("resources", value as Record<string, JsonValue>)}
						/>
					{:else if activeTab === "Instances"}
						<div class="section-actions">
							<button type="button" disabled={busy} onclick={addInstance}>
								Add Instance
							</button>
						</div>
						<StructuredValueEditor
							value={draft.level.instances as JsonValue}
							label="Placed Instances"
							disabled={busy}
							onChange={(value) =>
								updateLevel("instances", value as Record<string, JsonValue>[])}
						/>
					{:else if activeTab === "Prefabs"}
						<div class="section-actions">
							<button type="button" disabled={busy} onclick={addPrefab}>
								Add Prefab
							</button>
						</div>
						<StructuredValueEditor
							value={draft.prefabs as JsonValue}
							label="Prefab Library"
							disabled={busy}
							onChange={(value) => updateSection("prefabs", value)}
						/>
					{:else if activeTab === "Assets"}
						<div class="section-actions">
							<label class="upload-control">
								<span>Upload Asset</span>
								<input type="file" disabled={busy} onchange={uploadAsset} />
							</label>
							<p>{uploadMessage}</p>
						</div>
						<StructuredValueEditor
							value={draft.assets as JsonValue}
							label="Asset Manifest"
							disabled={busy}
							onChange={(value) => updateSection("assets", value)}
						/>
					{:else if activeTab === "Collision"}
						<div class="collision-summary">
							<div class="section-actions">
								<button type="button" disabled={!workspace || busy} onclick={checkCollisionCook}>
									Check Generated Collision
								</button>
								<button type="button" disabled={!workspace || busy} onclick={cookCollision}>
									Cook Static Collision
								</button>
								<p>
									{collisionDiagnostics?.message ??
										"No static environment collision diagnostics are available."}
								</p>
							</div>
							<section class="lighting-group" aria-label="Static environment collision source">
								<div class="lighting-group-header">
									<div>
										<p>Static Environment Source</p>
										<h2>{String(collisionSource?.mode ?? "none")}</h2>
									</div>
									<span class="lighting-badge">{collisionQualityLabel}</span>
								</div>
								<dl class="editor-facts">
									<div>
										<dt>Visual Asset</dt>
										<dd>{String(collisionSource?.visualAssetId ?? "none")}</dd>
									</div>
									<div>
										<dt>Visual URL</dt>
										<dd>{String(collisionSource?.visualAssetUrl ?? "none")}</dd>
									</div>
									<div>
										<dt>Profile</dt>
										<dd>{String(collisionSettings.profile ?? "none")}</dd>
									</div>
									<div>
										<dt>Chunk Size</dt>
										<dd>{String(collisionSettings.chunkSizeMeters ?? "none")}</dd>
									</div>
									<div>
										<dt>Sample Spacing</dt>
										<dd>{String(collisionSettings.sampleSpacingMeters ?? "none")}</dd>
									</div>
									<div>
										<dt>Collision Asset</dt>
										<dd>{String(collisionSource?.collisionAssetUrl ?? "automatic visual GLB")}</dd>
									</div>
								</dl>
							</section>

							<section class="lighting-group" aria-label="Static environment collision product">
								<div class="lighting-group-header">
									<div>
										<p>Generated Collision Product</p>
										<h2>{String(collisionSummary.chunkCount ?? 0)} Chunks</h2>
									</div>
									<span class="lighting-badge">{collisionIsStale ? "stale" : String(collisionDiagnostics?.status ?? "generated")}</span>
								</div>
								<dl class="editor-facts">
									<div>
										<dt>Collision Triangles</dt>
										<dd>{String(collisionSummary.triangleCount ?? 0)}</dd>
									</div>
									<div>
										<dt>Source Triangles</dt>
										<dd>{String(collisionSummary.sourceTriangleCount ?? 0)}</dd>
									</div>
									<div>
										<dt>Walkable Triangles</dt>
										<dd>{String(collisionSummary.walkableTriangleCount ?? "none")}</dd>
									</div>
									<div>
										<dt>Collision Ratio</dt>
										<dd>{collisionCompressionRatio}</dd>
									</div>
									<div>
										<dt>Sampled Points</dt>
										<dd>{String(collisionSummary.sampledPointCount ?? 0)}</dd>
									</div>
									<div>
										<dt>Meters / Sample</dt>
										<dd>{String(collisionSummary.metersPerSample ?? "none")}</dd>
									</div>
									<div>
										<dt>Source Bounds</dt>
										<dd>{sourceBoundsLabel}</dd>
									</div>
									<div>
										<dt>Walkable Bounds</dt>
										<dd>{walkableBoundsLabel}</dd>
									</div>
									<div>
										<dt>Collision Bounds</dt>
										<dd>{collisionBoundsLabel}</dd>
									</div>
									<div>
										<dt>Bounds Coverage</dt>
										<dd>{collisionBoundsCoverageLabel}</dd>
									</div>
									<div>
										<dt>Source Hash</dt>
										<dd>{String(collisionGeneratedSource.sourceHash ?? "none")}</dd>
									</div>
									<div>
										<dt>Current Hash</dt>
										<dd>{String(collisionDiagnostics?.currentSourceHash ?? "none")}</dd>
									</div>
									<div>
										<dt>Generated At</dt>
										<dd>{String(collisionDiagnostics?.generatedAt ?? "none")}</dd>
									</div>
								</dl>
							</section>
						</div>
					{:else if activeTab === "Performance"}
						<div class="performance-form">
							<div class="section-actions">
								<button
									type="button"
									disabled={!workspace || busy || !performanceChanged()}
									onclick={() => void saveLevel("performance")}
								>
									Save Performance
								</button>
								<p>
									{workspace?.folderPath ?? "No level selected"}/performance.json
								</p>
							</div>
							{#if performanceDraft}
								<section class="lighting-group" aria-label="Performance systems">
									<div class="lighting-group-header">
										<div>
											<p>Performance Config</p>
											<h2>Runtime Systems</h2>
										</div>
										<span class="lighting-badge">level-owned</span>
									</div>
									<PerformanceConfigEditor
										value={performanceDraft}
										disabled={busy}
										onChange={(value) => {
											performanceDraft = value;
										}}
									/>
								</section>
							{:else}
								<p class="settings-message">
									Performance config is not loaded for this level.
								</p>
							{/if}
						</div>
					{:else if activeTab === "Audio"}
						<div class="section-actions">
							<button type="button" disabled={busy} onclick={addAudioMapping}>
								Add Mapping
							</button>
						</div>
						<StructuredValueEditor
							value={draft.audio as JsonValue}
							label="Audio Content"
							disabled={busy}
							onChange={(value) => updateSection("audio", value)}
						/>
						{:else if activeTab === "Skybox"}
							<div class="skybox-form">
								<label>
								<span>Environment Kind</span>
								<select
									value={String(skyboxEnvironment.kind ?? "cubemap-skybox")}
									disabled={busy}
									onchange={(event) =>
										updateSkyboxEnvironmentKind(event.currentTarget.value)}
								>
									<option value="cubemap-skybox">cubemap-skybox</option>
									<option value="equirectangular-environment"
										>equirectangular-environment</option
									>
									<option value="video-skybox">video-skybox</option>
									<option value="procedural-atmosphere"
										>procedural-atmosphere</option
									>
									<option value="solid-color">solid-color</option>
								</select>
							</label>

							{#if environmentUsesAsset(skyboxEnvironment)}
								<label>
									<span>Skybox Asset ID</span>
									<input
										list="skybox-asset-options"
										value={String(skyboxEnvironment.assetId ?? "")}
										disabled={busy}
										oninput={(event) =>
											updateSkyboxEnvironmentField(
												"assetId",
												event.currentTarget.value,
											)}
									/>
									<datalist id="skybox-asset-options">
										{#each skyboxAssetOptions as assetId}
											<option value={assetId}></option>
										{/each}
									</datalist>
								</label>
							{/if}

							<label>
								<span>Background Intensity</span>
								<input
									type="number"
									min="0"
									step="0.01"
									value={numericField(skyboxEnvironment.backgroundIntensity, 1)}
									disabled={busy}
									oninput={(event) =>
											updateSkyboxEnvironmentField(
												"backgroundIntensity",
												readNonNegativeNumberInput(event.currentTarget),
											)}
								/>
							</label>

							<label>
								<span>Background Blur</span>
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									value={numericField(skyboxEnvironment.backgroundBlurriness)}
									disabled={busy}
									oninput={(event) =>
											updateSkyboxEnvironmentField(
												"backgroundBlurriness",
												readNonNegativeNumberInput(event.currentTarget),
											)}
								/>
							</label>

							<label>
								<span>Environment Lighting Intensity</span>
								<input
									type="number"
									min="0"
									step="0.01"
									value={numericField(skyboxEnvironment.environmentIntensity)}
									disabled={busy}
									oninput={(event) =>
											updateSkyboxEnvironmentField(
												"environmentIntensity",
												readNonNegativeNumberInput(event.currentTarget),
											)}
								/>
							</label>

							{#if environmentUsesAsset(skyboxEnvironment)}
								<label class="checkbox-control">
									<input
										type="checkbox"
										checked={skyboxEnvironment.requiredForReadiness !== false}
										disabled={busy}
										onchange={(event) =>
											updateSkyboxEnvironmentField(
												"requiredForReadiness",
												event.currentTarget.checked,
											)}
									/>
									<span>Require sky media before play</span>
								</label>
							{/if}
						</div>

						<StructuredValueEditor
							value={(draft.skybox.assets ?? {}) as JsonValue}
							label="Skybox Asset Loading"
							disabled={busy}
							onChange={(value) =>
								updateSkybox("assets", value as LevelPackageDocument["skybox"]["assets"])}
						/>
						<StructuredValueEditor
							value={(draft.skybox.planned ?? {}) as JsonValue}
							label="Planned Skybox Features"
							disabled={busy}
							onChange={(value) =>
								updateSkybox(
									"planned",
									value as LevelPackageDocument["skybox"]["planned"],
									)}
							/>
						{:else if activeTab === "NPCs"}
							{#if workspace}
								<NpcEditorPanel
									npcPackage={workspace.npcPackage}
									disabled={busy}
									onChange={updateNpcPackage}
									onSave={(label) => void saveLevel(label)}
								/>
							{:else}
								<p class="empty-state">No level selected.</p>
							{/if}
						{:else if activeTab === "Lighting"}
							<div class="lighting-workbench">
								<section class="lighting-group" aria-label="Level ambience">
									<div class="lighting-group-header">
										<div>
											<p>Level Ambience</p>
											<h2>Render Profile Lights</h2>
										</div>
										<button type="button" disabled={busy} onclick={addRenderLight}>
											Add Ambience Light
										</button>
									</div>
									{#if renderLightRows.length}
										{#each renderLightRows as row (row.key)}
											<article class="lighting-source">
												<div class="lighting-source-header">
													<div>
														<h3>{row.label}</h3>
														<p>{row.sourcePath}</p>
													</div>
														<button
															type="button"
															disabled={!workspace || busy}
															onclick={() => void saveLevel(row.label)}
														>
														Save
													</button>
												</div>
												<div class="lighting-fields">
													<label>
														<span>Kind</span>
														<select
															value={String(row.light.kind ?? "ambient")}
															disabled={busy}
															onchange={(event) =>
																updateRenderLightField(
																	row.index,
																	"kind",
																	event.currentTarget.value,
																)}
														>
															<option value="ambient">ambient</option>
															<option value="directional">directional</option>
														</select>
													</label>
													<label>
														<span>Color</span>
														<input
															type="color"
															value={String(row.light.color ?? "#ffffff")}
															disabled={busy}
															oninput={(event) =>
																updateRenderLightField(
																	row.index,
																	"color",
																	event.currentTarget.value,
																)}
														/>
													</label>
													<label>
														<span>Intensity</span>
														<input
															type="number"
															min="0"
															step="0.01"
															value={numericField(row.light.intensity)}
															disabled={busy}
																oninput={(event) =>
																	updateRenderLightField(
																		row.index,
																		"intensity",
																		readNonNegativeNumberInput(event.currentTarget),
																	)}
																onchange={(event) =>
																	updateRenderLightField(
																		row.index,
																		"intensity",
																		readNonNegativeNumberInput(event.currentTarget),
																	)}
															/>
													</label>
													{#if row.light.kind === "directional"}
														{#each vector3Value(row.light.position, [0, 1, 0]) as positionValue, axisIndex}
															<label>
																<span>Position {["X", "Y", "Z"][axisIndex]}</span>
																<input
																	type="number"
																	step="0.1"
																	value={positionValue}
																	disabled={busy}
																	oninput={(event) =>
																		updateRenderLightPosition(
																			row.index,
																			axisIndex,
																			readFiniteNumberInput(event.currentTarget),
																		)}
																/>
															</label>
														{/each}
													{/if}
												</div>
											</article>
										{/each}
									{:else}
										<p class="empty-state">No render-profile ambience lights found.</p>
									{/if}
								</section>

								<section class="lighting-group" aria-label="Sky environment lighting">
									<div class="lighting-group-header">
										<div>
											<p>Sky Environment</p>
											<h2>Image-based Lighting</h2>
										</div>
										<button
											type="button"
											disabled={!workspace || busy}
											onclick={() => void saveLevel("sky environment")}
										>
											Save
										</button>
									</div>
									<article class="lighting-source">
										<div class="lighting-source-header">
											<div>
												<h3>{String(skyboxEnvironment.kind ?? "environment")}</h3>
												<p>skybox.json -> environment</p>
											</div>
											<span class="lighting-badge">environment</span>
										</div>
										<div class="lighting-fields">
											<label>
												<span>Background Intensity</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={numericField(skyboxEnvironment.backgroundIntensity, 1)}
													disabled={busy}
													oninput={(event) =>
														updateSkyboxEnvironmentField(
															"backgroundIntensity",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Background Blur</span>
												<input
													type="number"
													min="0"
													max="1"
													step="0.01"
													value={numericField(skyboxEnvironment.backgroundBlurriness)}
													disabled={busy}
													oninput={(event) =>
														updateSkyboxEnvironmentField(
															"backgroundBlurriness",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Environment Intensity</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={numericField(skyboxEnvironment.environmentIntensity)}
													disabled={busy}
													oninput={(event) =>
														updateSkyboxEnvironmentField(
															"environmentIntensity",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
										</div>
									</article>
								</section>

								<section class="lighting-group" aria-label="Authored object lights">
									<div class="lighting-group-header">
										<div>
											<p>Object Lights</p>
											<h2>Local Prefabs, Instances, And NPCs</h2>
										</div>
									</div>
									{#if prefabLightRows.length || instanceLightRows.length || npcLightRows.length}
										{#each [...prefabLightRows, ...instanceLightRows, ...npcLightRows] as row (row.key)}
											<article class="lighting-source">
												<div class="lighting-source-header">
													<div>
														<h3>{row.label}</h3>
														<p>{row.sourcePath}</p>
													</div>
													<button
														type="button"
														disabled={!workspace || busy}
														onclick={() => void saveLevel(row.label)}
													>
														Save
													</button>
												</div>
												<div class="lighting-fields">
													<label>
														<span>Kind</span>
														<select
															value={String(row.light.kind ?? "point")}
															disabled={busy}
															onchange={(event) =>
																updateEntityLightField(
																	row.owner,
																	row.index,
																	"kind",
																	event.currentTarget.value,
																	row.groupIndex,
																)}
														>
															<option value="point">point</option>
															{#if row.owner !== "npc-instance"}
																<option value="ambient">ambient</option>
																<option value="directional">directional</option>
															{/if}
															<option value="spot">spot</option>
														</select>
													</label>
													<label>
														<span>Color</span>
														<input
															type="color"
															value={String(row.light.color ?? "#ffffff")}
															disabled={busy}
															oninput={(event) =>
																updateEntityLightField(
																	row.owner,
																	row.index,
																	"color",
																	event.currentTarget.value,
																	row.groupIndex,
																)}
														/>
													</label>
													<label>
														<span>Intensity</span>
														<input
															type="number"
															min="0"
															step="0.01"
															value={numericField(row.light.intensity)}
															disabled={busy}
															oninput={(event) =>
																updateEntityLightField(
																	row.owner,
																	row.index,
																	"intensity",
																	readNonNegativeNumberInput(event.currentTarget),
																	row.groupIndex,
																)}
														/>
													</label>
													{#if row.light.kind === "point" || row.light.kind === "spot"}
														<label>
															<span>Distance</span>
															<input
																type="number"
																min="0"
																step="0.1"
																value={numericField(row.light.distance)}
																disabled={busy}
																oninput={(event) =>
																	updateEntityLightField(
																	row.owner,
																	row.index,
																	"distance",
																	readNonNegativeNumberInput(event.currentTarget),
																	row.groupIndex,
																)}
														/>
													</label>
													<label>
															<span>Decay</span>
															<input
																type="number"
																min="0"
																step="0.1"
																value={numericField(row.light.decay)}
																disabled={busy}
																oninput={(event) =>
																	updateEntityLightField(
																	row.owner,
																	row.index,
																	"decay",
																	readNonNegativeNumberInput(event.currentTarget),
																	row.groupIndex,
																)}
														/>
													</label>
													{/if}
													<label class="checkbox-control">
														<input
															type="checkbox"
															checked={row.light.visible !== false}
															disabled={busy}
															onchange={(event) =>
																updateEntityLightField(
																	row.owner,
																	row.index,
																	"visible",
																	event.currentTarget.checked,
																	row.groupIndex,
																)}
														/>
														<span>Visible</span>
													</label>
												</div>
											</article>
										{/each}
									{:else}
										<p class="empty-state">No local prefab, instance, or NPC Light components found.</p>
									{/if}
								</section>

								<section class="lighting-group" aria-label="Material emission">
									<div class="lighting-group-header">
										<div>
											<p>Read-only Influence</p>
											<h2>Emissive Materials</h2>
										</div>
									</div>
									{#if materialEmissionRows.length}
										{#each materialEmissionRows as row (row.key)}
											<article class="lighting-source readonly-source">
												<div class="lighting-source-header">
													<div>
														<h3>{row.label}</h3>
														<p>{row.sourcePath}</p>
													</div>
													<span class="lighting-badge">material</span>
												</div>
												<div class="lighting-fields">
													<label>
														<span>Color</span>
														<input value={row.color} disabled />
													</label>
													<label>
														<span>Emissive</span>
														<input value={row.emissive} disabled />
													</label>
													<label>
														<span>Emissive Intensity</span>
														<input value={row.emissiveIntensity} disabled />
													</label>
												</div>
											</article>
										{/each}
									{:else}
										<p class="empty-state">No local emissive materials found.</p>
									{/if}
								</section>
							</div>
						{:else if activeTab === "Render"}
							<div class="section-actions">
								<button type="button" disabled={busy} onclick={addRenderLight}>
								Add Light
							</button>
						</div>
						<StructuredValueEditor
							value={draft.renderProfile as JsonValue}
							label="Render Profile"
							disabled={busy}
							onChange={(value) => updateSection("renderProfile", value)}
						/>
					{:else if activeTab === "Source"}
						<div class="source-selector">
							<label>
								<span>File</span>
								<select
									value={selectedSourceFile}
									onchange={(event) =>
										(selectedSourceFile = event.currentTarget.value)}
								>
									{#each sourceFileOptions as fileTab}
										<option value={fileTab}>{fileTab}</option>
									{/each}
								</select>
							</label>
						</div>
						<div class="file-source">
							<div class="file-source-header">
								<h2>{activeFile?.name ?? selectedSourceFile}</h2>
								<span>{activeFile?.path ?? "No file loaded"}</span>
							</div>
							<pre>{activeFile?.source ?? ""}</pre>
						</div>
					{/if}
				</div>
			{:else}
				<p class="empty-state">{statusMessage}</p>
			{/if}
		</section>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #101319;
		color: #f4f0e8;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
			"Segoe UI", sans-serif;
	}

	button,
	input,
	select {
		font: inherit;
	}

	.level-editor-shell {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr;
		background: #101319;
	}

	.workspace-header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) minmax(16rem, 24rem);
		gap: 1rem;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid rgba(244, 240, 232, 0.14);
		background: rgba(16, 19, 25, 0.94);
	}

	.workspace-header a {
		color: #65d3c8;
		text-decoration: none;
	}

	.workspace-header p,
	.workspace-header h1 {
		margin: 0;
	}

	.workspace-header p {
		color: rgba(244, 240, 232, 0.62);
		text-transform: uppercase;
		font-size: 0.72rem;
	}

	.workspace-header h1 {
		font-size: 1.5rem;
		line-height: 1.05;
	}

	label {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}

	label span,
	dt {
		color: rgba(244, 240, 232, 0.68);
		font-size: 0.78rem;
	}

	input,
	select,
	textarea {
		min-height: 2.25rem;
		box-sizing: border-box;
		border: 1px solid rgba(244, 240, 232, 0.18);
		border-radius: 6px;
		background: rgba(11, 14, 19, 0.92);
		color: #f4f0e8;
		padding: 0 0.65rem;
	}

	textarea {
		min-height: 7rem;
		padding: 0.65rem;
		resize: vertical;
	}

	.workspace-grid {
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
	}

	.level-summary {
		display: grid;
		align-content: start;
		gap: 1.25rem;
		padding: 1rem;
		border-right: 1px solid rgba(244, 240, 232, 0.14);
		background: rgba(13, 16, 21, 0.94);
	}

	.level-summary h2,
	.diagnostics h2 {
		margin: 0;
		font-size: 1rem;
	}

	dl {
		display: grid;
		gap: 0.8rem;
		margin: 0;
	}

	dt {
		margin-bottom: 0.25rem;
		text-transform: uppercase;
	}

	dd {
		margin: 0;
		overflow-wrap: anywhere;
		line-height: 1.35;
	}

	.save-panel,
	.diagnostics,
	.item-info,
	.section-actions,
	.source-selector {
		display: grid;
		gap: 0.75rem;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.035);
	}

	.item-info {
		gap: 0.85rem;
		border-color: rgba(101, 211, 200, 0.24);
		background: rgba(101, 211, 200, 0.055);
	}

	.item-info > div:first-child {
		display: grid;
		gap: 0.25rem;
	}

	.item-info > div:first-child p {
		color: rgba(244, 240, 232, 0.62);
		text-transform: uppercase;
		letter-spacing: 0;
	}

	.item-info dl {
		gap: 0.65rem;
	}

	.item-info dd {
		color: rgba(244, 240, 232, 0.72);
		font-size: 0.82rem;
	}

	button {
		min-height: 2.25rem;
		border: 1px solid rgba(101, 211, 200, 0.5);
		border-radius: 6px;
		background: rgba(101, 211, 200, 0.14);
		color: #f4f0e8;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		border-color: #65d3c8;
		background: rgba(101, 211, 200, 0.24);
	}

	button:disabled {
		border-color: rgba(154, 160, 168, 0.32);
		background: rgba(154, 160, 168, 0.12);
		color: rgba(216, 221, 228, 0.62);
		cursor: not-allowed;
	}

	p {
		margin: 0;
		color: rgba(244, 240, 232, 0.68);
		font-size: 0.78rem;
		line-height: 1.35;
	}

	.editor-panel {
		min-width: 0;
		min-height: 0;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
	}

	.file-tabs {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(244, 240, 232, 0.14);
	}

	.file-tabs button {
		padding: 0 0.75rem;
	}

	.file-tabs button.active {
		border-color: #65d3c8;
		background: rgba(101, 211, 200, 0.2);
	}

	.section-panel {
		min-height: 0;
		display: grid;
		gap: 1rem;
		overflow: auto;
		padding: 1rem;
	}

	.overview-form {
		display: grid;
		grid-template-columns: repeat(2, minmax(14rem, 1fr));
		gap: 1rem;
		align-content: start;
	}

		.skybox-form {
			display: grid;
			grid-template-columns: repeat(3, minmax(12rem, 1fr));
			gap: 1rem;
		align-content: start;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
			background: rgba(255, 255, 255, 0.035);
		}

		.lighting-workbench {
			display: grid;
			gap: 1rem;
			align-content: start;
		}

		.performance-form,
		.settings-grid {
			display: grid;
			gap: 0.85rem;
		}

		.settings-grid {
			grid-template-columns: repeat(2, minmax(10rem, 1fr));
		}

		.lighting-group {
			display: grid;
			gap: 0.85rem;
			padding: 0.85rem;
			border: 1px solid rgba(244, 240, 232, 0.14);
			border-radius: 8px;
			background: rgba(255, 255, 255, 0.035);
		}

		.lighting-group-header,
		.lighting-source-header {
			display: flex;
			gap: 1rem;
			align-items: start;
			justify-content: space-between;
		}

		.lighting-group-header h2,
		.lighting-source-header h3 {
			margin: 0;
			font-size: 1rem;
			line-height: 1.2;
		}

		.lighting-group-header p {
			text-transform: uppercase;
		}

		.lighting-source {
			display: grid;
			gap: 0.85rem;
			padding: 0.85rem;
			border: 1px solid rgba(101, 211, 200, 0.2);
			border-radius: 8px;
			background: rgba(9, 12, 16, 0.55);
		}

		.readonly-source {
			border-color: rgba(154, 160, 168, 0.24);
			background: rgba(154, 160, 168, 0.07);
		}

		.lighting-fields {
			display: grid;
			grid-template-columns: repeat(4, minmax(9rem, 1fr));
			gap: 0.75rem;
			align-items: end;
		}

		.npc-instance-form,
		.npc-conversation-fields {
			display: grid;
			gap: 0.85rem;
		}

		.npc-instance-form {
			padding-top: 0.85rem;
			border-top: 1px solid rgba(244, 240, 232, 0.12);
		}

		.npc-conversation-fields {
			grid-template-columns: repeat(2, minmax(14rem, 1fr));
		}

		.lighting-badge {
			align-self: start;
			padding: 0.25rem 0.45rem;
			border: 1px solid rgba(244, 240, 232, 0.18);
			border-radius: 6px;
			color: rgba(244, 240, 232, 0.72);
			font-size: 0.72rem;
			text-transform: uppercase;
		}

		.checkbox-control {
			display: flex;
		gap: 0.6rem;
		align-items: center;
		min-height: 2.25rem;
	}

	.checkbox-control input {
		min-height: auto;
	}

	.upload-control input {
		padding-top: 0.45rem;
	}

	.file-source {
		min-width: 0;
		display: grid;
		gap: 0.75rem;
	}

	.file-source-header {
		display: flex;
		gap: 1rem;
		align-items: baseline;
		justify-content: space-between;
	}

	.file-source-header h2 {
		margin: 0;
		font-size: 1rem;
	}

	.file-source-header span {
		color: rgba(244, 240, 232, 0.62);
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}

	pre {
		min-width: 0;
		overflow: auto;
		margin: 0;
		padding: 1rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
		background: #0b0e13;
		color: #e7ddc9;
		font-size: 0.8rem;
		line-height: 1.45;
		tab-size: 2;
	}

	.empty-state {
		padding: 1rem;
	}

	@media (max-width: 900px) {
		.workspace-header,
			.workspace-grid,
			.overview-form,
			.skybox-form,
			.lighting-fields {
				grid-template-columns: 1fr;
			}

			.lighting-group-header,
			.lighting-source-header {
				display: grid;
			}

		.level-summary {
			border-right: 0;
			border-bottom: 1px solid rgba(244, 240, 232, 0.14);
		}
	}
</style>
