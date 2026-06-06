import { BrowserAudioManager } from "../src/engine/adapters/browser/audio.js";
import type { AssetManifest } from "../src/engine/modules/assets/index.js";
import {
	musicStateFromAudioContentManifest,
	parseAudioContentManifest,
	validateAudioContentManifest,
} from "../src/engine/modules/audio/index.js";

function assertEqual<T>(actual: T, expected: T): void {
	if (actual !== expected) {
		throw new Error(
			`Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
	const actualJson = JSON.stringify(actual);
	const expectedJson = JSON.stringify(expected);

	if (actualJson !== expectedJson) {
		throw new Error(`Expected ${expectedJson}, received ${actualJson}.`);
	}
}

function assertMatch(actual: string, expected: RegExp): void {
	if (!expected.test(actual)) {
		throw new Error(`Expected "${actual}" to match ${expected}.`);
	}
}

function assertDefined<T>(actual: T | undefined): T {
	if (actual === undefined) {
		throw new Error("Expected value to be defined.");
	}

	return actual;
}

const assetManifest = {
	assets: [
		{
			id: "audio_music_a",
			kind: "audio",
			url: "/audio/music-a.mp3",
		},
		{
			id: "audio_music_b",
			kind: "audio",
			url: "/audio/music-b.mp3",
		},
		{
			id: "audio_sfx_a",
			kind: "audio",
			url: "/audio/sfx-a.mp3",
		},
	],
	preloadGroups: {
		test: ["audio_music_a", "audio_music_b", "audio_sfx_a"],
	},
} satisfies AssetManifest;

class FakeAudioParam {
	value: number;
	readonly events: Array<{
		readonly type: "set" | "linearRamp";
		readonly value: number;
		readonly time: number;
	}> = [];

	constructor(value = 1) {
		this.value = value;
	}

	setValueAtTime(value: number, time: number): void {
		this.value = value;
		this.events.push({ type: "set", value, time });
	}

	linearRampToValueAtTime(value: number, time: number): void {
		this.value = value;
		this.events.push({ type: "linearRamp", value, time });
	}
}

class FakeAudioNode {
	readonly connections: FakeAudioNode[] = [];
	disconnectCount = 0;

	connect(destination: FakeAudioNode): FakeAudioNode {
		this.connections.push(destination);
		return destination;
	}

	disconnect(): void {
		this.disconnectCount += 1;
	}
}

class FakeGainNode extends FakeAudioNode {
	readonly gain = new FakeAudioParam(1);
}

class FakeBufferSourceNode extends FakeAudioNode {
	buffer: object | null = null;
	loop = false;
	onended: ((event?: Event) => void) | null = null;
	readonly starts: number[] = [];
	readonly stops: number[] = [];

	start(when = 0): void {
		this.starts.push(when);
	}

	stop(when = 0): void {
		this.stops.push(when);
	}
}

class FakeAudioContext {
	readonly destination = new FakeAudioNode();
	readonly gains: FakeGainNode[] = [];
	readonly sources: FakeBufferSourceNode[] = [];
	state: AudioContextState = "running";
	currentTime = 0;

	createGain(): FakeGainNode {
		const gain = new FakeGainNode();
		this.gains.push(gain);
		return gain;
	}

	createBufferSource(): FakeBufferSourceNode {
		const source = new FakeBufferSourceNode();
		this.sources.push(source);
		return source;
	}

	async decodeAudioData(): Promise<object> {
		return {};
	}

	async resume(): Promise<void> {
		this.state = "running";
	}

	async close(): Promise<void> {
		this.state = "closed";
	}
}

function testSceneMusicFadeValidation(): void {
	const manifest = parseAudioContentManifest(
		{
			mixerBuses: [
				{
					id: "music",
					volume: 0.8,
				},
				{
					id: "sfx",
					volume: 0.9,
				},
			],
			sceneMusic: {
				trackIds: ["audio_music_a", "audio_music_b"],
				volume: 0.5,
				busId: "music",
				autoplay: true,
				fadeSeconds: 1.25,
			},
			eventMappings: [
				{
					id: "test.sfx",
					eventType: "TestSfx",
					soundId: "audio_sfx_a",
					volume: 0.25,
					busId: "sfx",
				},
			],
		},
		{ assetManifest },
	);

	assertDeepEqual(musicStateFromAudioContentManifest(manifest), {
		trackId: "audio_music_a",
		playing: true,
		volume: 0.5,
		busId: "music",
		fadeSeconds: 1.25,
	});
	assertEqual(manifest.eventMappings[0]?.busId, "sfx");

	const invalidNegativeFade = validateAudioContentManifest(
		{
			sceneMusic: {
				trackId: "audio_music_a",
				fadeSeconds: -1,
			},
			eventMappings: [],
		},
		{ assetManifest },
	);
	assertEqual(invalidNegativeFade.ok, false);
	assertMatch(
		invalidNegativeFade.ok ? "" : invalidNegativeFade.errors.join("\n"),
		/fadeSeconds must be a finite number from 0 to 30/,
	);

	const invalidLongFade = validateAudioContentManifest(
		{
			sceneMusic: {
				trackId: "audio_music_a",
				fadeSeconds: 31,
			},
			eventMappings: [],
		},
		{ assetManifest },
	);
	assertEqual(invalidLongFade.ok, false);

	const invalidBus = validateAudioContentManifest(
		{
			mixerBuses: [
				{
					id: "music",
					volume: 1,
				},
			],
			sceneMusic: {
				trackId: "audio_music_a",
				busId: "missing",
			},
			eventMappings: [
				{
					id: "test.sfx",
					eventType: "TestSfx",
					soundId: "audio_sfx_a",
					busId: "missing",
				},
			],
		},
		{ assetManifest },
	);
	assertEqual(invalidBus.ok, false);
	assertMatch(
		invalidBus.ok ? "" : invalidBus.errors.join("\n"),
		/references unknown mixer bus "missing"/,
	);
}

function testBrowserAudioMusicCrossfade(): void {
	const context = new FakeAudioContext();
	const manager = new BrowserAudioManager({
		context,
		fetch: async () => {
			throw new Error("test should use registered buffers");
		},
	});
	manager.registerSound("audio_music_a", {});
	manager.registerSound("audio_music_b", {});

	manager.setMusic({
		trackId: "audio_music_a",
		playing: true,
		volume: 0.4,
		fadeSeconds: 1,
	});

	assertEqual(context.sources.length, 1);
	assertEqual(context.sources[0]?.loop, true);
	assertDeepEqual(context.sources[0]?.starts, [0]);
	assertDeepEqual(lastGain(context).gain.events.at(-1), {
		type: "linearRamp",
		value: 0.4,
		time: 1,
	});

	const firstSource = context.sources[0];
	const firstMusicGain = lastGain(context);
	context.currentTime = 4;

	manager.setMusic({
		trackId: "audio_music_b",
		playing: true,
		volume: 0.7,
		fadeSeconds: 2,
	});

	assertEqual(context.sources.length, 2);
	assertDeepEqual(firstSource?.stops, [6]);
	assertDeepEqual(firstMusicGain.gain.events.at(-1), {
		type: "linearRamp",
		value: 0,
		time: 6,
	});
	assertDeepEqual(lastGain(context).gain.events.at(-1), {
		type: "linearRamp",
		value: 0.7,
		time: 6,
	});
	assertDeepEqual(manager.stats(), {
		unlocked: true,
		loadedSounds: 2,
		activeSounds: 2,
		musicTrackId: "audio_music_b",
	});
}

function testSameTrackVolumeFadeDoesNotRestartMusic(): void {
	const context = new FakeAudioContext();
	const manager = new BrowserAudioManager({ context });
	manager.registerSound("audio_music_a", {});

	manager.setMusic({
		trackId: "audio_music_a",
		playing: true,
		volume: 0.2,
	});

	const musicGain = lastGain(context);
	context.currentTime = 3;
	manager.setMusic({
		trackId: "audio_music_a",
		playing: true,
		volume: 0.6,
		fadeSeconds: 0.5,
	});

	assertEqual(context.sources.length, 1);
	assertDeepEqual(musicGain.gain.events.at(-1), {
		type: "linearRamp",
		value: 0.6,
		time: 3.5,
	});
}

function testBrowserAudioMixerBusRouting(): void {
	const context = new FakeAudioContext();
	const manager = new BrowserAudioManager({ context });
	manager.registerSound("audio_music_a", {});
	manager.configureMixerBuses([
		{
			id: "music",
			volume: 0.5,
		},
	]);

	manager.setMusic({
		trackId: "audio_music_a",
		playing: true,
		volume: 0.25,
		busId: "music",
	});

	const masterGain = assertDefined(context.gains[0]);
	const musicBusGain = assertDefined(context.gains[1]);
	const musicPlaybackGain = assertDefined(context.gains[2]);

	assertEqual(musicBusGain.gain.value, 0.5);
	assertEqual(musicBusGain.connections[0], masterGain);
	assertEqual(musicPlaybackGain.connections[0], musicBusGain);
	assertEqual(musicPlaybackGain.gain.value, 0.25);

	manager.setMixerBusVolume("music", 0.3);

	assertEqual(musicBusGain.gain.value, 0.3);
}

function lastGain(context: FakeAudioContext): FakeGainNode {
	const gain = context.gains.at(-1);
	return assertDefined(gain);
}

testSceneMusicFadeValidation();
testBrowserAudioMusicCrossfade();
testSameTrackVolumeFadeDoesNotRestartMusic();
testBrowserAudioMixerBusRouting();

console.log("Audio contract checks passed.");
