<script lang="ts">
import { onDestroy, onMount } from "svelte";
import type {
	GameDevBridgeCommandResult,
	GameDevBridgeEditorEndpoint,
	GameDevBridgeLogEntry,
	GameDevBridgeSnapshot,
} from "../app/gameDevBridge.js";
import {
	type MasterControlGraphEdge,
	type MasterControlGraphNode,
	type MasterControlGraphNodeGroup,
	createMasterControlGraph,
	graphAsMermaid,
} from "./masterControlGraph.js";

const groups: readonly MasterControlGraphNodeGroup[] = [
	"app",
	"global",
	"engine",
	"game",
	"levels",
	"adapters",
	"editor",
];
const GLOBAL_SETTINGS_API_PATH = "/__megameal-editor-api/global-settings";
const GLOBAL_PERFORMANCE_API_PATH = "/__megameal-editor-api/global-performance";
const PLAYER_PACKAGE_API_PATH = "/__megameal-editor-api/player-package";

type GlobalSettingsDraft = {
	readonly packageId: string;
	readonly defaultRuntimeSceneId: string;
};

type PerformanceSystemId = "lod" | "culling" | "streaming" | "collision";
type PerformanceSystemMode = "off" | "diagnostic";
type PerformanceConfigDraft = {
	schemaVersion: 1;
	systems: Record<
		PerformanceSystemId,
		{
			mode: PerformanceSystemMode;
		}
	>;
};

type Vector3Draft = [number, number, number];
type QuaternionDraft = [number, number, number, number];

type PlayerPackageDraft = {
	readonly assets: {
		readonly meshUrl: string;
		readonly materialUrl: string;
		readonly jumpAudioUrl: string;
		readonly chargeReleaseAudioUrl: string;
	};
	readonly transform: {
		readonly position: Vector3Draft;
		readonly rotation: QuaternionDraft;
		readonly scale: Vector3Draft;
	};
	readonly renderable: {
		readonly visible: boolean;
	};
	readonly rigidBody: {
		readonly mass: number;
	};
	readonly collider: {
		readonly halfHeight: number;
		readonly radius: number;
	};
	readonly characterController: {
		readonly speed: number;
		readonly sprintMultiplier: number;
		readonly jumpForce: number;
		readonly gravity: number;
		readonly groundY: number;
	};
	readonly firstPersonController: {
		readonly mouseSensitivity: number;
		readonly minPitchRadians: number;
		readonly maxPitchRadians: number;
		readonly eyeHeight: number;
		readonly fovDegrees: number;
		readonly near: number;
		readonly far: number;
	};
	readonly health: {
		readonly current: number;
		readonly max: number;
	};
	readonly audio: {
		readonly jumpVolume: number;
		readonly chargeReleaseVolume: number;
	};
	readonly light: {
		readonly kind: "point";
		readonly color: string;
		readonly intensity: number;
		readonly distance: number;
		readonly decay: number;
		readonly visible: boolean;
	};
};

type LiveGameState = {
	readonly playerPosition?: readonly [number, number, number];
	readonly health?: readonly [number, number];
	readonly remainingCollectibles?: number;
	readonly collectedCount?: number;
	readonly moving?: boolean;
	readonly pointerLocked?: boolean;
	readonly lookActive?: boolean;
	readonly inputEnabled?: boolean;
	readonly charging?: boolean;
	readonly chargeAmount?: number;
};

const performanceSystemIds = [
	"lod",
	"culling",
	"streaming",
	"collision",
] as const satisfies readonly PerformanceSystemId[];

// biome-ignore lint/style/useConst: Svelte state is reassigned from template event handlers.
let selectedNodeId = $state("level-package");
// biome-ignore lint/style/useConst: Svelte state is reassigned from template event handlers.
let activeGroup = $state<MasterControlGraphNodeGroup | "all">("all");
let liveSnapshot: GameDevBridgeSnapshot | undefined = $state();
let bridgeStatus = $state<"waiting" | "connected" | "unavailable">("waiting");
let bridgeEndpoint: GameDevBridgeEditorEndpoint | undefined = $state();
let devLogEntries: GameDevBridgeLogEntry[] = $state([]);
let pendingCommandId: string | undefined = $state();
let lastCommandMessage: string | undefined = $state();
let globalSettingsDraft: GlobalSettingsDraft | undefined = $state();
let savedGlobalSettings: GlobalSettingsDraft | undefined = $state();
let globalSettingsFilePath: string | undefined = $state();
let globalSettingsMessage: string | undefined = $state();
let globalSettingsBusy = $state(false);
let globalPerformanceDraft: PerformanceConfigDraft | undefined = $state();
let savedGlobalPerformance: PerformanceConfigDraft | undefined = $state();
let globalPerformanceFilePath: string | undefined = $state();
let globalPerformanceSourceHash: string | undefined = $state();
let globalPerformanceMessage: string | undefined = $state();
let globalPerformanceBusy = $state(false);
let playerPackageDraft: PlayerPackageDraft | undefined = $state();
let savedPlayerPackage: PlayerPackageDraft | undefined = $state();
let playerPackageFilePath: string | undefined = $state();
let playerPackageMessage: string | undefined = $state();
let playerPackageBusy = $state(false);
let destroyed = false;

