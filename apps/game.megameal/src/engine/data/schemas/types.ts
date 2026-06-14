export type SchemaValidationResult =
	| {
			readonly ok: true;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export type SchemaValidator<TData = unknown> = {
	validate(data: unknown): SchemaValidationResult;
	parse(data: unknown): TData;
};

export type PrefabData = {
	readonly id: string;
	readonly components: Record<string, unknown>;
	readonly assetIds?: readonly string[];
	readonly tags?: readonly string[];
};

export type CubemapFaceUrlsData = {
	readonly px: string;
	readonly nx: string;
	readonly py: string;
	readonly ny: string;
	readonly pz: string;
	readonly nz: string;
};

export type TextureProjectionData = "uv" | "equirectangular";

export type VideoAssetMetadataData = {
	readonly loop: boolean;
	readonly muted: true;
	readonly playsInline: boolean;
	readonly preload: "auto" | "metadata" | "none";
	readonly posterAssetId?: string;
	readonly crossOrigin?: "anonymous" | "use-credentials";
};

export type MaterialParametersData = {
	readonly color?: string;
	readonly emissive?: string;
	readonly emissiveIntensity?: number;
	readonly metalness?: number;
	readonly roughness?: number;
	readonly opacity?: number;
	readonly transparent?: boolean;
};

export type AssetManifestEntryData = {
	readonly id: string;
	readonly kind:
		| "mesh"
		| "material"
		| "texture"
		| "cubemap"
		| "video"
		| "audio"
		| "animation"
		| "prefab"
		| "scene"
		| "data";
	readonly url: string;
	readonly faces?: CubemapFaceUrlsData;
	readonly projection?: TextureProjectionData;
	readonly video?: VideoAssetMetadataData;
	readonly material?: MaterialParametersData;
	readonly colorSpace?: "srgb" | "linear";
	readonly tags?: readonly string[];
};

export type AssetManifestData = {
	readonly assets: readonly AssetManifestEntryData[];
	readonly preloadGroups?: Record<string, readonly string[]>;
};

export type LevelPrefabInstanceData = {
	readonly id: string;
	readonly prefabId: string;
	readonly stableId: string;
	readonly components?: Record<string, unknown>;
	readonly transform?: {
		readonly position?: readonly [number, number, number];
		readonly rotation?: readonly [number, number, number, number];
		readonly scale?: readonly [number, number, number];
	};
};

export type LevelData = {
	readonly id: string;
	readonly sceneId?: string;
	readonly preload?: readonly string[];
	readonly preloadGroups?: readonly string[];
	readonly resources?: Record<string, unknown>;
	readonly instances: readonly LevelPrefabInstanceData[];
};

export type TerrainBoundsData = {
	readonly min: readonly [number, number, number];
	readonly max: readonly [number, number, number];
};

export type TerrainChunkLodData = {
	readonly nearVisualStableIds: readonly string[];
	readonly farVisualStableIds: readonly string[];
};

export type TerrainMaterialLayerData = {
	readonly id: string;
	readonly materialAssetId: string;
	readonly textureAssetIds?: readonly string[];
	readonly uvScale?: readonly [number, number];
};

export type TerrainMaterialSetData = {
	readonly id: string;
	readonly blendMode: "single" | "weighted" | "splat-map";
	readonly fallbackMaterialAssetId: string;
	readonly layers: readonly TerrainMaterialLayerData[];
};

export type TerrainChunkMaterialBindingData = {
	readonly materialSetId: string;
	readonly layerIds: readonly string[];
	readonly uvScale?: readonly [number, number];
};

export type TerrainChunkStreamingPolicyData = {
	readonly startupRadiusMeters: number;
	readonly activeCollisionRadiusMeters: number;
	readonly nearVisualRadiusMeters: number;
	readonly farVisualRadiusMeters: number;
	readonly unloadRadiusMeters: number;
	readonly hysteresisMeters: number;
	readonly maxChunkOperationsPerTick: number;
};

export type TerrainChunkPackageChunkData = {
	readonly stableId: string;
	readonly groupId: string;
	readonly chunkKey: readonly [number, number];
	readonly bounds: TerrainBoundsData;
	readonly center: readonly [number, number, number];
	readonly lod: TerrainChunkLodData;
	readonly materialBinding?: TerrainChunkMaterialBindingData;
	readonly rigidBodyComponent: {
		readonly type: "fixed";
		readonly mass: 0;
	};
	readonly colliderComponent: Record<string, unknown>;
};

export type TerrainVisualBindingData = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly bounds: TerrainBoundsData;
	readonly sourceChunkStableIds: readonly string[];
	readonly lod: "near" | "far" | "merged-floor";
};

