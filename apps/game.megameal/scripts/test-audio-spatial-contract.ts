import { BrowserAudioManager } from "../src/engine/adapters/browser/audio.js";
import { World } from "../src/engine/core/index.js";
import { quat, vec3 } from "../src/engine/math/index.js";
import {
	type AudioListenerState,
	type AudioSpatialEmitterState,
	type AudioSpatialPort,
	SOUND_EMITTER_COMPONENT,
	createAudioSpatialSyncSystem,
} from "../src/engine/modules/audio/index.js";
import { TRANSFORM_COMPONENT } from "../src/engine/modules/rendering/index.js";
import {
	assertDeepEqual,
	assertDefined,
	assertEqual,
} from "./contractTestHelpers.js";

class RecordingSpatialAudio implements AudioSpatialPort {
	listener: AudioListenerState | undefined;
	readonly attached: AudioSpatialEmitterState[] = [];
	readonly updated: AudioSpatialEmitterState[] = [];
	readonly detached: number[] = [];
	detachAllCount = 0;

	setListener(state: AudioListenerState): void {
		this.listener = state;
	}

	attachEmitter(_entity: number, state: AudioSpatialEmitterState) {
		this.attached.push(state);
		return undefined;
	}

	updateEmitter(_entity: number, state: AudioSpatialEmitterState): void {
		this.updated.push(state);
	}

	detachEmitter(entity: number): void {
		this.detached.push(entity);
	}

	detachAllEmitters(): void {
		this.detachAllCount += 1;
	}
}

class FakeAudioParam {
	value: number;

	constructor(value = 0) {
		this.value = value;
	}

	setValueAtTime(value: number): void {
		this.value = value;
	}

