import {
	AUDIO_MANAGER_RESOURCE,
	type AssetManagerPort,
	type AudioContentManifest,
	type AudioManagerPort,
	type CameraPosePort,
	type CollisionOverlayItem,
	type CollisionOverlayRendererPort,
	EngineRuntime,
	type Entity,
	type InputPlatformPort,
	LIGHT_TRANSFORM_COMPONENT,
	LevelLoader,
	type LightRendererPort,
	LightSyncSystem,
	type PhysicsAdapterPort,
	PhysicsSyncSystem,
	type ReflectionProbeRendererPort,
	ReflectionProbeSyncSystem,
	type RenderProfileData,
	RenderSyncSystem,
	type RendererPort,
	type RuntimeSceneManifestData,
	type SceneEnvironmentRendererPort,
	SceneManager,
	audioEventMappingsFromManifest,
	createAudioEventSystem,
	createCameraPoseApplySystem,
	createPhysicsPostSyncSystem,
	createPhysicsPreSyncSystem,
	createPhysicsStepSystem,
	createTransformHistorySystem,
	musicStateFromAudioContentManifest,
	parseAudioContentManifest,
} from "../../engine/index.js";
import {
	type CollisionOverlayDiagnosticsState,
	collectCollisionOverlayItems,
	summarizeCollisionOverlay,
} from "../diagnostics/index.js";
import {
	type PerformanceDiagnosticsState,
	collectPerformanceDiagnostics,
} from "../performance/index.js";
import { PrefabRegistry, STABLE_ID_COMPONENT } from "../prefabs/index.js";
import { createGameScene } from "../scenes/index.js";
import {
	type GameHudState,
	RUNTIME_SCENE_TRANSITION_RESOURCE,
	type RuntimeSceneTransitionPort,
	createCharacterMotorSystem,
	createCharacterMovementSystem,
	createChargedActionSystem,
	createCollectibleSystem,
	createFirstPersonLookSystem,
	createFollowTargetSystem,
	createGameplayActionMap,
	createInteractionCommandSystem,
	createInteractionTargetSelectionSystem,
	createLightModulationSystem,
	createMovementBehaviorSystem,
	createMovementCommandSystem,
	createNpcDialogSystem,
	createNpcProximitySystem,
	createNpcSignificanceSystem,
	createPlayerCameraSystem,
	createPlayerChargeLightFeedbackSystem,
	createPlayerInputSystem,
	createPlayerLightCameraAnchorSystem,
	createPortalActivationSystem,
	createPortalProximitySystem,
	createStoryNoteActivationSystem,
	createStoryNoteProximitySystem,
	createWalkableGroundingSystem,
	selectGameHudState,
} from "../systems/index.js";

export type GameRendererPort = RendererPort &
	LightRendererPort &
	ReflectionProbeRendererPort &
	SceneEnvironmentRendererPort &
	CollisionOverlayRendererPort &
	CameraPosePort & {
		applyRenderProfile?(profile: RenderProfileData): void;
	};

export type MegamealGameRuntimeOptions = {
	readonly assets: AssetManagerPort;
	readonly renderer: GameRendererPort;
	readonly input: InputPlatformPort;
	readonly physics: PhysicsAdapterPort;
	readonly audio?: AudioManagerPort;
	readonly runtimeManifest?: RuntimeSceneManifestData;
	readonly runtimeSceneManifests?: readonly RuntimeSceneManifestData[];
	readonly audioContentManifestForRuntimeScene?: (
		runtimeSceneManifestId: string,
	) => AudioContentManifest;
};

export type MegamealGameRuntime = {
	readonly runtime: EngineRuntime;
	readonly sceneManager: SceneManager;
	runtimeSceneState(): RuntimeSceneState;
	requestRuntimeScene(runtimeSceneId: string): RuntimeSceneRequestResult;
	setCollisionOverlayEnabled(enabled: boolean): RuntimeDiagnosticToggleResult;
	runtimeDiagnostics(): RuntimeDiagnosticsState;
	gameState(): GameHudState;
	dispose(): Promise<void>;
};

export type RuntimeSceneState = {
	readonly activeRuntimeSceneId?: string;
	readonly loadingRuntimeSceneId?: string;
	readonly availableRuntimeSceneIds: readonly string[];
};

export type RuntimeSceneRequestResult = {
	readonly accepted: boolean;
	readonly runtimeSceneId: string;
	readonly message: string;
};

