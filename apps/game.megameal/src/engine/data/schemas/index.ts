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

export class SchemaValidationError extends Error {
	readonly errors: readonly string[];

	constructor(schemaName: string, errors: readonly string[]) {
		super(`${schemaName} validation failed: ${errors.join("; ")}`);
		this.name = "SchemaValidationError";
		this.errors = errors;
	}
}

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

export type SpriteAssetParametersData = {
	readonly color: string;
	readonly size: number;
	readonly opacity?: number;
	readonly intensity?: number;
	readonly glow?: number;
	readonly starType?: "point" | "sparkle" | "halo" | "classic";
	readonly depthTest?: boolean;
	readonly renderOrder?: number;
};

export type AssetManifestEntryData = {
	readonly id: string;
	readonly kind:
		| "mesh"
		| "material"
		| "sprite"
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
	readonly sprite?: SpriteAssetParametersData;
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
	};
	readonly environment: RenderProfileEnvironmentData;
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
	readonly readiness: {
		readonly playerStableId: string;
		readonly requiredAssetIds?: readonly string[];
		readonly requiredCollisionPrefabIds?: readonly string[];
		readonly requiredCollisionStableIds?: readonly string[];
		readonly requiredWalkableStableIds?: readonly string[];
		readonly requiredLightStableIds?: readonly string[];
	};
};

export type CollisionIntentData = "solid" | "trigger" | "walkable";
export type CollisionChannelData = string;

export function createSchemaValidator<TData>(
	schemaName: string,
	validateData: (data: unknown) => readonly string[],
): SchemaValidator<TData> {
	return {
		validate(data: unknown): SchemaValidationResult {
			const errors = validateData(data);
			return errors.length === 0 ? { ok: true } : { ok: false, errors };
		},
		parse(data: unknown): TData {
			const errors = validateData(data);

			if (errors.length > 0) {
				throw new SchemaValidationError(schemaName, errors);
			}

			return data as TData;
		},
	};
}

export const prefabDefinitionValidator = createSchemaValidator<PrefabData>(
	"PrefabDefinition",
	validatePrefabDefinition,
);

export const assetManifestValidator = createSchemaValidator<AssetManifestData>(
	"AssetManifest",
	validateAssetManifest,
);

export const levelDefinitionValidator = createSchemaValidator<LevelData>(
	"LevelDefinition",
	validateLevelDefinition,
);

export const renderProfileValidator = createSchemaValidator<RenderProfileData>(
	"RenderProfile",
	validateRenderProfile,
);

export const runtimeSceneManifestValidator =
	createSchemaValidator<RuntimeSceneManifestData>(
		"RuntimeSceneManifest",
		validateRuntimeSceneManifest,
	);

export function validatePrefabDefinition(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Prefab must be an object."];
	}

	requireString(data, "id", "prefab.id", errors);

	if (!isRecord(data.components)) {
		errors.push("prefab.components must be an object.");
	} else {
		const componentNames = Object.keys(data.components);

		if (componentNames.length === 0) {
			errors.push("prefab.components must contain at least one component.");
		}

		for (const [componentName, component] of Object.entries(data.components)) {
			if (componentName.length === 0) {
				errors.push(
					"prefab.components cannot contain an empty component name.",
				);
			}

			validateSerializableValue(
				component,
				`prefab.components.${componentName}`,
				errors,
			);
		}

		validateKnownComponents(data.components, "prefab.components", errors);
	}

	validateOptionalStringArray(data.assetIds, "prefab.assetIds", errors);
	validateOptionalStringArray(data.tags, "prefab.tags", errors);

	return errors;
}

export function validateAssetManifest(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Asset manifest must be an object."];
	}

	if (!Array.isArray(data.assets)) {
		errors.push("assetManifest.assets must be an array.");
		return errors;
	}

	const assetIds = new Set<string>();
	const assetKinds = new Map<string, string>();

	for (const [index, entry] of data.assets.entries()) {
		validateAssetManifestEntry(
			entry,
			`assetManifest.assets.${index}`,
			errors,
			assetIds,
		);

		if (
			isRecord(entry) &&
			typeof entry.id === "string" &&
			typeof entry.kind === "string"
		) {
			assetKinds.set(entry.id, entry.kind);
		}
	}

	for (const [index, entry] of data.assets.entries()) {
		if (isRecord(entry) && isRecord(entry.video)) {
			const posterAssetId = entry.video.posterAssetId;

			if (typeof posterAssetId === "string" && !assetIds.has(posterAssetId)) {
				errors.push(
					`assetManifest.assets.${index}.video.posterAssetId references unknown asset "${posterAssetId}".`,
				);
			} else if (
				typeof posterAssetId === "string" &&
				assetKinds.get(posterAssetId) !== "texture"
			) {
				errors.push(
					`assetManifest.assets.${index}.video.posterAssetId references ${assetKinds.get(posterAssetId)} asset "${posterAssetId}", expected texture.`,
				);
			}
		}
	}

	if (data.preloadGroups !== undefined) {
		if (!isRecord(data.preloadGroups)) {
			errors.push(
				"assetManifest.preloadGroups must be an object when provided.",
			);
		} else {
			for (const [groupId, groupAssetIds] of Object.entries(
				data.preloadGroups,
			)) {
				if (groupId.length === 0) {
					errors.push(
						"assetManifest.preloadGroups cannot contain an empty group ID.",
					);
				}

				validateRequiredStringArray(
					groupAssetIds,
					`assetManifest.preloadGroups.${groupId}`,
					errors,
				);

				if (Array.isArray(groupAssetIds)) {
					for (const [assetIndex, assetId] of groupAssetIds.entries()) {
						if (typeof assetId === "string" && !assetIds.has(assetId)) {
							errors.push(
								`assetManifest.preloadGroups.${groupId}.${assetIndex} references unknown asset "${assetId}".`,
							);
						}
					}
				}
			}
		}
	}

	return errors;
}

export function validateLevelDefinition(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Level must be an object."];
	}

	requireString(data, "id", "level.id", errors);

	if (data.sceneId !== undefined) {
		requireString(data, "sceneId", "level.sceneId", errors);
	}

	validateOptionalStringArray(data.preload, "level.preload", errors);
	validateOptionalStringArray(
		data.preloadGroups,
		"level.preloadGroups",
		errors,
	);

	if (data.resources !== undefined) {
		if (!isRecord(data.resources)) {
			errors.push("level.resources must be an object when provided.");
		} else {
			for (const [resourceName, resource] of Object.entries(data.resources)) {
				validateSerializableValue(
					resource,
					`level.resources.${resourceName}`,
					errors,
				);
			}
		}
	}

	if (!Array.isArray(data.instances)) {
		errors.push("level.instances must be an array.");
		return errors;
	}

	for (const [index, instance] of data.instances.entries()) {
		validateLevelInstance(instance, `level.instances.${index}`, errors);
	}

	return errors;
}

