import {
	type LevelEditorObjectEditPreviewPatchMessage,
	type LevelPrefabInstanceData,
	createObjectEditPreviewPatchMessage,
} from "../../engine/data/index.js";
import type { AssetManifestEntryData } from "../../engine/data/index.js";
import type { LevelEditorAuthoringEditOperation } from "../../engine/data/levelAuthoring/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
import {
	type EditorObjectLibraryCatalog,
	type EditorObjectLibraryEntry,
	type EditorObjectLibraryGroup,
	type EditorObjectLibraryPlacementDraft,
	type EditorObjectLibraryPlacementReadiness,
	type EditorObjectLibraryPreviewKind,
	type EditorObjectLibraryReplacementDraft,
	type EditorObjectLibraryReplacementSubject,
	buildManifestBackedObjectLibrary,
	tryCreateObjectLibraryReplacementDraft,
} from "../../game/editor/objectLibrary/index.js";
import {
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
} from "../../game/levels/index.js";
import type { LevelEditorQueuedAuthoringOperation } from "./levelEditorAuthoringStore.js";

export type LevelEditorObjectLibraryPreviewMode =
	| "model"
	| "image"
	| "audio"
	| "material"
	| "environment"
	| "data"
	| "none";

export type LevelEditorObjectLibraryPreviewModel = {
	readonly kind: EditorObjectLibraryPreviewKind;
	readonly mode: LevelEditorObjectLibraryPreviewMode;
	readonly label: string;
	readonly assetId: string | null;
	readonly url: string | null;
	readonly swatchColor: string | null;
	readonly contract:
		| "asset-preview"
		| "model-preview-placeholder"
		| "no-preview";
};

export type LevelEditorObjectLibraryPlacementReadinessModel =
	EditorObjectLibraryPlacementReadiness & {
		readonly placementDraft: EditorObjectLibraryPlacementDraft | null;
	};

export type LevelEditorObjectLibraryUsageState = "used" | "unused";

export type LevelEditorObjectLibraryUsageObject = {
	readonly prefabId: string;
	readonly assetIds: readonly string[];
};

export type LevelEditorObjectLibraryPanelEntry = {
	readonly entry: EditorObjectLibraryEntry;
	readonly id: string;
	readonly label: string;
	readonly kind: EditorObjectLibraryEntry["kind"];
	readonly sourceOwner: string;
	readonly tags: readonly string[];
	readonly runtimeSceneIds: readonly string[];
	readonly preview: LevelEditorObjectLibraryPreviewModel;
	readonly placementReadiness: LevelEditorObjectLibraryPlacementReadinessModel;
	readonly canStagePlacementDraft: boolean;
	readonly canPublishPlacement: boolean;
	readonly replacementDraft: EditorObjectLibraryReplacementDraft | null;
	readonly unavailableReason: string | null;
	readonly canReplaceSelectedObject: boolean;
	readonly usageCount: number;
	readonly usageState: LevelEditorObjectLibraryUsageState;
};

export type LevelEditorObjectLibraryStagedPlacement = {
	readonly id: string;
	readonly stableId: string;
	readonly label: string;
	readonly draft: EditorObjectLibraryPlacementDraft;
	readonly operation: LevelEditorAuthoringEditOperation;
	readonly saveOperation: LevelEditorAuthoringOperationData;
};

export type LevelEditorObjectLibraryPanelGroup = Omit<
	EditorObjectLibraryGroup,
	"entries"
> & {
	readonly entries: readonly LevelEditorObjectLibraryPanelEntry[];
};

export type LevelEditorObjectLibraryPanelModel = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly selectedObjectPreview: LevelEditorObjectLibraryPreviewModel | null;
	readonly selectedEntryId: string | null;
	readonly groups: readonly LevelEditorObjectLibraryPanelGroup[];
	readonly selectedEntry: LevelEditorObjectLibraryPanelEntry | null;
	readonly replacementDraft: EditorObjectLibraryReplacementDraft | null;
	readonly summary: {
		readonly entryCount: number;
		readonly placeableDraftEntryCount: number;
		readonly publishablePlacementEntryCount: number;
		readonly replaceableEntryCount: number;
		readonly usedEntryCount: number;
		readonly unusedEntryCount: number;
		readonly stagedWritesFiles: false;
		readonly replacementMode: "preview-only";
	};
};

