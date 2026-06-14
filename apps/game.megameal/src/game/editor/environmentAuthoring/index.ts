import type {
	AssetManifestEntryData,
	LevelPrefabInstanceData,
	LightComponentData,
	PrefabData,
	RenderProfileEnvironmentData,
	RuntimeSceneManifestData,
} from "../../../engine/data/index.js";
import { sceneMusicTrackIds } from "../../../engine/modules/audio/index.js";
import { audioContentManifestForRuntimeScene } from "../../assets/index.js";
import { defaultRuntimeSceneManifest } from "../../levels/index.js";
import { getLightAuthoringDraftForRuntimeScene } from "../lightDrafts/lightDraftRegistry.js";

export type EnvironmentAuthoringContractName =
	| "SkyboxEnvironmentContract"
	| "AuthoredLightContract"
	| "AudioManifestAndEvents"
	| "RenderProfile"
	| "LevelReadinessContract";

export type EnvironmentAuthoringField = {
	readonly path: string;
	readonly label: string;
	readonly input: "color" | "number" | "select" | "asset-id" | "boolean";
	readonly contract: EnvironmentAuthoringContractName;
	readonly readOnly: boolean;
};

export type EnvironmentAuthoringControlOption = {
	readonly value: string;
	readonly label: string;
	readonly sourceOwner: string;
};

export type EnvironmentAuthoringOperationDraft =
	| {
			readonly operation: "set-render-profile-environment";
			readonly runtimeSceneId: string;
			readonly levelId: string;
			readonly sourceOwner: string;
			readonly path: string;
			readonly value: string | number | boolean;
			readonly writesFiles: false;
			readonly requiresAuthoringTransaction: true;
	  }
	| {
			readonly operation: "set-authored-light-field";
			readonly runtimeSceneId: string;
			readonly levelId: string;
			readonly sourceOwner: string;
			readonly stableId: string;
			readonly path: string;
			readonly value: string | number | boolean;
			readonly writesFiles: false;
			readonly requiresAuthoringTransaction: true;
	  }
	| {
			readonly operation: "set-audio-track-id";
			readonly runtimeSceneId: string;
			readonly levelId: string;
			readonly sourceOwner: string;
			readonly trackIndex: number;
			readonly trackId: string;
			readonly writesFiles: false;
			readonly requiresAuthoringTransaction: true;
	  };

export type EnvironmentAuthoringControl = EnvironmentAuthoringField & {
	readonly id: string;
	readonly value: string | number | boolean;
	readonly options?: readonly EnvironmentAuthoringControlOption[];
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
	readonly operationDraft: EnvironmentAuthoringOperationDraft;
};

export type EnvironmentAuthoringLightControlGroup = {
	readonly stableId: string;
	readonly prefabId: string;
	readonly sourceOwner: string;
	readonly requiredForReadiness: boolean;
	readonly lightKind: LightComponentData["kind"];
	readonly controls: readonly EnvironmentAuthoringControl[];
};

export type EnvironmentAuthoringAudioTrackControl = {
	readonly trackIndex: number;
	readonly trackId: string;
	readonly options: readonly EnvironmentAuthoringControlOption[];
	readonly operationDraft: EnvironmentAuthoringOperationDraft;
};

export type EnvironmentAuthoringModel = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly renderProfileId: string;
	readonly writePolicy: {
		readonly mode: "explicit-save-only";
		readonly productionBuildSideEffects: false;
	};
	readonly environment: {
		readonly contract: "SkyboxEnvironmentContract";
		readonly sourceOwner: string;
		readonly kind: RenderProfileEnvironmentData["kind"];
		readonly assetId?: string;
		readonly requiredForReadiness: boolean;
		readonly fields: readonly EnvironmentAuthoringField[];
		readonly assetOptions: readonly EnvironmentAuthoringControlOption[];
		readonly controls: readonly EnvironmentAuthoringControl[];
	};
	readonly lighting: {
		readonly contract: "AuthoredLightContract";
		readonly sourceOwner: string;
		readonly profileLightCount: number;
		readonly authoredLightStableIds: readonly string[];
		readonly requiredLightStableIds: readonly string[];
		readonly budget: RuntimeSceneManifestData["renderProfile"]["lighting"]["budget"];
		readonly draft:
			| {
					readonly status: "registered";
					readonly draftId: string;
			  }
			| {
					readonly status: "missing";
			  };
		readonly fields: readonly EnvironmentAuthoringField[];
		readonly lightControls: readonly EnvironmentAuthoringLightControlGroup[];
	};
	readonly audio: {
		readonly contract: "AudioManifestAndEvents";
		readonly sourceOwner: string;
		readonly sceneMusicTrackIds: readonly string[];
		readonly availableTrackIds: readonly string[];
		readonly mixerBusIds: readonly string[];
		readonly eventMappingIds: readonly string[];
		readonly fields: readonly EnvironmentAuthoringField[];
		readonly trackControls: readonly EnvironmentAuthoringAudioTrackControl[];
	};
	readonly validation: {
		readonly errors: readonly string[];
		readonly warnings: readonly string[];
	};
};