export function validateRenderProfile(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Render profile must be an object."];
	}

	requireString(data, "id", "renderProfile.id", errors);

	if (!isRecord(data.renderer)) {
		errors.push("renderProfile.renderer must be an object.");
	} else {
		validateRequiredHexColor(
			data.renderer.clearColor,
			"renderProfile.renderer.clearColor",
			errors,
		);
		validateRequiredAlpha(
			data.renderer.clearAlpha,
			"renderProfile.renderer.clearAlpha",
			errors,
		);

		if (typeof data.renderer.antialias !== "boolean") {
			errors.push("renderProfile.renderer.antialias must be a boolean.");
		}

		validateRequiredPositiveNumber(
			data.renderer.maxPixelRatio,
			"renderProfile.renderer.maxPixelRatio",
			errors,
		);
		validateRequiredHexColor(
			data.renderer.fallbackMaterialColor,
			"renderProfile.renderer.fallbackMaterialColor",
			errors,
		);
	}

	if (!isRecord(data.lighting)) {
		errors.push("renderProfile.lighting must be an object.");
	} else if (!Array.isArray(data.lighting.lights)) {
		errors.push("renderProfile.lighting.lights must be an array.");
	} else {
		for (const [index, light] of data.lighting.lights.entries()) {
			validateRenderProfileLight(
				light,
				`renderProfile.lighting.lights.${index}`,
				errors,
			);
		}
	}

	validateRenderProfileEnvironment(
		data.environment,
		"renderProfile.environment",
		errors,
	);

	return errors;
}

export function validateRuntimeSceneManifest(data: unknown): readonly string[] {
	const errors: string[] = [];

	if (!isRecord(data)) {
		return ["Runtime scene manifest must be an object."];
	}

	if (data.schemaVersion !== 1) {
		errors.push("runtimeSceneManifest.schemaVersion must be 1.");
	}

	requireString(data, "id", "runtimeSceneManifest.id", errors);
	requireString(
		data,
		"generatedAt",
		"runtimeSceneManifest.generatedAt",
		errors,
	);

	if (!isRecord(data.source)) {
		errors.push("runtimeSceneManifest.source must be an object.");
	} else {
		if (
			data.source.kind !== "prototype" &&
			data.source.kind !== "authored" &&
			data.source.kind !== "cook"
		) {
			errors.push(
				"runtimeSceneManifest.source.kind must be prototype, authored, or cook.",
			);
		}

		requireString(data.source, "id", "runtimeSceneManifest.source.id", errors);
	}

	const levelErrors = validateLevelDefinition(data.level);
	for (const error of levelErrors) {
		errors.push(`runtimeSceneManifest.level: ${error}`);
	}

	const assetErrors = validateAssetManifest(data.assets);
	for (const error of assetErrors) {
		errors.push(`runtimeSceneManifest.assets: ${error}`);
	}

	const renderProfileErrors = validateRenderProfile(data.renderProfile);
	for (const error of renderProfileErrors) {
		errors.push(`runtimeSceneManifest.renderProfile: ${error}`);
	}

	if (!Array.isArray(data.prefabs)) {
		errors.push("runtimeSceneManifest.prefabs must be an array.");
	} else {
		for (const [index, prefab] of data.prefabs.entries()) {
			const prefabErrors = validatePrefabDefinition(prefab);

			for (const error of prefabErrors) {
				errors.push(`runtimeSceneManifest.prefabs.${index}: ${error}`);
			}
		}
	}

	if (!isRecord(data.readiness)) {
		errors.push("runtimeSceneManifest.readiness must be an object.");
	} else {
		requireString(
			data.readiness,
			"playerStableId",
			"runtimeSceneManifest.readiness.playerStableId",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredAssetIds,
			"runtimeSceneManifest.readiness.requiredAssetIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredCollisionPrefabIds,
			"runtimeSceneManifest.readiness.requiredCollisionPrefabIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredCollisionStableIds,
			"runtimeSceneManifest.readiness.requiredCollisionStableIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredWalkableStableIds,
			"runtimeSceneManifest.readiness.requiredWalkableStableIds",
			errors,
		);
		validateOptionalStringArray(
			data.readiness.requiredLightStableIds,
			"runtimeSceneManifest.readiness.requiredLightStableIds",
			errors,
		);
	}

	if (
		levelErrors.length > 0 ||
		assetErrors.length > 0 ||
		renderProfileErrors.length > 0 ||
		!Array.isArray(data.prefabs) ||
		!isRecord(data.level) ||
		!isRecord(data.assets) ||
		!isRecord(data.renderProfile) ||
		!isRecord(data.readiness)
	) {
		return errors;
	}

	validateRuntimeSceneReferences(data as RuntimeSceneManifestData, errors);

	return errors;
}

function validateRenderProfileLight(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (data.kind !== "ambient" && data.kind !== "directional") {
		errors.push(`${path}.kind must be ambient or directional.`);
		return;
	}

	validateRequiredHexColor(data.color, `${path}.color`, errors);
	validateRequiredNonNegativeNumber(
		data.intensity,
		`${path}.intensity`,
		errors,
	);

	if (data.kind === "directional") {
		validateRequiredNumberTuple(data.position, 3, `${path}.position`, errors);
	}
}

function validateRenderProfileEnvironment(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.kind) {
		case "solid-color":
			validateRequiredHexColor(data.color, `${path}.color`, errors);
			validateRequiredNonNegativeNumber(
				data.backgroundIntensity,
				`${path}.backgroundIntensity`,
				errors,
			);
			validateSceneEnvironmentLighting(
				data.lighting,
				`${path}.lighting`,
				errors,
			);
			return;
		case "cubemap-skybox":
		case "equirectangular-environment":
			validateAssetEnvironmentFields(data, path, errors);
			return;
		case "video-skybox":
			validateAssetEnvironmentFields(data, path, errors);
			if (data.mapping !== "equirectangular-360") {
				errors.push(`${path}.mapping must be equirectangular-360.`);
			}
			validateOptionalDynamicEnvironmentCapture(
				data.dynamicCapture,
				`${path}.dynamicCapture`,
				errors,
			);
			if (
				typeof data.environmentIntensity === "number" &&
				data.environmentIntensity > 0 &&
				data.dynamicCapture === undefined
			) {
				errors.push(
					`${path}.dynamicCapture is required when a video skybox contributes environment lighting.`,
				);
			}
			return;
		case "procedural-atmosphere":
			validateRequiredHexColor(data.skyColor, `${path}.skyColor`, errors);
			validateRequiredHexColor(
				data.horizonColor,
				`${path}.horizonColor`,
				errors,
			);
			validateRequiredHexColor(data.groundColor, `${path}.groundColor`, errors);
			validateRequiredVec3Like(
				data.sunDirection,
				`${path}.sunDirection`,
				errors,
			);
			validateRequiredHexColor(data.sunColor, `${path}.sunColor`, errors);
			validateRequiredNonNegativeNumber(
				data.sunIntensity,
				`${path}.sunIntensity`,
				errors,
			);
			validateRequiredNonNegativeNumber(
				data.turbidity,
				`${path}.turbidity`,
				errors,
			);
			validateRequiredNonNegativeNumber(
				data.exposure,
				`${path}.exposure`,
				errors,
			);
			validateRequiredNonNegativeNumber(
				data.backgroundIntensity,
				`${path}.backgroundIntensity`,
				errors,
			);
			validateRequiredNonNegativeNumber(
				data.environmentIntensity,
				`${path}.environmentIntensity`,
				errors,
			);
			validateSceneEnvironmentLighting(
				data.lighting,
				`${path}.lighting`,
				errors,
			);
			validateOptionalDynamicEnvironmentCapture(
				data.dynamicCapture,
				`${path}.dynamicCapture`,
				errors,
			);
			if (
				typeof data.environmentIntensity === "number" &&
				data.environmentIntensity > 0 &&
				data.dynamicCapture === undefined
			) {
				errors.push(
					`${path}.dynamicCapture is required when procedural atmosphere contributes environment lighting.`,
				);
			}
			return;
		default:
			errors.push(
				`${path}.kind must be solid-color, cubemap-skybox, equirectangular-environment, video-skybox, or procedural-atmosphere.`,
			);
	}
}