export type RuntimeDiagnosticToggleResult = {
	readonly accepted: boolean;
	readonly enabled: boolean;
	readonly message: string;
	readonly diagnostics: RuntimeDiagnosticsState;
};

export type RuntimeDiagnosticsState = {
	readonly collisionOverlay: CollisionOverlayDiagnosticsState;
	readonly performance: PerformanceDiagnosticsState;
};

export async function createMegamealGameRuntime(
	options: MegamealGameRuntimeOptions,
): Promise<MegamealGameRuntime> {
	const runtime = new EngineRuntime();
	const sceneManager = new SceneManager();
	const runtimeSceneCatalog = createRuntimeSceneCatalog(options);
	const initialRuntimeManifest =
		options.runtimeManifest ?? runtimeSceneCatalog.values().next().value;

	if (!initialRuntimeManifest) {
		throw new Error("No runtime scene manifests are registered.");
	}

	runtimeSceneCatalog.set(initialRuntimeManifest.id, initialRuntimeManifest);
	const runtimeSceneManifests = [...runtimeSceneCatalog.values()];
	const musicSelectionCounts = new Map<string, number>();
	const physicsSync = new PhysicsSyncSystem({
		adapter: options.physics,
	});
	const renderSync = new RenderSyncSystem({ renderer: options.renderer });
	const lightSync = new LightSyncSystem({
		renderer: options.renderer,
		lightTransformComponent: LIGHT_TRANSFORM_COMPONENT,
	});
	const reflectionProbeSync = new ReflectionProbeSyncSystem({
		renderer: options.renderer,
	});
	const audioEvents = options.audio
		? createAudioEventSystem({
				audio: options.audio,
				mappings: audioMappingsForRuntimeScenes(
					runtimeSceneManifests,
					options.audioContentManifestForRuntimeScene,
				),
				activeSceneId: () =>
					activeRuntimeSceneManifest?.level.sceneId ??
					activeRuntimeSceneManifest?.id,
			})
		: undefined;
	let activeRuntimeSceneManifest: RuntimeSceneManifestData | undefined;
	let loadingRuntimeSceneId: string | undefined;
	let collisionOverlayEnabled = false;
	let collisionOverlayItems: readonly CollisionOverlayItem[] = [];
	let collisionOverlayCleared = true;
	const transitionPort: RuntimeSceneTransitionPort = {
		currentRuntimeSceneId() {
			return activeRuntimeSceneManifest?.id;
		},
		canLoadRuntimeScene(runtimeSceneId) {
			return runtimeSceneCatalog.has(runtimeSceneId);
		},
		requestRuntimeScene(runtimeSceneId) {
			requestRuntimeScene(runtimeSceneId);
		},
	};

	options.input.setBindings(createGameplayActionMap().bindings);
	runtime.world.setResource("assets", options.assets);
	runtime.world.setResource("sceneManager", sceneManager);
	runtime.world.setResource(RUNTIME_SCENE_TRANSITION_RESOURCE, transitionPort);

	if (options.audio) {
		runtime.world.setResource(AUDIO_MANAGER_RESOURCE, options.audio);
	}

	runtime.scheduler.registerSystem("input", createTransformHistorySystem());
	runtime.scheduler.registerSystem(
		"input",
		createPlayerInputSystem({ input: options.input }),
	);
	runtime.scheduler.registerSystem("commands", createMovementCommandSystem());
	runtime.scheduler.registerSystem(
		"commands",
		createInteractionCommandSystem(),
		{
			order: 10,
		},
	);
	runtime.scheduler.registerSystem("character", createFirstPersonLookSystem(), {
		order: -10,
	});
	runtime.scheduler.registerSystem("character", createCharacterMotorSystem());
	runtime.scheduler.registerSystem(
		"character",
		createWalkableGroundingSystem(),
		{
			order: 5,
		},
	);
	runtime.scheduler.registerSystem(
		"character",
		createCharacterMovementSystem(),
		{
			order: 10,
		},
	);
	runtime.scheduler.registerSystem("camera", createPlayerCameraSystem());
	runtime.scheduler.registerSystem(
		"camera",
		createPlayerLightCameraAnchorSystem(),
		{ order: 5 },
	);
	runtime.scheduler.registerSystem("gameplay", createChargedActionSystem());
	runtime.scheduler.registerSystem(
		"gameplay",
		createPlayerChargeLightFeedbackSystem(),
		{ order: 5 },
	);
	runtime.scheduler.registerSystem("gameplay", createCollectibleSystem());
	runtime.scheduler.registerSystem("gameplay", createPortalProximitySystem(), {
		order: 10,
	});
	runtime.scheduler.registerSystem("gameplay", createNpcSignificanceSystem(), {
		order: 12,
	});
	runtime.scheduler.registerSystem("gameplay", createNpcProximitySystem(), {
		order: 14,
	});
	runtime.scheduler.registerSystem(
		"gameplay",
		createStoryNoteProximitySystem(),
		{ order: 15 },
	);
	runtime.scheduler.registerSystem(
		"gameplay",
		createInteractionTargetSelectionSystem(),
		{ order: 17 },
	);
	runtime.scheduler.registerSystem(
		"gameplay",
		createStoryNoteActivationSystem(),
		{ order: 18 },
	);
	runtime.scheduler.registerSystem("gameplay", createNpcDialogSystem(), {
		order: 19,
	});
	runtime.scheduler.registerSystem("gameplay", createPortalActivationSystem(), {
		order: 20,
	});
	runtime.scheduler.registerSystem("ai", createMovementBehaviorSystem(), {
		order: 0,
	});
	runtime.scheduler.registerSystem("ai", createFollowTargetSystem(), {
		order: 5,
	});
	runtime.scheduler.registerSystem("ai", createLightModulationSystem(), {
		order: 10,
	});
	runtime.scheduler.registerSystem(
		"physics-pre-sync",
		createPhysicsPreSyncSystem(physicsSync),
	);
	runtime.scheduler.registerSystem(
		"physics-step",
		createPhysicsStepSystem(options.physics),
	);
	runtime.scheduler.registerSystem(
		"physics-post-sync",
		createPhysicsPostSyncSystem(physicsSync),
	);

	if (audioEvents) {
		runtime.scheduler.registerSystem("audio", audioEvents.asSystem());
	}

	runtime.scheduler.registerSystem(
		"render-sync",
		createCameraPoseApplySystem({ camera: options.renderer }),
		{ order: -100 },
	);
	runtime.scheduler.registerSystem("render-sync", {
		id: "render-sync",
		update({ interpolation, world }) {
			renderSync.update(
				interpolation === undefined ? { world } : { interpolation, world },
			);
		},
	});
	runtime.scheduler.registerSystem(
		"render-sync",
		{
			id: "light-sync",
			update({ interpolation, world }) {
				lightSync.update(
					interpolation === undefined ? { world } : { interpolation, world },
				);
			},
		},
		{ order: 10 },
	);
	runtime.scheduler.registerSystem(
		"render-sync",
		{
			id: "reflection-probe-sync",
			update({ interpolation, world }) {
				reflectionProbeSync.update(
					interpolation === undefined ? { world } : { interpolation, world },
				);
			},
		},
		{ order: 20 },
	);
	runtime.scheduler.registerSystem(
		"render-sync",
		{
			id: "collision-overlay-sync",
			update({ world }) {
				if (!collisionOverlayEnabled) {
					collisionOverlayItems = [];

					if (!collisionOverlayCleared) {
						options.renderer.clearCollisionOverlay();
						collisionOverlayCleared = true;
					}

					return;
				}

				collisionOverlayItems = collectCollisionOverlayItems(world);
				options.renderer.setCollisionOverlay(collisionOverlayItems);
				collisionOverlayCleared = false;
			},
		},
		{ order: 90 },
	);
	runtime.scheduler.registerSystem("render", {
		id: "render",
		update({ interpolation }) {
			options.renderer.render(interpolation ?? 0);
		},
	});

	await loadRuntimeScene(initialRuntimeManifest.id, {
		restartAfterLoad: false,
	});
	runtime.start();

	let disposed = false;

	return {
		runtime,
		sceneManager,
		runtimeSceneState() {
			return {
				...(activeRuntimeSceneManifest
					? { activeRuntimeSceneId: activeRuntimeSceneManifest.id }
					: {}),
				...(loadingRuntimeSceneId ? { loadingRuntimeSceneId } : {}),
				availableRuntimeSceneIds: runtimeSceneManifests.map(
					(manifest) => manifest.id,
				),
			};
		},
		requestRuntimeScene,
		setCollisionOverlayEnabled,
		runtimeDiagnostics,
		gameState() {
			return selectGameHudState(runtime.world);
		},
		async dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			options.input.setFocusState({ gameplayInputEnabled: false });
			renderSync.detachAll();
			lightSync.detachAll();
			reflectionProbeSync.detachAll();
			clearCollisionOverlayState();
			options.renderer.clearSceneEnvironment();
			await sceneManager.unload(runtime.services);
			physicsSync.dispose();
			runtime.dispose();
		},
	};

	function requestRuntimeScene(
		runtimeSceneId: string,
	): RuntimeSceneRequestResult {
		if (!runtimeSceneCatalog.has(runtimeSceneId)) {
			return {
				accepted: false,
				runtimeSceneId,
				message: `Runtime scene manifest "${runtimeSceneId}" is not registered.`,
			};
		}

		if (loadingRuntimeSceneId !== undefined) {
			return {
				accepted: false,
				runtimeSceneId,
				message: `Runtime scene "${loadingRuntimeSceneId}" is already loading.`,
			};
		}

		if (activeRuntimeSceneManifest?.id === runtimeSceneId) {
			return {
				accepted: true,
				runtimeSceneId,
				message: `Runtime scene "${runtimeSceneId}" is already active.`,
			};
		}

		void loadRuntimeScene(runtimeSceneId).catch((error) => {
			runtime.events.emit({
				type: "RuntimeSceneTransitionFailed",
				runtimeSceneId,
				message:
					error instanceof Error
						? error.message
						: "Runtime scene transition failed.",
			});
		});

		return {
			accepted: true,
			runtimeSceneId,
			message: `Runtime scene "${runtimeSceneId}" load requested.`,
		};
	}

	function setCollisionOverlayEnabled(
		enabled: boolean,
	): RuntimeDiagnosticToggleResult {
		collisionOverlayEnabled = enabled;

		if (!enabled) {
			clearCollisionOverlayState();
		}

		return {
			accepted: true,
			enabled,
			message: enabled
				? "Collision overlay enabled."
				: "Collision overlay disabled.",
			diagnostics: runtimeDiagnostics(),
		};
	}

	function runtimeDiagnostics(): RuntimeDiagnosticsState {
		return {
			collisionOverlay: summarizeCollisionOverlay(
				collisionOverlayEnabled,
				collisionOverlayItems,
			),
			performance: collectPerformanceDiagnostics({
				world: runtime.world,
				assets: options.assets,
				...(activeRuntimeSceneManifest
					? { activeRuntimeSceneId: activeRuntimeSceneManifest.id }
					: {}),
			}),
		};
	}

	function clearCollisionOverlayState(): void {
		collisionOverlayItems = [];
		options.renderer.clearCollisionOverlay();
		collisionOverlayCleared = true;
	}

	async function loadRuntimeScene(
		runtimeSceneId: string,
		optionsForLoad: { readonly restartAfterLoad?: boolean } = {},
	): Promise<void> {
		const nextRuntimeSceneManifest = runtimeSceneCatalog.get(runtimeSceneId);

		if (!nextRuntimeSceneManifest) {
			throw new Error(
				`Runtime scene manifest "${runtimeSceneId}" is not registered.`,
			);
		}

		if (loadingRuntimeSceneId !== undefined) {
			return;
		}

		loadingRuntimeSceneId = runtimeSceneId;
		const shouldRestart =
			optionsForLoad.restartAfterLoad !== false &&
			runtime.lifecycle === "started";
		let loaded = false;

		options.input.setFocusState({ gameplayInputEnabled: false });
		runtime.pause();
		renderSync.detachAll();
		lightSync.detachAll();
		reflectionProbeSync.detachAll();
		clearCollisionOverlayState();
		physicsSync.dispose();
		options.audio?.setMusic({ trackId: undefined, playing: false, volume: 0 });
		options.renderer.clearSceneEnvironment();
		options.renderer.applyRenderProfile?.(
			nextRuntimeSceneManifest.renderProfile,
		);

		try {
			options.assets.registerManifest(nextRuntimeSceneManifest.assets);

			const levelLoader = new LevelLoader({
				prefabs: new PrefabRegistry(nextRuntimeSceneManifest.prefabs),
				assets: options.assets,
			});

			activeRuntimeSceneManifest = undefined;
			await sceneManager.load(
				createGameScene({
					levelLoader,
					runtimeManifest: nextRuntimeSceneManifest,
					physicsReady: () => {
						physicsSync.preSync(runtime.services);
						return requiredCollisionStableIdsReady(
							runtime.world,
							physicsSync,
							nextRuntimeSceneManifest,
						);
					},
				}),
				runtime.services,
			);
			await options.renderer.applySceneEnvironment(
				nextRuntimeSceneManifest.renderProfile.environment,
				options.assets,
			);
			applyRuntimeSceneMusic(
				options.audio,
				nextRuntimeSceneManifest,
				nextMusicSelectionIndex(
					musicSelectionCounts,
					nextRuntimeSceneManifest.id,
				),
				options.audioContentManifestForRuntimeScene,
			);
			activeRuntimeSceneManifest = nextRuntimeSceneManifest;
			loaded = true;
		} catch (error) {
			options.renderer.clearSceneEnvironment();
			await sceneManager.unload(runtime.services);
			throw error;
		} finally {
			loadingRuntimeSceneId = undefined;

			if (loaded) {
				options.input.setFocusState({ gameplayInputEnabled: true });
			}

			if (loaded && shouldRestart) {
				runtime.start();
			}
		}
	}
}

