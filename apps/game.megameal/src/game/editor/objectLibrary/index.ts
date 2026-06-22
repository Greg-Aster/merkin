import {
	type AssetManifestEntryData,
	type LevelEditorObjectEditPreviewPatch,
	type PrefabData,
	type RuntimeSceneManifestData,
	validateLevelEditorObjectEditPreviewPatch,
} from "../../../engine/data/index.js";
import { defaultRuntimeSceneManifests } from "../../levels/index.js";

export type EditorObjectLibraryEntryKind = "asset" | "prefab";

export type EditorObjectLibraryGroupSource =
	| "asset-manifest"
	| "prefab-manifest";

export type EditorObjectLibraryPreviewKind =
	| "audio"
	| "environment"
	| "material"
	| "mesh"
	| "texture"
	| "data";

export type EditorObjectLibraryPlacementDraft = {
	readonly operation: "insert-level-instance";
	readonly prefabId: string;
	readonly stableIdPattern: string;
	readonly componentOverrides: Record<string, unknown>;
	readonly transform: {
		readonly position: readonly [number, number, number];
		readonly rotation: readonly [number, number, number, number];
		readonly scale: readonly [number, number, number];
	};
	readonly writesFiles: false;
	readonly requiresAuthoringTransaction: true;
};

export type EditorObjectLibraryPlacementReadinessStatus =
	| "draft-ready"
	| "publish-ready"
	| "replacement-only"
	| "blocked";

export type EditorObjectLibraryPlacementReadiness = {
	readonly schemaVersion: 1;
	readonly contract: "ManifestBackedObjectPlacementReadiness";
	readonly status: EditorObjectLibraryPlacementReadinessStatus;
	readonly canStagePlacementDraft: boolean;
	readonly canPublishPlacement: boolean;
	readonly writesFiles: boolean;
	readonly requiresAuthoringTransaction: boolean;
	readonly requiredOwnerKinds: readonly ("level" | "prefab")[];
	readonly reasons: readonly string[];
};

export type EditorObjectLibraryReplacementSubject = {
	readonly stableId: string;
	readonly label: string;
	readonly currentPrefabId: string;
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly assetIds: readonly string[];
	readonly currentRenderable?: {
		readonly meshId?: string;
		readonly materialId?: string;
	};
	readonly currentSoundEmitter?: {
		readonly soundId?: string;
		readonly volume?: number;
	};
};

export type EditorObjectLibraryReplacementKind =
	| "replace-level-instance-prefab"
	| "replace-renderable-mesh"
	| "replace-renderable-material"
	| "replace-sound-emitter-audio";

export type EditorObjectLibraryReplacementDraft = {
	readonly schemaVersion: 1;
	readonly contract: "ObjectLibraryReplacementPreviewContract";
	readonly mode: "preview-only";
	readonly operation: "replace-selected-object";
	readonly replacementKind: EditorObjectLibraryReplacementKind;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourcePlanHash: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject;
	readonly replacement: {
		readonly entryId: string;
		readonly kind: EditorObjectLibraryEntryKind;
		readonly sourceId: string;
		readonly label: string;
		readonly prefabId?: string;
		readonly assetId?: string;
		readonly assetKind?: AssetManifestEntryData["kind"];
	};
	readonly preserveStableId: true;
	readonly writesFiles: false;
	readonly mutatesRuntimeDirectly: false;
	readonly previewPatch: LevelEditorObjectEditPreviewPatch;
	readonly authoringOperation: {
		readonly kind:
			| "replace-level-instance"
			| "replace-component-asset-reference";
		readonly previewOnly: true;
		readonly writesFiles: false;
		readonly mutatesRuntimeDirectly: false;
		readonly requiresAuthoringTransaction: true;
		readonly ownerKind: "level";
		readonly ownerTargetId: string;
		readonly subjectStableId: string;
		readonly preserveStableId: true;
		readonly payload: Record<string, unknown>;
	};
};

export type EditorObjectLibraryReplacementDraftResult =
	| {
			readonly ok: true;
			readonly draft: EditorObjectLibraryReplacementDraft;
	  }
	| {
			readonly ok: false;
			readonly errors: readonly string[];
	  };