export type LevelEditorObjectLibraryPlacementSource =
	| "object-library-panel"
	| "viewport-placement-target"
	| "viewport-click"
	| "viewport-drop";

export function buildLevelEditorObjectLibraryPanelModel(options: {
	readonly runtimeSceneId: string;
	readonly levelId?: string;
	readonly selectedObject?: EditorObjectLibraryReplacementSubject | null;
	readonly selectedEntryId?: string | null;
	readonly sceneObjects?: readonly LevelEditorObjectLibraryUsageObject[];
	readonly catalog?: EditorObjectLibraryCatalog;
}): LevelEditorObjectLibraryPanelModel {
	const runtimeManifest = getRuntimeSceneManifest(options.runtimeSceneId);
	const levelId = options.levelId ?? runtimeManifest?.level.id ?? "unknown";
	const catalog = options.catalog ?? buildManifestBackedObjectLibrary();
	const selectedObject = options.selectedObject ?? null;
	const usageCounts = objectLibraryUsageCounts(options.sceneObjects ?? []);
	const assetsById = new Map(
		(runtimeManifest?.assets.assets ?? []).map((asset) => [asset.id, asset]),
	);
	const groups = catalog.groups
		.map((group) => {
			const entries = group.entries
				.filter((entry) =>
					entry.runtimeSceneIds.includes(options.runtimeSceneId),
				)
				.map((entry) =>
					panelEntryForObjectLibraryEntry({
						entry,
						runtimeSceneId: options.runtimeSceneId,
						levelId,
						selectedObject,
						assetsById,
						usageCounts,
					}),
				);

			return { ...group, entries };
		})
		.filter((group) => group.entries.length > 0);
	const entries = groups.flatMap((group) => group.entries);
	const selectedEntry =
		entries.find((entry) => entry.id === options.selectedEntryId) ??
		entries.find((entry) => entry.canReplaceSelectedObject) ??
		entries[0] ??
		null;

	return {
		schemaVersion: 1,
		runtimeSceneId: options.runtimeSceneId,
		levelId,
		selectedObject,
		selectedObjectPreview: selectedObject
			? previewModelForAssetIds(selectedObject.assetIds, assetsById)
			: null,
		selectedEntryId: selectedEntry?.id ?? null,
		groups,
		selectedEntry,
		replacementDraft: selectedEntry?.replacementDraft ?? null,
		summary: {
			entryCount: entries.length,
			placeableDraftEntryCount: entries.filter(
				(entry) => entry.canStagePlacementDraft,
			).length,
			publishablePlacementEntryCount: entries.filter(
				(entry) => entry.canPublishPlacement,
			).length,
			replaceableEntryCount: entries.filter(
				(entry) => entry.canReplaceSelectedObject,
			).length,
			usedEntryCount: entries.filter((entry) => entry.usageState === "used")
				.length,
			unusedEntryCount: entries.filter((entry) => entry.usageState === "unused")
				.length,
			stagedWritesFiles: false,
			replacementMode: "preview-only",
		},
	};
}