function applyRuntimeSceneMusic(
	audio: AudioManagerPort | undefined,
	manifest: RuntimeSceneManifestData,
	selectionIndex: number,
	audioContentManifestForRuntimeScene: AudioContentManifestLookup | undefined,
): void {
	if (!audio) {
		return;
	}

	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene?.(manifest.id) ?? {
			eventMappings: [],
		},
		{
			assetManifest: manifest.assets,
		},
	);
	const musicState = musicStateFromAudioContentManifest(audioContent, {
		selectionIndex,
	});

	if (!musicState) {
		return;
	}

	audio.setMusic({
		...musicState,
		sceneId: manifest.level.sceneId ?? manifest.id,
	});
}

function nextMusicSelectionIndex(
	counts: Map<string, number>,
	runtimeSceneId: string,
): number {
	const nextIndex = counts.get(runtimeSceneId) ?? 0;
	counts.set(runtimeSceneId, nextIndex + 1);
	return nextIndex;
}

function createRuntimeSceneCatalog(options: {
	readonly runtimeManifest?: RuntimeSceneManifestData;
	readonly runtimeSceneManifests?: readonly RuntimeSceneManifestData[];
}): Map<string, RuntimeSceneManifestData> {
	const catalog = new Map<string, RuntimeSceneManifestData>();

	for (const manifest of options.runtimeSceneManifests ?? []) {
		catalog.set(manifest.id, manifest);
	}

	if (options.runtimeManifest) {
		catalog.set(options.runtimeManifest.id, options.runtimeManifest);
	}

	return catalog;
}

