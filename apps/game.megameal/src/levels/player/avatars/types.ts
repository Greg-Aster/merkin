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
};

export type PlayerAvatarPackageConfig = {
	readonly schemaVersion: 1;
	readonly selectedAvatarId: string;
	readonly assets: readonly {
		readonly id: string;
		readonly kind: "sprite";
		readonly url: string;
		readonly sprite: {
			readonly color: string;
			readonly size: number;
			readonly opacity?: number;
			readonly intensity?: number;
			readonly glow?: number;
			readonly starType?: "point" | "sparkle" | "halo" | "classic";
			readonly depthTest?: boolean;
			readonly renderOrder?: number;
		};
		readonly tags?: readonly string[];
	}[];
	readonly avatars: readonly PlayerAvatarDefinition[];
};
