import type { AssetManifestEntry } from "../../../engine/modules/assets/index.js";

export type PlayerAvatarVector3 = readonly [number, number, number];

export type PlayerAvatarMeshRenderable = {
	readonly kind?: "mesh";
	readonly meshId: string;
	readonly materialId?: string;
	readonly scale?: PlayerAvatarVector3;
};

export type PlayerAvatarSpriteRenderable = {
	readonly kind: "sprite";
	readonly spriteId: string;
	readonly color?: string;
	readonly scale?: PlayerAvatarVector3;
	readonly fallback?: PlayerAvatarMeshRenderable;
};

export type PlayerAvatarRenderable =
	| PlayerAvatarMeshRenderable
	| PlayerAvatarSpriteRenderable;

export type PlayerAvatarDefinition = {
	readonly id: string;
	readonly name: string;
	readonly renderable: PlayerAvatarRenderable;
	readonly physicsRig?: {
		readonly kind: "articulated-physics-rig";
		readonly rigId: string;
	};
};

export type PlayerAvatarPackageConfig = {
	readonly schemaVersion: 1;
	readonly selectedAvatarId: string;
	readonly assets: readonly AssetManifestEntry[];
	readonly avatars: readonly PlayerAvatarDefinition[];
};
