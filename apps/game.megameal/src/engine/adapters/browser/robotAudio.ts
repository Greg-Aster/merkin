/**
 * Browser Web Audio adapter for the virtual Ainekio V2 robot's ES8311 mic
 * (16 kHz mono 16-bit PCM capture) and NS4150B speaker (16 kHz PCM playback).
 */

const DEFAULT_ROBOT_AUDIO_SAMPLE_RATE = 16000;
const DEFAULT_ROBOT_AUDIO_FRAME_BYTES = 640;
const SAMPLES_PER_FRAME = DEFAULT_ROBOT_AUDIO_FRAME_BYTES / 2; // 320 samples (20ms @ 16kHz)

export class BrowserRobotAudioAdapter {
	#audioContext: AudioContext | undefined;
	#gainNode: GainNode | undefined;
	#nextPlayTime = 0;

	// Microphone capture state
	#micStream: MediaStream | undefined;
	#micSource: MediaStreamAudioSourceNode | undefined;
	#micProcessor: ScriptProcessorNode | undefined;
	#micSilentSink: GainNode | undefined;
	#micCarry: number[] = [];
	#micCounter = 1;
	#micActive = false;

	get micActive(): boolean {
		return this.#micActive;
	}

	get micSupported(): boolean {
		return (
			typeof navigator !== "undefined" &&
			typeof navigator.mediaDevices?.getUserMedia === "function"
		);
	}

	#ensureContext(): AudioContext | undefined {
		if (this.#audioContext) {
			if (this.#audioContext.state === "suspended") {
				void this.#audioContext.resume();
			}
			return this.#audioContext;
		}
		if (typeof AudioContext === "undefined") {
			return undefined;
		}
		// Use the hardware default sample rate so createMediaStreamSource() works on
		// Firefox/Linux (which rejects mismatched AudioContext vs MediaStream rates).
		// Speaker buffers at 16 kHz are resampled natively by Web Audio, and mic input
		// is downsampled cleanly to 16 kHz in startMicrophone().
		const ctx = new AudioContext();
		const gain = ctx.createGain();
		gain.gain.value = 0.8;
		gain.connect(ctx.destination);
		this.#audioContext = ctx;
		this.#gainNode = gain;
		return ctx;
	}

	playSpeakerPcm(pcmBytes: Uint8Array, volumePercent: number): void {
		const ctx = this.#ensureContext();
		if (!ctx || !this.#gainNode || pcmBytes.byteLength < 2) {
			return;
		}
		this.#gainNode.gain.value = Math.max(0, Math.min(1, volumePercent / 100));

		const sampleCount = pcmBytes.byteLength >> 1;
		const buffer = ctx.createBuffer(
			1,
			sampleCount,
			DEFAULT_ROBOT_AUDIO_SAMPLE_RATE,
		);
		const channel = buffer.getChannelData(0);
		const view = new DataView(
			pcmBytes.buffer,
			pcmBytes.byteOffset,
			pcmBytes.byteLength,
		);
		for (let i = 0; i < sampleCount; i += 1) {
			channel[i] = view.getInt16(i * 2, true) / 32768;
		}

		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(this.#gainNode);

		const now = ctx.currentTime;
		const startAt = Math.max(now + 0.01, this.#nextPlayTime);
		source.start(startAt);
		this.#nextPlayTime = startAt + buffer.duration;
	}

	stopSpeaker(): void {
		if (this.#audioContext) {
			this.#nextPlayTime = this.#audioContext.currentTime;
		}
	}

	async startMicrophone(
		onFrame: (counter: number, pcm: Uint8Array) => void,
	): Promise<boolean> {
		if (this.#micActive) {
			return true;
		}
		if (!this.micSupported) {
			return false;
		}
		const ctx = this.#ensureContext();
		if (!ctx) {
			return false;
		}

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				channelCount: 1,
				echoCancellation: true,
				noiseSuppression: true,
			},
		});
		const source = ctx.createMediaStreamSource(stream);
		const processor = ctx.createScriptProcessor(1024, 1, 1);
		const silentSink = ctx.createGain();
		silentSink.gain.value = 0;
		const ratio = ctx.sampleRate / DEFAULT_ROBOT_AUDIO_SAMPLE_RATE;

		processor.onaudioprocess = (event) => {
			if (!this.#micActive) {
				return;
			}
			const input = event.inputBuffer.getChannelData(0);
			if (Math.abs(ratio - 1) < 0.01) {
				for (let i = 0; i < input.length; i += 1) {
					this.#micCarry.push(input[i] ?? 0);
				}
			} else {
				const outLen = Math.floor(input.length / ratio);
				for (let i = 0; i < outLen; i += 1) {
					const srcPos = i * ratio;
					const idx0 = Math.min(input.length - 1, Math.floor(srcPos));
					const idx1 = Math.min(input.length - 1, idx0 + 1);
					const frac = srcPos - idx0;
					const s0 = input[idx0] ?? 0;
					const s1 = input[idx1] ?? s0;
					this.#micCarry.push(s0 + (s1 - s0) * frac);
				}
			}

			while (this.#micCarry.length >= SAMPLES_PER_FRAME) {
				const frameSamples = this.#micCarry.splice(0, SAMPLES_PER_FRAME);
				const pcm = new Uint8Array(DEFAULT_ROBOT_AUDIO_FRAME_BYTES);
				const view = new DataView(pcm.buffer);
				for (let i = 0; i < SAMPLES_PER_FRAME; i += 1) {
					const clamped = Math.max(-1, Math.min(1, frameSamples[i] ?? 0));
					view.setInt16(i * 2, Math.round(clamped * 32767), true);
				}
				const counter = this.#micCounter;
				this.#micCounter = (this.#micCounter + 1) >>> 0;
				onFrame(counter, pcm);
			}
		};

		source.connect(processor);
		processor.connect(silentSink);
		silentSink.connect(ctx.destination);
		this.#micStream = stream;
		this.#micSource = source;
		this.#micProcessor = processor;
		this.#micSilentSink = silentSink;
		this.#micActive = true;
		return true;
	}

	stopMicrophone(): void {
		this.#micActive = false;
		this.#micCarry = [];
		this.#micProcessor?.disconnect();
		this.#micSilentSink?.disconnect();
		this.#micSource?.disconnect();
		for (const track of this.#micStream?.getTracks() ?? []) {
			track.stop();
		}
		this.#micProcessor = undefined;
		this.#micSilentSink = undefined;
		this.#micSource = undefined;
		this.#micStream = undefined;
	}

	dispose(): void {
		this.stopMicrophone();
		this.stopSpeaker();
		if (this.#audioContext) {
			void this.#audioContext.close();
			this.#audioContext = undefined;
		}
		this.#gainNode = undefined;
	}
}
