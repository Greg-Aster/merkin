import {
	type CollisionCookDraftData,
	type CollisionCookDraftEntryData,
	type CollisionCookShapeData,
	type CollisionCookVector3Data,
	parseCollisionCookDraft,
} from "../../../engine/data/index.js";

export type CollisionOverlayBounds = {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
	readonly center: CollisionCookVector3Data;
	readonly size: CollisionCookVector3Data;
};

export type CollisionOverlayTransformViewModel = {
	readonly position: CollisionCookVector3Data;
	readonly rotation: readonly [number, number, number, number];
	readonly scale: CollisionCookVector3Data;
};

export type CollisionOverlayReadinessViewModel = {
	readonly requiredCollision: boolean;
	readonly requiredWalkable: boolean;
};

export type CollisionOverlayEntryViewModel = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly colliderTarget: CollisionCookDraftEntryData["colliderTarget"];
	readonly shapeType: CollisionCookShapeData["type"];
	readonly transform: CollisionOverlayTransformViewModel;
	readonly intent: CollisionCookDraftEntryData["collider"]["intent"];
	readonly channel: CollisionCookDraftEntryData["collider"]["channel"];
	readonly sensor: boolean;
	readonly readiness: CollisionOverlayReadinessViewModel;
	readonly bounds: CollisionOverlayBounds;
	readonly notes?: string;
};

export type CollisionOverlayViewModel = {
	readonly draftId: string;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly entries: readonly CollisionOverlayEntryViewModel[];
};

const DEFAULT_POSITION = [0, 0, 0] as const;
const DEFAULT_ROTATION = [0, 0, 0, 1] as const;
const DEFAULT_SCALE = [1, 1, 1] as const;

export function buildCollisionOverlayViewModel(
	draftInput: CollisionCookDraftData,
): CollisionOverlayViewModel {
	const draft = parseCollisionCookDraft(draftInput);

	return {
		draftId: draft.id,
		runtimeSceneId: draft.runtimeSceneId,
		levelId: draft.levelId,
		entries: draft.entries.map(collisionDraftEntryToOverlayViewModel),
	};
}

function collisionDraftEntryToOverlayViewModel(
	entry: CollisionCookDraftEntryData,
): CollisionOverlayEntryViewModel {
	const transform = normalizeTransform(entry);

	return {
		id: entry.id,
		stableId: entry.stableId,
		prefabId: entry.prefabId,
		colliderTarget: entry.colliderTarget,
		shapeType: entry.collider.shape.type,
		transform,
		intent: entry.collider.intent,
		channel: entry.collider.channel,
		sensor: entry.collider.sensor === true,
		readiness: {
			requiredCollision: entry.readiness.requiredCollision,
			requiredWalkable: entry.readiness.requiredWalkable === true,
		},
		bounds: computeWorldBounds(entry.collider.shape, transform),
		...(entry.notes !== undefined ? { notes: entry.notes } : {}),
	};
}

function normalizeTransform(
	entry: CollisionCookDraftEntryData,
): CollisionOverlayTransformViewModel {
	return {
		position: entry.transform?.position ?? DEFAULT_POSITION,
		rotation: entry.transform?.rotation ?? DEFAULT_ROTATION,
		scale: entry.transform?.scale ?? DEFAULT_SCALE,
	};
}

function computeWorldBounds(
	shape: CollisionCookShapeData,
	transform: CollisionOverlayTransformViewModel,
): CollisionOverlayBounds {
	const localBounds = computeLocalBounds(shape);
	const corners = boundsCorners(localBounds).map((corner) =>
		transformPoint(corner, transform),
	);
	const bounds = boundsFromPoints(corners);

	return {
		...bounds,
		center: midpoint(bounds.min, bounds.max),
		size: subtract(bounds.max, bounds.min),
	};
}

function computeLocalBounds(shape: CollisionCookShapeData): {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
} {
	switch (shape.type) {
		case "box":
			return boundsFromRadius(shape.halfExtents);
		case "sphere":
			return boundsFromRadius([shape.radius, shape.radius, shape.radius]);
		case "capsule":
			return boundsFromRadius([
				shape.radius,
				shape.halfHeight + shape.radius,
				shape.radius,
			]);
		case "cylinder":
			return boundsFromRadius([shape.radius, shape.halfHeight, shape.radius]);
		case "mesh":
			return boundsFromPoints(shape.vertices);
	}
}

function boundsFromRadius(radius: CollisionCookVector3Data): {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
} {
	return {
		min: [-radius[0], -radius[1], -radius[2]],
		max: [radius[0], radius[1], radius[2]],
	};
}

function boundsFromPoints(points: readonly CollisionCookVector3Data[]): {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
} {
	const first = points[0];

	if (!first) {
		return {
			min: [0, 0, 0],
			max: [0, 0, 0],
		};
	}

	let minX = first[0];
	let minY = first[1];
	let minZ = first[2];
	let maxX = first[0];
	let maxY = first[1];
	let maxZ = first[2];

	for (const point of points.slice(1)) {
		minX = Math.min(minX, point[0]);
		minY = Math.min(minY, point[1]);
		minZ = Math.min(minZ, point[2]);
		maxX = Math.max(maxX, point[0]);
		maxY = Math.max(maxY, point[1]);
		maxZ = Math.max(maxZ, point[2]);
	}

	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ],
	};
}

function boundsCorners(bounds: {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
}): readonly CollisionCookVector3Data[] {
	const { min, max } = bounds;

	return [
		[min[0], min[1], min[2]],
		[min[0], min[1], max[2]],
		[min[0], max[1], min[2]],
		[min[0], max[1], max[2]],
		[max[0], min[1], min[2]],
		[max[0], min[1], max[2]],
		[max[0], max[1], min[2]],
		[max[0], max[1], max[2]],
	];
}

function transformPoint(
	point: CollisionCookVector3Data,
	transform: CollisionOverlayTransformViewModel,
): CollisionCookVector3Data {
	const scaled = multiply(point, transform.scale);
	const rotated = rotateByQuaternion(scaled, transform.rotation);

	return add(rotated, transform.position);
}

function rotateByQuaternion(
	point: CollisionCookVector3Data,
	quaternion: readonly [number, number, number, number],
): CollisionCookVector3Data {
	const [x, y, z] = point;
	const [qx, qy, qz, qw] = quaternion;
	const tx = 2 * (qy * z - qz * y);
	const ty = 2 * (qz * x - qx * z);
	const tz = 2 * (qx * y - qy * x);

	return [
		x + qw * tx + (qy * tz - qz * ty),
		y + qw * ty + (qz * tx - qx * tz),
		z + qw * tz + (qx * ty - qy * tx),
	];
}

function add(
	left: CollisionCookVector3Data,
	right: CollisionCookVector3Data,
): CollisionCookVector3Data {
	return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtract(
	left: CollisionCookVector3Data,
	right: CollisionCookVector3Data,
): CollisionCookVector3Data {
	return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function multiply(
	left: CollisionCookVector3Data,
	right: CollisionCookVector3Data,
): CollisionCookVector3Data {
	return [left[0] * right[0], left[1] * right[1], left[2] * right[2]];
}

function midpoint(
	min: CollisionCookVector3Data,
	max: CollisionCookVector3Data,
): CollisionCookVector3Data {
	return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}
