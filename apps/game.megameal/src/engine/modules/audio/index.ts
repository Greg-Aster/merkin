import type { Entity } from "../../core/index.js";
import type { EngineEvent, EventBus, System, World } from "../../core/index.js";
import {
	type Quat,
	type Vec3,
	rotateVec3ByQuat,
	vec3,
} from "../../math/index.js";
import type { AssetManifest } from "../assets/index.js";

export const AUDIO_LISTENER_COMPONENT = "AudioListener";
export const SOUND_EMITTER_COMPONENT = "SoundEmitter";
export const AUDIO_MANAGER_RESOURCE = "audio";

export type AudioListenerComponent = {
	readonly active: boolean;
	readonly gain?: number;
};

export type SoundEmitterComponent = {
	readonly soundId: string;
	readonly active?: boolean;
	readonly loop?: boolean;
	readonly volume?: number;
	readonly busId?: string;
	readonly autoplay?: boolean;
	readonly sceneId?: string;
	readonly refDistance?: number;
	readonly maxDistance?: number;
	readonly rolloffFactor?: number;
	readonly distanceModel?: AudioDistanceModel;
	readonly coneInnerAngle?: number;
	readonly coneOuterAngle?: number;
	readonly coneOuterGain?: number;
};

export type AudioDistanceModel = "inverse" | "linear" | "exponential";

export type AudioSpatialOrientation = {
	readonly forward: Vec3;
	readonly up: Vec3;
};

export type AudioListenerState = AudioSpatialOrientation & {
	readonly position: Vec3;
	readonly gain?: number;
};

export type AudioSpatialEmitterState = AudioSpatialOrientation & {
	readonly entity: Entity;
	readonly soundId: string;
	readonly position: Vec3;
	readonly volume: number;
	readonly busId?: string;
	readonly loop: boolean;
	readonly sceneId?: string;
	readonly refDistance: number;
	readonly maxDistance: number;
	readonly rolloffFactor: number;
	readonly distanceModel: AudioDistanceModel;
	readonly coneInnerAngle?: number;
	readonly coneOuterAngle?: number;
	readonly coneOuterGain?: number;
};

export type AudioEvent =
	| {
			readonly type: "PlaySound";
			readonly entity?: Entity;
			readonly soundId: string;
			readonly volume?: number;
			readonly busId?: string;
			readonly loop?: boolean;
			readonly sceneId?: string;
	  }
	| {
			readonly type: "StopSound";
			readonly entity?: Entity;
			readonly soundId: string;
			readonly sceneId?: string;
	  }
	| {
			readonly type: "StopSceneAudio";
			readonly sceneId: string;
	  }
	| {
			readonly type: "SetMusic";
			readonly state: MusicState;
	  };

export type MusicState = {
	readonly trackId: string | undefined;
	readonly playing: boolean;
	readonly volume: number;
	readonly busId?: string;
	readonly sceneId?: string;
	readonly fadeSeconds?: number;
};

export type AudioSceneMusicData = {
	readonly trackId?: string;
	readonly trackIds?: readonly string[];
	readonly volume?: number;
	readonly busId?: string;
	readonly autoplay?: boolean;
	readonly fadeSeconds?: number;
};

export type AudioMixerBusData = {
	readonly id: string;
	readonly volume: number;
};

export type AudioUnlockState = "unlocked" | "blocked" | "unavailable";

export type AudioPlaybackHandle = {
	readonly id: string;
	readonly soundId: string;
	readonly sceneId?: string;
	stop(): void;
	dispose(): void;
};

export type AudioManagerStats = {
	readonly unlocked: boolean;
	readonly loadedSounds: number;
	readonly activeSounds: number;
	readonly musicTrackId?: string;
};

export type AudioManagerPort = {
	unlock(): Promise<AudioUnlockState>;
	registerSound(soundId: string, audioAsset: unknown): void;
	unregisterSound(soundId: string): void;
	hasSound(soundId: string): boolean;
	play(
		event: Extract<AudioEvent, { readonly type: "PlaySound" }>,
	): AudioPlaybackHandle | undefined;
	stop(event: Extract<AudioEvent, { readonly type: "StopSound" }>): void;
	stopScene(sceneId: string): void;
	stopAll(): void;
	setMusic(state: MusicState): void;
	stats(): AudioManagerStats;
	dispose(): void;
};

export type AudioMixerPort = {
	configureMixerBuses(buses: readonly AudioMixerBusData[]): void;
	setMixerBusVolume(busId: string, volume: number): void;
};

