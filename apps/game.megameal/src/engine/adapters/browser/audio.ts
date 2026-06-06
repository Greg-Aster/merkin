import type {
	AssetDisposer,
	AssetLoader,
	AssetManifestEntry,
} from "../../modules/assets/index.js";
import type {
	AudioManagerPort,
	AudioManagerStats,
	AudioPlaybackHandle,
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

export type BrowserOscillatorNodeLike = BrowserAudioNodeLike & {
	readonly frequency: BrowserAudioParamLike;
	type: OscillatorType | string;
	start(when?: number): void;
	stop(when?: number): void;
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
	readonly sampleRate?: number;
	readonly state: AudioContextState | "closed" | "running" | "suspended";
	createGain(): BrowserGainNodeLike;
	createBufferSource(): BrowserAudioBufferSourceNodeLike;
	createOscillator?(): BrowserOscillatorNodeLike;
	createBuffer?(
		channels: number,
		length: number,
		sampleRate: number,
	): {
		duration?: number;
		getChannelData(channel: number): Float32Array;
	};
	decodeAudioData(data: ArrayBuffer): Promise<BrowserAudioBufferLike>;
	resume(): Promise<void>;
	close(): Promise<void>;
};

export type BrowserAudioContextFactory = () => BrowserAudioContextLike;

export type BrowserAudioManagerOptions = {
	readonly context?: BrowserAudioContextLike;
	readonly createContext?: BrowserAudioContextFactory;
	readonly fetch?: typeof fetch;
	readonly masterVolume?: number;
};

export type ToneSoundOptions = {
	readonly frequencyHz: number;
	readonly durationSeconds: number;
	readonly volume?: number;
	readonly type?: OscillatorType | string;
};

export type BrowserAudioAsset =
	| {
			readonly kind: "browser:audio-buffer";
			readonly entry: AssetManifestEntry;
			readonly buffer: BrowserAudioBufferLike;
	  }
	| {
			readonly kind: "browser:tone-sound";
			readonly entry: AssetManifestEntry;
			readonly options: ToneSoundOptions;
	  };

type PlaybackRecord = {
	readonly id: string;
	readonly soundId: string;
	readonly sceneId?: string;
	readonly source: BrowserAudioBufferSourceNodeLike;
	readonly gain: BrowserGainNodeLike;
	disposed: boolean;
};

let nextPlaybackId = 1;

export class BrowserAudioManager implements AudioManagerPort {
	readonly #context: BrowserAudioContextLike;
	readonly #fetch: typeof fetch;
	readonly #sounds = new Map<string, BrowserAudioBufferLike>();
	readonly #toneSounds = new Map<string, ToneSoundOptions>();
	readonly #playbacks = new Map<string, PlaybackRecord>();
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
		this.#toneSounds.delete(soundId);
	}

	registerToneSound(soundId: string, options: ToneSoundOptions): void {
		if (options.durationSeconds <= 0) {
			throw new Error(`Tone sound "${soundId}" must have a positive duration.`);
		}

		this.#toneSounds.set(soundId, options);
		this.#sounds.delete(soundId);
	}

	unregisterSound(soundId: string): void {
		this.#sounds.delete(soundId);
		this.#toneSounds.delete(soundId);
		this.stop({ soundId });
	}

	hasSound(soundId: string): boolean {
		return this.#sounds.has(soundId) || this.#toneSounds.has(soundId);
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
			if (isBuiltinToneUrl(entry.url)) {
				const options = toneSoundOptionsFromUrl(entry.url);
				this.registerToneSound(entry.id, options);
				return {
					kind: "browser:tone-sound",
					entry,
					options,
				} satisfies BrowserAudioAsset;
			}

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
		gain.connect(this.#masterGain);

		const record: PlaybackRecord = {
			id: playbackId,
			soundId: event.soundId,
			source,
			gain,
			disposed: false,
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

		if (this.#musicPlaybackId !== undefined) {
			const playback = this.#playbacks.get(this.#musicPlaybackId);

			if (playback !== undefined && playback.soundId === nextTrackId) {
				setParam(playback.gain.gain, state.volume, this.#now());
				this.#music = state;
				return;
			}

			this.#stopPlayback(this.#musicPlaybackId);
		}

		this.#musicPlaybackId = undefined;
		this.#music = state;

		if (nextTrackId === undefined) {
			return;
		}

		const playback = this.play({
			soundId: nextTrackId,
			volume: state.volume,
			loop: true,
			...(state.sceneId === undefined ? {} : { sceneId: state.sceneId }),
		});

		this.#musicPlaybackId = playback?.id;
	}

	stats(): AudioManagerStats {
		return {
			unlocked: isAudioContextRunning(this.#context.state),
			loadedSounds: this.#sounds.size + this.#toneSounds.size,
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
		this.#sounds.clear();
		this.#toneSounds.clear();
		this.#masterGain.disconnect();
		void this.#context.close();
	}

	#createSource(soundId: string): BrowserAudioBufferSourceNodeLike | undefined {
		const buffer = this.#sounds.get(soundId);

		if (buffer) {
			const source = this.#context.createBufferSource();
			source.buffer = buffer;
			return source;
		}

		const tone = this.#toneSounds.get(soundId);

		if (!tone) {
			return undefined;
		}

		return this.#createToneSource(soundId, tone);
	}

	#createToneSource(
		soundId: string,
		tone: ToneSoundOptions,
	): BrowserAudioBufferSourceNodeLike | undefined {
		if (!this.#context.createBuffer) {
			return undefined;
		}

		const sampleRate = this.#context.sampleRate ?? 44_100;
		const length = Math.max(1, Math.round(tone.durationSeconds * sampleRate));
		const buffer = this.#context.createBuffer(1, length, sampleRate);
		const samples = buffer.getChannelData(0);
		const amplitude = tone.volume ?? 0.4;

		for (let index = 0; index < samples.length; index += 1) {
			const progress = index / Math.max(1, samples.length - 1);
			const envelope = Math.sin(Math.PI * progress);
			samples[index] =
				Math.sin((index / sampleRate) * tone.frequencyHz * Math.PI * 2) *
				amplitude *
				envelope;
		}

		this.registerSound(soundId, buffer);
		const source = this.#context.createBufferSource();
		source.buffer = buffer;
		return source;
	}

	#stopPlayback(playbackId: string): void {
		const playback = this.#playbacks.get(playbackId);

		if (!playback || playback.disposed) {
			return;
		}

		playback.disposed = true;
		try {
			playback.source.stop(this.#now());
		} finally {
			this.#releasePlayback(playbackId);
		}
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

		playback.source.onended = null;
		playback.source.disconnect();
		playback.gain.disconnect();
	}

	#assertActive(): void {
		if (this.#disposed) {
			throw new Error("Cannot use a disposed BrowserAudioManager.");
		}
	}

	#now(): number {
		return this.#context.currentTime;
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

function isAudioBufferLike(value: unknown): value is BrowserAudioBufferLike {
	return typeof value === "object" && value !== null;
}

function isAudioContextRunning(state: unknown): boolean {
	return state === "running";
}

function isBuiltinToneUrl(url: string): boolean {
	return url.startsWith("builtin://tone");
}

function toneSoundOptionsFromUrl(url: string): ToneSoundOptions {
	const parsed = new URL(url);
	const frequencyHz = numberQueryParam(parsed, "frequencyHz");
	const durationSeconds = numberQueryParam(parsed, "durationSeconds");
	const volume = optionalNumberQueryParam(parsed, "volume");
	const type = parsed.searchParams.get("type") ?? undefined;

	return {
		frequencyHz,
		durationSeconds,
		...(volume === undefined ? {} : { volume }),
		...(type === undefined ? {} : { type }),
	};
}

function numberQueryParam(url: URL, name: string): number {
	const value = optionalNumberQueryParam(url, name);

	if (value === undefined) {
		throw new Error(`Missing numeric audio tone parameter "${name}".`);
	}

	return value;
}

function optionalNumberQueryParam(url: URL, name: string): number | undefined {
	const value = url.searchParams.get(name);

	if (value === null) {
		return undefined;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`Invalid audio tone parameter "${name}": ${value}.`);
	}

	return parsed;
}