export type EditorObjectLibraryEntry = {
	readonly id: string;
	readonly sourceId: string;
	readonly kind: EditorObjectLibraryEntryKind;
	readonly label: string;
	readonly runtimeSceneIds: readonly string[];
	readonly sourceOwner: string;
	readonly tags: readonly string[];
	readonly preview: {
		readonly kind: EditorObjectLibraryPreviewKind;
		readonly assetId?: string;
		readonly url?: string;
	};
	readonly assetKind?: AssetManifestEntryData["kind"];
	readonly assetId?: string;
	readonly prefabId?: string;
	readonly assetIds?: readonly string[];
	readonly componentNames?: readonly string[];
	readonly placement?: EditorObjectLibraryPlacementDraft;
	readonly placementReadiness: EditorObjectLibraryPlacementReadiness;
};

export type EditorObjectLibraryGroup = {
	readonly id: string;
	readonly label: string;
	readonly source: EditorObjectLibraryGroupSource;
	readonly entries: readonly EditorObjectLibraryEntry[];
};

export type EditorObjectLibrarySceneSummary = {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly assetCount: number;
	readonly prefabCount: number;
};

export type EditorObjectLibraryCatalog = {
	readonly schemaVersion: 1;
	readonly source: "runtime-scene-manifests";
	readonly scenes: readonly EditorObjectLibrarySceneSummary[];
	readonly groups: readonly EditorObjectLibraryGroup[];
};

type MutableEntry = Omit<EditorObjectLibraryEntry, "runtimeSceneIds"> & {
	readonly runtimeSceneIds: Set<string>;
};

const groupLabels: Record<string, string> = {
	"assets:audio": "Audio Assets",
	"assets:data": "Data And Scene Assets",
	"assets:environment": "Environment Assets",
	"assets:materials": "Materials",
	"assets:meshes": "Meshes",
	"assets:textures": "Textures",
	"prefabs:audio": "Audio Emitters",
	"prefabs:collision": "Collision",
	"prefabs:environment": "Environment",
	"prefabs:interactive": "Interactive Content",
	"prefabs:lighting": "Lighting",
	"prefabs:npc": "NPC And Fireflies",
	"prefabs:portals": "Portals",
	"prefabs:props": "Props",
	"prefabs:spawn": "Spawn And Player",
	"prefabs:terrain": "Terrain",
};
const placementReadinessStatuses =
	new Set<EditorObjectLibraryPlacementReadinessStatus>([
		"draft-ready",
		"publish-ready",
		"replacement-only",
		"blocked",
	]);

export function buildManifestBackedObjectLibrary(
	manifests: readonly RuntimeSceneManifestData[] = defaultRuntimeSceneManifests,
): EditorObjectLibraryCatalog {
	const groups = new Map<string, MutableEntry[]>();

	for (const manifest of manifests) {
		for (const prefab of manifest.prefabs) {
			registerEntry(
				groups,
				prefabGroupId(prefab),
				prefabLibraryEntry(prefab, manifest),
			);
		}

		for (const asset of manifest.assets.assets) {
			registerEntry(
				groups,
				assetGroupId(asset),
				assetLibraryEntry(asset, manifest),
			);
		}
	}

	return {
		schemaVersion: 1,
		source: "runtime-scene-manifests",
		scenes: manifests
			.map((manifest) => ({
				runtimeSceneId: manifest.id,
				levelId: manifest.level.id,
				assetCount: manifest.assets.assets.length,
				prefabCount: manifest.prefabs.length,
			}))
			.sort((left, right) =>
				left.runtimeSceneId.localeCompare(right.runtimeSceneId),
			),
		groups: [...groups.entries()]
			.map(([id, entries]) => ({
				id,
				label: groupLabels[id] ?? id,
				source: groupSourceForId(id),
				entries: entries
					.map((entry) => ({
						...entry,
						runtimeSceneIds: [...entry.runtimeSceneIds].sort(),
					}))
					.sort((left, right) => left.label.localeCompare(right.label)),
			}))
			.sort((left, right) => left.label.localeCompare(right.label)),
	};
}

function groupSourceForId(id: string): EditorObjectLibraryGroupSource {
	return id.startsWith("assets:") ? "asset-manifest" : "prefab-manifest";
}