export function buildEnvironmentAuthoringModel(
	manifest: RuntimeSceneManifestData = defaultRuntimeSceneManifest,
): EnvironmentAuthoringModel {
	const audioContent = audioContentManifestForRuntimeScene(manifest.id);
	const lightDraft = getLightAuthoringDraftForRuntimeScene(manifest.id);
	const authoredLightStableIds = authoredLightStableIdsForManifest(manifest);
	const environmentAssetIdentifier = environmentAssetId(
		manifest.renderProfile.environment,
	);
	const environmentAssetOptions = environmentAssetOptionsForManifest(manifest);
	const audioTrackOptions = audioTrackOptionsForManifest(manifest);
	const sceneMusicIds = [...sceneMusicTrackIds(audioContent.sceneMusic)].sort();

	const model: Omit<EnvironmentAuthoringModel, "validation"> = {
		schemaVersion: 1,
		runtimeSceneId: manifest.id,
		levelId: manifest.level.id,
		renderProfileId: manifest.renderProfile.id,
		writePolicy: {
			mode: "explicit-save-only",
			productionBuildSideEffects: false,
		},
		environment: {
			contract: "SkyboxEnvironmentContract",
			sourceOwner: `renderProfile:${manifest.renderProfile.id}.environment`,
			kind: manifest.renderProfile.environment.kind,
			...(environmentAssetIdentifier
				? { assetId: environmentAssetIdentifier }
				: {}),
			requiredForReadiness:
				"requiredForReadiness" in manifest.renderProfile.environment
					? manifest.renderProfile.environment.requiredForReadiness
					: false,
			fields: environmentFields(manifest.renderProfile.environment),
			assetOptions: environmentAssetOptions,
			controls: environmentControls(
				manifest,
				manifest.renderProfile.environment,
				environmentAssetOptions,
			),
		},
		lighting: {
			contract: "AuthoredLightContract",
			sourceOwner: `renderProfile:${manifest.renderProfile.id}.lighting`,
			profileLightCount: manifest.renderProfile.lighting.lights.length,
			authoredLightStableIds,
			requiredLightStableIds: [
				...(manifest.readiness.requiredLightStableIds ?? []),
			].sort(),
			budget: manifest.renderProfile.lighting.budget,
			draft: lightDraft
				? { status: "registered", draftId: lightDraft.id }
				: { status: "missing" },
			fields: lightingFields(),
			lightControls: authoredLightControlGroupsForManifest(manifest),
		},
		audio: {
			contract: "AudioManifestAndEvents",
			sourceOwner: `audioContentManifest:${manifest.id}`,
			sceneMusicTrackIds: sceneMusicIds,
			availableTrackIds: audioTrackOptions.map((option) => option.value),
			mixerBusIds: [...(audioContent.mixerBuses ?? [])]
				.map((bus) => bus.id)
				.sort(),
			eventMappingIds: audioContent.eventMappings
				.map((mapping) => mapping.id)
				.sort(),
			fields: audioFields(),
			trackControls: sceneMusicIds.map((trackId, trackIndex) => ({
				trackIndex,
				trackId,
				options: audioTrackOptions,
				operationDraft: {
					operation: "set-audio-track-id",
					runtimeSceneId: manifest.id,
					levelId: manifest.level.id,
					sourceOwner: `audioContentManifest:${manifest.id}.sceneMusic`,
					trackIndex,
					trackId,
					writesFiles: false,
					requiresAuthoringTransaction: true,
				},
			})),
		},
	};

	return {
		...model,
		validation: validateEnvironmentAuthoringModel(model, manifest),
	};
}