const graph = $derived(
	createMasterControlGraph({
		...(liveSnapshot?.activeRuntimeSceneId
			? { activeRuntimeSceneId: liveSnapshot.activeRuntimeSceneId }
			: {}),
	}),
);
const selectedNode = $derived(
	graph.nodes.find((node) => node.id === selectedNodeId) ?? graph.nodes[0],
);
const visibleNodes = $derived(
	activeGroup === "all"
		? graph.nodes
		: graph.nodes.filter((node) => node.group === activeGroup),
);
const visibleNodeIds = $derived(new Set(visibleNodes.map((node) => node.id)));
const visibleEdges = $derived(
	graph.edges.filter(
		(edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
	),
);
const mermaidSource = $derived(graphAsMermaid(graph));
const runtimeSceneOptions = $derived(
	graph.nodes
		.filter((node) => node.runtimeSceneId)
		.map((node) => ({
			id: node.runtimeSceneId ?? "",
			label: `${node.label} (${node.runtimeSceneId})`,
		})),
);
const globalSettingsDirty = $derived(
	globalSettingsDraft !== undefined &&
		savedGlobalSettings !== undefined &&
		(globalSettingsDraft.packageId !== savedGlobalSettings.packageId ||
			globalSettingsDraft.defaultRuntimeSceneId !==
				savedGlobalSettings.defaultRuntimeSceneId),
);
const globalPerformanceDirty = $derived(
	globalPerformanceDraft !== undefined &&
		savedGlobalPerformance !== undefined &&
		JSON.stringify(globalPerformanceDraft) !==
			JSON.stringify(savedGlobalPerformance),
);
const playerPackageDirty = $derived(
	playerPackageDraft !== undefined &&
		savedPlayerPackage !== undefined &&
		JSON.stringify(playerPackageDraft) !== JSON.stringify(savedPlayerPackage),
);
const liveGameState = $derived(readLiveGameState(liveSnapshot?.gameState));
const collisionOverlayDiagnostics = $derived(
	liveSnapshot?.diagnostics?.collisionOverlay,
);
const performanceDiagnostics = $derived(liveSnapshot?.diagnostics?.performance);

onMount(() => {
	if (!import.meta.env.DEV) {
		bridgeStatus = "unavailable";
		globalSettingsMessage = "Global settings editing is available in dev only.";
		globalPerformanceMessage =
			"Performance settings editing is available in dev only.";
		playerPackageMessage = "Player package editing is available in dev only.";
		return;
	}

	void loadGlobalSettings();
	void loadGlobalPerformance();
	void loadPlayerPackage();
	void import("../app/gameDevBridge.js").then(
		({ createGameDevBridgeEditorEndpoint }) => {
			if (destroyed) {
				return;
			}

			bridgeEndpoint = createGameDevBridgeEditorEndpoint({
				onSnapshot(snapshot) {
					liveSnapshot = snapshot;
					bridgeStatus = "connected";
				},
				onCommandResult(result) {
					pendingCommandId =
						pendingCommandId === result.commandId
							? undefined
							: pendingCommandId;
					lastCommandMessage = result.message;
					addLog(commandResultToLogEntry(result));
				},
				onLog(entry) {
					addLog(entry);
				},
			});
		},
		() => {
			bridgeStatus = "unavailable";
		},
	);
});

onDestroy(() => {
	destroyed = true;
	bridgeEndpoint?.dispose();
});

function nodeById(id: string): MasterControlGraphNode {
	const node = graph.nodes.find((entry) => entry.id === id);

	if (!node) {
		throw new Error(`Unknown master-control node "${id}".`);
	}

	return node;
}

function isSelectedEdge(from: string, to: string): boolean {
	return from === selectedNodeId || to === selectedNodeId;
}

function edgePath(edge: MasterControlGraphEdge): string {
	const from = nodeById(edge.from);
	const to = nodeById(edge.to);

	if (from.x === to.x || from.y === to.y) {
		return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
	}

	return `M ${from.x} ${from.y} L ${from.x} ${to.y} L ${to.x} ${to.y}`;
}

function edgeLabelX(edge: MasterControlGraphEdge): number {
	const from = nodeById(edge.from);
	const to = nodeById(edge.to);

	return from.y === to.y ? (from.x + to.x) / 2 : from.x;
}

function edgeLabelY(edge: MasterControlGraphEdge): number {
	const from = nodeById(edge.from);
	const to = nodeById(edge.to);

	return from.y === to.y ? from.y - 1.2 : (from.y + to.y) / 2;
}

function requestRuntimeScene(runtimeSceneId: string): void {
	if (!bridgeEndpoint || !liveSnapshot) {
		return;
	}

	const command = bridgeEndpoint.sendLoadRuntimeScene(
		runtimeSceneId,
		liveSnapshot.sessionId,
	);
	pendingCommandId = command.id;
	lastCommandMessage = `Requested ${runtimeSceneId}.`;
	addLog({
		id: command.id,
		timestamp: command.issuedAt,
		level: "info",
		message: `Editor requested ${runtimeSceneId}.`,
	});
	window.setTimeout(() => {
		if (pendingCommandId !== command.id) {
			return;
		}

		pendingCommandId = undefined;
		lastCommandMessage = `No live game response for ${runtimeSceneId}.`;
		addLog({
			id: `${command.id}:timeout`,
			timestamp: Date.now(),
			level: "warn",
			message: `No live game response for ${runtimeSceneId}.`,
		});
	}, 2500);
}

function requestCollisionOverlay(enabled: boolean): void {
	if (!bridgeEndpoint || !liveSnapshot) {
		return;
	}

	const command = bridgeEndpoint.sendSetCollisionOverlay(
		enabled,
		liveSnapshot.sessionId,
	);
	pendingCommandId = command.id;
	lastCommandMessage = enabled
		? "Requested collision overlay."
		: "Requested collision overlay off.";
	addLog({
		id: command.id,
		timestamp: command.issuedAt,
		level: "info",
		message: enabled
			? "Editor requested collision overlay."
			: "Editor requested collision overlay off.",
	});
	window.setTimeout(() => {
		if (pendingCommandId !== command.id) {
			return;
		}

		pendingCommandId = undefined;
		lastCommandMessage = "No live game response for collision overlay.";
		addLog({
			id: `${command.id}:timeout`,
			timestamp: Date.now(),
			level: "warn",
			message: "No live game response for collision overlay.",
		});
	}, 2500);
}

async function loadGlobalSettings(): Promise<void> {
	globalSettingsBusy = true;
	globalSettingsMessage = "Loading global settings.";

	try {
		const response = await fetch(GLOBAL_SETTINGS_API_PATH, {
			headers: { Accept: "application/json" },
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.error ?? "Global settings failed to load.");
		}

		const settings = payload.settings as GlobalSettingsDraft;
		globalSettingsDraft = settings;
		savedGlobalSettings = settings;
		globalSettingsFilePath = payload.filePath as string;
		globalSettingsMessage = "Global settings loaded.";
	} catch (error) {
		globalSettingsMessage =
			error instanceof Error
				? error.message
				: "Global settings failed to load.";
	} finally {
		globalSettingsBusy = false;
	}
}

async function saveGlobalSettings(): Promise<void> {
	if (!globalSettingsDraft) {
		return;
	}

	globalSettingsBusy = true;
	globalSettingsMessage = "Saving global settings.";

	try {
		const response = await fetch(GLOBAL_SETTINGS_API_PATH, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify(globalSettingsDraft),
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.error ?? "Global settings failed to save.");
		}

		const settings = payload.settings as GlobalSettingsDraft;
		globalSettingsDraft = settings;
		savedGlobalSettings = settings;
		globalSettingsFilePath = payload.filePath as string;
		globalSettingsMessage = `Saved ${settings.defaultRuntimeSceneId}.`;
		addLog({
			id: `global-settings:${Date.now()}`,
			timestamp: Date.now(),
			level: "info",
			message: `Saved ${payload.filePath}.`,
		});
	} catch (error) {
		globalSettingsMessage =
			error instanceof Error
				? error.message
				: "Global settings failed to save.";
	} finally {
		globalSettingsBusy = false;
	}
}

