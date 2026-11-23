import type { Entity } from "../../core/index.js";
import type { EngineEvent, EventBus, System } from "../../core/index.js";
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
	readonly loop?: boolean;
	readonly volume?: number;
	readonly autoplay?: boolean;
};

export type AudioEvent =
	| {
			readonly type: "PlaySound";
			readonly entity?: Entity;
			readonly soundId: string;
			readonly volume?: number;
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
	readonly sceneId?: string;
};

export type AudioSceneMusicData = {
	readonly trackId?: string;
	readonly trackIds?: readonly string[];
	readonly volume?: number;
	readonly autoplay?: boolean;
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
	readonly loop?: boolean;
	readonly sceneId?: string;
	readonly when?: (event: EngineEvent) => boolean;
};

export type AudioContentManifest = {
	readonly eventMappings: readonly AudioEventMappingData[];
	readonly sceneMusic?: AudioSceneMusicData;
};

export type AudioEventMappingData = {
	readonly id: string;
	readonly eventType: string;
	readonly soundId: string;
	readonly volume?: number;
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
		["eventMappings", "sceneMusic"],
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
	const mappingIds = new Set<string>();

	for (const [index, mapping] of data.eventMappings.entries()) {
		validateAudioEventMappingData(
			mapping,
			`audioContentManifest.eventMappings.${index}`,
			audioAssetIds,
			mappingIds,
			errors,
		);
	}

	validateAudioSceneMusicData(
		data.sceneMusic,
		"audioContentManifest.sceneMusic",
		audioAssetIds,
		errors,
	);

	return errors;
}

function validateAudioSceneMusicData(
	data: unknown,
	path: string,
	audioAssetIds: ReadonlySet<string>,
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
		["trackId", "trackIds", "volume", "autoplay"],
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

	if (data.autoplay !== undefined && typeof data.autoplay !== "boolean") {
		errors.push(`${path}.autoplay must be a boolean when provided.`);
	}
}

function validateAudioEventMappingData(
	data: unknown,
	path: string,
	audioAssetIds: ReadonlySet<string>,
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
		["id", "eventType", "soundId", "volume", "loop", "sceneId"],
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

	if (data.loop !== undefined && typeof data.loop !== "boolean") {
		errors.push(`${path}.loop must be a boolean when provided.`);
	}

	if (data.sceneId !== undefined) {
		requireString(data, "sceneId", `${path}.sceneId`, errors);
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
