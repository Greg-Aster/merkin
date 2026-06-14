import {
	ACTIVE_CAMERA_POSE_RESOURCE,
	AUDIO_MANAGER_RESOURCE,
	type AssetManagerPort,
	type AudioManagerPort,
	type AudioMixerPort,
	type AudioSpatialPort,
	type CameraPosePort,
	EngineRuntime,
	type Entity,
	type InputPlatformPort,
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
	type WaterSurfaceRendererPort,
	WaterSurfaceSyncSystem,
	audioEventMappingsFromManifest,
	createAudioEventSystem,
	createAudioSpatialSyncSystem,
	createCameraPoseApplySystem,
	createPhysicsPostSyncSystem,
	createPhysicsPreSyncSystem,
	createPhysicsStepSystem,
	createTransformHistorySystem,
	musicStateFromAudioContentManifest,
	parseAudioContentManifest,
} from "../../engine/index.js";
import { audioContentManifestForRuntimeScene } from "../assets/index.js";
import {
	LevelLoader,
	defaultRuntimeSceneManifest,
	defaultRuntimeSceneManifests,
} from "../levels/index.js";
import { PrefabRegistry, STABLE_ID_COMPONENT } from "../prefabs/index.js";
import { createGameScene } from "../scenes/index.js";
import {
	type GameRuntimeUiState,
	RUNTIME_SCENE_TRANSITION_RESOURCE,
	type RuntimeSceneTransitionPort,
	createCharacterMotorSystem,
	createCharacterMovementSystem,
	createChargedActionSystem,
	createCollectibleSystem,
	createFirstPersonLookSystem,
	createGameplayActionMap,
	createInteractionCommandSystem,
	createInteractionTargetSelectionSystem,
	createMovementCommandSystem,
	createPlayerCameraSystem,
	createPlayerChargeLightFeedbackSystem,
	createPlayerInputSystem,
	createPortalActivationSystem,
	createPortalProximitySystem,
	createStoryNoteActivationSystem,
	createStoryNoteProximitySystem,
	createTerrainStreamingSystem,
	selectGameRuntimeUiState,
} from "../systems/index.js";

export type GameRendererPort = RendererPort &
	LightRendererPort &
	ReflectionProbeRendererPort &
	WaterSurfaceRendererPort &
	SceneEnvironmentRendererPort &
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
};

export type MegamealGameRuntime = {
	readonly runtime: EngineRuntime;
	readonly sceneManager: SceneManager;
	runtimeUiState(): GameRuntimeUiState;
	dispose(): Promise<void>;
};

