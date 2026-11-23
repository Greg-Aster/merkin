import type { Vec3 } from "./Vec3";
import { normalizeVec3, vec3 } from "./Vec3";

export type Ray = {
	readonly origin: Vec3;
	readonly direction: Vec3;
};

export function ray(
	origin: Vec3 = vec3(),
	direction: Vec3 = vec3(0, 0, -1),
): Ray {
	return {
		origin,
		direction: normalizeVec3(direction),
	};
}