export type TerrainChunkPackageData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly sourceManifestId: string;
	readonly policy: TerrainChunkStreamingPolicyData;
	readonly materialSets: readonly TerrainMaterialSetData[];
	readonly chunks: readonly TerrainChunkPackageChunkData[];
	readonly visualBindings: readonly TerrainVisualBindingData[];
	readonly startupChunkStableIds: readonly string[];
	readonly streamableChunkStableIds: readonly string[];
	readonly driftHash: string;
};

export type RenderProfileLightData =
	| {
			readonly kind: "ambient";
			readonly color: string;
			readonly intensity: number;
	  }
	| {
			readonly kind: "directional";
			readonly color: string;
			readonly intensity: number;
			readonly position: readonly [number, number, number];
			readonly shadow?: LightShadowData;
	  };

export type LightBudgetProfileData = {
	readonly maxTotal?: number;
	readonly maxAmbient?: number;
	readonly maxDirectional?: number;
	readonly maxPoint?: number;
	readonly maxSpot?: number;
	readonly maxArea?: number;
	readonly maxShadowCasting?: number;
};

export type LightShadowData = {
	readonly enabled: boolean;
	readonly mapSize?: 256 | 512 | 1024 | 2048;
	readonly bias?: number;
	readonly normalBias?: number;
	readonly radius?: number;
	readonly cameraNear?: number;
	readonly cameraFar?: number;
};

export type LightComponentData =
	| {
			readonly kind: "ambient";
			readonly color: string;
			readonly intensity: number;
			readonly visible?: boolean;
	  }
	| {
			readonly kind: "directional";
			readonly color: string;
			readonly intensity: number;
			readonly visible?: boolean;
			readonly shadow?: LightShadowData;
	  }
	| {
			readonly kind: "point";
			readonly color: string;
			readonly intensity: number;
			readonly distance: number;
			readonly decay: number;
			readonly visible?: boolean;
			readonly shadow?: LightShadowData;
	  }
	| {
			readonly kind: "spot";
			readonly color: string;
			readonly intensity: number;
			readonly distance: number;
			readonly decay: number;
			readonly angle: number;
			readonly penumbra: number;
			readonly visible?: boolean;
			readonly shadow?: LightShadowData;
	  }
	| {
			readonly kind: "area";
			readonly shape: "rectangle";
			readonly color: string;
			readonly intensity: number;
			readonly width: number;
			readonly height: number;
			readonly visible?: boolean;
	  };

export type DynamicEnvironmentCaptureData = {
	readonly mode: "on-load" | "interval" | "manual";
	readonly resolution: 64 | 128 | 256;
	readonly intervalSeconds?: number;
};

export type SceneEnvironmentLightingData = {
	readonly intensity: number;
	readonly source: "asset" | "dynamic-capture";
	readonly prefiltered?: boolean;
	readonly dynamicCapture?: DynamicEnvironmentCaptureData;
};

export type Vec3Data = {
	readonly x: number;
	readonly y: number;
	readonly z: number;
};

export type BaseEnvironmentData = {
	readonly backgroundIntensity: number;
	readonly lighting?: SceneEnvironmentLightingData;
};

