import { readFileSync } from "node:fs";

const gameDevBridgeSource = readFileSync(
	new URL("../src/app/dev-bridge/gameDevBridge.ts", import.meta.url),
	"utf8",
);
const gameDevBridgeRuntimeSource = readFileSync(
	new URL("../src/app/dev-bridge/gameDevBridgeRuntime.ts", import.meta.url),
	"utf8",
);

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

assertSourceIncludes(
	gameDevBridgeSource,
	"submitMotionEvent",
	"Game dev bridge command contract must keep direct motion-event submission.",
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