export type AudioSpatialPort = {
	setListener(state: AudioListenerState): void;
	attachEmitter(
		entity: Entity,
		state: AudioSpatialEmitterState,
	): AudioPlaybackHandle | undefined;
	updateEmitter(entity: Entity, state: AudioSpatialEmitterState): void;
	detachEmitter(entity: Entity): void;
	detachAllEmitters(): void;
};

export type AudioTransformComponent = {
	readonly position: Vec3;
	readonly rotation: Quat;
	readonly scale?: Vec3;
};

export type AudioPoseResource = {
	readonly position: Vec3;
	readonly rotation: Quat;
};

export type AudioSpatialSyncContext = {
	readonly world: World;
	readonly interpolation?: number;
};

export type AudioSpatialSyncSystemOptions = {
	readonly audio: AudioSpatialPort;
	readonly listenerResource?: string;
	readonly transformComponent?: string;
	readonly previousTransformComponent?: string;
	readonly listenerComponent?: string;
	readonly emitterComponent?: string;
	readonly activeSceneId?: () => string | undefined;
};

export type AudioSpatialSyncSystemHandle<
	TContext extends AudioSpatialSyncContext,
> = System<TContext> & {
	detach(entity: Entity): void;
	detachAll(): void;
	hasEmitter(entity: Entity): boolean;
};

export type AudioSceneScope = {
	readonly sceneId: string;
	registerAudioNode(dispose: () => void): void;
};

export function registerSceneAudioCleanup(
	scope: AudioSceneScope,
	audio: Pick<AudioManagerPort, "stopScene">,
	sceneId = scope.sceneId,
): void {
	scope.registerAudioNode(() => audio.stopScene(sceneId));
}

export type AudioEventMapping = {
	readonly eventType: string;
	readonly soundId: string;
	readonly volume?: number;
	readonly busId?: string;
	readonly loop?: boolean;
	readonly sceneId?: string;
	readonly when?: (event: EngineEvent) => boolean;
};

export type AudioContentManifest = {
	readonly mixerBuses?: readonly AudioMixerBusData[];
	readonly eventMappings: readonly AudioEventMappingData[];
	readonly sceneMusic?: AudioSceneMusicData;
};

export type AudioEventMappingData = {
	readonly id: string;
	readonly eventType: string;
	readonly soundId: string;
	readonly volume?: number;
	readonly busId?: string;
	readonly loop?: boolean;
	readonly sceneId?: string;
};

export type AudioContentManifestValidationResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export type AudioEventSystemOptions = {
	readonly audio: AudioManagerPort;
	readonly mappings?: readonly AudioEventMapping[];
	readonly activeSceneId?: () => string | undefined;
};

export class AudioEventSystem {
	readonly audio: AudioManagerPort;
	readonly mappings: readonly AudioEventMapping[];
	readonly activeSceneId: (() => string | undefined) | undefined;

	constructor(options: AudioEventSystemOptions) {
		this.audio = options.audio;
		this.mappings = options.mappings ?? [];
		this.activeSceneId = options.activeSceneId;
	}

	handle(event: EngineEvent): void {
		if (isAudioEvent(event)) {
			this.handleAudioEvent(event);
			return;
		}

		for (const mapping of this.mappings) {
			if (event.type !== mapping.eventType) {
				continue;
			}

			if (mapping.when && !mapping.when(event)) {
				continue;
			}

			const eventSceneId =
				typeof event.sceneId === "string" ? event.sceneId : undefined;
			const activeSceneId = this.activeSceneId?.();
			const mappingSceneContext = eventSceneId ?? activeSceneId;

			if (mapping.sceneId !== undefined) {
				if (
					mappingSceneContext === undefined ||
					mapping.sceneId !== mappingSceneContext
				) {
					continue;
				}
			}

			const sceneId = eventSceneId ?? mapping.sceneId;

			this.audio.play({
				type: "PlaySound",
				soundId: mapping.soundId,
				...(typeof event.entity === "number" ? { entity: event.entity } : {}),
				...(typeof mapping.volume === "number"
					? { volume: mapping.volume }
					: {}),
				...(typeof mapping.busId === "string" ? { busId: mapping.busId } : {}),
				...(typeof mapping.loop === "boolean" ? { loop: mapping.loop } : {}),
				...(sceneId === undefined ? {} : { sceneId }),
			});
		}
	}