export type SolidColorEnvironmentData = BaseEnvironmentData & {
	readonly kind: "solid-color";
	readonly color: string;
};

export type AssetBackedEnvironmentData = BaseEnvironmentData & {
	readonly assetId: string;
	readonly backgroundBlurriness: number;
	readonly environmentIntensity: number;
	readonly requiredForReadiness: boolean;
};

export type CubemapEnvironmentData = AssetBackedEnvironmentData & {
	readonly kind: "cubemap-skybox";
};

export type EquirectangularEnvironmentData = AssetBackedEnvironmentData & {
	readonly kind: "equirectangular-environment";
};

export type VideoSkyboxEnvironmentData = AssetBackedEnvironmentData & {
	readonly kind: "video-skybox";
	readonly mapping: "equirectangular-360";
	readonly dynamicCapture?: DynamicEnvironmentCaptureData;
};

export type ProceduralAtmosphereEnvironmentData = BaseEnvironmentData & {
	readonly kind: "procedural-atmosphere";
	readonly skyColor: string;
	readonly horizonColor: string;
	readonly groundColor: string;
	readonly sunDirection: Vec3Data | readonly [number, number, number];
	readonly sunColor: string;
	readonly sunIntensity: number;
	readonly turbidity: number;
	readonly exposure: number;
	readonly environmentIntensity: number;
	readonly dynamicCapture?: DynamicEnvironmentCaptureData;
};

export type RenderProfileEnvironmentData =
	| SolidColorEnvironmentData
	| CubemapEnvironmentData
	| EquirectangularEnvironmentData
	| VideoSkyboxEnvironmentData
	| ProceduralAtmosphereEnvironmentData;

export type RenderProfilePostProcessingEffectData =
	| {
			readonly kind: "bloom";
			readonly threshold: number;
			readonly intensity: number;
			readonly radius: number;
	  }
	| {
			readonly kind: "color-grading";
			readonly exposure: number;
			readonly contrast: number;
			readonly saturation: number;
	  }
	| {
			readonly kind: "vignette";
			readonly offset: number;
			readonly darkness: number;
	  };

export type RenderProfilePostProcessingData = {
	readonly enabled: boolean;
	readonly quality: "off" | "low" | "medium" | "high";
	readonly effects: readonly RenderProfilePostProcessingEffectData[];
};

export type RenderProfileData = {
	readonly id: string;
	readonly renderer: {
		readonly clearColor: string;
		readonly clearAlpha: number;
		readonly antialias: boolean;
		readonly maxPixelRatio: number;
		readonly fallbackMaterialColor: string;
	};
	readonly lighting: {
		readonly lights: readonly RenderProfileLightData[];
		readonly budget?: LightBudgetProfileData;
	};
	readonly environment: RenderProfileEnvironmentData;
	readonly postProcessing?: RenderProfilePostProcessingData;
};

export type RuntimeSceneManifestData = {
	readonly schemaVersion: 1;
	readonly id: string;
	readonly generatedAt: string;
	readonly source: {
		readonly kind: "prototype" | "authored" | "cook";
		readonly id: string;
	};
	readonly level: LevelData;
	readonly prefabs: readonly PrefabData[];
	readonly assets: AssetManifestData;
	readonly renderProfile: RenderProfileData;
	readonly terrainPackages?: readonly TerrainChunkPackageData[];
	readonly readiness: {
		readonly playerStableId: string;
		readonly requiredAssetIds?: readonly string[];
		readonly requiredCollisionPrefabIds?: readonly string[];
		readonly requiredCollisionStableIds?: readonly string[];
		readonly requiredWalkableStableIds?: readonly string[];
		readonly requiredLightStableIds?: readonly string[];
		readonly requiredTerrainPackageIds?: readonly string[];
	};
};

export type CollisionIntentData = "solid" | "trigger" | "walkable";
export type CollisionChannelData = string;