async function loadGlobalPerformance(): Promise<void> {
	globalPerformanceBusy = true;
	globalPerformanceMessage = "Loading performance settings.";

	try {
		const response = await fetch(GLOBAL_PERFORMANCE_API_PATH, {
			headers: { Accept: "application/json" },
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(
				payload.error ?? "Performance settings failed to load.",
			);
		}

		const performance = payload.performance as PerformanceConfigDraft;
		globalPerformanceDraft = structuredClone(performance);
		savedGlobalPerformance = structuredClone(performance);
		globalPerformanceFilePath = payload.filePath as string;
		globalPerformanceSourceHash = payload.sourceHash as string;
		globalPerformanceMessage = "Performance settings loaded.";
	} catch (error) {
		globalPerformanceMessage =
			error instanceof Error
				? error.message
				: "Performance settings failed to load.";
	} finally {
		globalPerformanceBusy = false;
	}
}

async function saveGlobalPerformance(): Promise<void> {
	if (!globalPerformanceDraft || !globalPerformanceSourceHash) {
		return;
	}

	globalPerformanceBusy = true;
	globalPerformanceMessage = "Saving performance settings.";

	try {
		const response = await fetch(GLOBAL_PERFORMANCE_API_PATH, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				performance: globalPerformanceDraft,
				sourceHash: globalPerformanceSourceHash,
			}),
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(
				payload.error ?? "Performance settings failed to save.",
			);
		}

		const performance = payload.performance as PerformanceConfigDraft;
		globalPerformanceDraft = structuredClone(performance);
		savedGlobalPerformance = structuredClone(performance);
		globalPerformanceFilePath = payload.filePath as string;
		globalPerformanceSourceHash = payload.sourceHash as string;
		globalPerformanceMessage = "Performance settings saved.";
		addLog({
			id: `global-performance:${Date.now()}`,
			timestamp: Date.now(),
			level: "info",
			message: `Saved ${payload.filePath}.`,
		});
	} catch (error) {
		globalPerformanceMessage =
			error instanceof Error
				? error.message
				: "Performance settings failed to save.";
	} finally {
		globalPerformanceBusy = false;
	}
}

function updateGlobalPerformanceMode(
	systemId: PerformanceSystemId,
	mode: PerformanceSystemMode,
): void {
	if (!globalPerformanceDraft) {
		return;
	}

	globalPerformanceDraft = {
		...globalPerformanceDraft,
		systems: {
			...globalPerformanceDraft.systems,
			[systemId]: {
				...globalPerformanceDraft.systems[systemId],
				mode,
			},
		},
	};
}

async function loadPlayerPackage(): Promise<void> {
	playerPackageBusy = true;
	playerPackageMessage = "Loading player package.";

	try {
		const response = await fetch(PLAYER_PACKAGE_API_PATH, {
			headers: { Accept: "application/json" },
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.error ?? "Player package failed to load.");
		}

		const playerPackage = payload.playerPackage as PlayerPackageDraft;
		playerPackageDraft = structuredClone(playerPackage);
		savedPlayerPackage = structuredClone(playerPackage);
		playerPackageFilePath = payload.filePath as string;
		playerPackageMessage = "Player package loaded.";
	} catch (error) {
		playerPackageMessage =
			error instanceof Error ? error.message : "Player package failed to load.";
	} finally {
		playerPackageBusy = false;
	}
}

async function savePlayerPackage(): Promise<void> {
	if (!playerPackageDraft) {
		return;
	}

	playerPackageBusy = true;
	playerPackageMessage = "Saving player package.";

	try {
		const response = await fetch(PLAYER_PACKAGE_API_PATH, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ playerPackage: playerPackageDraft }),
		});
		const payload = await response.json();

		if (!response.ok) {
			throw new Error(payload.error ?? "Player package failed to save.");
		}

		const playerPackage = payload.playerPackage as PlayerPackageDraft;
		playerPackageDraft = structuredClone(playerPackage);
		savedPlayerPackage = structuredClone(playerPackage);
		playerPackageFilePath = payload.filePath as string;
		playerPackageMessage = "Player package saved.";
		addLog({
			id: `player-package:${Date.now()}`,
			timestamp: Date.now(),
			level: "info",
			message: `Saved ${payload.filePath}.`,
		});
	} catch (error) {
		playerPackageMessage =
			error instanceof Error ? error.message : "Player package failed to save.";
	} finally {
		playerPackageBusy = false;
	}
}

function updatePlayerAssets(
	key: keyof PlayerPackageDraft["assets"],
	value: string,
): void {
	if (!playerPackageDraft) {
		return;
	}

	playerPackageDraft = {
		...playerPackageDraft,
		assets: {
			...playerPackageDraft.assets,
			[key]: value,
		},
	};
}

function updatePlayerNumber<
	TSection extends
		| "rigidBody"
		| "collider"
		| "characterController"
		| "firstPersonController"
		| "health"
		| "audio"
		| "light",
>(
	section: TSection,
	key: keyof PlayerPackageDraft[TSection],
	value: string,
): void {
	if (!playerPackageDraft) {
		return;
	}

	const nextValue = Number(value);
	if (!Number.isFinite(nextValue)) {
		return;
	}

	playerPackageDraft = {
		...playerPackageDraft,
		[section]: {
			...playerPackageDraft[section],
			[key]: nextValue,
		},
	} as PlayerPackageDraft;
}

function updatePlayerTuple(
	key: keyof PlayerPackageDraft["transform"],
	index: number,
	value: string,
): void {
	if (!playerPackageDraft) {
		return;
	}

	const nextValue = Number(value);
	if (!Number.isFinite(nextValue)) {
		return;
	}

	const nextTuple = [...playerPackageDraft.transform[key]];
	nextTuple[index] = nextValue;
	playerPackageDraft = {
		...playerPackageDraft,
		transform: {
			...playerPackageDraft.transform,
			[key]: nextTuple,
		},
	} as PlayerPackageDraft;
}

function updatePlayerRenderableVisible(visible: boolean): void {
	if (!playerPackageDraft) {
		return;
	}

	playerPackageDraft = {
		...playerPackageDraft,
		renderable: {
			...playerPackageDraft.renderable,
			visible,
		},
	};
}

function updatePlayerLightVisible(visible: boolean): void {
	if (!playerPackageDraft) {
		return;
	}

	playerPackageDraft = {
		...playerPackageDraft,
		light: {
			...playerPackageDraft.light,
			visible,
		},
	};
}

function updatePlayerLightColor(color: string): void {
	if (!playerPackageDraft) {
		return;
	}

	playerPackageDraft = {
		...playerPackageDraft,
		light: {
			...playerPackageDraft.light,
			color,
		},
	};
}

function addLog(entry: GameDevBridgeLogEntry): void {
	devLogEntries = [entry, ...devLogEntries].slice(0, 10);
}

function commandResultToLogEntry(
	result: GameDevBridgeCommandResult,
): GameDevBridgeLogEntry {
	return {
		id: `${result.commandId}:result`,
		timestamp: result.timestamp,
		level: result.accepted ? "info" : "warn",
		message: result.message,
	};
}

function formatTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString();
}

