import type {
	StaticEnvironmentCollisionProduct,
	StaticEnvironmentCollisionVector3,
} from "./staticEnvironmentCollision.js";

export type LevelNpcPlacementData = {
	readonly mode: "absolute" | "walkable-ground";
	readonly heightOffset?: number;
};

export function resolveNpcPlacementPosition(
	position: readonly [number, number, number],
	placement: LevelNpcPlacementData | undefined,
	collisionProducts: readonly StaticEnvironmentCollisionProduct[],
): readonly [number, number, number] {
	if (!placement || placement.mode === "absolute") {
		return position;
	}

	const groundY = walkableGroundYAt(
		position[0],
		position[2],
		collisionProducts,
	);

	if (groundY === undefined) {
		return position;
	}

	return [
		position[0],
		round(groundY + (placement.heightOffset ?? 0)),
		position[2],
	];
}

export function walkableGroundYAt(
	x: number,
	z: number,
	products: readonly StaticEnvironmentCollisionProduct[],
): number | undefined {
	let groundY: number | undefined;

	for (const product of products) {
		for (const chunk of product.chunks) {
			if (
				x < chunk.bounds.min[0] ||
				x > chunk.bounds.max[0] ||
				z < chunk.bounds.min[2] ||
				z > chunk.bounds.max[2]
			) {
				continue;
			}

			const vertices = chunk.collider.shape.vertices;
			const indices = chunk.collider.shape.indices;
			for (let index = 0; index + 2 < indices.length; index += 3) {
				const a = vertices[indices[index] ?? -1];
				const b = vertices[indices[index + 1] ?? -1];
				const c = vertices[indices[index + 2] ?? -1];
				if (!a || !b || !c) {
					continue;
				}

				const candidate = triangleHeightAt(a, b, c, x, z);
				if (
					candidate !== undefined &&
					(groundY === undefined || candidate > groundY)
				) {
					groundY = candidate;
				}
			}
		}
	}

	return groundY;
}

function triangleHeightAt(
	a: StaticEnvironmentCollisionVector3,
	b: StaticEnvironmentCollisionVector3,
	c: StaticEnvironmentCollisionVector3,
	x: number,
	z: number,
): number | undefined {
	const v0x = b[0] - a[0];
	const v0z = b[2] - a[2];
	const v1x = c[0] - a[0];
	const v1z = c[2] - a[2];
	const v2x = x - a[0];
	const v2z = z - a[2];

	const dot00 = v0x * v0x + v0z * v0z;
	const dot01 = v0x * v1x + v0z * v1z;
	const dot02 = v0x * v2x + v0z * v2z;
	const dot11 = v1x * v1x + v1z * v1z;
	const dot12 = v1x * v2x + v1z * v2z;
	const denominator = dot00 * dot11 - dot01 * dot01;
	if (Math.abs(denominator) < 1e-9) {
		return undefined;
	}

	const inverseDenominator = 1 / denominator;
	const u = (dot11 * dot02 - dot01 * dot12) * inverseDenominator;
	const v = (dot00 * dot12 - dot01 * dot02) * inverseDenominator;
	if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) {
		return undefined;
	}

	return a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]);
}

function round(value: number): number {
	return Math.round(value * 1000) / 1000;
}