	connect(events: EventBus, scope?: AudioSceneScope): () => void {
		const unsubscribe = events.subscribe((event) => this.handle(event));

		if (scope) {
			scope.registerAudioNode(unsubscribe);
		}

		return unsubscribe;
	}

	asSystem<TContext extends { readonly events: EventBus }>(): System<TContext> {
		return {
			id: "audio-events",
			update: ({ events }) => {
				for (const event of events.peek()) {
					this.handle(event);
				}
			},
		};
	}

	private handleAudioEvent(event: AudioEvent): void {
		switch (event.type) {
			case "PlaySound":
				this.audio.play(event);
				break;
			case "StopSound":
				this.audio.stop(event);
				break;
			case "StopSceneAudio":
				this.audio.stopScene(event.sceneId);
				break;
			case "SetMusic":
				this.audio.setMusic(event.state);
				break;
		}
	}
}

export function createAudioEventSystem(
	options: AudioEventSystemOptions,
): AudioEventSystem {
	return new AudioEventSystem(options);
}

export function createAudioSpatialSyncSystem<
	TContext extends AudioSpatialSyncContext,
>(
	options: AudioSpatialSyncSystemOptions,
): AudioSpatialSyncSystemHandle<TContext> {
	const transformComponent = options.transformComponent ?? "Transform";
	const previousTransformComponent =
		options.previousTransformComponent ?? "PreviousTransform";
	const listenerComponent =
		options.listenerComponent ?? AUDIO_LISTENER_COMPONENT;
	const emitterComponent = options.emitterComponent ?? SOUND_EMITTER_COMPONENT;
	const attachedEmitters = new Set<Entity>();
	const emitterKeys = new Map<Entity, string>();

	const system = {
		id: "audio-spatial-sync",
		reads: [
			transformComponent,
			previousTransformComponent,
			listenerComponent,
			emitterComponent,
			...(options.listenerResource ? [options.listenerResource] : []),
		],
		update(context) {
			const listener = listenerStateFromWorld(context.world, {
				transformComponent,
				listenerComponent,
				...(options.listenerResource !== undefined
					? { listenerResource: options.listenerResource }
					: {}),
			});

			if (listener) {
				options.audio.setListener(listener);
			}

			const activeEmitters = new Set<Entity>();

			for (const entity of context.world.query([
				transformComponent,
				emitterComponent,
			])) {
				const emitter = context.world.requireComponent<SoundEmitterComponent>(
					entity,
					emitterComponent,
				);

				if (emitter.active === false || emitter.autoplay === false) {
					continue;
				}

				const transform =
					context.world.requireComponent<AudioTransformComponent>(
						entity,
						transformComponent,
					);
				const previousTransform =
					context.world.getComponent<AudioTransformComponent>(
						entity,
						previousTransformComponent,
					);
				const spatialTransform =
					previousTransform && context.interpolation !== undefined
						? interpolateAudioTransform(
								previousTransform,
								transform,
								context.interpolation,
							)
						: transform;
				const state = spatialEmitterStateFromComponent(
					entity,
					emitter,
					spatialTransform,
					options.activeSceneId?.(),
				);
				const key = spatialEmitterKey(state);

				activeEmitters.add(entity);

				if (!attachedEmitters.has(entity)) {
					options.audio.attachEmitter(entity, state);
					attachedEmitters.add(entity);
					emitterKeys.set(entity, key);
					continue;
				}

				if (emitterKeys.get(entity) !== key) {
					options.audio.detachEmitter(entity);
					options.audio.attachEmitter(entity, state);
					emitterKeys.set(entity, key);
					continue;
				}

				options.audio.updateEmitter(entity, state);
			}

			for (const entity of [...attachedEmitters]) {
				if (!activeEmitters.has(entity)) {
					detach(entity);
				}
			}
		},
		detach,
		detachAll() {
			for (const entity of [...attachedEmitters]) {
				detach(entity);
			}
			options.audio.detachAllEmitters();
		},
		hasEmitter(entity) {
			return attachedEmitters.has(entity);
		},
	} satisfies AudioSpatialSyncSystemHandle<TContext>;

	return system;

	function detach(entity: Entity): void {
		if (!attachedEmitters.delete(entity)) {
			return;
		}

		emitterKeys.delete(entity);
		options.audio.detachEmitter(entity);
	}
}