function validateAssetEnvironmentFields(
	data: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	requireString(data, "assetId", `${path}.assetId`, errors);
	validateRequiredNonNegativeNumber(
		data.backgroundIntensity,
		`${path}.backgroundIntensity`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		data.backgroundBlurriness,
		`${path}.backgroundBlurriness`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		data.environmentIntensity,
		`${path}.environmentIntensity`,
		errors,
	);

	if (typeof data.requiredForReadiness !== "boolean") {
		errors.push(`${path}.requiredForReadiness must be a boolean.`);
	}

	validateSceneEnvironmentLighting(data.lighting, `${path}.lighting`, errors);
}

function validateSceneEnvironmentLighting(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateRequiredNonNegativeNumber(
		data.intensity,
		`${path}.intensity`,
		errors,
	);

	if (data.source !== "asset" && data.source !== "dynamic-capture") {
		errors.push(`${path}.source must be asset or dynamic-capture.`);
	}

	if (data.prefiltered !== undefined && typeof data.prefiltered !== "boolean") {
		errors.push(`${path}.prefiltered must be a boolean when provided.`);
	}

	validateOptionalDynamicEnvironmentCapture(
		data.dynamicCapture,
		`${path}.dynamicCapture`,
		errors,
	);
}

function validateOptionalDynamicEnvironmentCapture(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	if (
		data.mode !== "on-load" &&
		data.mode !== "interval" &&
		data.mode !== "manual"
	) {
		errors.push(`${path}.mode must be on-load, interval, or manual.`);
	}

	if (
		data.resolution !== 64 &&
		data.resolution !== 128 &&
		data.resolution !== 256
	) {
		errors.push(`${path}.resolution must be 64, 128, or 256.`);
	}

	if (data.mode === "interval" && data.intervalSeconds === undefined) {
		errors.push(`${path}.intervalSeconds is required when mode is interval.`);
	}

	if (data.intervalSeconds !== undefined) {
		validateRequiredPositiveNumber(
			data.intervalSeconds,
			`${path}.intervalSeconds`,
			errors,
		);

		if (data.mode !== "interval") {
			errors.push(
				`${path}.intervalSeconds is only supported when mode is interval.`,
			);
		}
	}
}

function validateAssetManifestEntry(
	data: unknown,
	path: string,
	errors: string[],
	assetIds: Set<string>,
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data, "id", `${path}.id`, errors);
	validateAssetKind(data.kind, `${path}.kind`, errors);
	requireString(data, "url", `${path}.url`, errors);
	validateOptionalColorSpace(data.colorSpace, `${path}.colorSpace`, errors);
	validateOptionalStringArray(data.tags, `${path}.tags`, errors);

	if (data.kind === "cubemap") {
		validateCubemapFaceUrls(data.faces, `${path}.faces`, errors);
	} else if (data.faces !== undefined) {
		errors.push(`${path}.faces is only supported for cubemap assets.`);
	}

	if (data.kind === "texture") {
		validateOptionalTextureProjection(
			data.projection,
			`${path}.projection`,
			errors,
		);
	} else if (data.projection !== undefined) {
		errors.push(`${path}.projection is only supported for texture assets.`);
	}

	if (data.kind === "video") {
		validateVideoAssetMetadata(data.video, `${path}.video`, errors);
	} else if (data.video !== undefined) {
		errors.push(`${path}.video is only supported for video assets.`);
	}

	if (data.kind === "material") {
		validateMaterialParameters(data.material, `${path}.material`, errors);
	} else if (data.material !== undefined) {
		errors.push(`${path}.material is only supported for material assets.`);
	}

	if (data.kind === "sprite") {
		validateSpriteAssetParameters(data.sprite, `${path}.sprite`, errors);
	} else if (data.sprite !== undefined) {
		errors.push(`${path}.sprite is only supported for sprite assets.`);
	}

	if (
		data.kind !== "texture" &&
		data.kind !== "cubemap" &&
		data.colorSpace !== undefined
	) {
		errors.push(
			`${path}.colorSpace is only supported for texture and cubemap assets.`,
		);
	}

	if (typeof data.id === "string" && data.id.length > 0) {
		if (assetIds.has(data.id)) {
			errors.push(
				`assetManifest.assets contains duplicate asset "${data.id}".`,
			);
		}

		assetIds.add(data.id);
	}
}

function validateAssetKind(
	kind: unknown,
	path: string,
	errors: string[],
): void {
	if (
		kind !== "mesh" &&
		kind !== "material" &&
		kind !== "sprite" &&
		kind !== "texture" &&
		kind !== "cubemap" &&
		kind !== "video" &&
		kind !== "audio" &&
		kind !== "animation" &&
		kind !== "prefab" &&
		kind !== "scene" &&
		kind !== "data"
	) {
		errors.push(
			`${path} must be mesh, material, sprite, texture, cubemap, video, audio, animation, prefab, scene, or data.`,
		);
	}
}

function validateOptionalTextureProjection(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (value !== "uv" && value !== "equirectangular") {
		errors.push(`${path} must be uv or equirectangular when provided.`);
	}
}