function readLiveGameState(
	value: Record<string, unknown> | undefined,
): LiveGameState {
	if (!value) {
		return {};
	}

	return {
		...(readNumberTuple(value.playerPosition, 3)
			? { playerPosition: readNumberTuple(value.playerPosition, 3) }
			: {}),
		...(readNumberTuple(value.health, 2)
			? { health: readNumberTuple(value.health, 2) }
			: {}),
		...(readNumber(value.remainingCollectibles) !== undefined
			? { remainingCollectibles: readNumber(value.remainingCollectibles) }
			: {}),
		...(readNumber(value.collectedCount) !== undefined
			? { collectedCount: readNumber(value.collectedCount) }
			: {}),
		...(readBoolean(value.moving) !== undefined
			? { moving: readBoolean(value.moving) }
			: {}),
		...(readBoolean(value.pointerLocked) !== undefined
			? { pointerLocked: readBoolean(value.pointerLocked) }
			: {}),
		...(readBoolean(value.lookActive) !== undefined
			? { lookActive: readBoolean(value.lookActive) }
			: {}),
		...(readBoolean(value.inputEnabled) !== undefined
			? { inputEnabled: readBoolean(value.inputEnabled) }
			: {}),
		...(readBoolean(value.charging) !== undefined
			? { charging: readBoolean(value.charging) }
			: {}),
		...(readNumber(value.chargeAmount) !== undefined
			? { chargeAmount: readNumber(value.chargeAmount) }
			: {}),
	};
}

function readNumberTuple(
	value: unknown,
	length: 2,
): readonly [number, number] | undefined;
function readNumberTuple(
	value: unknown,
	length: 3,
): readonly [number, number, number] | undefined;
function readNumberTuple(
	value: unknown,
	length: 2 | 3,
): readonly number[] | undefined {
	if (
		!Array.isArray(value) ||
		value.length !== length ||
		!value.every((entry) => typeof entry === "number")
	) {
		return undefined;
	}

	return value;
}

function readNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function formatLivePosition(
	position: readonly [number, number, number] | undefined,
): string {
	return position
		? position.map((coordinate) => coordinate.toFixed(1)).join(" / ")
		: "none";
}

function formatLiveMove(moving: boolean | undefined): string {
	return moving ? "active" : "idle";
}

function formatLiveInput(state: LiveGameState): string {
	if (state.lookActive) {
		return "looking";
	}

	if (state.pointerLocked) {
		return "locked";
	}

	return state.inputEnabled ? "ready" : "paused";
}

function formatLiveCharge(state: LiveGameState): string {
	if (!state.charging) {
		return "idle";
	}

	return `${Math.round((state.chargeAmount ?? 0) * 100)}%`;
}

function formatLiveHealth(
	health: readonly [number, number] | undefined,
): string {
	return health ? `${health[0]} / ${health[1]}` : "none";
}

function formatLiveCollectibles(state: LiveGameState): string {
	return `${state.collectedCount ?? 0} collected / ${state.remainingCollectibles ?? 0} remaining`;
}
</script>

<svelte:head>
	<title>Master Control Map</title>
</svelte:head>