export function validateEnvironmentAuthoringModel(
	model: Omit<EnvironmentAuthoringModel, "validation">,
	manifest: RuntimeSceneManifestData,
): EnvironmentAuthoringModel["validation"] {
	const errors: string[] = [];
	const warnings: string[] = [];
	const assetIds = new Set(manifest.assets.assets.map((asset) => asset.id));
	const requiredAssetIds = new Set(manifest.readiness.requiredAssetIds ?? []);

	if (model.runtimeSceneId !== manifest.id) {
		errors.push(
			`environment authoring model targets "${model.runtimeSceneId}", but manifest is "${manifest.id}".`,
		);
	}

	if (model.environment.assetId && !assetIds.has(model.environment.assetId)) {
		errors.push(
			`environment asset "${model.environment.assetId}" is not in the selected runtime scene asset manifest.`,
		);
	}

	if (
		model.environment.assetId &&
		!model.environment.assetOptions.some(
			(option) => option.value === model.environment.assetId,
		)
	) {
		errors.push(
			`environment asset "${model.environment.assetId}" is not exposed as an environment authoring option.`,
		);
	}

	if (
		model.environment.requiredForReadiness &&
		model.environment.assetId &&
		!requiredAssetIds.has(model.environment.assetId)
	) {
		errors.push(
			`required environment asset "${model.environment.assetId}" is missing from readiness.requiredAssetIds.`,
		);
	}

	for (const stableId of model.lighting.requiredLightStableIds) {
		if (!model.lighting.authoredLightStableIds.includes(stableId)) {
			errors.push(
				`required light stableId "${stableId}" is missing authored Light data.`,
			);
		}
	}

	for (const group of model.lighting.lightControls) {
		if (
			group.requiredForReadiness &&
			!model.lighting.requiredLightStableIds.includes(group.stableId)
		) {
			errors.push(
				`light control group "${group.stableId}" marks readiness but is absent from readiness.requiredLightStableIds.`,
			);
		}
	}

	for (const trackId of model.audio.sceneMusicTrackIds) {
		if (!assetIds.has(trackId)) {
			errors.push(
				`scene music track "${trackId}" is not in the selected runtime scene asset manifest.`,
			);
		}

		if (!model.audio.availableTrackIds.includes(trackId)) {
			errors.push(
				`scene music track "${trackId}" is not exposed as an audio authoring track option.`,
			);
		}
	}

	const audioContent = audioContentManifestForRuntimeScene(manifest.id);
	for (const mapping of audioContent.eventMappings) {
		if (!assetIds.has(mapping.soundId)) {
			errors.push(
				`audio event mapping "${mapping.id}" references missing sound asset "${mapping.soundId}".`,
			);
		}
	}

	if (model.lighting.draft.status === "missing") {
		warnings.push(
			"no registered light authoring draft exists for this runtime scene",
		);
	}

	for (const draft of [
		...model.environment.controls.map((control) => control.operationDraft),
		...model.lighting.lightControls.flatMap((group) =>
			group.controls.map((control) => control.operationDraft),
		),
		...model.audio.trackControls.map((control) => control.operationDraft),
	]) {
		if (draft.writesFiles !== false) {
			errors.push(
				`environment authoring operation "${draft.operation}" must not write files directly.`,
			);
		}
	}

	return { errors, warnings };
}

function environmentFields(
	environment: RenderProfileEnvironmentData,
): readonly EnvironmentAuthoringField[] {
	const fields: EnvironmentAuthoringField[] = [
		{
			path: "renderProfile.environment.kind",
			label: "Environment Kind",
			input: "select",
			contract: "SkyboxEnvironmentContract",
			readOnly: false,
		},
		{
			path: "renderProfile.environment.backgroundIntensity",
			label: "Background Intensity",
			input: "number",
			contract: "SkyboxEnvironmentContract",
			readOnly: false,
		},
	];

	if ("assetId" in environment) {
		fields.push({
			path: "renderProfile.environment.assetId",
			label: "Environment Asset",
			input: "asset-id",
			contract: "SkyboxEnvironmentContract",
			readOnly: false,
		});
		fields.push({
			path: "renderProfile.environment.requiredForReadiness",
			label: "Required For Readiness",
			input: "boolean",
			contract: "LevelReadinessContract",
			readOnly: false,
		});
	}

	if (environment.kind === "solid-color") {
		fields.push({
			path: "renderProfile.environment.color",
			label: "Background Color",
			input: "color",
			contract: "RenderProfile",
			readOnly: false,
		});
	}

	return fields;
}

