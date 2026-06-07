import {
	isRecord,
	requireString,
	validateOptionalColorSpace,
	validateOptionalStringArray,
	validateRequiredAlpha,
	validateRequiredHexColor,
	validateRequiredNonNegativeNumber,
	validateRequiredStringArray,
} from "./helpers.js";
import type { AssetManifestData } from "./types.js";
import { createSchemaValidator } from "./validation.js";

export const assetManifestValidator = createSchemaValidator<AssetManifestData>(
	"AssetManifest",
	validateAssetManifest,
);

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

export function validateAssetManifestEntry(
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
			`${path} must be mesh, material, texture, cubemap, video, audio, animation, prefab, scene, or data.`,
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