export function createObjectLibraryStagedPlacement(options: {
	readonly runtimeSceneId: string;
	readonly entry: LevelEditorObjectLibraryPanelEntry;
	readonly draft: EditorObjectLibraryPlacementDraft;
	readonly index: number;
	readonly source: LevelEditorObjectLibraryPlacementSource;
	readonly transform?: EditorObjectLibraryPlacementDraft["transform"];
}): LevelEditorObjectLibraryStagedPlacement {
	const stableId = stableIdForPlacementDraft(options.draft, options.index);
	const transform = options.transform ?? options.draft.transform;
	const instance = {
		id: stableId,
		stableId,
		prefabId: options.draft.prefabId,
		components: options.draft.componentOverrides,
		transform,
	} satisfies LevelPrefabInstanceData;
	const note =
		options.source === "viewport-placement-target"
			? "Object library placement draft staged from the viewport placement target."
			: options.source === "viewport-click"
				? "Object library placement draft staged from a viewport click point."
				: options.source === "viewport-drop"
					? "Object library placement draft staged from a viewport drop point."
					: "Object library placement draft staged from the editor panel.";
	const operation = {
		id: `object-library-placement:${options.runtimeSceneId}:${stableId}`,
		kind: "insert-instance",
		persistence: "saved",
		instance,
		note,
	} satisfies LevelEditorAuthoringEditOperation;
	const saveOperation = {
		kind: "insert-level-instance",
		ownerKind: "level",
		ownerTargetId: `${options.runtimeSceneId}:level`,
		subjectId: stableId,
		payload: {
			sourceOperationKind: options.draft.operation,
			entryId: options.entry.id,
			sourceOwner: options.entry.sourceOwner,
			placementDraft: options.draft,
			placementSource: options.source,
			instance,
		},
	} satisfies LevelEditorAuthoringOperationData;

	return {
		id: `${options.entry.id}:${stableId}`,
		stableId,
		label: options.entry.label,
		draft: options.draft,
		operation,
		saveOperation,
	};
}

export function editOperationForReplacementDraft(
	draft: EditorObjectLibraryReplacementDraft,
): LevelEditorAuthoringEditOperation | null {
	if (draft.replacementKind === "replace-level-instance-prefab") {
		if (draft.replacement.prefabId === undefined) {
			return null;
		}

		return {
			id: `object-library:${draft.sourcePlanHash}:replace-prefab`,
			kind: "replace-prefab",
			persistence: "saved",
			stableId: draft.selectedObject.stableId,
			prefabId: draft.replacement.prefabId,
			note: "Object library replacement staged from the editor panel.",
		} satisfies LevelEditorAuthoringEditOperation;
	}

	const componentName = stringValue(
		draft.authoringOperation.payload.componentName,
	);
	const patch = recordValue(draft.authoringOperation.payload.patch);

	if (componentName === null || patch === null) {
		return null;
	}

	return {
		id: `object-library:${draft.sourcePlanHash}:${componentName}`,
		kind: "set-component",
		persistence: "saved",
		stableId: draft.selectedObject.stableId,
		target: "level-instance",
		componentName,
		value: patch,
		note: "Object library asset replacement staged from the editor panel.",
	} satisfies LevelEditorAuthoringEditOperation;
}

export function saveOperationForReplacementDraft(
	draft: EditorObjectLibraryReplacementDraft,
): LevelEditorAuthoringOperationData {
	const operation = draft.authoringOperation;
	const kind =
		operation.kind === "replace-component-asset-reference"
			? "replace-level-instance"
			: operation.kind;

	return {
		kind,
		ownerKind: operation.ownerKind,
		ownerTargetId: operation.ownerTargetId,
		subjectId: operation.subjectStableId,
		payload: {
			...operation.payload,
			sourceOperationKind: operation.kind,
			replacementKind: draft.replacementKind,
			replacement: draft.replacement,
			sourcePlanHash: draft.sourcePlanHash,
		},
	} satisfies LevelEditorAuthoringOperationData;
}

export function createObjectLibraryReplacementQueueEntry(options: {
	readonly runtimeSceneId: string;
	readonly drafts: readonly EditorObjectLibraryReplacementDraft[];
	readonly id?: string;
	readonly label?: string;
}): LevelEditorQueuedAuthoringOperation | null {
	if (options.drafts.length === 0) {
		return null;
	}

	const operations = options.drafts.flatMap((draft) => {
		const operation = editOperationForReplacementDraft(draft);
		return operation === null ? [] : [operation];
	});
	const saveOperations = options.drafts.map(saveOperationForReplacementDraft);

	return {
		id: options.id ?? `object-library-replacements:${options.runtimeSceneId}`,
		label: options.label ?? "Object library replacements",
		...(operations.length === 0 ? {} : { operations }),
		saveOperations,
	};
}