function lightingFields(): readonly EnvironmentAuthoringField[] {
	return [
		{
			path: "renderProfile.lighting.lights",
			label: "Profile Lights",
			input: "select",
			contract: "RenderProfile",
			readOnly: false,
		},
		{
			path: "renderProfile.lighting.budget",
			label: "Light Budget",
			input: "number",
			contract: "AuthoredLightContract",
			readOnly: false,
		},
		{
			path: "level.instances.*.components.Light",
			label: "Authored Instance Lights",
			input: "select",
			contract: "AuthoredLightContract",
			readOnly: false,
		},
	];
}

function audioFields(): readonly EnvironmentAuthoringField[] {
	return [
		{
			path: "audioContentManifest.sceneMusic",
			label: "Scene Music",
			input: "asset-id",
			contract: "AudioManifestAndEvents",
			readOnly: false,
		},
		{
			path: "audioContentManifest.eventMappings",
			label: "Audio Event Mappings",
			input: "select",
			contract: "AudioManifestAndEvents",
			readOnly: false,
		},
		{
			path: "audioContentManifest.mixerBuses",
			label: "Mixer Buses",
			input: "number",
			contract: "AudioManifestAndEvents",
			readOnly: false,
		},
	];
}

function environmentControls(
	manifest: RuntimeSceneManifestData,
	environment: RenderProfileEnvironmentData,
	assetOptions: readonly EnvironmentAuthoringControlOption[],
): readonly EnvironmentAuthoringControl[] {
	const controls: EnvironmentAuthoringControl[] = [
		environmentControl({
			manifest,
			path: "renderProfile.environment.kind",
			label: "Environment Kind",
			input: "select",
			contract: "SkyboxEnvironmentContract",
			value: environment.kind,
			options: [
				"solid-color",
				"cubemap-skybox",
				"equirectangular-environment",
				"video-skybox",
				"procedural-atmosphere",
			].map((kind) => ({
				value: kind,
				label: kind,
				sourceOwner: "RenderProfileEnvironmentData.kind",
			})),
		}),
		environmentControl({
			manifest,
			path: "renderProfile.environment.backgroundIntensity",
			label: "Background Intensity",
			input: "number",
			contract: "SkyboxEnvironmentContract",
			value: environment.backgroundIntensity,
			min: 0,
			step: 0.01,
		}),
	];

	if ("assetId" in environment) {
		controls.push(
			environmentControl({
				manifest,
				path: "renderProfile.environment.assetId",
				label: "Environment Asset",
				input: "asset-id",
				contract: "SkyboxEnvironmentContract",
				value: environment.assetId,
				options: assetOptions,
			}),
			environmentControl({
				manifest,
				path: "renderProfile.environment.backgroundBlurriness",
				label: "Background Blurriness",
				input: "number",
				contract: "SkyboxEnvironmentContract",
				value: environment.backgroundBlurriness,
				min: 0,
				max: 1,
				step: 0.01,
			}),
			environmentControl({
				manifest,
				path: "renderProfile.environment.environmentIntensity",
				label: "Environment Intensity",
				input: "number",
				contract: "SkyboxEnvironmentContract",
				value: environment.environmentIntensity,
				min: 0,
				step: 0.01,
			}),
			environmentControl({
				manifest,
				path: "renderProfile.environment.requiredForReadiness",
				label: "Required For Readiness",
				input: "boolean",
				contract: "LevelReadinessContract",
				value: environment.requiredForReadiness,
			}),
		);
	}

	if (environment.kind === "solid-color") {
		controls.push(
			environmentControl({
				manifest,
				path: "renderProfile.environment.color",
				label: "Background Color",
				input: "color",
				contract: "RenderProfile",
				value: environment.color,
			}),
		);
	}

	if (environment.kind === "procedural-atmosphere") {
		controls.push(
			environmentControl({
				manifest,
				path: "renderProfile.environment.environmentIntensity",
				label: "Environment Intensity",
				input: "number",
				contract: "SkyboxEnvironmentContract",
				value: environment.environmentIntensity,
				min: 0,
				step: 0.01,
			}),
			environmentControl({
				manifest,
				path: "renderProfile.environment.exposure",
				label: "Exposure",
				input: "number",
				contract: "RenderProfile",
				value: environment.exposure,
				min: 0,
				step: 0.01,
			}),
		);
	}

	return controls;
}