export function validateObjectLibraryCatalog(
	catalog: EditorObjectLibraryCatalog,
): readonly string[] {
	const errors: string[] = [];
	const sceneIds = new Set(catalog.scenes.map((scene) => scene.runtimeSceneId));

	if (catalog.schemaVersion !== 1) {
		errors.push("objectLibrary.schemaVersion must be 1.");
	}

	if (catalog.groups.length === 0) {
		errors.push("objectLibrary.groups must contain at least one group.");
	}

	for (const group of catalog.groups) {
		const entryIds = new Set<string>();

		if (group.entries.length === 0) {
			errors.push(`objectLibrary group "${group.id}" must not be empty.`);
		}

		for (const entry of group.entries) {
			if (entryIds.has(entry.id)) {
				errors.push(
					`objectLibrary group "${group.id}" contains duplicate entry "${entry.id}".`,
				);
			}

			entryIds.add(entry.id);

			if (entry.runtimeSceneIds.length === 0) {
				errors.push(`objectLibrary entry "${entry.id}" has no source scenes.`);
			}

			for (const runtimeSceneId of entry.runtimeSceneIds) {
				if (!sceneIds.has(runtimeSceneId)) {
					errors.push(
						`objectLibrary entry "${entry.id}" references unknown runtime scene "${runtimeSceneId}".`,
					);
				}
			}

			if (entry.kind === "prefab" && !entry.placement) {
				errors.push(
					`objectLibrary prefab entry "${entry.id}" must expose an editor placement draft.`,
				);
			}

			validatePlacementReadiness(entry, errors);
		}
	}

	return errors;
}

export function createObjectLibraryReplacementDraft(options: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject;
	readonly replacementEntry: EditorObjectLibraryEntry;
	readonly manifests?: readonly RuntimeSceneManifestData[];
}): EditorObjectLibraryReplacementDraft {
	const result = tryCreateObjectLibraryReplacementDraft(options);

	if (!result.ok) {
		throw new Error(
			`Invalid object library replacement draft:\n${result.errors.join("\n")}`,
		);
	}

	return result.draft;
}

