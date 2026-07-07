import { readFileSync } from "node:fs";
import {
	createAinekioSesameNeutralMotionEvent,
	createAinekioSesameStepMotionEvent,
} from "../src/levels/player/avatars/index.js";

const gameDevBridgeSource = readFileSync(
	new URL("../src/app/dev-bridge/gameDevBridge.ts", import.meta.url),
	"utf8",
);
const gameDevBridgeRuntimeSource = readFileSync(
	new URL("../src/app/dev-bridge/gameDevBridgeRuntime.ts", import.meta.url),
	"utf8",
);
const globalLevelPackageSource = readFileSync(
	new URL("../src/levels/global/index.ts", import.meta.url),
	"utf8",
);
const masterControlMapSource = readFileSync(
	new URL("../src/editor/MasterControlMap.svelte", import.meta.url),
	"utf8",
);

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message?: string,
): void {
	if (actual !== expected) {
		throw new Error(
			message ?? `Expected ${String(expected)}, received ${String(actual)}.`,
		);
	}
}

function assertSourceIncludes(
	source: string,
	expected: string,
	message?: string,
): void {
	if (!source.includes(expected)) {
		throw new Error(
			message ?? `Expected source to include ${JSON.stringify(expected)}.`,
		);
	}
}

const neutral = createAinekioSesameNeutralMotionEvent(1000);
const step = createAinekioSesameStepMotionEvent(1000);
const expectedServoIds = new Set([
	"R1",
	"R2",
	"L1",
	"L2",
	"R4",
	"R3",
	"L3",
	"L4",
]);

assertEqual(
	neutral.robot,
	"ainekio-sesame",
	"Neutral test motion must target the Ainekio/Sesame physics rig.",
);
assertEqual(
	step.robot,
	"ainekio-sesame",
	"Step-cycle test motion must target the Ainekio/Sesame physics rig.",
);
assertEqual(
	step.ttlMs > Math.max(...step.frames.map((frame) => frame.atMs)),
	true,
	"Step-cycle test motion TTL must outlive its latest frame.",
);
for (const event of [neutral, step]) {
	for (const frame of event.frames) {
		assertEqual(
			expectedServoIds.has(frame.servo),
			true,
			`Motion test event references unsupported servo "${frame.servo}".`,
		);
	}
}

assertSourceIncludes(
	gameDevBridgeSource,
	"submitMotionEvent",
	"Game dev bridge command contract must include submitMotionEvent.",
);
assertSourceIncludes(
	gameDevBridgeSource,
	"submitMotionTestEvent",
	"Game dev bridge command contract must include registered motion test events.",
);
assertSourceIncludes(
	gameDevBridgeSource,
	"isPhysicsRigServoTargetEvent",
	"Game dev bridge must validate motion event payloads before queueing them.",
);
assertSourceIncludes(
	gameDevBridgeRuntimeSource,
	"client.submitMotionEvent(event)",
	"Game dev bridge runtime must submit accepted motion events into the Megameal runtime.",
);
assertSourceIncludes(
	gameDevBridgeRuntimeSource,
	"runtimeSettings.createPlayerAvatarMotionTestEvent",
	"Game dev bridge runtime must resolve editor test preset IDs through installed level-package data.",
);
assertSourceIncludes(
	globalLevelPackageSource,
	"createAinekioSesameStepMotionEvent",
	"Installed level-package data must own Ainekio/Sesame test motion resolution.",
);
assertSourceIncludes(
	masterControlMapSource,
	"sendSubmitMotionTestEvent",
	"Master Control must send Ainekio/Sesame test preset IDs through the bridge command path.",
);
