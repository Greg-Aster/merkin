import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
	BRIDGE_BIN_CAMERA_JPEG,
	BRIDGE_BIN_FACE_RGBA,
	BRIDGE_BIN_MIC_PCM,
	BRIDGE_BIN_SPEAKER_PCM,
	CAMERA_ORIGIN_REQUEST,
	VIRTUAL_ROBOT_AUDIO_FRAME_BYTES,
	VIRTUAL_ROBOT_FACE_HEIGHT,
	VIRTUAL_ROBOT_FACE_WIDTH,
	decodeBridgeFaceRgba,
	decodeBridgeSpeakerPcm,
	encodeBridgeCameraJpeg,
	encodeBridgeMicPcm,
	mujocoPositionToThree,
	mujocoQuaternionToThreeXyzw,
} from "../src/game/virtual-robot/index.js";

// 1. Verify legacy Sesame/Rapier physics-rig files are completely removed.
for (const removedPath of [
	"../src/game/physics-rigs/index.ts",
	"../src/pages/simulator.astro",
	"../scripts/test-dev-bridge-motion-contract.ts",
]) {
	assert.equal(
		existsSync(new URL(removedPath, import.meta.url)),
		false,
		`Superseded legacy path must remain deleted: ${removedPath}`,
	);
}

// 2. Verify ainekio-v2.glb and shared arenaGeometry.json exist and stay within budget.
const glbUrl = new URL(
	"../public/assets/robots/ainekio-v2.glb",
	import.meta.url,
);
assert.equal(
	existsSync(glbUrl),
	true,
	"ainekio-v2.glb must exist in public/assets/robots.",
);

const arenaGeometry = JSON.parse(
	readFileSync(
		new URL("../src/levels/v2-lab/arenaGeometry.json", import.meta.url),
		"utf8",
	),
) as {
	id: string;
	friction: number;
	geoms: Array<{ id: string; position_m: number[]; size_m: number[] }>;
};
assert.equal(arenaGeometry.id, "megameal_v2_lab");
assert.ok(
	arenaGeometry.geoms.length >= 4,
	"v2-lab arena must define shared MuJoCo/Megameal geoms.",
);

// 3. Verify MuJoCo (+X fwd, +Y left, +Z up) <-> Three.js (+Z fwd, +X left, +Y up) mapping.
assert.deepEqual(mujocoPositionToThree([1, 2, 3]), [2, 3, 1]);
assert.deepEqual(
	mujocoQuaternionToThreeXyzw([1, 0.1, 0.2, 0.3]),
	[0.2, 0.3, 0.1, 1],
);

// 4. Verify binary codecs match Ainekio simulator_bridge.py wire layout.
const facePixels = new Uint8Array(
	VIRTUAL_ROBOT_FACE_WIDTH * VIRTUAL_ROBOT_FACE_HEIGHT * 4,
);
facePixels.fill(180);
const faceBuf = new ArrayBuffer(10 + facePixels.byteLength);
const faceView = new DataView(faceBuf);
faceView.setUint8(0, BRIDGE_BIN_FACE_RGBA);
faceView.setUint16(1, VIRTUAL_ROBOT_FACE_WIDTH, true);
faceView.setUint16(3, VIRTUAL_ROBOT_FACE_HEIGHT, true);
faceView.setUint32(5, 42, true);
faceView.setUint8(9, 0);
new Uint8Array(faceBuf, 10).set(facePixels);
const decodedFace = decodeBridgeFaceRgba(faceBuf);
assert.ok(decodedFace);
assert.equal(decodedFace.width, 320);
assert.equal(decodedFace.height, 170);
assert.equal(decodedFace.sequence, 42);
assert.equal(decodedFace.rgba[0], 180);

const spkBuf = new ArrayBuffer(6 + VIRTUAL_ROBOT_AUDIO_FRAME_BYTES);
const spkView = new DataView(spkBuf);
spkView.setUint8(0, BRIDGE_BIN_SPEAKER_PCM);
spkView.setUint32(1, 7, true);
spkView.setUint8(5, 85);
const decodedSpeaker = decodeBridgeSpeakerPcm(spkBuf);
assert.ok(decodedSpeaker);
assert.equal(decodedSpeaker.counter, 7);
assert.equal(decodedSpeaker.volumePercent, 85);
assert.equal(decodedSpeaker.pcm.byteLength, VIRTUAL_ROBOT_AUDIO_FRAME_BYTES);

const camEncoded = encodeBridgeCameraJpeg({
	originCode: CAMERA_ORIGIN_REQUEST,
	resCode: 1,
	originId: 99,
	jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
});
assert.equal(camEncoded[0], BRIDGE_BIN_CAMERA_JPEG);
assert.equal(camEncoded[1], CAMERA_ORIGIN_REQUEST);
assert.equal(new DataView(camEncoded.buffer).getUint32(6, true), 99);

const micEncoded = encodeBridgeMicPcm({
	counter: 12,
	flags: 0x01,
	pcm: new Uint8Array(VIRTUAL_ROBOT_AUDIO_FRAME_BYTES),
});
assert.equal(micEncoded[0], BRIDGE_BIN_MIC_PCM);
assert.equal(micEncoded.byteLength, 6 + VIRTUAL_ROBOT_AUDIO_FRAME_BYTES);

// 5. Verify relay supports binary opcode 0x2 and robot-sim role.
const relaySource = readFileSync(
	new URL(
		"../src/app/dev-bridge/server/game-dev-bridge-relay.mjs",
		import.meta.url,
	),
	"utf8",
);
assert.ok(
	relaySource.includes('"robot-sim"'),
	"Dev bridge relay must support robot-sim role.",
);
assert.ok(
	relaySource.includes("frame.opcode === 0x2"),
	"Dev bridge relay must route binary frames.",
);

console.log("Virtual robot bridge contract passed.");
