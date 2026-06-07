import { validateLightShadowData } from "./componentSchemas.js";
import {
	isRecord,
	requireString,
	validateOptionalNonNegativeInteger,
	validateRequiredAlpha,
	validateRequiredHexColor,
	validateRequiredNonNegativeNumber,
	validateRequiredNumber,
	validateRequiredNumberTuple,
	validateRequiredPositiveNumber,
	validateRequiredVec3Like,
} from "./helpers.js";
import type { RenderProfileData } from "./types.js";
import { createSchemaValidator } from "./validation.js";

export const renderProfileValidator = createSchemaValidator<RenderProfileData>(
	"RenderProfile",
	validateRenderProfile,
);

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

		validateLightBudgetProfile(
			data.lighting.budget,
			"renderProfile.lighting.budget",
			errors,
		);
	}

	validateRenderProfileEnvironment(
		data.environment,
		"renderProfile.environment",
		errors,
	);
	validateRenderProfilePostProcessing(
		data.postProcessing,
		"renderProfile.postProcessing",
		errors,
	);

	return errors;
}

export function validateRenderProfileLight(
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

	if (data.shadow !== undefined) {
		if (data.kind === "ambient") {
			errors.push(`${path}.shadow is not supported for ambient lights.`);
		}

		validateLightShadowData(data.shadow, `${path}.shadow`, errors);
	}
}

function validateLightBudgetProfile(
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

	for (const key of [
		"maxTotal",
		"maxAmbient",
		"maxDirectional",
		"maxPoint",
		"maxSpot",
		"maxArea",
		"maxShadowCasting",
	] as const) {
		validateOptionalNonNegativeInteger(data[key], `${path}.${key}`, errors);
	}
}

export function validateRenderProfileEnvironment(
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

function validateRenderProfilePostProcessing(
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

	if (typeof data.enabled !== "boolean") {
		errors.push(`${path}.enabled must be a boolean.`);
	}

	if (
		data.quality !== "off" &&
		data.quality !== "low" &&
		data.quality !== "medium" &&
		data.quality !== "high"
	) {
		errors.push(`${path}.quality must be off, low, medium, or high.`);
	}

	if (data.enabled === false && data.quality !== "off") {
		errors.push(
			`${path}.quality must be off when post-processing is disabled.`,
		);
	}

	if (data.enabled === true && data.quality === "off") {
		errors.push(
			`${path}.quality cannot be off when post-processing is enabled.`,
		);
	}

	if (!Array.isArray(data.effects)) {
		errors.push(`${path}.effects must be an array.`);
		return;
	}

	if (data.enabled === false && data.effects.length > 0) {
		errors.push(
			`${path}.effects must be empty when post-processing is disabled.`,
		);
	}

	for (const [index, effect] of data.effects.entries()) {
		validateRenderProfilePostProcessingEffect(
			effect,
			`${path}.effects.${index}`,
			errors,
		);
	}
}

function validateRenderProfilePostProcessingEffect(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	switch (data.kind) {
		case "bloom":
			validateRequiredAlpha(data.threshold, `${path}.threshold`, errors);
			validateRequiredNonNegativeNumber(
				data.intensity,
				`${path}.intensity`,
				errors,
			);
			validateRequiredAlpha(data.radius, `${path}.radius`, errors);
			return;
		case "color-grading":
			validateRequiredNumber(data.exposure, `${path}.exposure`, errors);
			validateRequiredNumber(data.contrast, `${path}.contrast`, errors);
			validateRequiredNumber(data.saturation, `${path}.saturation`, errors);
			return;
		case "vignette":
			validateRequiredAlpha(data.offset, `${path}.offset`, errors);
			validateRequiredAlpha(data.darkness, `${path}.darkness`, errors);
			return;
		default:
			errors.push(`${path}.kind must be bloom, color-grading, or vignette.`);
	}
}