export function validateAudioContentManifest(
	manifest: unknown,
	options: {
		readonly assetManifest: AssetManifest;
	},
): AudioContentManifestValidationResult {
	const errors = validateAudioContentManifestData(
		manifest,
		options.assetManifest,
	);

	return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function parseAudioContentManifest(
	manifest: unknown,
	options: {
		readonly assetManifest: AssetManifest;
	},
): AudioContentManifest {
	const errors = validateAudioContentManifestData(
		manifest,
		options.assetManifest,
	);

	if (errors.length > 0) {
		throw new Error(
			`AudioContentManifest validation failed: ${errors.join("; ")}`,
		);
	}

	return manifest as AudioContentManifest;
}

export function audioEventMappingsFromManifest(
	manifest: AudioContentManifest,
): readonly AudioEventMapping[] {
	return manifest.eventMappings.map((mapping) => ({
		eventType: mapping.eventType,
		soundId: mapping.soundId,
		...(mapping.volume === undefined ? {} : { volume: mapping.volume }),
		...(mapping.busId === undefined ? {} : { busId: mapping.busId }),
		...(mapping.loop === undefined ? {} : { loop: mapping.loop }),
		...(mapping.sceneId === undefined ? {} : { sceneId: mapping.sceneId }),
	}));
}

export function musicStateFromAudioContentManifest(
	manifest: AudioContentManifest,
	options: {
		readonly selectionIndex?: number;
	} = {},
): MusicState | undefined {
	if (!manifest.sceneMusic) {
		return undefined;
	}

	const trackIds = sceneMusicTrackIds(manifest.sceneMusic);

	if (trackIds.length === 0) {
		return undefined;
	}

	const selectionIndex = options.selectionIndex ?? 0;
	const trackId = trackIds[selectionIndex % trackIds.length];

	return {
		trackId,
		playing: manifest.sceneMusic.autoplay ?? true,
		volume: manifest.sceneMusic.volume ?? 1,
		...(manifest.sceneMusic.busId === undefined
			? {}
			: { busId: manifest.sceneMusic.busId }),
		...(manifest.sceneMusic.fadeSeconds === undefined
			? {}
			: { fadeSeconds: manifest.sceneMusic.fadeSeconds }),
	};
}

export function sceneMusicTrackIds(
	sceneMusic: AudioSceneMusicData | undefined,
): readonly string[] {
	if (!sceneMusic) {
		return [];
	}

	if (sceneMusic.trackIds) {
		return sceneMusic.trackIds;
	}

	return sceneMusic.trackId ? [sceneMusic.trackId] : [];
}

function listenerStateFromWorld(
	world: World,
	options: {
		readonly listenerResource?: string;
		readonly transformComponent: string;
		readonly listenerComponent: string;
	},
): AudioListenerState | undefined {
	if (options.listenerResource) {
		const pose = world.getResource<AudioPoseResource>(options.listenerResource);

		if (pose) {
			return audioListenerStateFromPose(pose);
		}
	}

	for (const entity of world.query([
		options.transformComponent,
		options.listenerComponent,
	])) {
		const listener = world.requireComponent<AudioListenerComponent>(
			entity,
			options.listenerComponent,
		);

		if (listener.active === false) {
			continue;
		}

		const transform = world.requireComponent<AudioTransformComponent>(
			entity,
			options.transformComponent,
		);

		return {
			...audioListenerStateFromPose(transform),
			...(listener.gain === undefined ? {} : { gain: listener.gain }),
		};
	}

	return undefined;
}

function audioListenerStateFromPose(
	pose: AudioPoseResource,
): AudioListenerState {
	return {
		position: pose.position,
		...orientationFromRotation(pose.rotation),
	};
}

function spatialEmitterStateFromComponent(
	entity: Entity,
	emitter: SoundEmitterComponent,
	transform: AudioTransformComponent,
	activeSceneId: string | undefined,
): AudioSpatialEmitterState {
	const sceneId = emitter.sceneId ?? activeSceneId;

	return {
		entity,
		soundId: emitter.soundId,
		position: transform.position,
		...orientationFromRotation(transform.rotation),
		volume: emitter.volume ?? 1,
		...(emitter.busId === undefined ? {} : { busId: emitter.busId }),
		loop: emitter.loop ?? true,
		...(sceneId === undefined ? {} : { sceneId }),
		refDistance: emitter.refDistance ?? 1,
		maxDistance: emitter.maxDistance ?? 24,
		rolloffFactor: emitter.rolloffFactor ?? 1,
		distanceModel: emitter.distanceModel ?? "inverse",
		...(emitter.coneInnerAngle === undefined
			? {}
			: { coneInnerAngle: emitter.coneInnerAngle }),
		...(emitter.coneOuterAngle === undefined
			? {}
			: { coneOuterAngle: emitter.coneOuterAngle }),
		...(emitter.coneOuterGain === undefined
			? {}
			: { coneOuterGain: emitter.coneOuterGain }),
	};
}

function orientationFromRotation(rotation: Quat): AudioSpatialOrientation {
	return {
		forward: rotateVec3ByQuat(vec3(0, 0, -1), rotation),
		up: rotateVec3ByQuat(vec3(0, 1, 0), rotation),
	};
}

function interpolateAudioTransform(
	previous: AudioTransformComponent,
	current: AudioTransformComponent,
	interpolation: number,
): AudioTransformComponent {
	const t = Math.max(0, Math.min(1, interpolation));

	return {
		position: {
			x: previous.position.x + (current.position.x - previous.position.x) * t,
			y: previous.position.y + (current.position.y - previous.position.y) * t,
			z: previous.position.z + (current.position.z - previous.position.z) * t,
		},
		rotation: current.rotation,
		...(current.scale === undefined ? {} : { scale: current.scale }),
	};
}

function spatialEmitterKey(state: AudioSpatialEmitterState): string {
	return [
		state.soundId,
		state.loop ? "loop" : "oneshot",
		state.busId ?? "",
		state.sceneId ?? "",
		state.distanceModel,
		state.refDistance,
		state.maxDistance,
		state.rolloffFactor,
		state.coneInnerAngle ?? "",
		state.coneOuterAngle ?? "",
		state.coneOuterGain ?? "",
	].join("|");
}

function isAudioEvent(event: EngineEvent): event is AudioEvent {
	return (
		event.type === "PlaySound" ||
		event.type === "StopSound" ||
		event.type === "StopSceneAudio" ||
		event.type === "SetMusic"
	);
}

function validateAudioContentManifestData(
	data: unknown,
	assetManifest: AssetManifest,
): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["audioContentManifest must be an object."];
	}

	validateAllowedKeys(
		data,
		"audioContentManifest",
		["mixerBuses", "eventMappings", "sceneMusic"],
		errors,
	);

	if (!Array.isArray(data.eventMappings)) {
		errors.push("audioContentManifest.eventMappings must be an array.");
		return errors;
	}

	const audioAssetIds = new Set(
		assetManifest.assets
			.filter((asset) => asset.kind === "audio")
			.map((asset) => asset.id),
	);
	const mixerBusIds = validateAudioMixerBusData(
		data.mixerBuses,
		"audioContentManifest.mixerBuses",
		errors,
	);
	const mappingIds = new Set<string>();

	for (const [index, mapping] of data.eventMappings.entries()) {
		validateAudioEventMappingData(
			mapping,
			`audioContentManifest.eventMappings.${index}`,
			audioAssetIds,
			mixerBusIds,
			mappingIds,
			errors,
		);
	}

	validateAudioSceneMusicData(
		data.sceneMusic,
		"audioContentManifest.sceneMusic",
		audioAssetIds,
		mixerBusIds,
		errors,
	);

	return errors;
}