function validateVideoAssetMetadata(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object for video assets.`);
		return;
	}

	if (typeof data.loop !== "boolean") {
		errors.push(`${path}.loop must be a boolean.`);
	}

	if (data.muted !== true) {
		errors.push(
			`${path}.muted must be true because sky video audio is not owned by the environment contract.`,
		);
	}

	if (typeof data.playsInline !== "boolean") {
		errors.push(`${path}.playsInline must be a boolean.`);
	}

	if (
		data.preload !== "auto" &&
		data.preload !== "metadata" &&
		data.preload !== "none"
	) {
		errors.push(`${path}.preload must be auto, metadata, or none.`);
	}

	if (data.posterAssetId !== undefined) {
		requireString(data, "posterAssetId", `${path}.posterAssetId`, errors);
	}
}

const materialParameterKeys = new Set([
	"color",
	"emissive",
	"emissiveIntensity",
	"metalness",
	"roughness",
	"opacity",
	"transparent",
]);

function validateMaterialParameters(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (data === undefined) {
		return;
	}

	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	for (const key of Object.keys(data)) {
		if (!materialParameterKeys.has(key)) {
			errors.push(`${path}.${key} is not a supported material parameter.`);
		}
	}

	if (data.color !== undefined) {
		validateRequiredHexColor(data.color, `${path}.color`, errors);
	}

	if (data.emissive !== undefined) {
		validateRequiredHexColor(data.emissive, `${path}.emissive`, errors);
	}

	if (data.emissiveIntensity !== undefined) {
		validateRequiredNonNegativeNumber(
			data.emissiveIntensity,
			`${path}.emissiveIntensity`,
			errors,
		);
	}

	if (data.metalness !== undefined) {
		validateRequiredAlpha(data.metalness, `${path}.metalness`, errors);
	}

	if (data.roughness !== undefined) {
		validateRequiredAlpha(data.roughness, `${path}.roughness`, errors);
	}

	if (data.opacity !== undefined) {
		validateRequiredAlpha(data.opacity, `${path}.opacity`, errors);

		if (
			typeof data.opacity === "number" &&
			Number.isFinite(data.opacity) &&
			data.opacity < 1 &&
			data.transparent !== true
		) {
			errors.push(`${path}.transparent must be true when opacity is below 1.`);
		}
	}

	if (data.transparent !== undefined && typeof data.transparent !== "boolean") {
		errors.push(`${path}.transparent must be a boolean when provided.`);
	}
}

function validateSpriteAssetParameters(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredHexColor(data.color, `${path}.color`, errors);
	validateRequiredPositiveNumber(data.size, `${path}.size`, errors);

	if (data.opacity !== undefined) {
		validateRequiredAlpha(data.opacity, `${path}.opacity`, errors);
	}

	if (data.intensity !== undefined) {
		validateRequiredNonNegativeNumber(
			data.intensity,
			`${path}.intensity`,
			errors,
		);
	}

	if (data.glow !== undefined) {
		validateRequiredNonNegativeNumber(data.glow, `${path}.glow`, errors);
	}

	if (
		data.starType !== undefined &&
		data.starType !== "point" &&
		data.starType !== "sparkle" &&
		data.starType !== "halo" &&
		data.starType !== "classic"
	) {
		errors.push(`${path}.starType must be point, sparkle, halo, or classic.`);
	}

	if (data.depthTest !== undefined && typeof data.depthTest !== "boolean") {
		errors.push(`${path}.depthTest must be a boolean when provided.`);
	}

	if (data.renderOrder !== undefined) {
		validateRequiredNumber(data.renderOrder, `${path}.renderOrder`, errors);
	}
}

function validateCubemapFaceUrls(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(
			`${path} must be an object with px, nx, py, ny, pz, and nz URLs.`,
		);
		return;
	}

	const faceNames = ["px", "nx", "py", "ny", "pz", "nz"] as const;
	const expectedFaceNames = new Set<string>(faceNames);

	for (const faceName of faceNames) {
		requireString(data, faceName, `${path}.${faceName}`, errors);
	}

	for (const faceName of Object.keys(data)) {
		if (!expectedFaceNames.has(faceName)) {
			errors.push(`${path}.${faceName} is not a supported cubemap face.`);
		}
	}
}

function validateRuntimeSceneReferences(
	manifest: RuntimeSceneManifestData,
	errors: string[],
): void {
	const assetKinds = new Map(
		manifest.assets.assets.map((entry) => [entry.id, entry.kind] as const),
	);
	const assetsById = new Map(
		manifest.assets.assets.map((entry) => [entry.id, entry] as const),
	);
	const assetIds = new Set(assetKinds.keys());
	const preloadGroups = new Set(
		Object.keys(manifest.assets.preloadGroups ?? {}),
	);
	const scenePreloadAssetIds = new Set(manifest.level.preload ?? []);
	const readinessRequiredAssetIds = new Set(
		manifest.readiness.requiredAssetIds ?? [],
	);
	const prefabs = new Map<string, PrefabData>();
	const instances = new Map<string, LevelPrefabInstanceData>();

	for (const groupId of manifest.level.preloadGroups ?? []) {
		for (const assetId of manifest.assets.preloadGroups?.[groupId] ?? []) {
			scenePreloadAssetIds.add(assetId);
		}
	}

	for (const prefab of manifest.prefabs) {
		if (prefabs.has(prefab.id)) {
			errors.push(
				`runtimeSceneManifest.prefabs contains duplicate prefab "${prefab.id}".`,
			);
		}

		prefabs.set(prefab.id, prefab);

		for (const assetId of prefab.assetIds ?? []) {
			if (!assetIds.has(assetId)) {
				errors.push(
					`runtimeSceneManifest.prefabs.${prefab.id}.assetIds references unknown asset "${assetId}".`,
				);
			}
		}

		validateRenderableAssetReferences(
			prefab.components,
			`runtimeSceneManifest.prefabs.${prefab.id}.components`,
			{
				assetKinds,
				prefabAssetIds: new Set(prefab.assetIds ?? []),
				scenePreloadAssetIds,
			},
			errors,
		);
	}

	validateRenderProfileEnvironmentReferences(
		manifest.renderProfile.environment,
		{
			assetsById,
			assetKinds,
			scenePreloadAssetIds,
			readinessRequiredAssetIds,
		},
		errors,
	);

	for (const assetId of manifest.level.preload ?? []) {
		if (!assetIds.has(assetId)) {
			errors.push(
				`runtimeSceneManifest.level.preload references unknown asset "${assetId}".`,
			);
		}
	}

	for (const groupId of manifest.level.preloadGroups ?? []) {
		if (!preloadGroups.has(groupId)) {
			errors.push(
				`runtimeSceneManifest.level.preloadGroups references unknown group "${groupId}".`,
			);
		}
	}

	for (const instance of manifest.level.instances) {
		if (instances.has(instance.stableId)) {
			errors.push(
				`runtimeSceneManifest.level.instances contains duplicate stable ID "${instance.stableId}".`,
			);
		}

		instances.set(instance.stableId, instance);

		if (!prefabs.has(instance.prefabId)) {
			errors.push(
				`runtimeSceneManifest.level.instances references unknown prefab "${instance.prefabId}".`,
			);
		}

		if (instance.components) {
			validateRenderableAssetReferences(
				instance.components,
				`runtimeSceneManifest.level.instances.${instance.stableId}.components`,
				{
					assetKinds,
					scenePreloadAssetIds,
				},
				errors,
			);
		}
	}

	for (const assetId of manifest.readiness.requiredAssetIds ?? []) {
		if (!assetIds.has(assetId)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredAssetIds references unknown asset "${assetId}".`,
			);
		}
	}

	const playerStableId = manifest.readiness.playerStableId;
	const playerInstance = instances.get(playerStableId);

	if (!playerInstance) {
		errors.push(
			`runtimeSceneManifest.readiness.playerStableId "${playerStableId}" does not match a level instance stable ID.`,
		);
	}

	for (const prefabId of manifest.readiness.requiredCollisionPrefabIds ?? []) {
		const prefab = prefabs.get(prefabId);

		if (!prefab) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds references unknown prefab "${prefabId}".`,
			);
			continue;
		}

		if (
			!manifest.level.instances.some(
				(instance) => instance.prefabId === prefabId,
			)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds "${prefabId}" is not spawned by the level.`,
			);
		}

		if (!isRecord(prefab.components.Collider)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionPrefabIds "${prefabId}" has no Collider component.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredCollisionStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		if (
			!isRecord(prefab.components.Collider) &&
			!isRecord(instance.components?.Collider)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredCollisionStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Collider component.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredWalkableStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		const collider = isRecord(instance.components?.Collider)
			? instance.components.Collider
			: prefab.components.Collider;

		if (!isRecord(collider)) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Collider component.`,
			);
			continue;
		}

		if (collider.intent !== "walkable") {
			errors.push(
				`runtimeSceneManifest.readiness.requiredWalkableStableIds "${stableId}" resolves to Collider.intent "${String(collider.intent)}" instead of walkable.`,
			);
		}
	}

	for (const stableId of manifest.readiness.requiredLightStableIds ?? []) {
		const instance = instances.get(stableId);

		if (!instance) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredLightStableIds references unknown level instance stable ID "${stableId}".`,
			);
			continue;
		}

		const prefab = prefabs.get(instance.prefabId);

		if (!prefab) {
			continue;
		}

		if (
			!isRecord(prefab.components.Light) &&
			!isRecord(instance.components?.Light)
		) {
			errors.push(
				`runtimeSceneManifest.readiness.requiredLightStableIds "${stableId}" resolves to prefab "${instance.prefabId}" with no Light component.`,
			);
		}
	}
}

