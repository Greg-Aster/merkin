import type { Vec3 } from "../../math/index.js";
import type {
	AssetDisposer,
	AssetLoader,
	AssetManifestEntry,
} from "../../modules/assets/index.js";
import type {
	AudioListenerState,
	AudioManagerPort,
	AudioManagerStats,
	AudioMixerBusData,
	AudioMixerPort,
	AudioPlaybackHandle,
	AudioSpatialEmitterState,
	AudioSpatialPort,
	AudioUnlockState,
	MusicState,
} from "../../modules/audio/index.js";

export type BrowserAudioBufferLike = {
	readonly duration?: number;
};

export type BrowserAudioParamLike = {
	value: number;
	setValueAtTime?(value: number, time: number): void;
	linearRampToValueAtTime?(value: number, time: number): void;
};

export type BrowserAudioNodeLike = {
	connect(destination: BrowserAudioNodeLike): BrowserAudioNodeLike | undefined;
	disconnect(): void;
};

export type BrowserGainNodeLike = BrowserAudioNodeLike & {
	readonly gain: BrowserAudioParamLike;
};

export type BrowserPannerNodeLike = BrowserAudioNodeLike & {
	distanceModel: DistanceModelType;
	refDistance: number;
	maxDistance: number;
	rolloffFactor: number;
	coneInnerAngle: number;
	coneOuterAngle: number;
	coneOuterGain: number;
	panningModel?: PanningModelType;
	readonly positionX?: BrowserAudioParamLike;
	readonly positionY?: BrowserAudioParamLike;
	readonly positionZ?: BrowserAudioParamLike;
	readonly orientationX?: BrowserAudioParamLike;
	readonly orientationY?: BrowserAudioParamLike;
	readonly orientationZ?: BrowserAudioParamLike;
	setPosition?(x: number, y: number, z: number): void;
	setOrientation?(x: number, y: number, z: number): void;
};

export type BrowserAudioBufferSourceNodeLike = BrowserAudioNodeLike & {
	buffer: BrowserAudioBufferLike | null;
	loop: boolean;
	playbackRate?: BrowserAudioParamLike;
	onended: ((event?: Event) => void) | null;
	start(when?: number): void;
	stop(when?: number): void;
};

export type BrowserAudioContextLike = {
	readonly destination: BrowserAudioNodeLike;
	readonly currentTime: number;
	readonly state: AudioContextState | "closed" | "running" | "suspended";
	readonly listener?: BrowserAudioListenerLike;
	createGain(): BrowserGainNodeLike;
	createBufferSource(): BrowserAudioBufferSourceNodeLike;
	createPanner?(): BrowserPannerNodeLike;
	decodeAudioData(data: ArrayBuffer): Promise<BrowserAudioBufferLike>;
	resume(): Promise<void>;
	close(): Promise<void>;
};

export type BrowserAudioListenerLike = {
	readonly positionX?: BrowserAudioParamLike;
	readonly positionY?: BrowserAudioParamLike;
	readonly positionZ?: BrowserAudioParamLike;
	readonly forwardX?: BrowserAudioParamLike;
	readonly forwardY?: BrowserAudioParamLike;
	readonly forwardZ?: BrowserAudioParamLike;
	readonly upX?: BrowserAudioParamLike;
	readonly upY?: BrowserAudioParamLike;
	readonly upZ?: BrowserAudioParamLike;
	setPosition?(x: number, y: number, z: number): void;
	setOrientation?(
		forwardX: number,
		forwardY: number,
		forwardZ: number,
		upX: number,
		upY: number,
		upZ: number,
	): void;
};

export type BrowserAudioContextFactory = () => BrowserAudioContextLike;

export type BrowserAudioManagerOptions = {
	readonly context?: BrowserAudioContextLike;
	readonly createContext?: BrowserAudioContextFactory;
	readonly fetch?: typeof fetch;
	readonly masterVolume?: number;
};

export type BrowserAudioAsset = {
	readonly kind: "browser:audio-buffer";
	readonly entry: AssetManifestEntry;
	readonly buffer: BrowserAudioBufferLike;
};

type PlaybackRecord = {
	readonly id: string;
	readonly soundId: string;
	readonly sceneId?: string;
	readonly busId?: string;
	readonly emitterEntity?: number;
	readonly source: BrowserAudioBufferSourceNodeLike;
	readonly gain: BrowserGainNodeLike;
	readonly panner?: BrowserPannerNodeLike;
	disposed: boolean;
	stopping: boolean;
};

let nextPlaybackId = 1;

