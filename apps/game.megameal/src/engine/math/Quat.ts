import type { Vec3 } from "./Vec3";
import { vec3 } from "./Vec3";

export type Quat = {
	x: number;
	y: number;
	z: number;
	w: number;
};

export function quat(x = 0, y = 0, z = 0, w = 1): Quat {
	return { x, y, z, w };
}

export function identityQuat(): Quat {
	return quat();
}

export function multiplyQuat(left: Quat, right: Quat): Quat {
	return quat(
		left.w * right.x + left.x * right.w + left.y * right.z - left.z * right.y,
		left.w * right.y - left.x * right.z + left.y * right.w + left.z * right.x,
		left.w * right.z + left.x * right.y - left.y * right.x + left.z * right.w,
		left.w * right.w - left.x * right.x - left.y * right.y - left.z * right.z,
	);
}

export function conjugateQuat(value: Quat): Quat {
	return quat(-value.x, -value.y, -value.z, value.w);
}

export function normalizeQuat(value: Quat): Quat {
	const length = Math.sqrt(
		value.x * value.x +
			value.y * value.y +
			value.z * value.z +
			value.w * value.w,
	);

	return length > 0
		? quat(
				value.x / length,
				value.y / length,
				value.z / length,
				value.w / length,
			)
		: identityQuat();
}

export function quatFromAxisAngle(axis: Vec3, radians: number): Quat {
	const axisLength = Math.sqrt(
		axis.x * axis.x + axis.y * axis.y + axis.z * axis.z,
	);

	if (axisLength === 0) {
		return identityQuat();
	}

	const halfAngle = radians * 0.5;
	const scale = Math.sin(halfAngle) / axisLength;

	return normalizeQuat(
		quat(axis.x * scale, axis.y * scale, axis.z * scale, Math.cos(halfAngle)),
	);
}

export function rotateVec3ByQuat(value: Vec3, rotation: Quat): Vec3 {
	const vectorQuat = quat(value.x, value.y, value.z, 0);
	const rotated = multiplyQuat(
		multiplyQuat(rotation, vectorQuat),
		conjugateQuat(rotation),
	);
	return vec3(rotated.x, rotated.y, rotated.z);
}
