export type Vec3 = {
	x: number;
	y: number;
	z: number;
};

export function vec3(x = 0, y = 0, z = 0): Vec3 {
	return { x, y, z };
}

export function addVec3(left: Vec3, right: Vec3): Vec3 {
	return vec3(left.x + right.x, left.y + right.y, left.z + right.z);
}

export function subtractVec3(left: Vec3, right: Vec3): Vec3 {
	return vec3(left.x - right.x, left.y - right.y, left.z - right.z);
}

export function scaleVec3(value: Vec3, scalar: number): Vec3 {
	return vec3(value.x * scalar, value.y * scalar, value.z * scalar);
}

export function dotVec3(left: Vec3, right: Vec3): number {
	return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function crossVec3(left: Vec3, right: Vec3): Vec3 {
	return vec3(
		left.y * right.z - left.z * right.y,
		left.z * right.x - left.x * right.z,
		left.x * right.y - left.y * right.x,
	);
}

export function lengthSquaredVec3(value: Vec3): number {
	return dotVec3(value, value);
}

export function lengthVec3(value: Vec3): number {
	return Math.sqrt(lengthSquaredVec3(value));
}

export function normalizeVec3(value: Vec3): Vec3 {
	const length = lengthVec3(value);
	return length > 0 ? scaleVec3(value, 1 / length) : vec3();
}
