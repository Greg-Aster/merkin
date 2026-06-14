import {
	type LevelEditorObjectEditPreviewPatchMessage,
	createObjectEditPreviewPatchMessage,
} from "../../engine/data/index.js";
import type { AssetManifestEntryData } from "../../engine/data/index.js";
import {
	type EditorObjectLibraryCatalog,
	type EditorObjectLibraryEntry,
	type EditorObjectLibraryGroup,
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

export type LevelEditorObjectLibraryPanelEntry = {
	readonly entry: EditorObjectLibraryEntry;
	readonly id: string;
	readonly label: string;
	readonly kind: EditorObjectLibraryEntry["kind"];
	readonly sourceOwner: string;
	readonly tags: readonly string[];
	readonly runtimeSceneIds: readonly string[];
	readonly preview: LevelEditorObjectLibraryPreviewModel;
	readonly replacementDraft: EditorObjectLibraryReplacementDraft | null;
	readonly unavailableReason: string | null;
	readonly canReplaceSelectedObject: boolean;
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
		readonly replaceableEntryCount: number;
		readonly stagedWritesFiles: false;
		readonly replacementMode: "preview-only";
	};
};

export function buildLevelEditorObjectLibraryPanelModel(options: {
	readonly runtimeSceneId: string;
	readonly levelId?: string;
	readonly selectedObject?: EditorObjectLibraryReplacementSubject | null;
	readonly selectedEntryId?: string | null;
	readonly catalog?: EditorObjectLibraryCatalog;
}): LevelEditorObjectLibraryPanelModel {
	const runtimeManifest = getRuntimeSceneManifest(options.runtimeSceneId);
	const levelId = options.levelId ?? runtimeManifest?.level.id ?? "unknown";
	const catalog = options.catalog ?? buildManifestBackedObjectLibrary();
	const selectedObject = options.selectedObject ?? null;
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
			replaceableEntryCount: entries.filter(
				(entry) => entry.canReplaceSelectedObject,
			).length,
			stagedWritesFiles: false,
			replacementMode: "preview-only",
		},
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

function panelEntryForObjectLibraryEntry(options: {
	readonly entry: EditorObjectLibraryEntry;
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly selectedObject: EditorObjectLibraryReplacementSubject | null;
	readonly assetsById: ReadonlyMap<string, AssetManifestEntryData>;
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

	return {
		entry: options.entry,
		id: options.entry.id,
		label: options.entry.label,
		kind: options.entry.kind,
		sourceOwner: options.entry.sourceOwner,
		tags: options.entry.tags,
		runtimeSceneIds: options.entry.runtimeSceneIds,
		preview: previewModelForEntry(options.entry, options.assetsById),
		replacementDraft,
		unavailableReason,
		canReplaceSelectedObject: replacementDraft !== null,
	};
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