function validateAudioSceneMusicData(
	data: unknown,
	path: string,
	audioAssetIds: ReadonlySet<string>,
	mixerBusIds: ReadonlySet<string>,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateAllowedKeys(
		data,
		path,
		["trackId", "trackIds", "volume", "busId", "autoplay", "fadeSeconds"],
		errors,
	);

	const hasTrackId = data.trackId !== undefined;
	const hasTrackIds = data.trackIds !== undefined;

	if (hasTrackId === hasTrackIds) {
		errors.push(`${path} must provide exactly one of trackId or trackIds.`);
	}

	if (hasTrackId) {
		requireString(data, "trackId", `${path}.trackId`, errors);

		if (typeof data.trackId === "string" && data.trackId.length > 0) {
			if (!audioAssetIds.has(data.trackId)) {
				errors.push(
					`${path}.trackId references unknown audio asset "${data.trackId}".`,
				);
			}
		}
	}

	if (hasTrackIds) {
		if (!Array.isArray(data.trackIds) || data.trackIds.length === 0) {
			errors.push(`${path}.trackIds must be a non-empty array when provided.`);
		} else {
			const seenTrackIds = new Set<string>();

			for (const [index, trackId] of data.trackIds.entries()) {
				if (typeof trackId !== "string" || trackId.length === 0) {
					errors.push(`${path}.trackIds.${index} must be a non-empty string.`);
					continue;
				}

				if (seenTrackIds.has(trackId)) {
					errors.push(
						`${path}.trackIds contains duplicate track "${trackId}".`,
					);
				}

				seenTrackIds.add(trackId);

				if (!audioAssetIds.has(trackId)) {
					errors.push(
						`${path}.trackIds.${index} references unknown audio asset "${trackId}".`,
					);
				}
			}
		}
	}

	if (data.volume !== undefined) {
		validateAudioUnitValue(data.volume, `${path}.volume`, errors);
	}

	validateOptionalAudioBusId(data.busId, `${path}.busId`, mixerBusIds, errors);

	if (data.autoplay !== undefined && typeof data.autoplay !== "boolean") {
		errors.push(`${path}.autoplay must be a boolean when provided.`);
	}

	if (data.fadeSeconds !== undefined) {
		validateAudioDurationSeconds(
			data.fadeSeconds,
			`${path}.fadeSeconds`,
			errors,
		);
	}
}