export function createObjectLibraryReplacementPreviewMessage(options: {
	readonly requestId: string;
	readonly draft: EditorObjectLibraryReplacementDraft;
}): LevelEditorObjectEditPreviewPatchMessage {
	return createObjectEditPreviewPatchMessage({
		requestId: options.requestId,
		patch: options.draft.previewPatch,
	});
}

export function objectLibrarySubjectFromSelection(options: {
	readonly stableId: string;
	readonly label?: string;
	readonly prefabId: string;
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly assetIds: readonly string[];
	readonly currentRenderable?: EditorObjectLibraryReplacementSubject["currentRenderable"];
	readonly currentSoundEmitter?: EditorObjectLibraryReplacementSubject["currentSoundEmitter"];
}): EditorObjectLibraryReplacementSubject {
	return {
		stableId: options.stableId,
		label: options.label ?? options.stableId,
		currentPrefabId: options.prefabId,
		sourceOwner: options.sourceOwner,
		componentNames: [...options.componentNames].sort(),
		assetIds: [...options.assetIds].sort(),
		...(options.currentRenderable === undefined
			? {}
			: { currentRenderable: options.currentRenderable }),
		...(options.currentSoundEmitter === undefined
			? {}
			: { currentSoundEmitter: options.currentSoundEmitter }),
	};
}

function stableIdForPlacementDraft(
	draft: EditorObjectLibraryPlacementDraft,
	index: number,
): string {
	const slug = `draft-${index}`;

	return draft.stableIdPattern
		.replace("{prefabId}", draft.prefabId)
		.replace("{slug}", slug)
		.replace(/[^a-zA-Z0-9:_-]+/g, "-")
		.replace(/-+/g, "-");
}

function panelEntryForObjectLibraryEntry(options: {
	readonly entry: EditorObjectLibraryEntry;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly assetsById: ReadonlyMap<string, AssetManifestEntryData>;
	readonly usageCounts: {
		readonly prefabs: ReadonlyMap<string, number>;
		readonly assets: ReadonlyMap<string, number>;
	};
}): LevelEditorObjectLibraryPanelEntry {
	const replacementResult = options.selectedObject
		? tryCreateObjectLibraryReplacementDraft({
				runtimeSceneId: options.runtimeSceneId,
				levelId: options.levelId,
				selectedObject: options.selectedObject,
				replacementEntry: options.entry,
				manifests: defaultRuntimeSceneManifests,
			})
		: undefined;
	const replacementDraft =
		replacementResult?.ok === true ? replacementResult.draft : null;
	const unavailableReason =
		options.selectedObject === null
			? "No selected object"
			: replacementResult?.ok === false
				? replacementResult.errors.join(" ")
				: null;
	const usageCount = usageCountForObjectLibraryEntry(
		options.entry,
		options.usageCounts,
	);

	return {
		entry: options.entry,
		id: options.entry.id,
		label: options.entry.label,
		kind: options.entry.kind,
		sourceOwner: options.entry.sourceOwner,
		tags: options.entry.tags,
		runtimeSceneIds: options.entry.runtimeSceneIds,
		preview: previewModelForEntry(options.entry, options.assetsById),
		placementReadiness: {
			...options.entry.placementReadiness,
			placementDraft: placementDraftForCurrentLevel(
				options.entry.placement ?? null,
				options.levelId,
			),
		},
		canStagePlacementDraft:
			options.entry.placementReadiness.canStagePlacementDraft,
		canPublishPlacement: options.entry.placementReadiness.canPublishPlacement,
		replacementDraft,
		unavailableReason,
		canReplaceSelectedObject: replacementDraft !== null,
		usageCount,
		usageState: usageCount > 0 ? "used" : "unused",
	};
}