function environmentControl(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly path: string;
	readonly label: string;
	readonly input: EnvironmentAuthoringField["input"];
	readonly contract: EnvironmentAuthoringContractName;
	readonly value: string | number | boolean;
	readonly options?: readonly EnvironmentAuthoringControlOption[];
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
}): EnvironmentAuthoringControl {
	return {
		id: controlId(options.path),
		path: options.path,
		label: options.label,
		input: options.input,
		contract: options.contract,
		readOnly: false,
		value: options.value,
		...(options.options === undefined ? {} : { options: options.options }),
		...(options.min === undefined ? {} : { min: options.min }),
		...(options.max === undefined ? {} : { max: options.max }),
		...(options.step === undefined ? {} : { step: options.step }),
		operationDraft: {
			operation: "set-render-profile-environment",
			runtimeSceneId: options.manifest.id,
			levelId: options.manifest.level.id,
			sourceOwner: `renderProfile:${options.manifest.renderProfile.id}.environment`,
			path: options.path,
			value: options.value,
			writesFiles: false,
			requiresAuthoringTransaction: true,
		},
	};
}

function environmentAssetOptionsForManifest(
	manifest: RuntimeSceneManifestData,
): readonly EnvironmentAuthoringControlOption[] {
	return manifest.assets.assets
		.filter(isEnvironmentAsset)
		.map((asset) => ({
			value: asset.id,
			label: asset.id,
			sourceOwner: `assetManifest:${asset.id}:${asset.kind}`,
		}))
		.sort((left, right) => left.label.localeCompare(right.label));
}

function audioTrackOptionsForManifest(
	manifest: RuntimeSceneManifestData,
): readonly EnvironmentAuthoringControlOption[] {
	return manifest.assets.assets
		.filter((asset) => asset.kind === "audio")
		.map((asset) => ({
			value: asset.id,
			label: asset.id,
			sourceOwner: `assetManifest:${asset.id}:audio`,
		}))
		.sort((left, right) => left.label.localeCompare(right.label));
}

function isEnvironmentAsset(asset: AssetManifestEntryData): boolean {
	return (
		asset.kind === "cubemap" ||
		asset.kind === "video" ||
		(asset.kind === "texture" &&
			(asset.projection === "equirectangular" ||
				asset.tags?.includes("environment") === true ||
				asset.tags?.includes("skybox") === true))
	);
}

function authoredLightControlGroupsForManifest(
	manifest: RuntimeSceneManifestData,
): readonly EnvironmentAuthoringLightControlGroup[] {
	const prefabsById = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab]),
	);
	const requiredLightStableIds = new Set(
		manifest.readiness.requiredLightStableIds ?? [],
	);

	return manifest.level.instances
		.flatMap((instance) => {
			const prefab = prefabsById.get(instance.prefabId);
			const instanceLight = lightComponentValue(instance.components?.Light);
			const prefabLight = lightComponentValue(prefab?.components.Light);
			const light = instanceLight ?? prefabLight;

			if (!light) {
				return [];
			}

			const sourceOwner =
				instanceLight === undefined
					? `prefab:${instance.prefabId}.components.Light`
					: `level:${manifest.level.id}:${instance.stableId}.components.Light`;

			return [
				{
					stableId: instance.stableId,
					prefabId: instance.prefabId,
					sourceOwner,
					requiredForReadiness: requiredLightStableIds.has(instance.stableId),
					lightKind: light.kind,
					controls: lightControlsForInstance({
						manifest,
						stableId: instance.stableId,
						sourceOwner,
						light,
					}),
				},
			];
		})
		.sort((left, right) => left.stableId.localeCompare(right.stableId));
}