function validateAudioEventMappingData(
	data: unknown,
	path: string,
	audioAssetIds: ReadonlySet<string>,
	mixerBusIds: ReadonlySet<string>,
	mappingIds: Set<string>,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateAllowedKeys(
		data,
		path,
		["id", "eventType", "soundId", "volume", "busId", "loop", "sceneId"],
		errors,
	);
	requireString(data, "id", `${path}.id`, errors);
	requireString(data, "eventType", `${path}.eventType`, errors);
	requireString(data, "soundId", `${path}.soundId`, errors);

	if (typeof data.id === "string" && data.id.length > 0) {
		if (mappingIds.has(data.id)) {
			errors.push(
				`audioContentManifest.eventMappings contains duplicate mapping "${data.id}".`,
			);
		}

		mappingIds.add(data.id);
	}

	if (typeof data.soundId === "string" && data.soundId.length > 0) {
		if (!audioAssetIds.has(data.soundId)) {
			errors.push(
				`${path}.soundId references unknown audio asset "${data.soundId}".`,
			);
		}
	}

	if (data.volume !== undefined) {
		validateAudioUnitValue(data.volume, `${path}.volume`, errors);
	}

	validateOptionalAudioBusId(data.busId, `${path}.busId`, mixerBusIds, errors);

	if (data.loop !== undefined && typeof data.loop !== "boolean") {
		errors.push(`${path}.loop must be a boolean when provided.`);
	}

	if (data.sceneId !== undefined) {
		requireString(data, "sceneId", `${path}.sceneId`, errors);
	}
}

function validateAudioMixerBusData(
	data: unknown,
	path: string,
	errors: string[],
): ReadonlySet<string> {
	const busIds = new Set<string>();

	if (data === undefined) {
		return busIds;
	}

	if (!Array.isArray(data)) {
		errors.push(`${path} must be an array when provided.`);
		return busIds;
	}

	for (const [index, bus] of data.entries()) {
		const busPath = `${path}.${index}`;

		if (!isRecord(bus)) {
			errors.push(`${busPath} must be an object.`);
			continue;
		}

		validateAllowedKeys(bus, busPath, ["id", "volume"], errors);
		requireString(bus, "id", `${busPath}.id`, errors);

		if (typeof bus.id === "string" && bus.id.length > 0) {
			if (busIds.has(bus.id)) {
				errors.push(`${path} contains duplicate bus "${bus.id}".`);
			}

			busIds.add(bus.id);
		}

		validateAudioUnitValue(bus.volume, `${busPath}.volume`, errors);
	}

	return busIds;
}

function validateOptionalAudioBusId(
	value: unknown,
	path: string,
	mixerBusIds: ReadonlySet<string>,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string when provided.`);
		return;
	}

	if (!mixerBusIds.has(value)) {
		errors.push(`${path} references unknown mixer bus "${value}".`);
	}
}

function validateAudioUnitValue(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number from 0 to 1.`);
	}
}

function validateAudioDurationSeconds(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 30
	) {
		errors.push(`${path} must be a finite number from 0 to 30.`);
	}
}

function requireString(
	data: Record<string, unknown>,
	key: string,
	path: string,
	errors: string[],
): void {
	if (typeof data[key] !== "string" || data[key].length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function validateAllowedKeys(
	data: Record<string, unknown>,
	path: string,
	allowedKeys: readonly string[],
	errors: string[],
): void {
	const allowed = new Set(allowedKeys);

	for (const key of Object.keys(data)) {
		if (!allowed.has(key)) {
			errors.push(`${path}.${key} is not a supported audio manifest field.`);
		}
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