function validateRenderProfileEnvironmentReferences(
	environment: RenderProfileEnvironmentData,
	options: {
		readonly assetsById: ReadonlyMap<string, AssetManifestEntryData>;
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
		readonly readinessRequiredAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	if (!isAssetBackedEnvironmentData(environment)) {
		return;
	}

	const actualKind = options.assetKinds.get(environment.assetId);

	if (actualKind === undefined) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references unknown asset "${environment.assetId}".`,
		);
		return;
	}

	const expectedKind = environmentAssetKind(environment);

	if (expectedKind !== undefined && actualKind !== expectedKind) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references ${actualKind} asset "${environment.assetId}", expected ${expectedKind}.`,
		);
	}

	const asset = options.assetsById.get(environment.assetId);

	if (
		environment.kind === "equirectangular-environment" &&
		asset?.projection !== "equirectangular"
	) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId "${environment.assetId}" must reference a texture asset with projection "equirectangular".`,
		);
	}

	if (!options.scenePreloadAssetIds.has(environment.assetId)) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId references asset "${environment.assetId}" that is not declared in the level preload set.`,
		);
	}

	if (
		environment.requiredForReadiness &&
		!options.readinessRequiredAssetIds.has(environment.assetId)
	) {
		errors.push(
			`runtimeSceneManifest.renderProfile.environment.assetId "${environment.assetId}" is required for readiness but is missing from runtimeSceneManifest.readiness.requiredAssetIds.`,
		);
	}
}

function environmentAssetKind(
	environment: RenderProfileEnvironmentData,
): "cubemap" | "texture" | "video" | undefined {
	switch (environment.kind) {
		case "cubemap-skybox":
			return "cubemap";
		case "equirectangular-environment":
			return "texture";
		case "video-skybox":
			return "video";
		case "solid-color":
		case "procedural-atmosphere":
			return undefined;
	}
}

function isAssetBackedEnvironmentData(
	environment: RenderProfileEnvironmentData,
): environment is
	| CubemapEnvironmentData
	| EquirectangularEnvironmentData
	| VideoSkyboxEnvironmentData {
	return (
		environment.kind === "cubemap-skybox" ||
		environment.kind === "equirectangular-environment" ||
		environment.kind === "video-skybox"
	);
}