	linearRampToValueAtTime(value: number): void {
		this.value = value;
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

class FakePannerNode extends FakeAudioNode {
	distanceModel: DistanceModelType = "inverse";
	refDistance = 1;
	maxDistance = 10_000;
	rolloffFactor = 1;
	coneInnerAngle = 360;
	coneOuterAngle = 360;
	coneOuterGain = 0;
	panningModel: PanningModelType = "equalpower";
	readonly positionX = new FakeAudioParam();
	readonly positionY = new FakeAudioParam();
	readonly positionZ = new FakeAudioParam();
	readonly orientationX = new FakeAudioParam();
	readonly orientationY = new FakeAudioParam();
	readonly orientationZ = new FakeAudioParam(-1);
}

class FakeAudioListener {
	readonly positionX = new FakeAudioParam();
	readonly positionY = new FakeAudioParam();
	readonly positionZ = new FakeAudioParam();
	readonly forwardX = new FakeAudioParam();
	readonly forwardY = new FakeAudioParam();
	readonly forwardZ = new FakeAudioParam(-1);
	readonly upX = new FakeAudioParam();
	readonly upY = new FakeAudioParam(1);
	readonly upZ = new FakeAudioParam();
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
	readonly listener = new FakeAudioListener();
	readonly gains: FakeGainNode[] = [];
	readonly panners: FakePannerNode[] = [];
	readonly sources: FakeBufferSourceNode[] = [];
	state: AudioContextState = "running";
	currentTime = 0;

	createGain(): FakeGainNode {
		const gain = new FakeGainNode();
		this.gains.push(gain);
		return gain;
	}

	createPanner(): FakePannerNode {
		const panner = new FakePannerNode();
		this.panners.push(panner);
		return panner;
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

function testSpatialSyncUsesWorldState(): void {
	const world = new World();
	const audio = new RecordingSpatialAudio();
	const system = createAudioSpatialSyncSystem({
		audio,
		listenerResource: "camera:activePose",
		activeSceneId: () => "scene:test",
	});
	const emitter = world.createEntity();

	world.setResource("camera:activePose", {
		position: vec3(1, 2, 3),
		rotation: quat(0, 0, 0, 1),
	});
	world.addComponent(emitter, TRANSFORM_COMPONENT, {
		position: vec3(4, 5, 6),
		rotation: quat(0, 0, 0, 1),
		scale: vec3(1, 1, 1),
	});
	world.addComponent(emitter, SOUND_EMITTER_COMPONENT, {
		soundId: "audio_portal_cycle",
		volume: 0.25,
		busId: "spatial",
		refDistance: 2,
		maxDistance: 12,
		rolloffFactor: 1.5,
	});

	system.update({ world });

	assertDeepEqual(assertDefined(audio.listener).position, vec3(1, 2, 3));
	assertDeepEqual(assertDefined(audio.listener).forward, vec3(0, 0, -1));
	assertEqual(audio.attached.length, 1);
	assertEqual(audio.attached[0]?.soundId, "audio_portal_cycle");
	assertEqual(audio.attached[0]?.sceneId, "scene:test");
	assertEqual(audio.attached[0]?.loop, true);
	assertEqual(audio.attached[0]?.volume, 0.25);
	assertEqual(audio.attached[0]?.busId, "spatial");
	assertDeepEqual(audio.attached[0]?.position, vec3(4, 5, 6));

	world.addComponent(emitter, TRANSFORM_COMPONENT, {
		position: vec3(7, 8, 9),
		rotation: quat(0, 0, 0, 1),
		scale: vec3(1, 1, 1),
	});
	system.update({ world });

	assertEqual(audio.updated.length, 1);
	assertDeepEqual(audio.updated[0]?.position, vec3(7, 8, 9));

	world.addComponent(emitter, SOUND_EMITTER_COMPONENT, {
		soundId: "audio_portal_cycle",
		active: false,
	});
	system.update({ world });

	assertDeepEqual(audio.detached, [emitter]);
}

function testBrowserAudioSpatialPannerAndListener(): void {
	const context = new FakeAudioContext();
	const manager = new BrowserAudioManager({ context });

	manager.registerSound("audio_portal_cycle", {});
	manager.configureMixerBuses([
		{
			id: "spatial",
			volume: 0.75,
		},
	]);
	manager.setListener({
		position: vec3(1, 2, 3),
		forward: vec3(0, 0, -1),
		up: vec3(0, 1, 0),
	});

	assertEqual(context.listener.positionX.value, 1);
	assertEqual(context.listener.positionY.value, 2);
	assertEqual(context.listener.positionZ.value, 3);
	assertEqual(context.listener.forwardZ.value, -1);
	assertEqual(context.listener.upY.value, 1);

	const handle = manager.attachEmitter(7, {
		entity: 7,
		soundId: "audio_portal_cycle",
		position: vec3(4, 5, 6),
		forward: vec3(1, 0, 0),
		up: vec3(0, 1, 0),
		volume: 0.4,
		busId: "spatial",
		loop: true,
		sceneId: "scene:test",
		refDistance: 2,
		maxDistance: 12,
		rolloffFactor: 1.25,
		distanceModel: "inverse",
	});

	assertDefined(handle);
	assertEqual(context.sources.length, 1);
	assertEqual(context.sources[0]?.loop, true);
	assertDeepEqual(context.sources[0]?.starts, [0]);
	assertEqual(context.panners.length, 1);
	assertEqual(context.panners[0]?.positionX.value, 4);
	assertEqual(context.panners[0]?.positionY.value, 5);
	assertEqual(context.panners[0]?.positionZ.value, 6);
	assertEqual(context.panners[0]?.orientationX.value, 1);
	assertEqual(context.panners[0]?.refDistance, 2);
	assertEqual(context.panners[0]?.maxDistance, 12);
	assertEqual(context.panners[0]?.rolloffFactor, 1.25);
	assertEqual(context.gains.at(-1)?.gain.value, 0.4);
	assertEqual(context.gains[1]?.gain.value, 0.75);
	assertEqual(context.panners[0]?.connections[0], context.gains[1]);

	manager.updateEmitter(7, {
		entity: 7,
		soundId: "audio_portal_cycle",
		position: vec3(8, 9, 10),
		forward: vec3(0, 0, -1),
		up: vec3(0, 1, 0),
		volume: 0.2,
		busId: "spatial",
		loop: true,
		sceneId: "scene:test",
		refDistance: 3,
		maxDistance: 14,
		rolloffFactor: 1.5,
		distanceModel: "linear",
	});

	assertEqual(context.sources.length, 1);
	assertEqual(context.panners[0]?.distanceModel, "linear");
	assertEqual(context.panners[0]?.positionX.value, 8);
	assertEqual(context.gains.at(-1)?.gain.value, 0.2);

	manager.detachEmitter(7);

	assertDeepEqual(context.sources[0]?.stops, [0]);
	assertEqual(manager.stats().activeSounds, 0);
	manager.dispose();
}

testSpatialSyncUsesWorldState();
testBrowserAudioSpatialPannerAndListener();

console.log("Audio spatial contract checks passed.");
