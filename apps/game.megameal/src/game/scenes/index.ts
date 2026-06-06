import {
	type RuntimeSceneManifestData,
	type Scene,
	evaluateRuntimeSceneReadiness,
	loadRuntimeSceneManifest,
} from "../../engine/index.js";
import {
	AUDIO_MANAGER_RESOURCE,
	type AudioManagerPort,
	registerSceneAudioCleanup,
} from "../../engine/modules/audio/index.js";
import type { SceneScope } from "../../engine/modules/scene/index.js";
import {
	type LevelLoader,
	prototypeRuntimeSceneManifest,
} from "../levels/index.js";
import {
	ACTIVE_INTERACTION_TARGET_RESOURCE,
	ACTIVE_PORTAL_RESOURCE,
	ACTIVE_STORY_NOTE_RESOURCE,
	COLLECTED_COUNT_RESOURCE,
	OPEN_STORY_NOTE_RESOURCE,
	PLAYER_ENTITY_RESOURCE,
	TOTAL_COLLECTIBLES_RESOURCE,
} from "../systems/index.js";

export type GameSceneOptions = {
	readonly id?: string;
	readonly levelLoader: LevelLoader;
	readonly runtimeManifest?: RuntimeSceneManifestData;
	readonly physicsReady: () => boolean;
};

export function createGameScene(options: GameSceneOptions): Scene {
	const manifest = loadRuntimeSceneManifest(
		options.runtimeManifest ?? prototypeRuntimeSceneManifest,
	);
	const sceneId = options.id ?? manifest.level.sceneId ?? manifest.id;

	return {
		id: sceneId,
		async load({ world }) {
			const scope = world.requireResource<SceneScope>(`scene:${sceneId}:scope`);
			const audio = world.getResource<AudioManagerPort>(AUDIO_MANAGER_RESOURCE);

			if (audio) {
				registerSceneAudioCleanup(scope, audio, sceneId);
			}

			const result = await options.levelLoader.loadDefinition(
				world,
				manifest.level,
				{
					scope,
				},
			);
			const playerSpawned = result.spawned.some(
				(spawned) => spawned.stableId === manifest.readiness.playerStableId,
			);
			const readiness = evaluateRuntimeSceneReadiness(manifest, {
				levelId: result.levelId,
				...(result.sceneId ? { sceneId: result.sceneId } : {}),
				preloadedAssetIds: result.preloadedAssets,
				spawned: result.spawned.map((spawned) => ({
					prefabId: spawned.prefabId,
					stableId: spawned.stableId,
				})),
				physicsReady: options.physicsReady(),
				playerReady: playerSpawned,
			});

			if (!readiness.ok) {
				throw new Error(
					`Runtime scene manifest "${manifest.id}" is not ready: ${readiness.errors.join("; ")}`,
				);
			}

			const player = result.spawned.find(
				(spawned) => spawned.stableId === readiness.playerStableId,
			);

			if (!player) {
				throw new Error(
					`Runtime scene manifest "${manifest.id}" did not spawn player "${readiness.playerStableId}".`,
				);
			}

			world.setResource(PLAYER_ENTITY_RESOURCE, player.entity);
			scope.registerCleanup(() => {
				world.removeResource(PLAYER_ENTITY_RESOURCE);
				world.removeResource(ACTIVE_INTERACTION_TARGET_RESOURCE);
				world.removeResource(ACTIVE_PORTAL_RESOURCE);
				world.removeResource(ACTIVE_STORY_NOTE_RESOURCE);
				world.removeResource(OPEN_STORY_NOTE_RESOURCE);
				world.removeResource(COLLECTED_COUNT_RESOURCE);
				world.removeResource(TOTAL_COLLECTIBLES_RESOURCE);
			});
		},
		activate() {},
		deactivate() {},
		unload() {},
	};
}
