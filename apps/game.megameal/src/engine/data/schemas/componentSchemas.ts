import { validateColliderComponent } from "./colliderSchema.js";
import {
	isRecord,
	requireString,
	validateOptionalNonNegativeNumber,
	validateOptionalNumber,
	validateOptionalNumberTuple,
	validateOptionalPositiveNumber,
	validateOptionalStringArray,
	validateRequiredAlpha,
	validateRequiredHexColor,
	validateRequiredNonNegativeInteger,
	validateRequiredNonNegativeNumber,
	validateRequiredNumber,
	validateRequiredNumberTuple,
	validateRequiredPositiveNumber,
	validateRequiredPositiveNumberTuple,
	validateRequiredVec3Like,
	validateSerializableValue,
} from "./helpers.js";

export function validateLevelInstance(
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
				allowPartialCharacterController: true,
			});
		}
	}

	if (data.transform !== undefined) {
		validateTransformOverride(data.transform, `${path}.transform`, errors);
	}
}

export function validateKnownComponents(
	components: Record<string, unknown>,
	path: string,
	errors: string[],
	options: {
		readonly hasTransformOverride?: boolean;
		readonly allowPartialCharacterController?: boolean;
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
			requireString(renderable, "meshId", `${path}.Renderable.meshId`, errors);

			if (renderable.materialId !== undefined) {
				requireString(
					renderable,
					"materialId",
					`${path}.Renderable.materialId`,
					errors,
				);
			}
		}
	}

	validateTerrainChunkCellComponent(
		components.TerrainChunkCell,
		`${path}.TerrainChunkCell`,
		errors,
	);

	if (components.TerrainChunkCell !== undefined && !hasTransform) {
		errors.push(`${path}.TerrainChunkCell requires a Transform component.`);
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

	validateWaterSurfaceComponent(
		components.WaterSurface,
		`${path}.WaterSurface`,
		errors,
	);

	if (components.WaterSurface !== undefined && !hasTransform) {
		errors.push(`${path}.WaterSurface requires a Transform component.`);
	}

	validateFireflyPopulationMemberComponent(
		components.FireflyPopulationMember,
		`${path}.FireflyPopulationMember`,
		errors,
	);

	if (components.FireflyPopulationMember !== undefined && !hasTransform) {
		errors.push(
			`${path}.FireflyPopulationMember requires a Transform component.`,
		);
	}

	validateAudioListenerComponent(
		components.AudioListener,
		`${path}.AudioListener`,
		errors,
	);

	if (components.AudioListener !== undefined && !hasTransform) {
		errors.push(`${path}.AudioListener requires a Transform component.`);
	}

	validateSoundEmitterComponent(
		components.SoundEmitter,
		`${path}.SoundEmitter`,
		errors,
	);

	if (components.SoundEmitter !== undefined && !hasTransform) {
		errors.push(`${path}.SoundEmitter requires a Transform component.`);
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
	validateCharacterControllerComponent(
		components.CharacterController,
		`${path}.CharacterController`,
		errors,
		{
			allowPartial: options.allowPartialCharacterController === true,
		},
	);
}

function validateTerrainChunkCellComponent(
	cell: unknown,
	path: string,
	errors: string[],
): void {
	if (cell === undefined) {
		return;
	}

	if (!isRecord(cell)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(cell, "packageId", `${path}.packageId`, errors);
}

function validateWaterSurfaceComponent(
	water: unknown,
	path: string,
	errors: string[],
): void {
	if (water === undefined) {
		return;
	}

	if (!isRecord(water)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (water.surfaceType !== "plane") {
		errors.push(`${path}.surfaceType must be plane.`);
	}

	if (
		water.bodyType !== undefined &&
		water.bodyType !== "ocean" &&
		water.bodyType !== "lake" &&
		water.bodyType !== "river" &&
		water.bodyType !== "custom"
	) {
		errors.push(
			`${path}.bodyType must be ocean, lake, river, or custom when provided.`,
		);
	}

	validateOptionalStringArray(
		water.normalMapAssetIds,
		`${path}.normalMapAssetIds`,
		errors,
	);
	validateWaterSurfaceAnimation(water.animation, `${path}.animation`, errors);
	validateWaterSurfaceReflection(
		water.reflection,
		`${path}.reflection`,
		errors,
	);
	validateWaterSurfaceRefraction(
		water.refraction,
		`${path}.refraction`,
		errors,
	);
	validateWaterSurfaceGameplayVolume(
		water.gameplayVolume,
		`${path}.gameplayVolume`,
		errors,
	);
	validateOptionalNumber(water.renderOrder, `${path}.renderOrder`, errors);

	if (water.visible !== undefined && typeof water.visible !== "boolean") {
		errors.push(`${path}.visible must be a boolean when provided.`);
	}
}

function validateAudioListenerComponent(
	listener: unknown,
	path: string,
	errors: string[],
): void {
	if (listener === undefined) {
		return;
	}

	if (!isRecord(listener)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (typeof listener.active !== "boolean") {
		errors.push(`${path}.active must be a boolean.`);
	}

	if (listener.gain !== undefined) {
		validateRequiredAlpha(listener.gain, `${path}.gain`, errors);
	}
}

function validateSoundEmitterComponent(
	emitter: unknown,
	path: string,
	errors: string[],
): void {
	if (emitter === undefined) {
		return;
	}

	if (!isRecord(emitter)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(emitter, "soundId", `${path}.soundId`, errors);

	if (emitter.active !== undefined && typeof emitter.active !== "boolean") {
		errors.push(`${path}.active must be a boolean when provided.`);
	}

	if (emitter.loop !== undefined && typeof emitter.loop !== "boolean") {
		errors.push(`${path}.loop must be a boolean when provided.`);
	}

	if (emitter.autoplay !== undefined && typeof emitter.autoplay !== "boolean") {
		errors.push(`${path}.autoplay must be a boolean when provided.`);
	}

	if (emitter.sceneId !== undefined) {
		requireString(emitter, "sceneId", `${path}.sceneId`, errors);
	}

	if (emitter.volume !== undefined) {
		validateRequiredAlpha(emitter.volume, `${path}.volume`, errors);
	}

	if (emitter.busId !== undefined) {
		requireString(emitter, "busId", `${path}.busId`, errors);
	}

	validateOptionalPositiveNumber(
		emitter.refDistance,
		`${path}.refDistance`,
		errors,
	);
	validateOptionalPositiveNumber(
		emitter.maxDistance,
		`${path}.maxDistance`,
		errors,
	);
	validateOptionalNonNegativeNumber(
		emitter.rolloffFactor,
		`${path}.rolloffFactor`,
		errors,
	);

	if (
		emitter.distanceModel !== undefined &&
		emitter.distanceModel !== "inverse" &&
		emitter.distanceModel !== "linear" &&
		emitter.distanceModel !== "exponential"
	) {
		errors.push(
			`${path}.distanceModel must be inverse, linear, or exponential when provided.`,
		);
	}

	validateOptionalNonNegativeNumber(
		emitter.coneInnerAngle,
		`${path}.coneInnerAngle`,
		errors,
	);
	validateOptionalNonNegativeNumber(
		emitter.coneOuterAngle,
		`${path}.coneOuterAngle`,
		errors,
	);

	if (emitter.coneOuterGain !== undefined) {
		validateRequiredAlpha(
			emitter.coneOuterGain,
			`${path}.coneOuterGain`,
			errors,
		);
	}
}

function validateWaterSurfaceAnimation(
	animation: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(animation)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (animation.mode !== "static" && animation.mode !== "scrolling") {
		errors.push(`${path}.mode must be static or scrolling.`);
	}

	validateRequiredNonNegativeNumber(animation.speed, `${path}.speed`, errors);
	validateRequiredNumberTuple(
		animation.direction,
		2,
		`${path}.direction`,
		errors,
	);
	validateRequiredNonNegativeNumber(
		animation.waveAmplitude,
		`${path}.waveAmplitude`,
		errors,
	);
	validateRequiredPositiveNumber(
		animation.waveLength,
		`${path}.waveLength`,
		errors,
	);
}

function validateWaterSurfaceReflection(
	reflection: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(reflection)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (
		reflection.mode !== "none" &&
		reflection.mode !== "environment" &&
		reflection.mode !== "reflection-probe"
	) {
		errors.push(`${path}.mode must be none, environment, or reflection-probe.`);
	}

	validateRequiredAlpha(reflection.intensity, `${path}.intensity`, errors);

	if (reflection.mode === "reflection-probe") {
		requireString(reflection, "probeStableId", `${path}.probeStableId`, errors);
	} else if (reflection.probeStableId !== undefined) {
		errors.push(
			`${path}.probeStableId is only supported when mode is reflection-probe.`,
		);
	}
}

function validateWaterSurfaceRefraction(
	refraction: unknown,
	path: string,
	errors: string[],
): void {
	if (refraction === undefined) {
		return;
	}

	if (!isRecord(refraction)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	if (typeof refraction.enabled !== "boolean") {
		errors.push(`${path}.enabled must be a boolean.`);
	}

	validateRequiredAlpha(refraction.intensity, `${path}.intensity`, errors);

	if (refraction.enabled === false && refraction.intensity !== 0) {
		errors.push(`${path}.intensity must be 0 when refraction is disabled.`);
	}
}

function validateWaterSurfaceGameplayVolume(
	volume: unknown,
	path: string,
	errors: string[],
): void {
	if (volume === undefined) {
		return;
	}

	if (!isRecord(volume)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	if (volume.enabled !== false) {
		errors.push(
			`${path}.enabled must be false until the water gameplay volume contract is implemented.`,
		);
	}
}

function validateFireflyPopulationMemberComponent(
	member: unknown,
	path: string,
	errors: string[],
): void {
	if (member === undefined) {
		return;
	}

	if (!isRecord(member)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	requireString(member, "populationId", `${path}.populationId`, errors);
	requireString(member, "memberId", `${path}.memberId`, errors);
	validateRequiredNonNegativeInteger(member.seed, `${path}.seed`, errors);

	if (member.phase !== undefined) {
		validateRequiredAlpha(member.phase, `${path}.phase`, errors);
	}

	if (member.flicker !== undefined) {
		if (!isRecord(member.flicker)) {
			errors.push(`${path}.flicker must be an object when provided.`);
		} else {
			validateRequiredPositiveNumber(
				member.flicker.frequencyHz,
				`${path}.flicker.frequencyHz`,
				errors,
			);
			validateRequiredAlpha(
				member.flicker.amplitude,
				`${path}.flicker.amplitude`,
				errors,
			);
		}
	}
}

function validateCharacterControllerComponent(
	controller: unknown,
	path: string,
	errors: string[],
	options: {
		readonly allowPartial?: boolean;
	} = {},
): void {
	if (controller === undefined) {
		return;
	}

	if (!isRecord(controller)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (options.allowPartial === true) {
		validateOptionalPositiveNumber(controller.speed, `${path}.speed`, errors);
		validateOptionalNonNegativeNumber(
			controller.jumpForce,
			`${path}.jumpForce`,
			errors,
		);

		if (
			controller.grounded !== undefined &&
			typeof controller.grounded !== "boolean"
		) {
			errors.push(`${path}.grounded must be a boolean when provided.`);
		}
	} else {
		validateRequiredPositiveNumber(controller.speed, `${path}.speed`, errors);
		validateRequiredNonNegativeNumber(
			controller.jumpForce,
			`${path}.jumpForce`,
			errors,
		);

		if (typeof controller.grounded !== "boolean") {
			errors.push(`${path}.grounded must be a boolean.`);
		}
	}

	validateOptionalPositiveNumber(
		controller.sprintMultiplier,
		`${path}.sprintMultiplier`,
		errors,
	);
	validateOptionalNumber(controller.gravity, `${path}.gravity`, errors);
	validateOptionalNumber(
		controller.verticalVelocity,
		`${path}.verticalVelocity`,
		errors,
	);
	validateOptionalNumber(controller.groundY, `${path}.groundY`, errors);

	validateKinematicCollisionSettings(
		controller.kinematicCollision,
		`${path}.kinematicCollision`,
		errors,
	);
}

function validateKinematicCollisionSettings(
	settings: unknown,
	path: string,
	errors: string[],
): void {
	if (settings === undefined) {
		return;
	}

	if (!isRecord(settings)) {
		errors.push(`${path} must be an object.`);
		return;
	}

	if (settings.enabled !== undefined && typeof settings.enabled !== "boolean") {
		errors.push(`${path}.enabled must be a boolean when provided.`);
	}

	validateOptionalNonNegativeNumber(settings.offset, `${path}.offset`, errors);
	if (settings.slide !== undefined && typeof settings.slide !== "boolean") {
		errors.push(`${path}.slide must be a boolean when provided.`);
	}
	validateOptionalStringArray(
		settings.obstacleChannels,
		`${path}.obstacleChannels`,
		errors,
	);
	if (
		Array.isArray(settings.obstacleChannels) &&
		settings.obstacleChannels.length === 0
	) {
		errors.push(`${path}.obstacleChannels must not be empty when provided.`);
	}
	validateOptionalPositiveNumber(
		settings.snapToGroundDistance,
		`${path}.snapToGroundDistance`,
		errors,
	);
	validateOptionalNumber(
		settings.maxSlopeClimbAngle,
		`${path}.maxSlopeClimbAngle`,
		errors,
	);
	validateOptionalNumber(
		settings.minSlopeSlideAngle,
		`${path}.minSlopeSlideAngle`,
		errors,
	);

	if (settings.up !== undefined) {
		validateRequiredVec3Like(settings.up, `${path}.up`, errors);
	}

	if (settings.autostep !== undefined) {
		if (!isRecord(settings.autostep)) {
			errors.push(`${path}.autostep must be an object when provided.`);
		} else {
			validateRequiredPositiveNumber(
				settings.autostep.maxHeight,
				`${path}.autostep.maxHeight`,
				errors,
			);
			validateRequiredPositiveNumber(
				settings.autostep.minWidth,
				`${path}.autostep.minWidth`,
				errors,
			);
			if (
				settings.autostep.includeDynamicBodies !== undefined &&
				typeof settings.autostep.includeDynamicBodies !== "boolean"
			) {
				errors.push(
					`${path}.autostep.includeDynamicBodies must be a boolean when provided.`,
				);
			}
		}
	}

	for (const angleProperty of [
		"maxSlopeClimbAngle",
		"minSlopeSlideAngle",
	] as const) {
		const value = settings[angleProperty];
		if (typeof value === "number" && (value < 0 || value > Math.PI / 2)) {
			errors.push(`${path}.${angleProperty} must be between 0 and PI / 2.`);
		}
	}
}

export function validateLightComponent(
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
		light.kind !== "spot" &&
		light.kind !== "area"
	) {
		errors.push(
			`${path}.kind must be ambient, directional, point, spot, or area.`,
		);
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

	if (light.kind === "area") {
		if (light.shape !== "rectangle") {
			errors.push(`${path}.shape must be rectangle for area lights.`);
		}

		validateRequiredPositiveNumber(light.width, `${path}.width`, errors);
		validateRequiredPositiveNumber(light.height, `${path}.height`, errors);
	}

	if (light.shadow !== undefined) {
		if (light.kind === "ambient" || light.kind === "area") {
			errors.push(`${path}.shadow is not supported for ${light.kind} lights.`);
		}

		validateLightShadowData(light.shadow, `${path}.shadow`, errors);
	}
}

export function validateLightComponentData(
	light: unknown,
	path = "Light",
): readonly string[] {
	const errors: string[] = [];

	validateLightComponent(light, path, errors);

	return errors;
}

export function validateLightShadowData(
	data: unknown,
	path: string,
	errors: string[],
): void {
	if (!isRecord(data)) {
		errors.push(`${path} must be an object when provided.`);
		return;
	}

	if (typeof data.enabled !== "boolean") {
		errors.push(`${path}.enabled must be a boolean.`);
	}

	if (
		data.mapSize !== undefined &&
		data.mapSize !== 256 &&
		data.mapSize !== 512 &&
		data.mapSize !== 1024 &&
		data.mapSize !== 2048
	) {
		errors.push(`${path}.mapSize must be 256, 512, 1024, or 2048.`);
	}

	validateOptionalNumber(data.bias, `${path}.bias`, errors);
	validateOptionalNumber(data.normalBias, `${path}.normalBias`, errors);
	validateOptionalNonNegativeNumber(data.radius, `${path}.radius`, errors);
	validateOptionalPositiveNumber(data.cameraNear, `${path}.cameraNear`, errors);
	validateOptionalPositiveNumber(data.cameraFar, `${path}.cameraFar`, errors);

	if (
		typeof data.cameraNear === "number" &&
		Number.isFinite(data.cameraNear) &&
		typeof data.cameraFar === "number" &&
		Number.isFinite(data.cameraFar) &&
		data.cameraFar <= data.cameraNear
	) {
		errors.push(`${path}.cameraFar must be greater than cameraNear.`);
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

export function validateTransformOverride(
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
