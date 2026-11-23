import type { Vec3 } from "./Vec3";
import { vec3 } from "./Vec3";

export type Bounds = {
	readonly min: Vec3;
	readonly max: Vec3;
};

export function bounds(min: Vec3 = vec3(), max: Vec3 = vec3()): Bounds {
	return { min, max };
}

export function containsPoint(boundsValue: Bounds, point: Vec3): boolean {
	return (
		point.x >= boundsValue.min.x &&
		point.x <= boundsValue.max.x &&
		point.y >= boundsValue.min.y &&
		point.y <= boundsValue.max.y &&
		point.z >= boundsValue.min.z &&
		point.z <= boundsValue.max.z
	);
}