export class BrowserAudioManager
	implements AudioManagerPort, AudioSpatialPort, AudioMixerPort
{
	readonly #context: BrowserAudioContextLike;
	readonly #fetch: typeof fetch;
	readonly #sounds = new Map<string, BrowserAudioBufferLike>();
	readonly #playbacks = new Map<string, PlaybackRecord>();
	readonly #emitterPlaybackIds = new Map<number, string>();
	readonly #busGains = new Map<string, BrowserGainNodeLike>();
	readonly #gestureCleanups: Array<() => void> = [];
	readonly #masterGain: BrowserGainNodeLike;
	#musicPlaybackId: string | undefined;
	#music: MusicState = {
		trackId: undefined,
		playing: false,
		volume: 1,
	};
	#disposed = false;

	constructor(options: BrowserAudioManagerOptions = {}) {
		this.#context =
			options.context ??
			options.createContext?.() ??
			createDefaultAudioContext();
		this.#fetch = options.fetch ?? getDefaultFetch();
		this.#masterGain = this.#context.createGain();
		setParam(this.#masterGain.gain, options.masterVolume ?? 1, this.#now());
		this.#masterGain.connect(this.#context.destination);
	}

	async unlock(): Promise<AudioUnlockState> {
		if (this.#disposed) {
			return "unavailable";
		}

		if (isAudioContextRunning(this.#context.state)) {
			return "unlocked";
		}

		try {
			await this.#context.resume();
		} catch {
			return "blocked";
		}

		return isAudioContextRunning(this.#context.state) ? "unlocked" : "blocked";
	}

	registerUnlockGestures(target: EventTarget = window): () => void {
		const unlock = () => {
			void this.unlock();
		};
		const options = {
			capture: true,
			passive: true,
		} satisfies AddEventListenerOptions;
		const events = ["pointerdown", "keydown", "touchstart"] as const;

		for (const event of events) {
			target.addEventListener(event, unlock, options);
		}

		const cleanup = () => {
			for (const event of events) {
				target.removeEventListener(event, unlock, options);
			}
		};

		this.#gestureCleanups.push(cleanup);
		return cleanup;
	}

	registerSound(soundId: string, audioAsset: unknown): void {
		if (!isAudioBufferLike(audioAsset)) {
			throw new Error(
				`Audio asset "${soundId}" is not a decoded audio buffer.`,
			);
		}

		this.#sounds.set(soundId, audioAsset);
	}

	unregisterSound(soundId: string): void {
		this.#sounds.delete(soundId);
		this.stop({ soundId });
	}

	hasSound(soundId: string): boolean {
		return this.#sounds.has(soundId);
	}

	async loadBuffer(
		soundId: string,
		url: string,
	): Promise<BrowserAudioBufferLike> {
		const response = await this.#fetch(url);

		if (!response.ok) {
			throw new Error(`Failed to load audio asset "${soundId}" from "${url}".`);
		}

		const data = await response.arrayBuffer();
		const buffer = await this.#context.decodeAudioData(data.slice(0));
		this.registerSound(soundId, buffer);
		return buffer;
	}

	createAssetLoader(): AssetLoader {
		return async (entry: AssetManifestEntry) => {
			const buffer = await this.loadBuffer(entry.id, entry.url);
			return {
				kind: "browser:audio-buffer",
				entry,
				buffer,
			} satisfies BrowserAudioAsset;
		};
	}

	play(event: {
		readonly soundId: string;
		readonly volume?: number;
		readonly busId?: string;
		readonly loop?: boolean;
		readonly sceneId?: string;
	}): AudioPlaybackHandle | undefined {
		this.#assertActive();
		void this.unlock();

		const source = this.#createSource(event.soundId);

		if (!source) {
			return undefined;
		}

		const gain = this.#context.createGain();
		const playbackId = `audio:${nextPlaybackId}`;
		nextPlaybackId += 1;

		setParam(gain.gain, event.volume ?? 1, this.#now());
		source.loop = event.loop ?? false;
		source.connect(gain);
		gain.connect(this.#outputForBus(event.busId));

		const record: PlaybackRecord = {
			id: playbackId,
			soundId: event.soundId,
			source,
			gain,
			disposed: false,
			stopping: false,
			...(event.busId === undefined ? {} : { busId: event.busId }),
			...(event.sceneId === undefined ? {} : { sceneId: event.sceneId }),
		};

		source.onended = () => {
			this.#releasePlayback(playbackId);
		};
		this.#playbacks.set(playbackId, record);
		source.start(this.#now());

		return {
			id: playbackId,
			soundId: event.soundId,
			...(event.sceneId === undefined ? {} : { sceneId: event.sceneId }),
			stop: () => this.#stopPlayback(playbackId),
			dispose: () => this.#stopPlayback(playbackId),
		};
	}

	stop(event: {
		readonly type?: "StopSound";
		readonly soundId: string;
		readonly sceneId?: string;
	}): void {
		for (const playback of [...this.#playbacks.values()]) {
			if (playback.soundId !== event.soundId) {
				continue;
			}

			if (event.sceneId !== undefined && playback.sceneId !== event.sceneId) {
				continue;
			}

			this.#stopPlayback(playback.id);
		}
	}

	stopScene(sceneId: string): void {
		for (const playback of [...this.#playbacks.values()]) {
			if (playback.sceneId === sceneId) {
				this.#stopPlayback(playback.id);
			}
		}
	}

	stopAll(): void {
		for (const playbackId of [...this.#playbacks.keys()]) {
			this.#stopPlayback(playbackId);
		}
	}

	setMusic(state: MusicState): void {
		this.#assertActive();

		const nextTrackId = state.playing ? state.trackId : undefined;
		const fadeSeconds = state.fadeSeconds ?? 0;

		if (this.#musicPlaybackId !== undefined) {
			const playback = this.#playbacks.get(this.#musicPlaybackId);

			if (
				playback !== undefined &&
				playback.soundId === nextTrackId &&
				playback.busId === state.busId
			) {
				rampParam(playback.gain.gain, state.volume, this.#now(), fadeSeconds);
				this.#music = state;
				return;
			}

			this.#fadeOutPlayback(this.#musicPlaybackId, fadeSeconds);
		}

		this.#musicPlaybackId = undefined;
		this.#music = state;

		if (nextTrackId === undefined) {
			return;
		}

		const playback = this.play({
			soundId: nextTrackId,
			volume: fadeSeconds > 0 ? 0 : state.volume,
			...(state.busId === undefined ? {} : { busId: state.busId }),
			loop: true,
			...(state.sceneId === undefined ? {} : { sceneId: state.sceneId }),
		});

		this.#musicPlaybackId = playback?.id;

		if (playback && fadeSeconds > 0) {
			const record = this.#playbacks.get(playback.id);
			if (record !== undefined) {
				rampParam(record.gain.gain, state.volume, this.#now(), fadeSeconds);
			}
		}
	}

	configureMixerBuses(buses: readonly AudioMixerBusData[]): void {
		this.#assertActive();

		for (const bus of buses) {
			this.setMixerBusVolume(bus.id, bus.volume);
		}
	}

	setMixerBusVolume(busId: string, volume: number): void {
		this.#assertActive();
		setParam(this.#gainForBus(busId).gain, volume, this.#now());
	}

	setListener(state: AudioListenerState): void {
		this.#assertActive();
		const listener = this.#context.listener;

		if (!listener) {
			return;
		}

		setAudioParam3(listener, "position", state.position, this.#now());
		setAudioListenerOrientation(listener, state, this.#now());
	}

	attachEmitter(
		entity: number,
		state: AudioSpatialEmitterState,
	): AudioPlaybackHandle | undefined {
		this.#assertActive();
		this.detachEmitter(entity);
		const playback = this.#playSpatialEmitter(state);

		if (!playback) {
			return undefined;
		}

		this.#emitterPlaybackIds.set(entity, playback.id);
		return playback;
	}

	updateEmitter(entity: number, state: AudioSpatialEmitterState): void {
		this.#assertActive();
		const playbackId = this.#emitterPlaybackIds.get(entity);

		if (!playbackId) {
			this.attachEmitter(entity, state);
			return;
		}

		const playback = this.#playbacks.get(playbackId);

		if (!playback || playback.soundId !== state.soundId) {
			this.attachEmitter(entity, state);
			return;
		}

		setParam(playback.gain.gain, state.volume, this.#now());

		if (playback.panner) {
			applyEmitterStateToPanner(playback.panner, state, this.#now());
		}
	}

	detachEmitter(entity: number): void {
		const playbackId = this.#emitterPlaybackIds.get(entity);

		if (!playbackId) {
			return;
		}

		this.#emitterPlaybackIds.delete(entity);
		this.#stopPlayback(playbackId);
	}

	detachAllEmitters(): void {
		for (const entity of [...this.#emitterPlaybackIds.keys()]) {
			this.detachEmitter(entity);
		}
	}

	stats(): AudioManagerStats {
		return {
			unlocked: isAudioContextRunning(this.#context.state),
			loadedSounds: this.#sounds.size,
			activeSounds: this.#playbacks.size,
			...(this.#music.trackId === undefined
				? {}
				: { musicTrackId: this.#music.trackId }),
		};
	}

	dispose(): void {
		if (this.#disposed) {
			return;
		}

		this.#disposed = true;
		for (const cleanup of this.#gestureCleanups.splice(0).reverse()) {
			cleanup();
		}
		this.stopAll();
		this.#emitterPlaybackIds.clear();
		this.#sounds.clear();
		this.#masterGain.disconnect();
		for (const busGain of this.#busGains.values()) {
			busGain.disconnect();
		}
		this.#busGains.clear();
		void this.#context.close();
	}

	#createSource(soundId: string): BrowserAudioBufferSourceNodeLike | undefined {
		const buffer = this.#sounds.get(soundId);

		if (!buffer) {
			return undefined;
		}

		const source = this.#context.createBufferSource();
		source.buffer = buffer;
		return source;
	}

	#playSpatialEmitter(
		state: AudioSpatialEmitterState,
	): AudioPlaybackHandle | undefined {
		void this.unlock();

		const source = this.#createSource(state.soundId);

		if (!source) {
			return undefined;
		}

		const gain = this.#context.createGain();
		const panner = this.#context.createPanner?.();
		const playbackId = `audio:${nextPlaybackId}`;
		nextPlaybackId += 1;

		setParam(gain.gain, state.volume, this.#now());
		source.loop = state.loop;

		if (panner) {
			applyEmitterStateToPanner(panner, state, this.#now());
			source.connect(gain);
			gain.connect(panner);
			panner.connect(this.#outputForBus(state.busId));
		} else {
			source.connect(gain);
			gain.connect(this.#outputForBus(state.busId));
		}

		const record: PlaybackRecord = {
			id: playbackId,
			soundId: state.soundId,
			emitterEntity: state.entity,
			source,
			gain,
			disposed: false,
			stopping: false,
			...(state.busId === undefined ? {} : { busId: state.busId }),
			...(panner === undefined ? {} : { panner }),
			...(state.sceneId === undefined ? {} : { sceneId: state.sceneId }),
		};

		source.onended = () => {
			this.#releasePlayback(playbackId);
		};
		this.#playbacks.set(playbackId, record);
		source.start(this.#now());

		return {
			id: playbackId,
			soundId: state.soundId,
			...(state.sceneId === undefined ? {} : { sceneId: state.sceneId }),
			stop: () => this.#stopPlayback(playbackId),
			dispose: () => this.#stopPlayback(playbackId),
		};
	}

	#stopPlayback(playbackId: string): void {
		const playback = this.#playbacks.get(playbackId);

		if (!playback || playback.disposed) {
			return;
		}

		playback.disposed = true;
		playback.stopping = true;
		try {
			playback.source.stop(this.#now());
		} finally {
			this.#releasePlayback(playbackId);
		}
	}

	#fadeOutPlayback(playbackId: string, fadeSeconds: number): void {
		const playback = this.#playbacks.get(playbackId);

		if (!playback || playback.disposed || playback.stopping) {
			return;
		}

		if (fadeSeconds <= 0) {
			this.#stopPlayback(playbackId);
			return;
		}

		const now = this.#now();
		const stopAt = now + fadeSeconds;
		playback.stopping = true;
		rampParam(playback.gain.gain, 0, now, fadeSeconds);
		playback.source.stop(stopAt);
	}

	#releasePlayback(playbackId: string): void {
		const playback = this.#playbacks.get(playbackId);

		if (!playback) {
			return;
		}

		this.#playbacks.delete(playbackId);

		if (this.#musicPlaybackId === playbackId) {
			this.#musicPlaybackId = undefined;
		}

		if (
			playback.emitterEntity !== undefined &&
			this.#emitterPlaybackIds.get(playback.emitterEntity) === playbackId
		) {
			this.#emitterPlaybackIds.delete(playback.emitterEntity);
		}

		playback.source.onended = null;
		playback.source.disconnect();
		playback.gain.disconnect();
		playback.panner?.disconnect();
	}

	#assertActive(): void {
		if (this.#disposed) {
			throw new Error("Cannot use a disposed BrowserAudioManager.");
		}
	}

	#now(): number {
		return this.#context.currentTime;
	}

	#outputForBus(busId: string | undefined): BrowserAudioNodeLike {
		return busId === undefined ? this.#masterGain : this.#gainForBus(busId);
	}

	#gainForBus(busId: string): BrowserGainNodeLike {
		const existing = this.#busGains.get(busId);

		if (existing) {
			return existing;
		}

		const gain = this.#context.createGain();
		setParam(gain.gain, 1, this.#now());
		gain.connect(this.#masterGain);
		this.#busGains.set(busId, gain);
		return gain;
	}
}

export function createBrowserAudioAssetLoader(
	manager: BrowserAudioManager,
): AssetLoader {
	return manager.createAssetLoader();
}

export function createBrowserAudioAssetDisposer(
	manager: Pick<BrowserAudioManager, "unregisterSound">,
): AssetDisposer {
	return (_asset, entry) => {
		manager.unregisterSound(entry.id);
	};
}

function applyEmitterStateToPanner(
	panner: BrowserPannerNodeLike,
	state: AudioSpatialEmitterState,
	time: number,
): void {
	panner.distanceModel = state.distanceModel;
	panner.refDistance = state.refDistance;
	panner.maxDistance = state.maxDistance;
	panner.rolloffFactor = state.rolloffFactor;
	panner.coneInnerAngle = state.coneInnerAngle ?? 360;
	panner.coneOuterAngle = state.coneOuterAngle ?? 360;
	panner.coneOuterGain = state.coneOuterGain ?? 0;

	if (panner.panningModel !== undefined) {
		panner.panningModel = "HRTF";
	}

	setAudioParam3(panner, "position", state.position, time);
	setAudioParam3(panner, "orientation", state.forward, time);
}

function setAudioParam3(
	target: BrowserPannerNodeLike | BrowserAudioListenerLike,
	kind: "position" | "orientation",
	value: Vec3,
	time: number,
): void {
	const paramX =
		kind === "position"
			? target.positionX
			: "orientationX" in target
				? target.orientationX
				: undefined;
	const paramY =
		kind === "position"
			? target.positionY
			: "orientationY" in target
				? target.orientationY
				: undefined;
	const paramZ =
		kind === "position"
			? target.positionZ
			: "orientationZ" in target
				? target.orientationZ
				: undefined;

	if (paramX && paramY && paramZ) {
		setParam(paramX, value.x, time);
		setParam(paramY, value.y, time);
		setParam(paramZ, value.z, time);
		return;
	}

	if (kind === "position") {
		target.setPosition?.(value.x, value.y, value.z);
		return;
	}

	if (kind === "orientation") {
		(target as BrowserPannerNodeLike).setOrientation?.(
			value.x,
			value.y,
			value.z,
		);
	}
}

function setAudioListenerOrientation(
	listener: BrowserAudioListenerLike,
	state: AudioListenerState,
	time: number,
): void {
	if (
		listener.forwardX &&
		listener.forwardY &&
		listener.forwardZ &&
		listener.upX &&
		listener.upY &&
		listener.upZ
	) {
		setParam(listener.forwardX, state.forward.x, time);
		setParam(listener.forwardY, state.forward.y, time);
		setParam(listener.forwardZ, state.forward.z, time);
		setParam(listener.upX, state.up.x, time);
		setParam(listener.upY, state.up.y, time);
		setParam(listener.upZ, state.up.z, time);
		return;
	}

	listener.setOrientation?.(
		state.forward.x,
		state.forward.y,
		state.forward.z,
		state.up.x,
		state.up.y,
		state.up.z,
	);
}

function createDefaultAudioContext(): BrowserAudioContextLike {
	const audioGlobal = globalThis as typeof globalThis & {
		webkitAudioContext?: typeof AudioContext;
	};
	const audioContextConstructor =
		audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;

	if (!audioContextConstructor) {
		throw new Error("Web Audio is not available in this environment.");
	}

	return new audioContextConstructor() as unknown as BrowserAudioContextLike;
}

function getDefaultFetch(): typeof fetch {
	if (!globalThis.fetch) {
		throw new Error("Fetch is not available in this environment.");
	}

	return globalThis.fetch.bind(globalThis);
}

function setParam(
	param: BrowserAudioParamLike,
	value: number,
	time: number,
): void {
	if (param.setValueAtTime) {
		param.setValueAtTime(value, time);
		return;
	}

	param.value = value;
}

function rampParam(
	param: BrowserAudioParamLike,
	value: number,
	time: number,
	durationSeconds: number,
): void {
	if (durationSeconds <= 0 || !param.linearRampToValueAtTime) {
		setParam(param, value, time);
		return;
	}

	setParam(param, param.value, time);
	param.linearRampToValueAtTime(value, time + durationSeconds);
}

function isAudioBufferLike(value: unknown): value is BrowserAudioBufferLike {
	return typeof value === "object" && value !== null;
}

function isAudioContextRunning(state: unknown): boolean {
	return state === "running";
}