function audioMappingsForRuntimeScenes(
	manifests: readonly RuntimeSceneManifestData[],
	audioContentManifestForRuntimeScene: AudioContentManifestLookup | undefined,
) {
	return manifests.flatMap((manifest) =>
		audioEventMappingsFromManifest(
			parseAudioContentManifest(
				audioContentManifestForRuntimeScene?.(manifest.id) ?? {
					eventMappings: [],
				},
				{
					assetManifest: manifest.assets,
				},
			),
		),
	);
}

type AudioContentManifestLookup = (
	runtimeSceneManifestId: string,
) => AudioContentManifest;

function requiredCollisionStableIdsReady(
	world: EngineRuntime["world"],
	physicsSync: PhysicsSyncSystem,
	manifest: RuntimeSceneManifestData,
): boolean {
	const requiredStableIds = [
		...(manifest.readiness.requiredCollisionStableIds ?? []),
		...(manifest.readiness.requiredWalkableStableIds ?? []),
	];

	if (requiredStableIds.length === 0) {
		return true;
	}

	const entitiesByStableId = stableIdEntityMap(world);

	return requiredStableIds.every((stableId) => {
		const entity = entitiesByStableId.get(stableId);
		return entity !== undefined && physicsSync.hasCollider(entity);
	});
}

function stableIdEntityMap(world: EngineRuntime["world"]): Map<string, Entity> {
	const entities = new Map<string, Entity>();

	for (const entity of world.query([STABLE_ID_COMPONENT])) {
		const stableId = world.getComponent<{ readonly id?: unknown }>(
			entity,
			STABLE_ID_COMPONENT,
		);

		if (typeof stableId?.id === "string") {
			entities.set(stableId.id, entity);
		}
	}

	return entities;
}
