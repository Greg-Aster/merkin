import type { EngineEvent } from "../src/engine/core/index.js";
import {
	type AudioEvent,
	type AudioManagerPort,
	type AudioManagerStats,
	type AudioPlaybackHandle,
	type AudioUnlockState,
	type MusicState,
	createAudioEventSystem,
} from "../src/engine/modules/audio/index.js";
import { EngineRuntime } from "../src/engine/runtime/index.js";
import { assertEqual } from "./contractTestHelpers.js";

type PlaySoundEvent = Extract<AudioEvent, { readonly type: "PlaySound" }>;

class RecordingAudioManager implements AudioManagerPort {
	readonly played: PlaySoundEvent[] = [];

	async unlock(): Promise<AudioUnlockState> {
		return "unavailable";
	}

	registerSound(): void {}

	unregisterSound(): void {}

	hasSound(): boolean {
		return true;
	}

	play(event: PlaySoundEvent): AudioPlaybackHandle | undefined {
		this.played.push(event);
		return undefined;
	}

	stop(): void {}

	stopScene(): void {}

	stopAll(): void {}

	setMusic(_state: MusicState): void {}

	stats(): AudioManagerStats {
		return {
			unlocked: false,
			loadedSounds: 0,
			activeSounds: 0,
		};
	}

	dispose(): void {}
}

function registerMappedAudio(
	runtime: EngineRuntime,
	audio: RecordingAudioManager,
) {
	runtime.scheduler.registerSystem(
		"audio",
		createAudioEventSystem({
			audio,
			mappings: [
				{
					eventType: "ContractAudioCue",
					soundId: "audio_contract_cue",
				},
			],
		}).asSystem(),
	);
}

function step(runtime: EngineRuntime): void {
	runtime.update(1 / 60);
}

{
	const runtime = new EngineRuntime();
	const audio = new RecordingAudioManager();

	registerMappedAudio(runtime, audio);
	runtime.scheduler.registerSystem("gameplay", {
		id: "contract-audio-early-emitter",
		update({ events }) {
			events.emit({
				type: "ContractAudioCue",
				sceneId: "contract_scene",
			} satisfies EngineEvent);
		},
	});

	runtime.start();
	step(runtime);

	assertEqual(
		audio.played.length,
		1,
		"Events emitted before the audio stage must play in the same fixed tick.",
	);
	assertEqual(
		runtime.events.size,
		0,
		"Events observed by the audio stage must be drained after the fixed tick.",
	);
	assertEqual(audio.played[0]?.soundId, "audio_contract_cue");
	assertEqual(audio.played[0]?.sceneId, "contract_scene");
}

{
	const runtime = new EngineRuntime();
	const audio = new RecordingAudioManager();
	let emittedLateCue = false;

	registerMappedAudio(runtime, audio);
	runtime.scheduler.registerSystem("camera", {
		id: "contract-audio-late-emitter",
		update({ events }) {
			if (emittedLateCue) {
				return;
			}

			emittedLateCue = true;
			events.emit({
				type: "ContractAudioCue",
				sceneId: "contract_scene",
			} satisfies EngineEvent);
		},
	});

	runtime.start();
	step(runtime);

	assertEqual(
		audio.played.length,
		0,
		"Events emitted after the audio stage must not play before audio observes them.",
	);
	assertEqual(
		runtime.events.size,
		1,
		"Events emitted after the audio stage must remain queued for the next fixed tick.",
	);

	step(runtime);

	assertEqual(
		audio.played.length,
		1,
		"Events emitted after the audio stage must play on the next fixed tick.",
	);
	assertEqual(
		runtime.events.size,
		0,
		"Late events must drain after the next audio stage observes them.",
	);
	assertEqual(audio.played[0]?.soundId, "audio_contract_cue");
	assertEqual(audio.played[0]?.sceneId, "contract_scene");
}

console.log("Audio event ordering contract checks passed.");
