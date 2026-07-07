import type { PhysicsRigServoFrame } from "../../../../game/physics-rigs/index.js";
import { createAinekioSesameMotionEvent } from "./motionAdapter.js";

const STEP_FRAMES = [
	frameSet(0, {
		R1: 18,
		R2: -18,
		L1: -18,
		L2: 18,
		R3: 22,
		R4: 0,
		L3: 0,
		L4: 22,
	}),
	frameSet(160, {
		R1: -18,
		R2: 18,
		L1: 18,
		L2: -18,
		R3: 0,
		R4: 22,
		L3: 22,
		L4: 0,
	}),
	frameSet(320, {
		R1: 12,
		R2: -12,
		L1: -12,
		L2: 12,
		R3: 16,
		R4: 0,
		L3: 0,
		L4: 16,
	}),
	frameSet(480, {
		R1: 0,
		R2: 0,
		L1: 0,
		L2: 0,
		R3: 0,
		R4: 0,
		L3: 0,
		L4: 0,
	}),
].flat();

export function createAinekioSesameNeutralMotionEvent(issuedAtMs = Date.now()) {
	return createAinekioSesameMotionEvent({
		sequence: "megameal-neutral",
		command: "neutral",
		issuedAtMs,
		ttlMs: 350,
		frames: frameSet(0, {
			R1: 0,
			R2: 0,
			L1: 0,
			L2: 0,
			R3: 0,
			R4: 0,
			L3: 0,
			L4: 0,
		}),
	});
}

export function createAinekioSesameStepMotionEvent(issuedAtMs = Date.now()) {
	return createAinekioSesameMotionEvent({
		sequence: "megameal-step-cycle",
		command: "step-cycle",
		issuedAtMs,
		ttlMs: 700,
		frames: STEP_FRAMES,
	});
}

function frameSet(
	atMs: number,
	angles: Record<string, number>,
): readonly PhysicsRigServoFrame[] {
	return Object.entries(angles).map(([servo, angleDeg]) => ({
		servo,
		angleDeg,
		atMs,
	}));
}