function validateRenderableAssetReferences(
	components: Record<string, unknown>,
	path: string,
	options: {
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly prefabAssetIds?: ReadonlySet<string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	const renderable = components.Renderable;

	if (renderable === undefined) {
		return;
	}

	if (!isRecord(renderable)) {
		return;
	}

	if (renderable.kind === "sprite") {
		validateRenderableAssetReference(
			renderable.spriteId,
			"sprite",
			`${path}.Renderable.spriteId`,
			options,
			errors,
		);
		return;
	}

	validateRenderableAssetReference(
		renderable.meshId,
		"mesh",
		`${path}.Renderable.meshId`,
		options,
		errors,
	);

	if (renderable.materialId !== undefined) {
		validateRenderableAssetReference(
			renderable.materialId,
			"material",
			`${path}.Renderable.materialId`,
			options,
			errors,
		);
	}
}

function validateRenderableAssetReference(
	assetId: unknown,
	expectedKind: "mesh" | "material" | "sprite",
	path: string,
	options: {
		readonly assetKinds: ReadonlyMap<string, string>;
		readonly prefabAssetIds?: ReadonlySet<string>;
		readonly scenePreloadAssetIds: ReadonlySet<string>;
	},
	errors: string[],
): void {
	if (typeof assetId !== "string") {
		return;
	}

	const actualKind = options.assetKinds.get(assetId);

	if (actualKind === undefined) {
		errors.push(`${path} references unknown asset "${assetId}".`);
		return;
	}

	if (actualKind !== expectedKind) {
		errors.push(
			`${path} references ${actualKind} asset "${assetId}", expected ${expectedKind}.`,
		);
	}

	if (
		options.prefabAssetIds !== undefined &&
		!options.prefabAssetIds.has(assetId)
	) {
		errors.push(
			`${path} references asset "${assetId}" that is missing from the prefab assetIds list.`,
		);
	}

	if (!options.scenePreloadAssetIds.has(assetId)) {
		errors.push(
			`${path} references asset "${assetId}" that is not declared in the level preload set.`,
		);
	}
}

function validateLevelInstance(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(data, "prefabId", `${path}.prefabId`, errors);
	requireString(data, "id", `${path}.id`, errors);
	requireString(data, "stableId", `${path}.stableId`, errors);

	if (data.components !== undefined) {
		if (!isRecord(data.components)) {
			errors.push(`${path}.components must be an object when provided.`);
		} else {
			for (const [componentName, component] of Object.entries(
				data.components,
			)) {
				validateSerializableValue(
					component,
					`${path}.components.${componentName}`,
					errors,
				);
			}

			validateKnownComponents(data.components, `${path}.components`, errors, {
				hasTransformOverride: isRecord(data.transform),
			});
		}
	}

	if (data.transform !== undefined) {
		validateTransformOverride(data.transform, `${path}.transform`, errors);
	}
}

function validateKnownComponents(
	components: Record<string, unknown>,
	path: string,
	errors: string[],
	options: {
		readonly hasTransformOverride?: boolean;
	} = {},
): void {
	const transform = components.Transform;
	const hasTransform =
		isRecord(transform) || options.hasTransformOverride === true;

	if (transform !== undefined) {
		if (!isRecord(transform)) {
			errors.push(`${path}.Transform must be an object.`);
		} else {
			validateOptionalNumberTuple(
				transform.position,
				3,
				`${path}.Transform.position`,
				errors,
			);
			validateOptionalNumberTuple(
				transform.rotation,
				4,
				`${path}.Transform.rotation`,
				errors,
			);
			validateOptionalNumberTuple(
				transform.scale,
				3,
				`${path}.Transform.scale`,
				errors,
			);
		}
	}

	const renderable = components.Renderable;

	if (renderable !== undefined) {
		if (!isRecord(renderable)) {
			errors.push(`${path}.Renderable must be an object.`);
		} else {
			validateRenderableComponent(renderable, `${path}.Renderable`, errors);
		}
	}

	validateLightComponent(components.Light, `${path}.Light`, errors);

	if (components.Light !== undefined && !hasTransform) {
		errors.push(`${path}.Light requires a Transform component.`);
	}

	validateReflectionProbeComponent(
		components.ReflectionProbe,
		`${path}.ReflectionProbe`,
		errors,
	);

	if (components.ReflectionProbe !== undefined && !hasTransform) {
		errors.push(`${path}.ReflectionProbe requires a Transform component.`);
	}

	const rigidBody = components.RigidBody;

	if (rigidBody !== undefined) {
		if (!isRecord(rigidBody)) {
			errors.push(`${path}.RigidBody must be an object.`);
		} else {
			if (
				rigidBody.type !== "dynamic" &&
				rigidBody.type !== "fixed" &&
				rigidBody.type !== "kinematic"
			) {
				errors.push(
					`${path}.RigidBody.type must be dynamic, fixed, or kinematic.`,
				);
			}

			if (
				typeof rigidBody.mass !== "number" ||
				!Number.isFinite(rigidBody.mass) ||
				rigidBody.mass < 0
			) {
				errors.push(
					`${path}.RigidBody.mass must be a finite non-negative number.`,
				);
			}
		}
	}

	validateColliderComponent(components.Collider, `${path}.Collider`, errors);
	validateNpcComponent(components.Npc, `${path}.Npc`, errors);
	validateMovementBehaviorComponent(
		components.MovementBehavior,
		`${path}.MovementBehavior`,
		errors,
	);
	validateLightModulationComponent(
		components.LightModulation,
		`${path}.LightModulation`,
		errors,
	);
	validateInteractionTargetComponent(
		components.InteractionTarget,
		`${path}.InteractionTarget`,
		errors,
	);
	validateConversationComponent(
		components.Conversation,
		`${path}.Conversation`,
		errors,
	);
	validateFollowTargetComponent(
		components.FollowTarget,
		`${path}.FollowTarget`,
		errors,
	);

	if (components.MovementBehavior !== undefined && !hasTransform) {
		errors.push(`${path}.MovementBehavior requires a Transform component.`);
	}

	if (components.FollowTarget !== undefined && !hasTransform) {
		errors.push(`${path}.FollowTarget requires a Transform component.`);
	}

	if (
		components.LightModulation !== undefined &&
		components.Light === undefined
	) {
		errors.push(`${path}.LightModulation requires a Light component.`);
	}

	if (
		(components.InteractionTarget !== undefined ||
			components.Conversation !== undefined) &&
		components.Npc === undefined
	) {
		errors.push(
			`${path}.InteractionTarget and Conversation require an Npc component.`,
		);
	}
}

function validateNpcComponent(
	npc: unknown,
	path: string,
	errors: string[],
): void {
	if (npc === undefined) {
		return;
	}

	if (!isRecord(npc)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(npc, "id", `${path}.id`, errors);
	requireString(npc, "archetype", `${path}.archetype`, errors);
	requireString(npc, "displayName", `${path}.displayName`, errors);
}

function validateMovementBehaviorComponent(
	behavior: unknown,
	path: string,
	errors: string[],
): void {
	if (behavior === undefined) {
		return;
	}

	if (!isRecord(behavior)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (behavior.kind === "static") {
		return;
	}

	if (behavior.kind !== "hover-wander") {
		errors.push(`${path}.kind must be static or hover-wander.`);
		return;
	}

	validateRequiredNumberTuple(
		behavior.basePosition,
		3,
		`${path}.basePosition`,
		errors,
	);
	validateRequiredNonNegativeNumber(behavior.radius, `${path}.radius`, errors);
	validateRequiredNonNegativeNumber(behavior.speed, `${path}.speed`, errors);
	validateRequiredNumber(behavior.hoverHeight, `${path}.hoverHeight`, errors);
	validateRequiredNonNegativeNumber(
		behavior.bobAmplitude,
		`${path}.bobAmplitude`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		behavior.bobSpeed,
		`${path}.bobSpeed`,
		errors,
	);

	if (behavior.phase !== undefined) {
		validateRequiredNumber(behavior.phase, `${path}.phase`, errors);
	}
}

function validateLightModulationComponent(
	modulation: unknown,
	path: string,
	errors: string[],
): void {
	if (modulation === undefined) {
		return;
	}

	if (!isRecord(modulation)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	validateRequiredNonNegativeNumber(
		modulation.baseIntensity,
		`${path}.baseIntensity`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		modulation.baseDistance,
		`${path}.baseDistance`,
		errors,
	);
	validateRequiredAlpha(
		modulation.minimumIntensityScale,
		`${path}.minimumIntensityScale`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		modulation.pulseSpeed,
		`${path}.pulseSpeed`,
		errors,
	);
	validateRequiredAlpha(
		modulation.pulseSoftness,
		`${path}.pulseSoftness`,
		errors,
	);
	validateRequiredAlpha(
		modulation.activeLightPercent,
		`${path}.activeLightPercent`,
		errors,
	);
	validateRequiredPositiveNumberTuple(
		modulation.blinkPeriodSeconds,
		2,
		`${path}.blinkPeriodSeconds`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		modulation.blinkFadeSeconds,
		`${path}.blinkFadeSeconds`,
		errors,
	);

	if (modulation.phase !== undefined) {
		validateRequiredNumber(modulation.phase, `${path}.phase`, errors);
	}

	if (modulation.maxActiveLights !== undefined) {
		validateRequiredNonNegativeNumber(
			modulation.maxActiveLights,
			`${path}.maxActiveLights`,
			errors,
		);
	}

	if (modulation.nearDistance !== undefined) {
		validateRequiredNonNegativeNumber(
			modulation.nearDistance,
			`${path}.nearDistance`,
			errors,
		);
	}

	if (modulation.farDistance !== undefined) {
		validateRequiredNonNegativeNumber(
			modulation.farDistance,
			`${path}.farDistance`,
			errors,
		);
	}

	if (modulation.midIntensityScale !== undefined) {
		validateRequiredAlpha(
			modulation.midIntensityScale,
			`${path}.midIntensityScale`,
			errors,
		);
	}
}

function validateInteractionTargetComponent(
	interaction: unknown,
	path: string,
	errors: string[],
): void {
	if (interaction === undefined) {
		return;
	}

	if (!isRecord(interaction)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (interaction.kind !== "npc") {
		errors.push(`${path}.kind must be npc.`);
	}

	requireString(interaction, "prompt", `${path}.prompt`, errors);
	validateRequiredPositiveNumber(
		interaction.activationRadius,
		`${path}.activationRadius`,
		errors,
	);
}

function validateConversationComponent(
	conversation: unknown,
	path: string,
	errors: string[],
): void {
	if (conversation === undefined) {
		return;
	}

	if (!isRecord(conversation)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (conversation.mode !== "read-only") {
		errors.push(`${path}.mode must be read-only.`);
	}

	requireString(conversation, "title", `${path}.title`, errors);
	requireString(conversation, "excerpt", `${path}.excerpt`, errors);
	requireString(conversation, "body", `${path}.body`, errors);

	if (conversation.durationMs !== undefined) {
		validateRequiredPositiveNumber(
			conversation.durationMs,
			`${path}.durationMs`,
			errors,
		);
	}
}

function validateRenderableComponent(
	renderable: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	const kind = renderable.kind ?? "mesh";

	if (kind !== "mesh" && kind !== "sprite") {
		errors.push(`${path}.kind must be mesh or sprite when provided.`);
		return;
	}

	if (kind === "mesh") {
		requireString(renderable, "meshId", `${path}.meshId`, errors);

		if (renderable.materialId !== undefined) {
			requireString(renderable, "materialId", `${path}.materialId`, errors);
		}

		return;
	}

	requireString(renderable, "spriteId", `${path}.spriteId`, errors);
}

function validateFollowTargetComponent(
	followTarget: unknown,
	path: string,
	errors: string[],
): void {
	if (followTarget === undefined) {
		return;
	}

	if (!isRecord(followTarget)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(
		followTarget,
		"targetStableId",
		`${path}.targetStableId`,
		errors,
	);

	if (followTarget.offset !== undefined) {
		validateRequiredNumberTuple(
			followTarget.offset,
			3,
			`${path}.offset`,
			errors,
		);
	}

	if (followTarget.scale !== undefined) {
		validateRequiredNumberTuple(followTarget.scale, 3, `${path}.scale`, errors);
	}

	if (
		followTarget.inheritRotation !== undefined &&
		typeof followTarget.inheritRotation !== "boolean"
	) {
		errors.push(`${path}.inheritRotation must be a boolean when present.`);
	}
}

function validateLightComponent(
	light: unknown,
	path: string,
	errors: string[],
): void {
	if (light === undefined) {
		return;
	}

	if (!isRecord(light)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (
		light.kind !== "ambient" &&
		light.kind !== "directional" &&
		light.kind !== "point" &&
		light.kind !== "spot"
	) {
		errors.push(`${path}.kind must be ambient, directional, point, or spot.`);
		return;
	}

	validateRequiredHexColor(light.color, `${path}.color`, errors);
	validateRequiredNonNegativeNumber(
		light.intensity,
		`${path}.intensity`,
		errors,
	);

	if (light.visible !== undefined && typeof light.visible !== "boolean") {
		errors.push(`${path}.visible must be a boolean when provided.`);
	}

	if (light.kind === "point" || light.kind === "spot") {
		validateRequiredNonNegativeNumber(
			light.distance,
			`${path}.distance`,
			errors,
		);
		validateRequiredNonNegativeNumber(light.decay, `${path}.decay`, errors);
	}

	if (light.kind === "spot") {
		validateRequiredPositiveNumber(light.angle, `${path}.angle`, errors);
		validateRequiredAlpha(light.penumbra, `${path}.penumbra`, errors);
	}
}

function validateReflectionProbeComponent(
	probe: unknown,
	path: string,
	errors: string[],
): void {
	if (probe === undefined) {
		return;
	}

	if (!isRecord(probe)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (
		probe.mode !== "static" &&
		probe.mode !== "dynamic" &&
		probe.mode !== "manual"
	) {
		errors.push(`${path}.mode must be static, dynamic, or manual.`);
	}

	if (
		probe.resolution !== 64 &&
		probe.resolution !== 128 &&
		probe.resolution !== 256
	) {
		errors.push(`${path}.resolution must be 64, 128, or 256.`);
	}

	if (probe.priority !== undefined) {
		validateRequiredNumber(probe.priority, `${path}.priority`, errors);
	}

	if (probe.intensity !== undefined) {
		validateRequiredNonNegativeNumber(
			probe.intensity,
			`${path}.intensity`,
			errors,
		);
	}

	if (probe.updateIntervalSeconds !== undefined) {
		validateRequiredPositiveNumber(
			probe.updateIntervalSeconds,
			`${path}.updateIntervalSeconds`,
			errors,
		);

		if (probe.mode !== "dynamic") {
			errors.push(
				`${path}.updateIntervalSeconds is only supported when mode is dynamic.`,
			);
		}
	}

	if (probe.visible !== undefined && typeof probe.visible !== "boolean") {
		errors.push(`${path}.visible must be a boolean when provided.`);
	}

	if (!isRecord(probe.shape)) {
		errors.push(`${path}.shape must be an object.`);
		return;
	}

	if (probe.shape.type === "sphere") {
		validateRequiredPositiveNumber(
			probe.shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (probe.shape.type === "box") {
		validateRequiredPositiveNumberTuple(
			probe.shape.halfExtents,
			3,
			`${path}.shape.halfExtents`,
			errors,
		);
		return;
	}

	errors.push(`${path}.shape.type must be sphere or box.`);
}

function validateColliderComponent(
	collider: unknown,
	path: string,
	errors: string[],
): void {
	if (collider === undefined) {
		return;
	}

	if (!isRecord(collider)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (collider.sensor !== undefined && typeof collider.sensor !== "boolean") {
		errors.push(`${path}.sensor must be a boolean when provided.`);
	}

	validateCollisionIntent(collider.intent, `${path}.intent`, errors);
	validateCollisionChannel(collider.channel, `${path}.channel`, errors);
	validateCollisionIntentSensorPolicy(collider, path, errors);

	if (!isRecord(collider.shape)) {
		errors.push(`${path}.shape must be an object.`);
		return;
	}

	const shape = collider.shape;

	if (shape.type === "box") {
		validateRequiredPositiveNumberTuple(
			shape.halfExtents,
			3,
			`${path}.shape.halfExtents`,
			errors,
		);
		return;
	}

	if (shape.type === "sphere") {
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "capsule") {
		validateRequiredPositiveNumber(
			shape.halfHeight,
			`${path}.shape.halfHeight`,
			errors,
		);
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "cylinder") {
		validateRequiredPositiveNumber(
			shape.halfHeight,
			`${path}.shape.halfHeight`,
			errors,
		);
		validateRequiredPositiveNumber(
			shape.radius,
			`${path}.shape.radius`,
			errors,
		);
		return;
	}

	if (shape.type === "mesh") {
		if (!Array.isArray(shape.vertices) || shape.vertices.length < 3) {
			errors.push(`${path}.shape.vertices must contain at least 3 vertices.`);
			return;
		}

		for (const [index, vertex] of shape.vertices.entries()) {
			validateRequiredNumberTuple(
				vertex,
				3,
				`${path}.shape.vertices.${index}`,
				errors,
			);
		}

		if (!Array.isArray(shape.indices) || shape.indices.length < 3) {
			errors.push(`${path}.shape.indices must contain at least 3 indices.`);
			return;
		}

		if (shape.indices.length % 3 !== 0) {
			errors.push(`${path}.shape.indices length must be divisible by 3.`);
		}

		for (const [index, item] of shape.indices.entries()) {
			if (
				typeof item !== "number" ||
				!Number.isInteger(item) ||
				item < 0 ||
				item >= shape.vertices.length
			) {
				errors.push(
					`${path}.shape.indices.${index} must be an integer vertex index.`,
				);
			}
		}
		return;
	}

	errors.push(
		`${path}.shape.type must be box, sphere, capsule, cylinder, or mesh.`,
	);
}

function validateCollisionIntent(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value !== "solid" && value !== "trigger" && value !== "walkable") {
		errors.push(`${path} must be solid, trigger, or walkable.`);
	}
}

function validateCollisionChannel(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function validateCollisionIntentSensorPolicy(
	collider: Record<string, unknown>,
	path: string,
	errors: string[],
): void {
	if (collider.intent === "trigger" && collider.sensor !== true) {
		errors.push(`${path}.sensor must be true when intent is trigger.`);
	}

	if (
		(collider.intent === "solid" || collider.intent === "walkable") &&
		collider.sensor === true
	) {
		errors.push(
			`${path}.sensor cannot be true when intent is solid or walkable.`,
		);
	}
}

function validateTransformOverride(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	validateOptionalNumberTuple(data.position, 3, `${path}.position`, errors);
	validateOptionalNumberTuple(data.rotation, 4, `${path}.rotation`, errors);
	validateOptionalNumberTuple(data.scale, 3, `${path}.scale`, errors);
}

function validateOptionalNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value) || value.length !== length) {
		errors.push(`${path} must be an array with ${length} numbers.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item)) {
			errors.push(`${path}.${index} must be a finite number.`);
		}
	}
}

function validateRequiredNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== length) {
		errors.push(`${path} must be an array with ${length} numbers.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item)) {
			errors.push(`${path}.${index} must be a finite number.`);
		}
	}
}

function validateRequiredPositiveNumberTuple(
	value: unknown,
	length: number,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value) || value.length !== length) {
		errors.push(`${path} must be an array with ${length} positive numbers.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "number" || !Number.isFinite(item) || item <= 0) {
			errors.push(`${path}.${index} must be a positive finite number.`);
		}
	}
}

function validateRequiredVec3Object(
	value: unknown,
	path: string,
	errors: string[],
	options: { readonly positive?: boolean } = {},
): void {
	if (!isRecord(value)) {
		errors.push(`${path} must be an object with x, y, and z numbers.`);
		return;
	}

	for (const axis of ["x", "y", "z"] as const) {
		const item = value[axis];

		if (
			typeof item !== "number" ||
			!Number.isFinite(item) ||
			(options.positive === true && item <= 0)
		) {
			errors.push(
				options.positive === true
					? `${path}.${axis} must be a positive finite number.`
					: `${path}.${axis} must be a finite number.`,
			);
		}
	}
}

function validateRequiredVec3Like(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (Array.isArray(value)) {
		validateRequiredNumberTuple(value, 3, path, errors);
		return;
	}

	validateRequiredVec3Object(value, path, errors);
}

function validateRequiredPositiveNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		errors.push(`${path} must be a positive finite number.`);
	}
}

function validateRequiredNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		errors.push(`${path} must be a finite number.`);
	}
}

function validateRequiredNonNegativeNumber(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		errors.push(`${path} must be a non-negative finite number.`);
	}
}

function validateRequiredAlpha(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "number" ||
		!Number.isFinite(value) ||
		value < 0 ||
		value > 1
	) {
		errors.push(`${path} must be a finite number from 0 to 1.`);
	}
}

function validateRequiredHexColor(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		typeof value !== "string" ||
		!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
	) {
		errors.push(`${path} must be a #rgb or #rrggbb color string.`);
	}
}

function validateOptionalStringArray(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array when provided.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

function validateOptionalColorSpace(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (value === undefined) {
		return;
	}

	if (value !== "srgb" && value !== "linear") {
		errors.push(`${path} must be srgb or linear when provided.`);
	}
}

function validateRequiredStringArray(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (!Array.isArray(value)) {
		errors.push(`${path} must be an array.`);
		return;
	}

	for (const [index, item] of value.entries()) {
		if (typeof item !== "string" || item.length === 0) {
			errors.push(`${path}.${index} must be a non-empty string.`);
		}
	}
}

function validateSerializableValue(
	value: unknown,
	path: string,
	errors: string[],
): void {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			errors.push(`${path} must be finite when it is a number.`);
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			validateSerializableValue(item, `${path}.${index}`, errors);
		}
		return;
	}

	if (isRecord(value)) {
		for (const [key, item] of Object.entries(value)) {
			if (item === undefined) {
				errors.push(`${path}.${key} cannot be undefined.`);
				continue;
			}

			validateSerializableValue(item, `${path}.${key}`, errors);
		}
		return;
	}

	errors.push(`${path} must be JSON-serializable data.`);
}

function requireString(
	data: Record<string, unknown>,
	key: string,
	path: string,
	errors: string[],
): void {
	const value = data[key];

	if (typeof value !== "string" || value.length === 0) {
		errors.push(`${path} must be a non-empty string.`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
	);
}