function lightControlsForInstance(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly stableId: string;
	readonly sourceOwner: string;
	readonly light: LightComponentData;
}): readonly EnvironmentAuthoringControl[] {
	const controls = [
		lightControl({
			...options,
			path: "Light.kind",
			label: "Kind",
			input: "select",
			value: options.light.kind,
			options: ["ambient", "directional", "point", "spot", "area"].map(
				(kind) => ({
					value: kind,
					label: kind,
					sourceOwner: "LightComponentData.kind",
				}),
			),
		}),
		lightControl({
			...options,
			path: "Light.color",
			label: "Color",
			input: "color",
			value: options.light.color,
		}),
		lightControl({
			...options,
			path: "Light.intensity",
			label: "Intensity",
			input: "number",
			value: options.light.intensity,
			min: 0,
			step: 0.1,
		}),
		lightControl({
			...options,
			path: "Light.visible",
			label: "Visible",
			input: "boolean",
			value: options.light.visible ?? true,
		}),
	];

	if ("distance" in options.light) {
		controls.push(
			lightControl({
				...options,
				path: "Light.distance",
				label: "Distance",
				input: "number",
				value: options.light.distance,
				min: 0,
				step: 0.1,
			}),
			lightControl({
				...options,
				path: "Light.decay",
				label: "Decay",
				input: "number",
				value: options.light.decay,
				min: 0,
				step: 0.1,
			}),
		);
	}

	if (options.light.kind === "spot") {
		controls.push(
			lightControl({
				...options,
				path: "Light.angle",
				label: "Angle",
				input: "number",
				value: options.light.angle,
				min: 0,
				step: 0.01,
			}),
			lightControl({
				...options,
				path: "Light.penumbra",
				label: "Penumbra",
				input: "number",
				value: options.light.penumbra,
				min: 0,
				max: 1,
				step: 0.01,
			}),
		);
	}

	if (options.light.kind === "area") {
		controls.push(
			lightControl({
				...options,
				path: "Light.width",
				label: "Width",
				input: "number",
				value: options.light.width,
				min: 0,
				step: 0.1,
			}),
			lightControl({
				...options,
				path: "Light.height",
				label: "Height",
				input: "number",
				value: options.light.height,
				min: 0,
				step: 0.1,
			}),
		);
	}

	if ("shadow" in options.light && options.light.shadow !== undefined) {
		controls.push(
			lightControl({
				...options,
				path: "Light.shadow.enabled",
				label: "Shadow",
				input: "boolean",
				value: options.light.shadow.enabled,
			}),
		);
	}

	return controls;
}

function lightControl(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly stableId: string;
	readonly sourceOwner: string;
	readonly path: string;
	readonly label: string;
	readonly input: EnvironmentAuthoringField["input"];
	readonly value: string | number | boolean;
	readonly options?: readonly EnvironmentAuthoringControlOption[];
	readonly min?: number;
	readonly max?: number;
	readonly step?: number;
}): EnvironmentAuthoringControl {
	return {
		id: `${controlId(options.stableId)}:${controlId(options.path)}`,
		path: options.path,
		label: options.label,
		input: options.input,
		contract: "AuthoredLightContract",
		readOnly: false,
		value: options.value,
		...(options.options === undefined ? {} : { options: options.options }),
		...(options.min === undefined ? {} : { min: options.min }),
		...(options.max === undefined ? {} : { max: options.max }),
		...(options.step === undefined ? {} : { step: options.step }),
		operationDraft: {
			operation: "set-authored-light-field",
			runtimeSceneId: options.manifest.id,
			levelId: options.manifest.level.id,
			sourceOwner: options.sourceOwner,
			stableId: options.stableId,
			path: options.path,
			value: options.value,
			writesFiles: false,
			requiresAuthoringTransaction: true,
		},
	};
}

function environmentAssetId(
	environment: RenderProfileEnvironmentData,
): string | undefined {
	return "assetId" in environment ? environment.assetId : undefined;
}

function authoredLightStableIdsForManifest(
	manifest: RuntimeSceneManifestData,
): readonly string[] {
	const prefabsById = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab]),
	);

	return manifest.level.instances
		.filter((instance) => instanceHasLight(instance, prefabsById))
		.map((instance) => instance.stableId)
		.sort();
}

function instanceHasLight(
	instance: LevelPrefabInstanceData,
	prefabsById: ReadonlyMap<string, PrefabData>,
): boolean {
	return (
		instance.components?.Light !== undefined ||
		prefabsById.get(instance.prefabId)?.components.Light !== undefined
	);
}

function lightComponentValue(value: unknown): LightComponentData | undefined {
	const light = asRecord(value);
	const kind = light.kind;

	return typeof kind === "string" &&
		(kind === "ambient" ||
			kind === "directional" ||
			kind === "point" ||
			kind === "spot" ||
			kind === "area")
		? (light as unknown as LightComponentData)
		: undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return value as Record<string, unknown>;
}

function controlId(path: string): string {
	return path
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