<main class="master-control-shell">
	<section class="map-toolbar" aria-label="Map filters">
		<button
			type="button"
			class:active={activeGroup === "all"}
			onclick={() => (activeGroup = "all")}
		>
			All
		</button>
		{#each groups as group}
			<button
				type="button"
				class:active={activeGroup === group}
				onclick={() => (activeGroup = group)}
			>
				{group}
			</button>
		{/each}
	</section>

	<section class="map-workspace" aria-label="Master control map">
		<div class="map-main">
			<div class="node-map">
				<svg viewBox="0 0 100 100" aria-hidden="true" class="edge-layer">
					<defs>
						<marker
							id="arrowhead"
							viewBox="0 0 10 10"
							refX="8"
							refY="5"
							markerWidth="5"
							markerHeight="5"
							orient="auto-start-reverse"
						>
							<path d="M 0 0 L 10 5 L 0 10 z" />
						</marker>
					</defs>
					{#each visibleEdges as edge}
						<path
							d={edgePath(edge)}
							class={`edge-route edge-${edge.kind}`}
							class:selected={isSelectedEdge(edge.from, edge.to)}
						/>
						<text
							x={edgeLabelX(edge)}
							y={edgeLabelY(edge)}
							class={`edge-label edge-${edge.kind}`}
							class:selected={isSelectedEdge(edge.from, edge.to)}
						>
							{edge.label}
						</text>
					{/each}
				</svg>

				{#each visibleNodes as node}
					<button
						type="button"
						class:selected={node.id === selectedNodeId}
						class:removable={node.removable}
						class:active-runtime={node.isActiveRuntimeScene}
						class:configurable={node.isConfigurable}
						class:read-only={!node.isConfigurable}
						class:data-source={node.isDataSource}
						class={`map-node group-${node.group} status-${node.status}`}
						style={`left: ${node.x}%; top: ${node.y}%;`}
						onclick={() => (selectedNodeId = node.id)}
					>
						<span>{node.label}</span>
						<small>{node.group}</small>
						<small class="node-status">{node.status}</small>
						{#if node.isConfigurable}
							<small class="config-badge">config</small>
						{/if}
						{#if node.isActiveRuntimeScene}
							<small class="active-badge">active</small>
						{/if}
						{#if node.isDataSource}
							<small class="source-badge">source</small>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<aside class="node-detail" aria-label="Selected node">
			<p class="node-group">{selectedNode.group}</p>
			<h1>{selectedNode.label}</h1>
			<dl>
				<div>
					<dt>Owner</dt>
					<dd>{selectedNode.owner}</dd>
				</div>
				<div>
					<dt>Contract</dt>
					<dd>{selectedNode.contract}</dd>
				</div>
				<div>
					<dt>Status</dt>
					<dd>{selectedNode.status}: {selectedNode.statusNote}</dd>
				</div>
				{#if selectedNode.isActiveRuntimeScene}
					<div>
						<dt>Runtime</dt>
						<dd>Current live game scene</dd>
					</div>
				{/if}
				{#if selectedNode.runtimeSceneId}
					<div>
						<dt>Runtime Scene</dt>
						<dd>{selectedNode.runtimeSceneId}</dd>
					</div>
					<div>
						<dt>Command</dt>
						<dd>
							<div class="runtime-scene-actions">
								<a
									class="open-level-editor-button"
									href={`/editor/level/?runtimeScene=${encodeURIComponent(selectedNode.runtimeSceneId)}`}
									target="_blank"
									rel="noreferrer"
								>
									Open level editor
								</a>
								<button
									type="button"
									class="load-scene-button"
									disabled={!bridgeEndpoint ||
										!liveSnapshot ||
										pendingCommandId !== undefined ||
										selectedNode.runtimeSceneId ===
											liveSnapshot.activeRuntimeSceneId}
									onclick={() =>
										selectedNode.runtimeSceneId &&
										requestRuntimeScene(selectedNode.runtimeSceneId)}
								>
									Load in game
								</button>
							</div>
						</dd>
					</div>
				{/if}
				{#if selectedNode.isDataSource}
					<div>
						<dt>Source</dt>
						<dd>Editor level entries are loaded from this router</dd>
					</div>
				{/if}
				<div>
					<dt>Removable</dt>
					<dd>{selectedNode.removable ? "Yes" : "No"}</dd>
				</div>
				<div>
					<dt>Configurable</dt>
					<dd>
						{selectedNode.isConfigurable
							? "Yes - this node has an editor-backed configuration path."
							: "No - this node is workflow information or runtime structure only."}
					</dd>
				</div>
				{#if selectedNode.details}
					{#each selectedNode.details as detail}
						<div>
							<dt>{detail.label}</dt>
							<dd>{detail.value}</dd>
						</div>
					{/each}
				{/if}
			</dl>
			{#if selectedNode.id === "global-settings"}
				<section class="settings-panel" aria-label="Global settings editor">
					<div class="settings-panel-header">
						<h2>Global Settings</h2>
						<button
							type="button"
							class="reload-button"
							disabled={globalSettingsBusy}
							onclick={() => void loadGlobalSettings()}
						>
							Reload
						</button>
					</div>
					{#if globalSettingsDraft}
						<label>
							<span>Package ID</span>
							<input
								value={globalSettingsDraft.packageId}
								disabled
								aria-label="Package ID"
							/>
						</label>
						<label>
							<span>Default Runtime Scene</span>
							<select
								value={globalSettingsDraft.defaultRuntimeSceneId}
								disabled={globalSettingsBusy}
								onchange={(event) => {
									const target = event.currentTarget;
									globalSettingsDraft = {
										...globalSettingsDraft,
										defaultRuntimeSceneId: target.value,
									};
								}}
							>
								{#each runtimeSceneOptions as option}
									<option value={option.id}>{option.label}</option>
								{/each}
							</select>
						</label>
						<div class="settings-actions">
							<button
								type="button"
								class="save-button"
								disabled={globalSettingsBusy || !globalSettingsDirty}
								onclick={() => void saveGlobalSettings()}
							>
								Save
							</button>
							<span>{globalSettingsMessage}</span>
						</div>
						{#if globalSettingsFilePath}
							<p class="settings-file">{globalSettingsFilePath}</p>
						{/if}
					{:else}
						<p class="settings-message">
							{globalSettingsMessage ?? "Global settings are not loaded."}
						</p>
					{/if}
				</section>
			{/if}
			{#if selectedNode.id === "player-package"}
				<section class="settings-panel" aria-label="Player package editor">
					<div class="settings-panel-header">
						<h2>Player Package</h2>
						<button
							type="button"
							class="reload-button"
							disabled={playerPackageBusy}
							onclick={() => void loadPlayerPackage()}
						>
							Reload
						</button>
					</div>
					{#if playerPackageDraft}
						<div class="settings-section">
							<h3>Assets</h3>
							<label>
								<span>Mesh URL</span>
								<input
									value={playerPackageDraft.assets.meshUrl}
									disabled={playerPackageBusy}
									oninput={(event) =>
										updatePlayerAssets("meshUrl", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Material URL</span>
								<input
									value={playerPackageDraft.assets.materialUrl}
									disabled={playerPackageBusy}
									oninput={(event) =>
										updatePlayerAssets("materialUrl", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Jump Audio URL</span>
								<input
									value={playerPackageDraft.assets.jumpAudioUrl}
									disabled={playerPackageBusy}
									oninput={(event) =>
										updatePlayerAssets("jumpAudioUrl", event.currentTarget.value)}
								/>
							</label>
							<label>
								<span>Charge Audio URL</span>
								<input
									value={playerPackageDraft.assets.chargeReleaseAudioUrl}
									disabled={playerPackageBusy}
									oninput={(event) =>
										updatePlayerAssets(
											"chargeReleaseAudioUrl",
											event.currentTarget.value,
										)}
								/>
							</label>
						</div>

						<div class="settings-section">
							<h3>Default Transform</h3>
							<div class="tuple-row">
								<span>Position</span>
								{#each playerPackageDraft.transform.position as value, index}
									<input
										type="number"
										step="0.01"
										value={value}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerTuple("position", index, event.currentTarget.value)}
									/>
								{/each}
							</div>
							<div class="tuple-row">
								<span>Rotation</span>
								{#each playerPackageDraft.transform.rotation as value, index}
									<input
										type="number"
										step="0.01"
										value={value}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerTuple("rotation", index, event.currentTarget.value)}
									/>
								{/each}
							</div>
							<div class="tuple-row">
								<span>Scale</span>
								{#each playerPackageDraft.transform.scale as value, index}
									<input
										type="number"
										step="0.01"
										value={value}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerTuple("scale", index, event.currentTarget.value)}
									/>
								{/each}
							</div>
						</div>

						<div class="settings-section">
							<h3>Movement</h3>
							<div class="settings-grid">
								<label>
									<span>Speed</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.characterController.speed}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"characterController",
												"speed",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Sprint Multiplier</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.characterController.sprintMultiplier}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"characterController",
												"sprintMultiplier",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Jump Force</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.characterController.jumpForce}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"characterController",
												"jumpForce",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Gravity</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.characterController.gravity}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"characterController",
												"gravity",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Ground Y</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.characterController.groundY}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"characterController",
												"groundY",
												event.currentTarget.value,
											)}
									/>
								</label>
							</div>
						</div>

						<div class="settings-section">
							<h3>Body</h3>
							<div class="settings-grid">
								<label>
									<span>Mass</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.rigidBody.mass}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"rigidBody",
												"mass",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Capsule Half Height</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.collider.halfHeight}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"collider",
												"halfHeight",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Capsule Radius</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.collider.radius}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"collider",
												"radius",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Health Current</span>
									<input
										type="number"
										step="1"
										value={playerPackageDraft.health.current}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"health",
												"current",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Health Max</span>
									<input
										type="number"
										step="1"
										value={playerPackageDraft.health.max}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"health",
												"max",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label class="checkbox-label">
									<input
										type="checkbox"
										checked={playerPackageDraft.renderable.visible}
										disabled={playerPackageBusy}
										onchange={(event) =>
											updatePlayerRenderableVisible(event.currentTarget.checked)}
									/>
									<span>Renderable Visible</span>
								</label>
							</div>
						</div>

						<div class="settings-section">
							<h3>Camera</h3>
							<div class="settings-grid">
								<label>
									<span>Mouse Sensitivity</span>
									<input
										type="number"
										step="0.0001"
										value={playerPackageDraft.firstPersonController.mouseSensitivity}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"mouseSensitivity",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Min Pitch</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.firstPersonController.minPitchRadians}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"minPitchRadians",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Max Pitch</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.firstPersonController.maxPitchRadians}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"maxPitchRadians",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Eye Height</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.firstPersonController.eyeHeight}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"eyeHeight",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>FOV</span>
									<input
										type="number"
										step="1"
										value={playerPackageDraft.firstPersonController.fovDegrees}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"fovDegrees",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Near</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.firstPersonController.near}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"near",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Far</span>
									<input
										type="number"
										step="1"
										value={playerPackageDraft.firstPersonController.far}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"firstPersonController",
												"far",
												event.currentTarget.value,
											)}
									/>
								</label>
							</div>
						</div>

						<div class="settings-section">
							<h3>Audio And Light</h3>
							<div class="settings-grid">
								<label>
									<span>Jump Volume</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.audio.jumpVolume}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"audio",
												"jumpVolume",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Charge Volume</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.audio.chargeReleaseVolume}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"audio",
												"chargeReleaseVolume",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Light Color</span>
									<input
										value={playerPackageDraft.light.color}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerLightColor(event.currentTarget.value)}
									/>
								</label>
								<label>
									<span>Light Intensity</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.light.intensity}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"light",
												"intensity",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Light Distance</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.light.distance}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"light",
												"distance",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Light Decay</span>
									<input
										type="number"
										step="0.01"
										value={playerPackageDraft.light.decay}
										disabled={playerPackageBusy}
										oninput={(event) =>
											updatePlayerNumber(
												"light",
												"decay",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label class="checkbox-label">
									<input
										type="checkbox"
										checked={playerPackageDraft.light.visible}
										disabled={playerPackageBusy}
										onchange={(event) =>
											updatePlayerLightVisible(event.currentTarget.checked)}
									/>
									<span>Light Visible</span>
								</label>
							</div>
						</div>

						<div class="settings-actions">
							<button
								type="button"
								class="save-button"
								disabled={playerPackageBusy || !playerPackageDirty}
								onclick={() => void savePlayerPackage()}
							>
								Save
							</button>
							<span>{playerPackageMessage}</span>
						</div>
						{#if playerPackageFilePath}
							<p class="settings-file">{playerPackageFilePath}</p>
						{/if}
					{:else}
						<p class="settings-message">
							{playerPackageMessage ?? "Player package is not loaded."}
						</p>
					{/if}
				</section>
			{/if}
			{#if selectedNode.id === "game-runtime"}
				<section class="live-panel" aria-label="Runtime diagnostics">
					<div class="live-panel-header">
						<h2>Runtime Diagnostics</h2>
						<span class={`live-status ${bridgeStatus}`}>{bridgeStatus}</span>
					</div>
					<dl>
						<div>
							<dt>Active Scene</dt>
							<dd>{liveSnapshot?.activeRuntimeSceneId ?? "none"}</dd>
						</div>
						<div>
							<dt>Collision Overlay</dt>
							<dd>
								{collisionOverlayDiagnostics?.enabled
									? "visible in game canvas"
									: "hidden"}
							</dd>
						</div>
						<div>
							<dt>Collider Shapes</dt>
							<dd>{collisionOverlayDiagnostics?.shapeCount ?? 0}</dd>
						</div>
						<div>
							<dt>Synced</dt>
							<dd>
								{collisionOverlayDiagnostics?.syncedShapeCount ?? 0} synced /
								{collisionOverlayDiagnostics?.unsyncedShapeCount ?? 0} unsynced
							</dd>
						</div>
						{#if lastCommandMessage}
							<div>
								<dt>Last Command</dt>
								<dd>{lastCommandMessage}</dd>
							</div>
						{/if}
					</dl>
					<div class="diagnostic-actions">
						<button
							type="button"
							class="diagnostic-toggle-button"
							disabled={!bridgeEndpoint ||
								!liveSnapshot ||
								pendingCommandId !== undefined}
							onclick={() =>
								requestCollisionOverlay(
									!(collisionOverlayDiagnostics?.enabled ?? false),
								)}
						>
							{collisionOverlayDiagnostics?.enabled
								? "Hide Collision Overlay"
								: "Show Collision Overlay"}
						</button>
					</div>
				</section>
			{/if}
			{#if selectedNode.id === "runtime-client"}
				<section class="live-panel" aria-label="Game client HUD telemetry">
					<div class="live-panel-header">
						<h2>HUD Telemetry</h2>
						<span class={`live-status ${bridgeStatus}`}>{bridgeStatus}</span>
					</div>
					<dl>
						<div>
							<dt>Session</dt>
							<dd>{liveSnapshot?.sessionId ?? "none"}</dd>
						</div>
						<div>
							<dt>Active Scene</dt>
							<dd>{liveSnapshot?.activeRuntimeSceneId ?? "none"}</dd>
						</div>
						<div>
							<dt>Loading Scene</dt>
							<dd>{liveSnapshot?.loadingRuntimeSceneId ?? "none"}</dd>
						</div>
						<div>
							<dt>Tick</dt>
							<dd>{liveSnapshot?.runtime.tick ?? 0}</dd>
						</div>
						<div>
							<dt>Position</dt>
							<dd>{formatLivePosition(liveGameState.playerPosition)}</dd>
						</div>
						<div>
							<dt>Move</dt>
							<dd>{formatLiveMove(liveGameState.moving)}</dd>
						</div>
						<div>
							<dt>Input</dt>
							<dd>{formatLiveInput(liveGameState)}</dd>
						</div>
						<div>
							<dt>Charge</dt>
							<dd>{formatLiveCharge(liveGameState)}</dd>
						</div>
						<div>
							<dt>Health</dt>
							<dd>{formatLiveHealth(liveGameState.health)}</dd>
						</div>
						<div>
							<dt>Collectibles</dt>
							<dd>{formatLiveCollectibles(liveGameState)}</dd>
						</div>
						{#if lastCommandMessage}
							<div>
								<dt>Last Command</dt>
								<dd>{lastCommandMessage}</dd>
							</div>
						{/if}
					</dl>
					<div class="dev-log" aria-label="Game client development log">
						{#if devLogEntries.length === 0}
							<p>No live events</p>
						{:else}
							{#each devLogEntries as entry}
								<p class={`log-entry ${entry.level}`}>
									<time>{formatTime(entry.timestamp)}</time>
									<span>{entry.message}</span>
								</p>
							{/each}
						{/if}
					</div>
				</section>
			{/if}
			<pre>{mermaidSource}</pre>
		</aside>
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

	button {
		font: inherit;
	}

	.master-control-shell {
		min-height: 100vh;
		display: grid;
		grid-template-rows: auto 1fr;
		background: #101319;
	}

	.map-toolbar {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		overflow-x: auto;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid rgba(244, 240, 232, 0.14);
		background: rgba(16, 19, 25, 0.86);
	}

	.map-toolbar button {
		min-height: 2.25rem;
		padding: 0 0.8rem;
		border: 1px solid rgba(244, 240, 232, 0.22);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.04);
		color: #f4f0e8;
		text-transform: capitalize;
		cursor: pointer;
	}

	.map-toolbar button.active,
	.map-toolbar button:hover {
		border-color: #65d3c8;
		background: rgba(101, 211, 200, 0.16);
	}

	.map-workspace {
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 26rem);
	}

	.map-main {
		min-width: 0;
		display: grid;
		align-content: start;
	}

	.node-map {
		position: relative;
		min-height: 60rem;
		overflow: visible;
		background-image:
			linear-gradient(rgba(244, 240, 232, 0.055) 1px, transparent 1px),
			linear-gradient(90deg, rgba(244, 240, 232, 0.055) 1px, transparent 1px);
		background-size: 3rem 3rem;
	}

	.edge-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.edge-route {
		fill: none;
		stroke: rgba(244, 240, 232, 0.38);
		stroke-width: 0.32;
		marker-end: url("#arrowhead");
	}

	.edge-route.edge-data {
		stroke: rgba(101, 211, 200, 0.55);
	}

	.edge-route.edge-editor {
		stroke: rgba(216, 221, 228, 0.4);
		stroke-dasharray: 1.4 1.4;
	}

	.edge-route.edge-future {
		stroke: rgba(154, 160, 168, 0.5);
		stroke-dasharray: 2.2 1.6;
	}

	.edge-route.selected {
		stroke: #f0b45d;
		stroke-width: 0.58;
	}

	.edge-layer marker path {
		fill: rgba(244, 240, 232, 0.42);
	}

	.edge-label {
		fill: rgba(244, 240, 232, 0.72);
		opacity: 0.22;
		font-size: 1.35px;
		text-anchor: middle;
		paint-order: stroke;
		stroke: #101319;
		stroke-width: 0.34;
	}

	.edge-label.edge-data {
		fill: rgba(101, 211, 200, 0.78);
	}

	.edge-label.edge-editor,
	.edge-label.edge-future {
		fill: rgba(216, 221, 228, 0.62);
	}

	.edge-label.selected {
		fill: #f0b45d;
		opacity: 1;
		font-size: 1.75px;
	}

	.map-node {
		position: absolute;
		width: 9.5rem;
		min-height: 4rem;
		transform: translate(-50%, -50%);
		display: grid;
		gap: 0.2rem;
		align-content: center;
		padding: 0.65rem 0.75rem;
		border: 1px solid rgba(244, 240, 232, 0.24);
		border-radius: 8px;
		background: rgba(21, 26, 35, 0.92);
		color: #f4f0e8;
		box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
		cursor: pointer;
	}

	.map-node:hover,
	.map-node.selected {
		opacity: 1;
		border-color: #f0b45d;
		box-shadow:
			0 0 0 2px rgba(240, 180, 93, 0.18),
			0 16px 34px rgba(0, 0, 0, 0.34);
	}

	.map-node.read-only {
		opacity: 0.56;
	}

	.map-node.read-only:hover,
	.map-node.read-only.selected {
		opacity: 0.94;
	}

	.map-node span {
		font-weight: 760;
		line-height: 1.1;
	}

	.map-node small {
		color: rgba(244, 240, 232, 0.72);
		text-transform: uppercase;
		font-size: 0.68rem;
	}

	.map-node .node-status {
		width: fit-content;
		justify-self: center;
		padding: 0.1rem 0.36rem;
		border: 1px solid rgba(244, 240, 232, 0.18);
		border-radius: 4px;
		color: rgba(244, 240, 232, 0.82);
		font-size: 0.62rem;
	}

	.map-node.removable {
		border-style: dashed;
	}

	.map-node.status-partial {
		border-style: dotted;
		border-color: rgba(240, 180, 93, 0.86);
	}

	.map-node.status-partial .node-status {
		border-color: rgba(240, 180, 93, 0.4);
		color: #f0b45d;
	}

	.map-node.status-future {
		border-color: rgba(154, 160, 168, 0.62);
		background: rgba(72, 76, 82, 0.82);
		color: rgba(244, 240, 232, 0.74);
		box-shadow: none;
	}

	.map-node.status-future .node-status,
	.map-node.status-future small {
		color: rgba(216, 221, 228, 0.72);
	}

	.map-node.active-runtime {
		border-color: #65d3c8;
		box-shadow:
			0 0 0 2px rgba(101, 211, 200, 0.22),
			0 0 26px rgba(101, 211, 200, 0.34),
			0 16px 34px rgba(0, 0, 0, 0.34);
	}

	.map-node.data-source {
		border-color: #65d3c8;
		box-shadow:
			0 0 0 2px rgba(101, 211, 200, 0.18),
			0 0 22px rgba(101, 211, 200, 0.26),
			0 16px 34px rgba(0, 0, 0, 0.3);
	}

	.map-node .active-badge {
		width: fit-content;
		justify-self: center;
		padding: 0.1rem 0.36rem;
		border: 1px solid rgba(101, 211, 200, 0.42);
		border-radius: 4px;
		color: #65d3c8;
		font-size: 0.62rem;
	}

	.map-node .config-badge {
		width: fit-content;
		justify-self: center;
		padding: 0.1rem 0.36rem;
		border: 1px solid rgba(240, 180, 93, 0.42);
		border-radius: 4px;
		color: #f0b45d;
		font-size: 0.62rem;
	}

	.map-node .source-badge {
		width: fit-content;
		justify-self: center;
		padding: 0.1rem 0.36rem;
		border: 1px solid rgba(101, 211, 200, 0.42);
		border-radius: 4px;
		color: #65d3c8;
		font-size: 0.62rem;
	}

	.group-app {
		background: rgba(34, 53, 75, 0.94);
	}

	.group-global {
		background: rgba(78, 61, 34, 0.94);
	}

	.group-engine {
		background: rgba(28, 67, 60, 0.94);
	}

	.group-game {
		background: rgba(69, 45, 76, 0.94);
	}

	.group-levels {
		background: rgba(78, 48, 40, 0.94);
	}

	.group-adapters {
		background: rgba(40, 61, 85, 0.94);
	}

	.group-editor {
		background: rgba(74, 74, 39, 0.94);
	}

	.node-detail {
		display: grid;
		align-content: start;
		gap: 1rem;
		padding: 1.25rem;
		border-left: 1px solid rgba(244, 240, 232, 0.14);
		background: rgba(13, 16, 21, 0.94);
	}

	.node-detail h1,
	.node-detail p,
	.node-detail dl {
		margin: 0;
	}

	.node-group {
		width: fit-content;
		padding: 0.22rem 0.5rem;
		border: 1px solid rgba(101, 211, 200, 0.4);
		border-radius: 4px;
		color: #65d3c8;
		text-transform: uppercase;
		font-size: 0.72rem;
	}

	.node-detail h1 {
		font-size: 1.7rem;
		line-height: 1;
	}

	.node-detail dl {
		display: grid;
		gap: 0.9rem;
	}

	.node-detail dt {
		margin-bottom: 0.25rem;
		color: rgba(244, 240, 232, 0.62);
		font-size: 0.78rem;
		text-transform: uppercase;
	}

	.node-detail dd {
		margin: 0;
		line-height: 1.45;
	}

	.load-scene-button {
		min-height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid rgba(101, 211, 200, 0.5);
		border-radius: 6px;
		background: rgba(101, 211, 200, 0.14);
		color: #f4f0e8;
		cursor: pointer;
	}

	.runtime-scene-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.open-level-editor-button {
		display: inline-flex;
		min-height: 2rem;
		align-items: center;
		padding: 0 0.75rem;
		border: 1px solid rgba(240, 180, 93, 0.52);
		border-radius: 6px;
		background: rgba(240, 180, 93, 0.14);
		color: #f4f0e8;
		text-decoration: none;
	}

	.open-level-editor-button:hover {
		border-color: #f0b45d;
		background: rgba(240, 180, 93, 0.22);
	}

	.load-scene-button:hover:not(:disabled) {
		border-color: #65d3c8;
		background: rgba(101, 211, 200, 0.24);
	}

	.load-scene-button:disabled {
		border-color: rgba(154, 160, 168, 0.32);
		background: rgba(154, 160, 168, 0.12);
		color: rgba(216, 221, 228, 0.62);
		cursor: not-allowed;
	}

	.diagnostic-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.diagnostic-toggle-button {
		min-height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid rgba(240, 180, 93, 0.5);
		border-radius: 6px;
		background: rgba(240, 180, 93, 0.14);
		color: #f4f0e8;
		cursor: pointer;
	}

	.diagnostic-toggle-button:hover:not(:disabled) {
		border-color: #f0b45d;
		background: rgba(240, 180, 93, 0.22);
	}

	.diagnostic-toggle-button:disabled {
		border-color: rgba(154, 160, 168, 0.32);
		background: rgba(154, 160, 168, 0.12);
		color: rgba(216, 221, 228, 0.62);
		cursor: not-allowed;
	}

	.settings-panel {
		display: grid;
		gap: 0.85rem;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.035);
	}

	.settings-panel-header,
	.settings-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.settings-panel h2 {
		margin: 0;
		font-size: 1rem;
	}

	.settings-section {
		display: grid;
		gap: 0.7rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(244, 240, 232, 0.12);
	}

	.settings-section h3 {
		margin: 0;
		color: rgba(244, 240, 232, 0.86);
		font-size: 0.86rem;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.settings-panel label {
		display: grid;
		gap: 0.35rem;
	}

	.settings-panel label span,
	.settings-actions span,
	.settings-file,
	.settings-message {
		color: rgba(244, 240, 232, 0.68);
		font-size: 0.78rem;
		line-height: 1.35;
	}

	.settings-panel input,
	.settings-panel select {
		width: 100%;
		min-height: 2.25rem;
		box-sizing: border-box;
		border: 1px solid rgba(244, 240, 232, 0.18);
		border-radius: 6px;
		background: rgba(11, 14, 19, 0.92);
		color: #f4f0e8;
		font: inherit;
	}

	.settings-panel input[type="checkbox"] {
		width: 1rem;
		min-height: 1rem;
		accent-color: #65d3c8;
	}

	.settings-panel input {
		padding: 0 0.65rem;
	}

	.settings-panel select {
		padding: 0 0.5rem;
	}

	.settings-panel input:disabled {
		color: rgba(244, 240, 232, 0.58);
	}

	.checkbox-label {
		min-height: 2.25rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.tuple-row {
		display: grid;
		grid-template-columns: 4.5rem repeat(4, minmax(0, 1fr));
		gap: 0.45rem;
		align-items: center;
	}

	.tuple-row span {
		color: rgba(244, 240, 232, 0.68);
		font-size: 0.78rem;
	}

	.reload-button,
	.save-button {
		min-height: 2rem;
		padding: 0 0.75rem;
		border: 1px solid rgba(101, 211, 200, 0.5);
		border-radius: 6px;
		background: rgba(101, 211, 200, 0.14);
		color: #f4f0e8;
		cursor: pointer;
	}

	.reload-button:hover:not(:disabled),
	.save-button:hover:not(:disabled) {
		border-color: #65d3c8;
		background: rgba(101, 211, 200, 0.24);
	}

	.reload-button:disabled,
	.save-button:disabled {
		border-color: rgba(154, 160, 168, 0.32);
		background: rgba(154, 160, 168, 0.12);
		color: rgba(216, 221, 228, 0.62);
		cursor: not-allowed;
	}

	.settings-file,
	.settings-message {
		margin: 0;
	}

	.live-panel {
		display: grid;
		gap: 0.85rem;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.035);
	}

	.live-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.live-panel h2 {
		margin: 0;
		font-size: 1rem;
	}

	.live-status {
		padding: 0.16rem 0.42rem;
		border: 1px solid rgba(216, 221, 228, 0.26);
		border-radius: 4px;
		color: rgba(216, 221, 228, 0.72);
		text-transform: uppercase;
		font-size: 0.64rem;
	}

	.live-status.connected {
		border-color: rgba(101, 211, 200, 0.44);
		color: #65d3c8;
	}

	.live-status.unavailable {
		border-color: rgba(154, 160, 168, 0.34);
		color: rgba(154, 160, 168, 0.9);
	}

	.dev-log {
		display: grid;
		gap: 0.42rem;
		max-height: 8rem;
		overflow: auto;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(244, 240, 232, 0.12);
	}

	.dev-log p {
		margin: 0;
	}

	.log-entry {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr);
		gap: 0.5rem;
		color: rgba(244, 240, 232, 0.8);
		font-size: 0.76rem;
		line-height: 1.35;
	}

	.log-entry time {
		color: rgba(216, 221, 228, 0.58);
	}

	.log-entry.warn span {
		color: #f0b45d;
	}

	.log-entry.error span {
		color: #ff8c8c;
	}

	.node-detail pre {
		max-height: 18rem;
		overflow: auto;
		margin: 0;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 6px;
		background: #0b0e13;
		color: #e7ddc9;
		font-size: 0.78rem;
		line-height: 1.45;
		white-space: pre;
	}

	@media (max-width: 900px) {
		.map-workspace {
			grid-template-columns: 1fr;
		}

		.node-detail {
			border-left: 0;
			border-top: 1px solid rgba(244, 240, 232, 0.14);
		}

		.node-map {
			min-height: 50rem;
		}

		.map-node {
			width: 7.6rem;
			min-height: 3.5rem;
			font-size: 0.82rem;
		}
	}
</style>