export function tryCreateObjectLibraryReplacementDraft(options: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject;
	readonly replacementEntry: EditorObjectLibraryEntry;
	readonly manifests?: readonly RuntimeSceneManifestData[];
}): EditorObjectLibraryReplacementDraftResult {
	const manifests = options.manifests ?? defaultRuntimeSceneManifests;
	const manifest = manifests.find(
		(candidate) => candidate.id === options.runtimeSceneId,
	);
	const errors: string[] = [];

	if (!manifest) {
		errors.push(
			`runtime scene "${options.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
		return { ok: false, errors };
	}

	if (
		!options.replacementEntry.runtimeSceneIds.includes(options.runtimeSceneId)
	) {
		errors.push(
			`replacement entry "${options.replacementEntry.id}" is not declared by runtime scene "${options.runtimeSceneId}".`,
		);
	}

	const preview = buildReplacementPreviewPatch({
		manifest,
		levelId: options.levelId,
		selectedObject: options.selectedObject,
		replacementEntry: options.replacementEntry,
		errors,
	});

	if (!preview) {
		return { ok: false, errors };
	}

	const draft = {
		schemaVersion: 1,
		contract: "ObjectLibraryReplacementPreviewContract",
		mode: "preview-only",
		operation: "replace-selected-object",
		replacementKind: preview.replacementKind,
		runtimeSceneId: options.runtimeSceneId,
		levelId: options.levelId,
		sourcePlanHash: preview.previewPatch.sourcePlanHash,
		selectedObject: cloneValue(options.selectedObject),
		replacement: {
			entryId: options.replacementEntry.id,
			kind: options.replacementEntry.kind,
			sourceId: options.replacementEntry.sourceId,
			label: options.replacementEntry.label,
			...(options.replacementEntry.prefabId === undefined
				? {}
				: { prefabId: options.replacementEntry.prefabId }),
			...(options.replacementEntry.assetId === undefined
				? {}
				: { assetId: options.replacementEntry.assetId }),
			...(options.replacementEntry.assetKind === undefined
				? {}
				: { assetKind: options.replacementEntry.assetKind }),
		},
		preserveStableId: true,
		writesFiles: false,
		mutatesRuntimeDirectly: false,
		previewPatch: preview.previewPatch,
		authoringOperation: preview.authoringOperation,
	} satisfies EditorObjectLibraryReplacementDraft;
	const validationErrors = validateObjectLibraryReplacementDraft(draft);

	if (validationErrors.length > 0) {
		return { ok: false, errors: [...errors, ...validationErrors] };
	}

	return { ok: true, draft };
}

export function validateObjectLibraryReplacementDraft(
	draft: EditorObjectLibraryReplacementDraft,
): readonly string[] {
	const errors: string[] = [];

	if (draft.schemaVersion !== 1) {
		errors.push("replacementDraft.schemaVersion must be 1.");
	}

	if (draft.contract !== "ObjectLibraryReplacementPreviewContract") {
		errors.push(
			"replacementDraft.contract must be ObjectLibraryReplacementPreviewContract.",
		);
	}

	if (draft.mode !== "preview-only") {
		errors.push("replacementDraft.mode must be preview-only.");
	}

	if (draft.operation !== "replace-selected-object") {
		errors.push("replacementDraft.operation must be replace-selected-object.");
	}

	if (draft.preserveStableId !== true) {
		errors.push("replacementDraft.preserveStableId must be true.");
	}

	if (draft.writesFiles !== false) {
		errors.push("replacementDraft.writesFiles must be false.");
	}

	if (draft.mutatesRuntimeDirectly !== false) {
		errors.push("replacementDraft.mutatesRuntimeDirectly must be false.");
	}

	if (draft.authoringOperation.previewOnly !== true) {
		errors.push("replacementDraft authoring operation must be preview-only.");
	}

	if (draft.authoringOperation.writesFiles !== false) {
		errors.push("replacementDraft authoring operation must not write files.");
	}

	if (draft.authoringOperation.mutatesRuntimeDirectly !== false) {
		errors.push(
			"replacementDraft authoring operation must not mutate runtime directly.",
		);
	}

	if (
		draft.authoringOperation.subjectStableId !== draft.selectedObject.stableId
	) {
		errors.push(
			"replacementDraft authoring operation must target the selected stable ID.",
		);
	}

	if (draft.previewPatch.runtimeSceneId !== draft.runtimeSceneId) {
		errors.push(
			"replacementDraft preview patch runtimeSceneId must match the draft.",
		);
	}

	if (draft.previewPatch.levelId !== draft.levelId) {
		errors.push("replacementDraft preview patch levelId must match the draft.");
	}

	for (const error of validateLevelEditorObjectEditPreviewPatch(
		draft.previewPatch,
	)) {
		errors.push(error);
	}

	for (const entry of draft.previewPatch.entries) {
		if (entry.stableId !== draft.selectedObject.stableId) {
			errors.push(
				"replacementDraft preview entries must preserve the selected stable ID.",
			);
		}
	}

	return errors;
}

function registerEntry(
	groups: Map<string, MutableEntry[]>,
	groupId: string,
	entry: MutableEntry,
): void {
	const entries = groups.get(groupId) ?? [];
	const existing = entries.find((candidate) => candidate.id === entry.id);

	if (existing) {
		for (const runtimeSceneId of entry.runtimeSceneIds) {
			existing.runtimeSceneIds.add(runtimeSceneId);
		}
		return;
	}

	entries.push(entry);
	groups.set(groupId, entries);
}

function buildReplacementPreviewPatch(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject;
	readonly replacementEntry: EditorObjectLibraryEntry;
	readonly errors: string[];
}):
	| {
			readonly replacementKind: EditorObjectLibraryReplacementKind;
			readonly previewPatch: LevelEditorObjectEditPreviewPatch;
			readonly authoringOperation: EditorObjectLibraryReplacementDraft["authoringOperation"];
	  }
	| undefined {
	const sourcePlanHash = `object-library:${options.manifest.id}:${options.selectedObject.stableId}:${options.replacementEntry.id}`;
	const ownerTargetId = `${options.manifest.id}:level`;

	if (options.replacementEntry.kind === "prefab") {
		const prefab = options.manifest.prefabs.find(
			(candidate) => candidate.id === options.replacementEntry.prefabId,
		);

		if (!prefab) {
			options.errors.push(
				`prefab "${String(options.replacementEntry.prefabId)}" is not present in runtime scene "${options.manifest.id}".`,
			);
			return undefined;
		}

		const components = Object.fromEntries(
			Object.entries(cloneRecord(prefab.components)).filter(
				([componentName]) => componentName !== "Transform",
			),
		);
		const removeComponents = options.selectedObject.componentNames
			.filter((componentName) => componentName !== "Transform")
			.filter((componentName) => components[componentName] === undefined);
		const previewPatch = {
			schemaVersion: 1,
			channel: "level-editor-object-edit-preview",
			mode: "temporary-preview",
			runtimeSceneId: options.manifest.id,
			levelId: options.levelId,
			sourcePlanHash,
			entries: [
				{
					stableId: options.selectedObject.stableId,
					operation: "component-patch",
					components,
					...(removeComponents.length === 0 ? {} : { removeComponents }),
				},
			],
		} satisfies LevelEditorObjectEditPreviewPatch;

		return {
			replacementKind: "replace-level-instance-prefab",
			previewPatch,
			authoringOperation: {
				kind: "replace-level-instance",
				previewOnly: true,
				writesFiles: false,
				mutatesRuntimeDirectly: false,
				requiresAuthoringTransaction: true,
				ownerKind: "level",
				ownerTargetId,
				subjectStableId: options.selectedObject.stableId,
				preserveStableId: true,
				payload: {
					prefabId: prefab.id,
					componentOverrides: {},
				},
			},
		};
	}

	const asset = options.manifest.assets.assets.find(
		(candidate) => candidate.id === options.replacementEntry.assetId,
	);

	if (!asset) {
		options.errors.push(
			`asset "${String(options.replacementEntry.assetId)}" is not present in runtime scene "${options.manifest.id}".`,
		);
		return undefined;
	}

	const assetPatch = replacementPatchForAsset(asset, options.selectedObject);

	if (!assetPatch) {
		options.errors.push(
			`asset "${asset.id}" with kind "${asset.kind}" cannot replace the selected object through the object-library preview contract.`,
		);
		return undefined;
	}

	const previewPatch = {
		schemaVersion: 1,
		channel: "level-editor-object-edit-preview",
		mode: "temporary-preview",
		runtimeSceneId: options.manifest.id,
		levelId: options.levelId,
		sourcePlanHash,
		entries: [
			{
				stableId: options.selectedObject.stableId,
				operation: "component-patch",
				components: assetPatch.components,
			},
		],
	} satisfies LevelEditorObjectEditPreviewPatch;

	return {
		replacementKind: assetPatch.replacementKind,
		previewPatch,
		authoringOperation: {
			kind: "replace-component-asset-reference",
			previewOnly: true,
			writesFiles: false,
			mutatesRuntimeDirectly: false,
			requiresAuthoringTransaction: true,
			ownerKind: "level",
			ownerTargetId,
			subjectStableId: options.selectedObject.stableId,
			preserveStableId: true,
			payload: assetPatch.payload,
		},
	};
}

function replacementPatchForAsset(
	asset: AssetManifestEntryData,
	selectedObject: EditorObjectLibraryReplacementSubject,
):
	| {
			readonly replacementKind: Exclude<
				EditorObjectLibraryReplacementKind,
				"replace-level-instance-prefab"
			>;
			readonly components: Record<string, unknown>;
			readonly payload: Record<string, unknown>;
	  }
	| undefined {
	switch (asset.kind) {
		case "mesh": {
			const renderable = {
				...(selectedObject.currentRenderable ?? {}),
				meshId: asset.id,
			};

			return {
				replacementKind: "replace-renderable-mesh",
				components: { Renderable: renderable },
				payload: { componentName: "Renderable", patch: renderable },
			};
		}
		case "material": {
			const renderable = {
				...(selectedObject.currentRenderable ?? {}),
				materialId: asset.id,
			};

			return {
				replacementKind: "replace-renderable-material",
				components: { Renderable: renderable },
				payload: { componentName: "Renderable", patch: renderable },
			};
		}
		case "audio": {
			const soundEmitter = {
				...(selectedObject.currentSoundEmitter ?? {}),
				soundId: asset.id,
			};

			return {
				replacementKind: "replace-sound-emitter-audio",
				components: { SoundEmitter: soundEmitter },
				payload: { componentName: "SoundEmitter", patch: soundEmitter },
			};
		}
		default:
			return undefined;
	}
}

function prefabLibraryEntry(
	prefab: PrefabData,
	manifest: RuntimeSceneManifestData,
): MutableEntry {
	const componentNames = Object.keys(prefab.components).sort();

	return {
		id: `prefab:${prefab.id}`,
		sourceId: prefab.id,
		kind: "prefab",
		label: labelFromId(prefab.id),
		runtimeSceneIds: new Set([manifest.id]),
		sourceOwner: `runtime-scene-manifest-catalog:prefabs:${prefab.id}`,
		tags: [...(prefab.tags ?? [])].sort(),
		preview: prefabPreview(prefab),
		prefabId: prefab.id,
		assetIds: [...(prefab.assetIds ?? [])].sort(),
		componentNames,
		placement: {
			operation: "insert-level-instance",
			prefabId: prefab.id,
			stableIdPattern: `${manifest.level.id}:{prefabId}:{slug}`,
			componentOverrides: {},
			transform: {
				position: [0, 0, 0],
				rotation: [0, 0, 0, 1],
				scale: [1, 1, 1],
			},
			writesFiles: false,
			requiresAuthoringTransaction: true,
		},
		placementReadiness: prefabPlacementReadiness(),
	};
}

function assetLibraryEntry(
	asset: AssetManifestEntryData,
	manifest: RuntimeSceneManifestData,
): MutableEntry {
	return {
		id: `asset:${asset.id}`,
		sourceId: asset.id,
		kind: "asset",
		label: labelFromId(asset.id),
		runtimeSceneIds: new Set([manifest.id]),
		sourceOwner: `runtime-scene-manifest-catalog:assets:${asset.id}`,
		tags: [...(asset.tags ?? [])].sort(),
		preview: {
			kind: assetPreviewKind(asset),
			assetId: asset.id,
			url: asset.url,
		},
		assetKind: asset.kind,
		assetId: asset.id,
		placementReadiness: assetPlacementReadiness(),
	};
}

function prefabPlacementReadiness(): EditorObjectLibraryPlacementReadiness {
	return {
		schemaVersion: 1,
		contract: "ManifestBackedObjectPlacementReadiness",
		status: "publish-ready",
		canStagePlacementDraft: true,
		canPublishPlacement: true,
		writesFiles: true,
		requiresAuthoringTransaction: true,
		requiredOwnerKinds: ["level", "prefab"],
		reasons: [
			"Prefab is declared by the selected runtime scene manifest and can be staged through a generated level insertion owner.",
			"Save Level/Publish writes bounded generated runtime placement data after validation.",
		],
	};
}

function assetPlacementReadiness(): EditorObjectLibraryPlacementReadiness {
	return {
		schemaVersion: 1,
		contract: "ManifestBackedObjectPlacementReadiness",
		status: "replacement-only",
		canStagePlacementDraft: false,
		canPublishPlacement: false,
		writesFiles: false,
		requiresAuthoringTransaction: false,
		requiredOwnerKinds: [],
		reasons: [
			"Asset entries are manifest-backed replacement sources; placement requires a prefab entry.",
		],
	};
}

function validatePlacementReadiness(
	entry: EditorObjectLibraryEntry,
	errors: string[],
): void {
	const readiness = entry.placementReadiness;

	if (readiness.schemaVersion !== 1) {
		errors.push(
			`objectLibrary entry "${entry.id}" placementReadiness.schemaVersion must be 1.`,
		);
	}

	if (readiness.contract !== "ManifestBackedObjectPlacementReadiness") {
		errors.push(
			`objectLibrary entry "${entry.id}" placementReadiness.contract must be ManifestBackedObjectPlacementReadiness.`,
		);
	}

	if (!placementReadinessStatuses.has(readiness.status)) {
		errors.push(
			`objectLibrary entry "${entry.id}" placementReadiness.status is invalid.`,
		);
	}

	if (readiness.reasons.length === 0) {
		errors.push(
			`objectLibrary entry "${entry.id}" placementReadiness.reasons must describe the placement state.`,
		);
	}

	if (
		entry.kind === "prefab" &&
		(readiness.status !== "publish-ready" ||
			readiness.canStagePlacementDraft !== true ||
			readiness.canPublishPlacement !== true ||
			readiness.writesFiles !== true ||
			readiness.requiresAuthoringTransaction !== true)
	) {
		errors.push(
			`objectLibrary prefab entry "${entry.id}" placement readiness must be publish-ready through an authoring transaction.`,
		);
	}

	if (
		entry.kind === "asset" &&
		(readiness.status !== "replacement-only" ||
			readiness.canStagePlacementDraft !== false ||
			readiness.canPublishPlacement !== false ||
			readiness.writesFiles !== false ||
			readiness.requiresAuthoringTransaction !== false)
	) {
		errors.push(
			`objectLibrary asset entry "${entry.id}" placement readiness must be replacement-only.`,
		);
	}
}

function prefabGroupId(prefab: PrefabData): string {
	const components = prefab.components;
	const tags = new Set(prefab.tags ?? []);

	if (components.CharacterController !== undefined || prefab.id === "player") {
		return "prefabs:spawn";
	}

	if (components.FireflyPopulationMember !== undefined || tags.has("firefly")) {
		return "prefabs:npc";
	}

	if (
		components.WaterSurface !== undefined ||
		components.ReflectionProbe !== undefined ||
		tags.has("water") ||
		tags.has("environment")
	) {
		return "prefabs:environment";
	}

	if (components.Portal !== undefined) {
		return "prefabs:portals";
	}

	if (components.SoundEmitter !== undefined) {
		return "prefabs:audio";
	}

	if (components.Light !== undefined || tags.has("light")) {
		return "prefabs:lighting";
	}

	if (
		components.StoryNote !== undefined ||
		components.Collectible !== undefined
	) {
		return "prefabs:interactive";
	}

	if (
		components.TerrainChunkCell !== undefined ||
		components.TerrainSurface !== undefined ||
		tags.has("terrain")
	) {
		return "prefabs:terrain";
	}

	if (components.Collider !== undefined || components.RigidBody !== undefined) {
		return "prefabs:collision";
	}

	return "prefabs:props";
}

function assetGroupId(asset: AssetManifestEntryData): string {
	if (
		asset.kind === "cubemap" ||
		asset.kind === "video" ||
		asset.projection === "equirectangular"
	) {
		return "assets:environment";
	}

	switch (asset.kind) {
		case "audio":
			return "assets:audio";
		case "material":
			return "assets:materials";
		case "mesh":
			return "assets:meshes";
		case "texture":
			return "assets:textures";
		default:
			return "assets:data";
	}
}

function prefabPreview(
	prefab: PrefabData,
): EditorObjectLibraryEntry["preview"] {
	const renderable = asRecord(prefab.components.Renderable);
	const soundEmitter = asRecord(prefab.components.SoundEmitter);

	if (typeof soundEmitter?.soundId === "string") {
		return { kind: "audio", assetId: soundEmitter.soundId };
	}

	if (typeof renderable?.meshId === "string") {
		return { kind: "mesh", assetId: renderable.meshId };
	}

	if (prefab.components.WaterSurface !== undefined) {
		return { kind: "environment" };
	}

	if (prefab.components.Light !== undefined) {
		return { kind: "environment" };
	}

	return { kind: "data" };
}

function assetPreviewKind(
	asset: AssetManifestEntryData,
): EditorObjectLibraryPreviewKind {
	if (asset.kind === "audio") {
		return "audio";
	}

	if (asset.kind === "material") {
		return "material";
	}

	if (asset.kind === "mesh") {
		return "mesh";
	}

	if (
		asset.kind === "cubemap" ||
		asset.kind === "video" ||
		asset.projection === "equirectangular"
	) {
		return "environment";
	}

	if (asset.kind === "texture") {
		return "texture";
	}

	return "data";
}

function labelFromId(id: string): string {
	return id
		.split(/[_:-]+/g)
		.filter(Boolean)
		.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
		.join(" ");
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return cloneValue(value) as Record<string, unknown>;
}

function cloneValue<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}

	return value as Record<string, unknown>;
}