export async function createMegamealGameRuntime(
	options: MegamealGameRuntimeOptions,
): Promise<MegamealGameRuntime> {
	const runtime = new EngineRuntime();
	const sceneManager = new SceneManager();
	const initialRuntimeManifest =
		options.runtimeManifest ?? defaultRuntimeSceneManifest;
	const runtimeSceneCatalog = createRuntimeSceneCatalog(initialRuntimeManifest);
	const runtimeSceneManifests = [...runtimeSceneCatalog.values()];
	const musicSelectionCounts = new Map<string, number>();
	const physicsSync = new PhysicsSyncSystem({
		adapter: options.physics,
	});
	const renderSync = new RenderSyncSystem({ renderer: options.renderer });
	const lightSync = new LightSyncSystem({ renderer: options.renderer });
	const reflectionProbeSync = new ReflectionProbeSyncSystem({
		renderer: options.renderer,
	});
	const waterSurfaceSync = new WaterSurfaceSyncSystem({
		renderer: options.renderer,
	});
	const spatialAudio = audioSpatialPortFromOptions(options.audio);
	const audioSpatialSync = spatialAudio
		? createAudioSpatialSyncSystem({
				audio: spatialAudio,
				listenerResource: ACTIVE_CAMERA_POSE_RESOURCE,
				activeSceneId: () =>
					activeRuntimeSceneManifest?.level.sceneId ??
					activeRuntimeSceneManifest?.id,
			})
		: undefined;
	const audioEvents = options.audio
		? createAudioEventSystem({
				audio: options.audio,
				mappings: audioMappingsForRuntimeScenes(runtimeSceneManifests),
				activeSceneId: () =>
					activeRuntimeSceneManifest?.level.sceneId ??
					activeRuntimeSceneManifest?.id,
			})
		: undefined;
	let activeRuntimeSceneManifest: RuntimeSceneManifestData | undefined;
	let loadingRuntimeSceneId: string | undefined;
	const transitionPort: RuntimeSceneTransitionPort = {
		currentRuntimeSceneId() {
			return activeRuntimeSceneManifest?.id;
		},
		canLoadRuntimeScene(runtimeSceneId) {
			return runtimeSceneCatalog.has(runtimeSceneId);
		},
		requestRuntimeScene(runtimeSceneId) {
			if (
				loadingRuntimeSceneId !== undefined ||
				activeRuntimeSceneManifest?.id === runtimeSceneId
			) {
				return;
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
		},
		reloadRuntimeScene(runtimeSceneId) {
			const targetRuntimeSceneId =
				runtimeSceneId ?? activeRuntimeSceneManifest?.id;

			if (
				loadingRuntimeSceneId !== undefined ||
				targetRuntimeSceneId === undefined
			) {
				return;
			}

			void loadRuntimeScene(targetRuntimeSceneId).catch((error) => {
				runtime.events.emit({
					type: "RuntimeSceneTransitionFailed",
					runtimeSceneId: targetRuntimeSceneId,
					message:
						error instanceof Error
							? error.message
							: "Runtime scene reload failed.",
				});
			});
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
		createCharacterMovementSystem({ physics: options.physics }),
		{
			order: 10,
		},
	);
	runtime.scheduler.registerSystem("camera", createPlayerCameraSystem());
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
	runtime.scheduler.registerSystem("gameplay", createPortalActivationSystem(), {
		order: 20,
	});
	runtime.scheduler.registerSystem(
		"physics-pre-sync",
		createTerrainStreamingSystem(),
		{ order: -20 },
	);
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
	if (audioSpatialSync) {
		runtime.scheduler.registerSystem("render-sync", audioSpatialSync, {
			order: -90,
		});
	}
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
			id: "water-surface-sync",
			update({ interpolation, world, deltaSeconds, tick }) {
				waterSurfaceSync.update({
					...(interpolation === undefined ? {} : { interpolation }),
					...(deltaSeconds === undefined ? {} : { deltaSeconds }),
					...(tick === undefined ? {} : { tick }),
					world,
				});
			},
		},
		{ order: 30 },
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
		runtimeUiState() {
			return selectGameRuntimeUiState(runtime.world);
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
			waterSurfaceSync.detachAll();
			audioSpatialSync?.detachAll();
			options.renderer.clearSceneEnvironment();
			await sceneManager.unload(runtime.services);
			physicsSync.dispose();
			runtime.dispose();
		},
	};

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
		audioSpatialSync?.detachAll();
		physicsSync.dispose();
		options.audio?.setMusic({
			trackId: undefined,
			playing: false,
			volume: 0,
			fadeSeconds: runtimeSceneMusicFadeSeconds(nextRuntimeSceneManifest),
		});
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
					physicsReady: ({ terrainPackageStartupStableIds = [] } = {}) => {
						physicsSync.preSync(runtime.services);
						return requiredCollisionStableIdsReady(
							runtime.world,
							physicsSync,
							nextRuntimeSceneManifest,
							terrainPackageStartupStableIds,
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
): void {
	if (!audio) {
		return;
	}

	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{
			assetManifest: manifest.assets,
		},
	);
	const musicState = musicStateFromAudioContentManifest(audioContent, {
		selectionIndex,
	});

	if (isAudioMixerPort(audio)) {
		audio.configureMixerBuses(audioContent.mixerBuses ?? []);
	}

	if (!musicState) {
		return;
	}

	audio.setMusic({
		...musicState,
		sceneId: manifest.level.sceneId ?? manifest.id,
	});
}

function runtimeSceneMusicFadeSeconds(
	manifest: RuntimeSceneManifestData,
): number {
	const audioContent = parseAudioContentManifest(
		audioContentManifestForRuntimeScene(manifest.id),
		{
			assetManifest: manifest.assets,
		},
	);

	return audioContent.sceneMusic?.fadeSeconds ?? 0.75;
}

function nextMusicSelectionIndex(
	counts: Map<string, number>,
	runtimeSceneId: string,
): number {
	const nextIndex = counts.get(runtimeSceneId) ?? 0;
	counts.set(runtimeSceneId, nextIndex + 1);
	return nextIndex;
}

function createRuntimeSceneCatalog(
	initialRuntimeSceneManifest: RuntimeSceneManifestData,
): Map<string, RuntimeSceneManifestData> {
	const catalog = new Map<string, RuntimeSceneManifestData>();

	for (const manifest of defaultRuntimeSceneManifests) {
		catalog.set(manifest.id, manifest);
	}

	catalog.set(initialRuntimeSceneManifest.id, initialRuntimeSceneManifest);
	return catalog;
}

function audioMappingsForRuntimeScenes(
	manifests: readonly RuntimeSceneManifestData[],
) {
	return manifests.flatMap((manifest) =>
		audioEventMappingsFromManifest(
			parseAudioContentManifest(
				audioContentManifestForRuntimeScene(manifest.id),
				{
					assetManifest: manifest.assets,
				},
			),
		),
	);
}

function audioSpatialPortFromOptions(
	audio: AudioManagerPort | undefined,
): AudioSpatialPort | undefined {
	if (!audio || !isAudioSpatialPort(audio)) {
		return undefined;
	}

	return audio;
}

function isAudioMixerPort(
	audio: AudioManagerPort,
): audio is AudioManagerPort & AudioMixerPort {
	return (
		"configureMixerBuses" in audio &&
		typeof audio.configureMixerBuses === "function" &&
		"setMixerBusVolume" in audio &&
		typeof audio.setMixerBusVolume === "function"
	);
}

function isAudioSpatialPort(
	audio: AudioManagerPort,
): audio is AudioManagerPort & AudioSpatialPort {
	const candidate = audio as Partial<AudioSpatialPort>;

	return (
		typeof candidate.setListener === "function" &&
		typeof candidate.attachEmitter === "function" &&
		typeof candidate.updateEmitter === "function" &&
		typeof candidate.detachEmitter === "function" &&
		typeof candidate.detachAllEmitters === "function"
	);
}

function requiredCollisionStableIdsReady(
	world: EngineRuntime["world"],
	physicsSync: PhysicsSyncSystem,
	manifest: RuntimeSceneManifestData,
	additionalStableIds: readonly string[] = [],
): boolean {
	const requiredStableIds = [
		...(manifest.readiness.requiredCollisionStableIds ?? []),
		...(manifest.readiness.requiredWalkableStableIds ?? []),
		...additionalStableIds,
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
