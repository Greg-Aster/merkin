import type {
	PhysicsRigServoFrame,
	PhysicsRigServoTargetEvent,
} from "../../../../game/physics-rigs/index.js";
import { AINEKIO_SESAME_PHYSICS_RIG_ID } from "./rig.js";

const AINEKIO_SESAME_SERVO_IDS = new Set([
	"R1",
	"R2",
	"L1",
	"L2",
	"R4",
	"R3",
	"L3",
	"L4",
]);

export type AinekioSesameMotionAdapterInput = {
	readonly sequence: string;
	readonly command: string;
	readonly issuedAtMs: number;
	readonly ttlMs: number;
	readonly frames: readonly PhysicsRigServoFrame[];
};

export function createAinekioSesameMotionEvent(
	input: AinekioSesameMotionAdapterInput,
): PhysicsRigServoTargetEvent {
	for (const frame of input.frames) {
		if (!AINEKIO_SESAME_SERVO_IDS.has(frame.servo)) {
			throw new Error(
				`Ainekio/Sesame motion frame references unknown servo "${frame.servo}".`,
			);
		}
	}

	return {
		schemaVersion: 1,
		robot: AINEKIO_SESAME_PHYSICS_RIG_ID,
		sequence: input.sequence,
		command: input.command,
		issuedAtMs: input.issuedAtMs,
		ttlMs: input.ttlMs,
		frames: input.frames,
	};
}