function placementDraftForCurrentLevel(
	draft: EditorObjectLibraryPlacementDraft | null,
	levelId: string,
): EditorObjectLibraryPlacementDraft | null {
	if (draft === null) {
		return null;
	}

	return {
		...draft,
		stableIdPattern: `${levelId}:{prefabId}:{slug}`,
	};
}

function objectLibraryUsageCounts(
	objects: readonly LevelEditorObjectLibraryUsageObject[],
): {
	readonly prefabs: ReadonlyMap<string, number>;
	readonly assets: ReadonlyMap<string, number>;
} {
	return {
		prefabs: countBy(objects.map((object) => object.prefabId)),
		assets: countBy(objects.flatMap((object) => object.assetIds)),
	};
}

function usageCountForObjectLibraryEntry(
	entry: EditorObjectLibraryEntry,
	usageCounts: {
		readonly prefabs: ReadonlyMap<string, number>;
		readonly assets: ReadonlyMap<string, number>;
	},
): number {
	if (entry.prefabId) {
		return usageCounts.prefabs.get(entry.prefabId) ?? 0;
	}

	if (entry.assetId) {
		return usageCounts.assets.get(entry.assetId) ?? 0;
	}

	return (entry.assetIds ?? []).reduce(
		(count, assetId) => count + (usageCounts.assets.get(assetId) ?? 0),
		0,
	);
}

function countBy(values: readonly string[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();

	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return counts;
}

function stringValue(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function previewModelForEntry(
	entry: EditorObjectLibraryEntry,
	assetsById: ReadonlyMap<string, AssetManifestEntryData>,
): LevelEditorObjectLibraryPreviewModel {
	const asset = entry.preview.assetId
		? assetsById.get(entry.preview.assetId)
		: entry.assetId
			? assetsById.get(entry.assetId)
			: undefined;

	if (asset) {
		return previewModelForAsset(asset);
	}

	return {
		kind: entry.preview.kind,
		mode: entry.preview.kind === "mesh" ? "model" : "data",
		label: entry.label,
		assetId: entry.preview.assetId ?? entry.assetId ?? null,
		url: entry.preview.url ?? null,
		swatchColor: null,
		contract:
			entry.preview.kind === "mesh"
				? "model-preview-placeholder"
				: "no-preview",
	};
}

function previewModelForAssetIds(
	assetIds: readonly string[],
	assetsById: ReadonlyMap<string, AssetManifestEntryData>,
): LevelEditorObjectLibraryPreviewModel | null {
	const assets = assetIds
		.map((assetId) => assetsById.get(assetId))
		.filter(
			(candidate): candidate is AssetManifestEntryData =>
				candidate !== undefined,
		);
	const asset = [
		"mesh",
		"texture",
		"cubemap",
		"video",
		"material",
		"audio",
		"data",
		"scene",
		"animation",
		"prefab",
	].flatMap((kind) => assets.filter((candidate) => candidate.kind === kind))[0];

	return asset ? previewModelForAsset(asset) : null;
}

function previewModelForAsset(
	asset: AssetManifestEntryData,
): LevelEditorObjectLibraryPreviewModel {
	const mode = previewModeForAsset(asset);

	return {
		kind: assetPreviewKind(asset),
		mode,
		label: asset.id,
		assetId: asset.id,
		url: asset.faces?.px ?? asset.url ?? null,
		swatchColor: asset.material?.color ?? null,
		contract: mode === "model" ? "model-preview-placeholder" : "asset-preview",
	};
}

function previewModeForAsset(
	asset: AssetManifestEntryData,
): LevelEditorObjectLibraryPreviewMode {
	switch (asset.kind) {
		case "mesh":
			return "model";
		case "texture":
		case "cubemap":
		case "video":
			return "image";
		case "audio":
			return "audio";
		case "material":
			return "material";
		case "data":
		case "scene":
		case "animation":
		case "prefab":
			return "data";
	}
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
