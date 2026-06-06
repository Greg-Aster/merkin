export type Vec2 = {
	x: number;
	y: number;
};

export function vec2(x = 0, y = 0): Vec2 {
	return { x, y };
}

export function addVec2(left: Vec2, right: Vec2): Vec2 {
	return vec2(left.x + right.x, left.y + right.y);
}

export function subtractVec2(left: Vec2, right: Vec2): Vec2 {
	return vec2(left.x - right.x, left.y - right.y);
}

export function scaleVec2(value: Vec2, scalar: number): Vec2 {
	return vec2(value.x * scalar, value.y * scalar);
}

export function dotVec2(left: Vec2, right: Vec2): number {
	return left.x * right.x + left.y * right.y;
}

export function lengthSquaredVec2(value: Vec2): number {
	return dotVec2(value, value);
}

export function lengthVec2(value: Vec2): number {
	return Math.sqrt(lengthSquaredVec2(value));
}

export function normalizeVec2(value: Vec2): Vec2 {
	const length = lengthVec2(value);
	return length > 0 ? scaleVec2(value, 1 / length) : vec2();
}
