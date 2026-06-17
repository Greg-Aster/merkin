import type {
	AssetManifestEntryData,
	LevelPrefabInstanceData,
	PrefabData,
	RuntimeSceneManifestData,
} from "../../engine/data/index.js";
import {
	validateRuntimeSceneContentGraph,
	validateRuntimeSceneManifest,
} from "../../engine/data/index.js";
import {
	type LevelEditorAuthoringDocumentProvenance,
	projectRuntimeSceneManifestToAuthoringDocument,
	validateLevelEditorAuthoringDocument,
} from "../../engine/data/levelAuthoring/index.js";
import { parseAudioContentManifest } from "../../engine/modules/audio/index.js";
import { audioContentManifestForRuntimeScene } from "../../game/assets/index.js";
import {
	type LevelEditorOwnerRegistry,
	type LevelEditorOwnerTarget,
	buildLevelEditorOwnerRegistry,
} from "../../game/editor/authoring/ownerRegistry.js";
import {
	type EditorBuildPublishPlan,
	buildEditorBuildPublishPlan,
	validateEditorBuildPublishPlan,
} from "../../game/editor/buildPublish/index.js";
import {
	defaultRuntimeSceneManifest,
	defaultRuntimeSceneManifests,
	getRuntimeSceneManifest,
} from "../../game/levels/index.js";

export type LevelEditorWorkspaceCategory =
	| "spawn"
	| "terrain"
	| "collision"
	| "lights"
	| "portals"
	| "audio"
	| "story"
	| "props";

export type LevelEditorWorkspaceCapability =
	| "previewable"
	| "editable"
	| "read-only"
	| "bake-only";

export type LevelEditorWorkspacePreviewTargetKind =
	| "light"
	| "spawn"
	| "portal"
	| "audio-emitter";

export type LevelEditorWorkspaceField = {
	readonly path: string;
	readonly label: string;
	readonly value: string | number | boolean;
	readonly input: "text" | "number" | "color" | "checkbox";
	readonly step?: string;
	readonly min?: string;
	readonly readOnly: boolean;
};

export type LevelEditorWorkspaceObject = {
	readonly id: string;
	readonly stableId: string;
	readonly prefabId: string;
	readonly label: string;
	readonly category: LevelEditorWorkspaceCategory;
	readonly sourceOwner: string;
	readonly assetIds: readonly string[];
	readonly componentNames: readonly string[];
	readonly capabilities: readonly LevelEditorWorkspaceCapability[];
	readonly capabilityReason: string;
	readonly fields: readonly LevelEditorWorkspaceField[];
	readonly preview: LevelEditorWorkspaceSelectedObjectPreview;
	readonly previewTargetKind?: LevelEditorWorkspacePreviewTargetKind;
	readonly previewSeed?: Record<string, unknown>;
};

export type LevelEditorWorkspaceTreeGroup = {
	readonly category: LevelEditorWorkspaceCategory;
	readonly label: string;
	readonly objects: readonly LevelEditorWorkspaceObject[];
};

export type LevelEditorWorkspaceGraphNode = {
	readonly id: string;
	readonly label: string;
	readonly kind: "data" | "validation" | "runtime" | "editor";
	readonly status: "ready" | "preview-only" | "read-only" | "bake";
	readonly count?: number;
	readonly selected?: boolean;
};

export type LevelEditorWorkspaceGraphEdge = {
	readonly from: string;
	readonly to: string;
	readonly label: string;
};

export type LevelEditorWorkspaceLevelItem = {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourceKind: RuntimeSceneManifestData["source"]["kind"];
	readonly sourceId: string;
	readonly objectCount: number;
	readonly assetCount: number;
	readonly requiredAssetCount: number;
	readonly terrainPackageCount: number;
};

export type LevelEditorWorkspacePreviewMode =
	| "model"
	| "image"
	| "audio"
	| "material"
	| "data"
	| "none";

export type LevelEditorWorkspaceAssetPreview = {
	readonly assetId: string;
	readonly kind: AssetManifestEntryData["kind"];
	readonly url: string;
	readonly label: string;
	readonly mode: LevelEditorWorkspacePreviewMode;
	readonly swatchColor: string | null;
	readonly tags: readonly string[];
};

export type LevelEditorWorkspaceSelectedObjectPreview = {
	readonly title: string;
	readonly subtitle: string;
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly assetIds: readonly string[];
	readonly primaryAsset: LevelEditorWorkspaceAssetPreview | null;
};

export type LevelEditorWorkspaceLibraryItem = {
	readonly id: string;
	readonly label: string;
	readonly kind: "prefab" | AssetManifestEntryData["kind"];
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly assetIds: readonly string[];
	readonly tags: readonly string[];
	readonly usageCount: number;
	readonly preview: LevelEditorWorkspaceAssetPreview | null;
};

export type LevelEditorWorkspaceLibraryGroup = {
	readonly id: string;
	readonly label: string;
	readonly items: readonly LevelEditorWorkspaceLibraryItem[];
};

export type LevelEditorWorkspaceCommandId =
	| "save"
	| "save-level"
	| "discard"
	| "build"
	| "publish";

export type LevelEditorWorkspaceCommand = {
	readonly id: LevelEditorWorkspaceCommandId;
	readonly label: string;
	readonly enabled: boolean;
	readonly requiresDirty: boolean;
	readonly blocksDirty: boolean;
	readonly operation:
		| "authoring-transaction"
		| "owner-write"
		| "publish-owner-write"
		| "clear-staged-preview"
		| "build-plan"
		| "publish-plan";
	readonly reason: string;
};

export type LevelEditorWorkspaceOutputLogEntry = {
	readonly id: string;
	readonly level: "info" | "success" | "warning" | "error";
	readonly source: string;
	readonly message: string;
};

export type LevelEditorValidationReportCategory =
	| "stable-id"
	| "owner-provenance"
	| "reference-integrity"
	| "readiness"
	| "render-budget"
	| "terrain"
	| "audio-content"
	| "unsupported-field"
	| "runtime-scene-schema"
	| "content-graph";

export type LevelEditorValidationReportItem = {
	readonly id: string;
	readonly severity: "error" | "warning";
	readonly category: LevelEditorValidationReportCategory;
	readonly source:
		| "runtime-scene-manifest"
		| "content-graph"
		| "authoring-provenance"
		| "workspace-model";
	readonly message: string;
	readonly blocksPublish: boolean;
};

export type LevelEditorValidationReport = {
	readonly schemaVersion: 1;
	readonly runtimeSceneId: string;
	readonly generatedFrom: readonly string[];
	readonly items: readonly LevelEditorValidationReportItem[];
	readonly errorCount: number;
	readonly warningCount: number;
	readonly blocksPublish: boolean;
};

export type LevelEditorWorkspaceAuthoringSaveTarget = {
	readonly id: string;
	readonly targetFile: string;
	readonly ownerExport: string;
	readonly writeStrategy: string;
};

export type LevelEditorWorkspaceAuthoringState = {
	readonly status: "ready" | "blocked";
	readonly documentContentHash: string | null;
	readonly sourceManifestContentHash: string | null;
	readonly recordCount: number;
	readonly ownerTargetCount: number;
	readonly writableTargetCount: number;
	readonly saveTarget: LevelEditorWorkspaceAuthoringSaveTarget | null;
	readonly errors: readonly string[];
};

export type LevelEditorWorkspaceCommandPlanStep = {
	readonly id: string;
	readonly label: string;
	readonly phase: string;
	readonly commandKind: "package-script" | "manual";
	readonly scriptName?: string;
	readonly command?: string;
	readonly action?: string;
	readonly writesAuthoredSource: boolean;
	readonly productionBuildStep: boolean;
};

export type LevelEditorWorkspaceCommandPlan = {
	readonly mode: "build" | "publish-local";
	readonly label: string;
	readonly localOnly: true;
	readonly productionBuildHasHiddenCook: false;
	readonly stepCount: number;
	readonly steps: readonly LevelEditorWorkspaceCommandPlanStep[];
	readonly errors: readonly string[];
};

export type LevelEditorWorkspaceModel = {
	readonly schemaVersion: 1;
	readonly selectedRuntimeSceneId: string;
	readonly selectedLevelId: string;
	readonly selectedStableId: string | null;
	readonly levelBrowser: readonly LevelEditorWorkspaceLevelItem[];
	readonly sceneTree: readonly LevelEditorWorkspaceTreeGroup[];
	readonly objects: readonly LevelEditorWorkspaceObject[];
	readonly objectLibrary: readonly LevelEditorWorkspaceLibraryGroup[];
	readonly graph: {
		readonly nodes: readonly LevelEditorWorkspaceGraphNode[];
		readonly edges: readonly LevelEditorWorkspaceGraphEdge[];
	};
	readonly validation: {
		readonly errors: readonly string[];
		readonly warnings: readonly string[];
	};
	readonly validationReport: LevelEditorValidationReport;
	readonly routes: {
		readonly editor: "/editor/";
		readonly liveGame: "/";
	};
	readonly commands: readonly LevelEditorWorkspaceCommand[];
	readonly authoring: LevelEditorWorkspaceAuthoringState;
	readonly commandPlans: {
		readonly build: LevelEditorWorkspaceCommandPlan;
		readonly publish: LevelEditorWorkspaceCommandPlan;
	};
	readonly outputLog: readonly LevelEditorWorkspaceOutputLogEntry[];
	readonly persistence: {
		readonly mode: "explicit-authoring-save";
		readonly writesFiles: false;
		readonly saveOwner: "generated-authoring-transaction";
		readonly bakeOwner: "contract-cli";
	};
};

const categoryLabels: Record<LevelEditorWorkspaceCategory, string> = {
	spawn: "Spawn",
	terrain: "Terrain",
	collision: "Collision",
	lights: "Lights",
	portals: "Portals",
	audio: "Audio Emitters",
	story: "Story",
	props: "Props",
};

export function buildLevelEditorWorkspaceModel(
	options: {
		readonly selectedRuntimeSceneId?: string;
		readonly selectedStableId?: string;
	} = {},
): LevelEditorWorkspaceModel {
	const selectedManifest =
		getRuntimeSceneManifest(
			options.selectedRuntimeSceneId ?? defaultRuntimeSceneManifest.id,
		) ?? defaultRuntimeSceneManifest;
	const objects = buildWorkspaceObjects(selectedManifest);
	const selectedStableId =
		options.selectedStableId ??
		selectedManifest.readiness.playerStableId ??
		objects[0]?.stableId ??
		null;
	const authoring = buildWorkspaceAuthoringState(selectedManifest);
	const commandPlans = buildWorkspaceCommandPlans(selectedManifest);
	const validationReport = buildLevelEditorValidationReport({
		manifest: selectedManifest,
		objects,
		authoring,
	});
	const validation = summarizeValidationReport(validationReport);

	return {
		schemaVersion: 1,
		selectedRuntimeSceneId: selectedManifest.id,
		selectedLevelId: selectedManifest.level.id,
		selectedStableId,
		levelBrowser: defaultRuntimeSceneManifests.map(levelBrowserItem),
		sceneTree: buildSceneTree(objects),
		objects,
		objectLibrary: buildObjectLibrary(selectedManifest, objects),
		graph: buildEngineGraph(selectedManifest, objects, selectedStableId),
		validation,
		validationReport,
		routes: {
			editor: "/editor/",
			liveGame: "/",
		},
		commands: workspaceCommands({ authoring, commandPlans, validation }),
		authoring,
		commandPlans,
		outputLog: buildInitialOutputLog({
			manifest: selectedManifest,
			validationReport,
			authoring,
			commandPlans,
		}),
		persistence: {
			mode: "explicit-authoring-save",
			writesFiles: false,
			saveOwner: "generated-authoring-transaction",
			bakeOwner: "contract-cli",
		},
	};
}

function levelBrowserItem(
	manifest: RuntimeSceneManifestData,
): LevelEditorWorkspaceLevelItem {
	return {
		runtimeSceneId: manifest.id,
		levelId: manifest.level.id,
		sourceKind: manifest.source.kind,
		sourceId: manifest.source.id,
		objectCount: manifest.level.instances.length,
		assetCount: manifest.assets.assets.length,
		requiredAssetCount: manifest.readiness.requiredAssetIds?.length ?? 0,
		terrainPackageCount: manifest.terrainPackages?.length ?? 0,
	};
}

function buildWorkspaceObjects(
	manifest: RuntimeSceneManifestData,
): readonly LevelEditorWorkspaceObject[] {
	const assetsById = new Map(
		manifest.assets.assets.map((asset) => [asset.id, asset]),
	);
	const prefabsById = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab]),
	);
	const terrainStableIds = new Set(
		(manifest.terrainPackages ?? []).flatMap((terrainPackage) =>
			terrainPackage.chunks.map((chunk) => chunk.stableId),
		),
	);

	return manifest.level.instances.map((instance) => {
		const prefab = prefabsById.get(instance.prefabId);
		const components = mergeInstanceComponents(prefab, instance);
		const componentNames = Object.keys(components).sort();
		const category = objectCategory({
			instance,
			components,
			manifest,
			terrainStableIds,
		});
		const previewTargetKind = previewTargetKindForCategory(category);
		const capabilities = capabilitiesForCategory(category);
		const assetIds = objectAssetIds(prefab, components, assetsById);
		const sourceOwner = `level:${manifest.level.id} prefab:${instance.prefabId}`;
		const label = objectLabel(instance, components);

		return {
			id: instance.id,
			stableId: instance.stableId,
			prefabId: instance.prefabId,
			label,
			category,
			sourceOwner,
			assetIds,
			componentNames,
			capabilities,
			capabilityReason: capabilityReason(category),
			fields: inspectorFieldsForObject(category, components),
			preview: selectedObjectPreview({
				label,
				stableId: instance.stableId,
				sourceOwner,
				componentNames,
				assetIds,
				assetsById,
			}),
			...(previewTargetKind === undefined
				? {}
				: {
						previewTargetKind,
						previewSeed: previewSeedForObject(previewTargetKind, components),
					}),
		};
	});
}

function buildSceneTree(
	objects: readonly LevelEditorWorkspaceObject[],
): readonly LevelEditorWorkspaceTreeGroup[] {
	const categories = Object.keys(
		categoryLabels,
	) as LevelEditorWorkspaceCategory[];

	return categories
		.map((category) => ({
			category,
			label: categoryLabels[category],
			objects: objects.filter((object) => object.category === category),
		}))
		.filter((group) => group.objects.length > 0);
}

function buildObjectLibrary(
	manifest: RuntimeSceneManifestData,
	objects: readonly LevelEditorWorkspaceObject[],
): readonly LevelEditorWorkspaceLibraryGroup[] {
	const assetsById = new Map(
		manifest.assets.assets.map((asset) => [asset.id, asset]),
	);
	const prefabUsageCount = countBy(objects.map((object) => object.prefabId));
	const assetUsageCount = countBy(objects.flatMap((object) => object.assetIds));
	const prefabItems = manifest.prefabs.map((prefab) => {
		const assetIds = objectAssetIds(prefab, prefab.components, assetsById);

		return {
			id: `prefab:${prefab.id}`,
			label: prefab.id,
			kind: "prefab",
			sourceOwner: `prefab:${prefab.id}`,
			componentNames: Object.keys(prefab.components).sort(),
			assetIds,
			tags: prefab.tags ?? [],
			usageCount: prefabUsageCount.get(prefab.id) ?? 0,
			preview: previewAssetForIds(assetIds, assetsById),
		} satisfies LevelEditorWorkspaceLibraryItem;
	});
	const assetGroups = new Map<
		AssetManifestEntryData["kind"],
		LevelEditorWorkspaceLibraryItem[]
	>();

	for (const asset of manifest.assets.assets) {
		const item = {
			id: `asset:${asset.id}`,
			label: asset.id,
			kind: asset.kind,
			sourceOwner: `asset:${asset.id}`,
			componentNames: [],
			assetIds: [asset.id],
			tags: asset.tags ?? [],
			usageCount: assetUsageCount.get(asset.id) ?? 0,
			preview: assetPreview(asset),
		} satisfies LevelEditorWorkspaceLibraryItem;
		const items = assetGroups.get(asset.kind) ?? [];
		items.push(item);
		assetGroups.set(asset.kind, items);
	}

	return [
		{
			id: "prefabs",
			label: "Prefabs",
			items: prefabItems.sort(compareLibraryItems),
		},
		...[...assetGroups.entries()]
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([kind, items]) => ({
				id: `assets:${kind}`,
				label: `${titleCase(kind)} Assets`,
				items: items.sort(compareLibraryItems),
			})),
	].filter((group) => group.items.length > 0);
}

function buildEngineGraph(
	manifest: RuntimeSceneManifestData,
	objects: readonly LevelEditorWorkspaceObject[],
	selectedStableId: string | null,
): LevelEditorWorkspaceModel["graph"] {
	const count = (category: LevelEditorWorkspaceCategory) =>
		objects.filter((object) => object.category === category).length;

	return {
		nodes: [
			{
				id: "level-assets",
				label: "Level Assets",
				kind: "data",
				status: "ready",
				count: manifest.assets.assets.length,
			},
			{
				id: "authored-level",
				label: "Authored Level Manifest",
				kind: "data",
				status: "ready",
				count: objects.length,
			},
			{
				id: "content-graph",
				label: "Content Graph Validation",
				kind: "validation",
				status: "ready",
			},
			{
				id: "runtime-manifest",
				label: "Runtime Scene Manifest",
				kind: "runtime",
				status: "ready",
			},
			{
				id: "readiness",
				label: "Readiness Gate",
				kind: "validation",
				status: "ready",
			},
			{
				id: "live-runtime",
				label: "Live Game Runtime",
				kind: "runtime",
				status: "preview-only",
			},
			{
				id: "preview-channel",
				label: "Dev Preview Channel",
				kind: "editor",
				status: "preview-only",
			},
			graphCategoryNode("spawn", count("spawn"), selectedStableId, objects),
			graphCategoryNode(
				"collision",
				count("collision"),
				selectedStableId,
				objects,
			),
			graphCategoryNode("lights", count("lights"), selectedStableId, objects),
			graphCategoryNode("portals", count("portals"), selectedStableId, objects),
			graphCategoryNode("audio", count("audio"), selectedStableId, objects),
			graphCategoryNode("terrain", count("terrain"), selectedStableId, objects),
		],
		edges: [
			{ from: "level-assets", to: "authored-level", label: "referenced by" },
			{ from: "authored-level", to: "content-graph", label: "validated by" },
			{ from: "content-graph", to: "runtime-manifest", label: "loads as" },
			{ from: "runtime-manifest", to: "readiness", label: "gated by" },
			{ from: "readiness", to: "live-runtime", label: "activates" },
			{
				from: "preview-channel",
				to: "live-runtime",
				label: "temporary patches",
			},
		],
	};
}

function graphCategoryNode(
	category: LevelEditorWorkspaceCategory,
	count: number,
	selectedStableId: string | null,
	objects: readonly LevelEditorWorkspaceObject[],
): LevelEditorWorkspaceGraphNode {
	const selectedObject = objects.find(
		(object) => object.stableId === selectedStableId,
	);

	return {
		id: `category:${category}`,
		label: categoryLabels[category],
		kind:
			category === "terrain" || category === "collision" ? "data" : "editor",
		status: category === "terrain" ? "bake" : "preview-only",
		count,
		selected: selectedObject?.category === category,
	};
}

export function buildLevelEditorValidationReport(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly objects?: readonly LevelEditorWorkspaceObject[];
	readonly authoring?: LevelEditorWorkspaceAuthoringState;
}): LevelEditorValidationReport {
	const items: LevelEditorValidationReportItem[] = [];
	const seenIds = new Set<string>();
	const runtimeSceneIds = defaultRuntimeSceneManifests.map(
		(manifest) => manifest.id,
	);

	for (const message of validateRuntimeSceneManifest(options.manifest)) {
		addValidationReportItem(items, seenIds, {
			severity: "error",
			source: "runtime-scene-manifest",
			category: categoryForValidationMessage("runtime-scene-manifest", message),
			message,
		});
	}

	try {
		const audioContent = parseAudioContentManifest(
			audioContentManifestForRuntimeScene(options.manifest.id),
			{ assetManifest: options.manifest.assets },
		);
		const contentGraphValidation = validateRuntimeSceneContentGraph({
			manifest: options.manifest,
			runtimeSceneIds,
			audioContent,
		});

		if (!contentGraphValidation.ok) {
			for (const message of contentGraphValidation.errors) {
				addValidationReportItem(items, seenIds, {
					severity: "error",
					source: "content-graph",
					category: categoryForValidationMessage("content-graph", message),
					message,
				});
			}
		}
	} catch (error) {
		addValidationReportItem(items, seenIds, {
			severity: "error",
			source: "content-graph",
			category: "audio-content",
			message: error instanceof Error ? error.message : String(error),
		});
	}

	for (const message of options.authoring?.errors ?? []) {
		addValidationReportItem(items, seenIds, {
			severity: "error",
			source: "authoring-provenance",
			category: categoryForValidationMessage("authoring-provenance", message),
			message,
		});
	}

	for (const message of workspaceValidationWarnings(options.objects ?? [])) {
		addValidationReportItem(items, seenIds, {
			severity: "warning",
			source: "workspace-model",
			category: categoryForValidationMessage("workspace-model", message),
			message,
		});
	}

	const errorCount = items.filter((item) => item.severity === "error").length;
	const warningCount = items.filter(
		(item) => item.severity === "warning",
	).length;

	return {
		schemaVersion: 1,
		runtimeSceneId: options.manifest.id,
		generatedFrom: [
			"validateRuntimeSceneManifest",
			"validateRuntimeSceneContentGraph",
			"validateLevelEditorAuthoringDocument",
			"levelEditorWorkspaceModel",
		],
		items,
		errorCount,
		warningCount,
		blocksPublish: errorCount > 0,
	};
}

function summarizeValidationReport(
	report: LevelEditorValidationReport,
): LevelEditorWorkspaceModel["validation"] {
	return {
		errors: report.items
			.filter((item) => item.severity === "error")
			.map((item) => item.message),
		warnings: report.items
			.filter((item) => item.severity === "warning")
			.map((item) => item.message),
	};
}

function addValidationReportItem(
	items: LevelEditorValidationReportItem[],
	seenIds: Set<string>,
	item: Omit<LevelEditorValidationReportItem, "id" | "blocksPublish">,
): void {
	const baseId = [
		item.source,
		item.category,
		slugifyValidationId(item.message),
	].join(":");
	let id = baseId;
	let suffix = 2;

	while (seenIds.has(id)) {
		id = `${baseId}:${suffix}`;
		suffix += 1;
	}

	seenIds.add(id);
	items.push({
		id,
		...item,
		blocksPublish: item.severity === "error",
	});
}

function categoryForValidationMessage(
	source: LevelEditorValidationReportItem["source"],
	message: string,
): LevelEditorValidationReportCategory {
	const normalized = message.toLowerCase();

	if (normalized.includes("owner") || normalized.includes("provenance")) {
		return "owner-provenance";
	}

	if (normalized.includes("duplicate stable id")) {
		return "stable-id";
	}

	if (normalized.includes("readiness")) {
		return "readiness";
	}

	if (
		normalized.includes("terrain package") ||
		normalized.includes("terrain")
	) {
		return "terrain";
	}

	if (normalized.includes("lighting.budget")) {
		return "render-budget";
	}

	if (
		normalized.includes("unknown asset") ||
		normalized.includes("unknown prefab") ||
		normalized.includes("targetruntimesceneid") ||
		normalized.includes("not in the runtime scene catalog") ||
		normalized.includes("dangling")
	) {
		return "reference-integrity";
	}

	if (
		normalized.includes("audio") ||
		normalized.includes("sound") ||
		normalized.includes("music")
	) {
		return "audio-content";
	}

	if (
		normalized.includes("unsupported") ||
		normalized.includes("read-only") ||
		normalized.includes("bake-only")
	) {
		return "unsupported-field";
	}

	return source === "runtime-scene-manifest"
		? "runtime-scene-schema"
		: "content-graph";
}

function workspaceValidationWarnings(
	objects: readonly LevelEditorWorkspaceObject[],
): readonly string[] {
	const warnings: string[] = [];
	const terrainCount = objects.filter(
		(object) => object.category === "terrain",
	).length;
	const bakeOnlyCount = objects.filter((object) =>
		object.capabilities.includes("bake-only"),
	).length;
	const readOnlyCount = objects.filter(
		(object) =>
			object.capabilities.includes("read-only") &&
			!object.capabilities.includes("editable"),
	).length;

	if (terrainCount > 0) {
		warnings.push(
			`${terrainCount} terrain workspace objects are bake-only and must publish through their cook/drift contract.`,
		);
	} else if (bakeOnlyCount > 0) {
		warnings.push(
			`${bakeOnlyCount} workspace objects are bake-only and must publish through their owner contract.`,
		);
	}

	if (readOnlyCount > 0) {
		warnings.push(
			`${readOnlyCount} workspace objects expose read-only fields; unsupported staged fields are refused before publish.`,
		);
	}

	return warnings;
}

function slugifyValidationId(message: string): string {
	const slug = message
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 96);

	return slug.length === 0 ? "item" : slug;
}

function objectCategory(options: {
	readonly instance: LevelPrefabInstanceData;
	readonly components: Record<string, unknown>;
	readonly manifest: RuntimeSceneManifestData;
	readonly terrainStableIds: ReadonlySet<string>;
}): LevelEditorWorkspaceCategory {
	const { instance, components, manifest, terrainStableIds } = options;

	if (
		instance.stableId === manifest.readiness.playerStableId ||
		components.CharacterController !== undefined ||
		instance.prefabId === "player"
	) {
		return "spawn";
	}

	if (
		terrainStableIds.has(instance.stableId) ||
		components.TerrainChunkCell !== undefined ||
		components.TerrainSurface !== undefined
	) {
		return "terrain";
	}

	if (components.Portal !== undefined) {
		return "portals";
	}

	if (components.Light !== undefined) {
		return "lights";
	}

	if (components.SoundEmitter !== undefined) {
		return "audio";
	}

	if (components.StoryNote !== undefined) {
		return "story";
	}

	if (components.Collider !== undefined) {
		return "collision";
	}

	return "props";
}

function previewTargetKindForCategory(
	category: LevelEditorWorkspaceCategory,
): LevelEditorWorkspacePreviewTargetKind | undefined {
	switch (category) {
		case "spawn":
			return "spawn";
		case "lights":
			return "light";
		case "portals":
			return "portal";
		case "audio":
			return "audio-emitter";
		default:
			return undefined;
	}
}

function capabilitiesForCategory(
	category: LevelEditorWorkspaceCategory,
): readonly LevelEditorWorkspaceCapability[] {
	switch (category) {
		case "spawn":
		case "lights":
		case "portals":
		case "audio":
			return ["previewable", "editable"];
		case "collision":
			return ["previewable", "editable", "bake-only"];
		case "terrain":
			return ["read-only", "bake-only"];
		default:
			return ["read-only"];
	}
}

function capabilityReason(category: LevelEditorWorkspaceCategory): string {
	switch (category) {
		case "spawn":
		case "lights":
		case "portals":
		case "audio":
			return "temporary dev preview can patch this component in the live game window";
		case "collision":
			return "collision editing uses the existing cook preview and bake contract";
		case "terrain":
			return "terrain packages are inspected here and changed through cook/bake tooling";
		default:
			return "not in the v1 direct-manipulation packet";
	}
}

function objectLabel(
	instance: LevelPrefabInstanceData,
	components: Record<string, unknown>,
): string {
	const portal = asRecord(components.Portal);
	const storyNote = asRecord(components.StoryNote);

	return (
		stringValue(portal?.label) ??
		stringValue(storyNote?.title) ??
		instance.stableId
	);
}

function inspectorFieldsForObject(
	category: LevelEditorWorkspaceCategory,
	components: Record<string, unknown>,
): readonly LevelEditorWorkspaceField[] {
	const fields: LevelEditorWorkspaceField[] = [];
	const transform = asRecord(components.Transform);

	if (
		category === "spawn" ||
		category === "lights" ||
		category === "portals" ||
		category === "audio" ||
		category === "collision"
	) {
		addVectorFields(
			fields,
			"Transform.position",
			"Position",
			transform?.position,
		);
		addVectorFields(fields, "Transform.scale", "Scale", transform?.scale);
	}

	if (category === "lights") {
		const light = asRecord(components.Light);
		addField(fields, "Light.color", "Color", light?.color, "color");
		addField(
			fields,
			"Light.intensity",
			"Intensity",
			light?.intensity,
			"number",
			{
				step: "0.1",
				min: "0",
			},
		);
		addField(fields, "Light.distance", "Distance", light?.distance, "number", {
			step: "0.1",
			min: "0",
		});
		addField(fields, "Light.decay", "Decay", light?.decay, "number", {
			step: "0.1",
			min: "0",
		});
		addField(
			fields,
			"Light.visible",
			"Visible",
			light?.visible ?? true,
			"checkbox",
		);
	}

	if (category === "portals") {
		const portal = asRecord(components.Portal);
		addField(fields, "Portal.label", "Label", portal?.label, "text");
		addField(fields, "Portal.prompt", "Prompt", portal?.prompt, "text");
		addField(
			fields,
			"Portal.targetRuntimeSceneId",
			"Target Scene",
			portal?.targetRuntimeSceneId,
			"text",
		);
		addField(
			fields,
			"Portal.activationRadius",
			"Activation Radius",
			portal?.activationRadius,
			"number",
			{ step: "0.05", min: "0.01" },
		);
	}

	if (category === "audio") {
		const emitter = asRecord(components.SoundEmitter);
		addField(fields, "SoundEmitter.soundId", "Sound", emitter?.soundId, "text");
		addField(
			fields,
			"SoundEmitter.volume",
			"Volume",
			emitter?.volume,
			"number",
			{
				step: "0.01",
				min: "0",
			},
		);
		addField(
			fields,
			"SoundEmitter.refDistance",
			"Reference Distance",
			emitter?.refDistance,
			"number",
			{ step: "0.1", min: "0" },
		);
		addField(
			fields,
			"SoundEmitter.maxDistance",
			"Max Distance",
			emitter?.maxDistance,
			"number",
			{ step: "0.1", min: "0" },
		);
		addField(
			fields,
			"SoundEmitter.rolloffFactor",
			"Rolloff",
			emitter?.rolloffFactor,
			"number",
			{ step: "0.05", min: "0" },
		);
		addField(
			fields,
			"SoundEmitter.active",
			"Active",
			emitter?.active ?? true,
			"checkbox",
		);
	}

	if (fields.length > 0) {
		return fields;
	}

	return Object.keys(components)
		.sort()
		.map((componentName) => ({
			path: componentName,
			label: componentName,
			value: "read-only component",
			input: "text",
			readOnly: true,
		}));
}

function previewSeedForObject(
	targetKind: LevelEditorWorkspacePreviewTargetKind,
	components: Record<string, unknown>,
): Record<string, unknown> {
	const seed: Record<string, unknown> = {};
	const transform = asRecord(components.Transform);

	if (transform) {
		seed.transform = cloneRecord(transform);
	}

	switch (targetKind) {
		case "light":
			seed.light = cloneRecord(asRecord(components.Light) ?? {});
			break;
		case "portal":
			seed.portal = cloneRecord(asRecord(components.Portal) ?? {});
			break;
		case "audio-emitter":
			seed.soundEmitter = cloneRecord(asRecord(components.SoundEmitter) ?? {});
			break;
	}

	return seed;
}

function selectedObjectPreview(options: {
	readonly label: string;
	readonly stableId: string;
	readonly sourceOwner: string;
	readonly componentNames: readonly string[];
	readonly assetIds: readonly string[];
	readonly assetsById: ReadonlyMap<string, AssetManifestEntryData>;
}): LevelEditorWorkspaceSelectedObjectPreview {
	return {
		title: options.label,
		subtitle: options.stableId,
		sourceOwner: options.sourceOwner,
		componentNames: options.componentNames,
		assetIds: options.assetIds,
		primaryAsset: previewAssetForIds(options.assetIds, options.assetsById),
	};
}

function objectAssetIds(
	prefab: PrefabData | undefined,
	components: Record<string, unknown>,
	assetsById: ReadonlyMap<string, AssetManifestEntryData>,
): readonly string[] {
	const assetIds = new Set<string>();

	for (const assetId of prefab?.assetIds ?? []) {
		if (assetsById.has(assetId)) {
			assetIds.add(assetId);
		}
	}

	collectAssetIdsFromValue(components, assetsById, assetIds);

	return [...assetIds].sort();
}

function collectAssetIdsFromValue(
	value: unknown,
	assetsById: ReadonlyMap<string, AssetManifestEntryData>,
	assetIds: Set<string>,
): void {
	if (typeof value === "string") {
		if (assetsById.has(value)) {
			assetIds.add(value);
		}
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			collectAssetIdsFromValue(item, assetsById, assetIds);
		}
		return;
	}

	const record = asRecord(value);
	if (!record) {
		return;
	}

	for (const item of Object.values(record)) {
		collectAssetIdsFromValue(item, assetsById, assetIds);
	}
}

function previewAssetForIds(
	assetIds: readonly string[],
	assetsById: ReadonlyMap<string, AssetManifestEntryData>,
): LevelEditorWorkspaceAssetPreview | null {
	const assets = assetIds
		.map((assetId) => assetsById.get(assetId))
		.filter((asset): asset is AssetManifestEntryData => asset !== undefined);
	const preferredAsset = [
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
	].flatMap((kind) => assets.filter((asset) => asset.kind === kind))[0];

	return preferredAsset === undefined ? null : assetPreview(preferredAsset);
}

function assetPreview(
	asset: AssetManifestEntryData,
): LevelEditorWorkspaceAssetPreview {
	return {
		assetId: asset.id,
		kind: asset.kind,
		url: asset.faces?.px ?? asset.url,
		label: asset.id,
		mode: previewModeForAsset(asset),
		swatchColor: asset.material?.color ?? null,
		tags: asset.tags ?? [],
	};
}

function previewModeForAsset(
	asset: AssetManifestEntryData,
): LevelEditorWorkspacePreviewMode {
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

function mergeInstanceComponents(
	prefab: PrefabData | undefined,
	instance: LevelPrefabInstanceData,
): Record<string, unknown> {
	const components = cloneRecord(prefab?.components ?? {});

	for (const [componentName, component] of Object.entries(
		instance.components ?? {},
	)) {
		components[componentName] =
			asRecord(components[componentName]) && asRecord(component)
				? { ...asRecord(components[componentName]), ...asRecord(component) }
				: cloneValue(component);
	}

	if (instance.transform !== undefined) {
		components.Transform = {
			...(asRecord(components.Transform) ?? {}),
			...(instance.transform.position === undefined
				? {}
				: { position: [...instance.transform.position] }),
			...(instance.transform.rotation === undefined
				? {}
				: { rotation: [...instance.transform.rotation] }),
			...(instance.transform.scale === undefined
				? {}
				: { scale: [...instance.transform.scale] }),
		};
	}

	return components;
}

function addVectorFields(
	fields: LevelEditorWorkspaceField[],
	path: string,
	label: string,
	value: unknown,
): void {
	const tuple = Array.isArray(value) ? value : undefined;

	for (const [index, axis] of ["x", "y", "z"].entries()) {
		addField(
			fields,
			`${path}.${axis}`,
			`${label} ${axis.toUpperCase()}`,
			typeof tuple?.[index] === "number" ? tuple[index] : index === 2 ? 0 : 0,
			"number",
			{ step: "0.01" },
		);
	}
}

function addField(
	fields: LevelEditorWorkspaceField[],
	path: string,
	label: string,
	value: unknown,
	input: LevelEditorWorkspaceField["input"],
	options: {
		readonly step?: string;
		readonly min?: string;
	} = {},
): void {
	fields.push({
		path,
		label,
		value:
			typeof value === "number" ||
			typeof value === "boolean" ||
			typeof value === "string"
				? value
				: "",
		input,
		...(options.step === undefined ? {} : { step: options.step }),
		...(options.min === undefined ? {} : { min: options.min }),
		readOnly: false,
	});
}

function workspaceCommands(options: {
	readonly authoring: LevelEditorWorkspaceAuthoringState;
	readonly commandPlans: LevelEditorWorkspaceModel["commandPlans"];
	readonly validation: LevelEditorWorkspaceModel["validation"];
}): readonly LevelEditorWorkspaceCommand[] {
	const saveReady =
		options.authoring.status === "ready" &&
		options.authoring.saveTarget !== null;
	const buildReady =
		options.commandPlans.build.errors.length === 0 &&
		options.validation.errors.length === 0;
	const publishReady =
		options.commandPlans.publish.errors.length === 0 &&
		options.validation.errors.length === 0;

	return [
		{
			id: "save",
			label: "Save Draft",
			enabled: saveReady,
			requiresDirty: true,
			blocksDirty: false,
			operation: "authoring-transaction",
			reason: saveReady
				? `writes a generated authoring draft transaction to ${options.authoring.saveTarget?.targetFile}; staged edits remain dirty until a bounded level owner write succeeds`
				: `draft save is blocked: ${firstError(options.authoring.errors)}`,
		},
		{
			id: "save-level",
			label: "Save Level",
			enabled: saveReady,
			requiresDirty: true,
			blocksDirty: false,
			operation: "owner-write",
			reason: saveReady
				? "writes the first supported bounded runtime owner data path for level-owned set-transform operations"
				: `level save is blocked: ${firstError(options.authoring.errors)}`,
		},
		{
			id: "discard",
			label: "Discard",
			enabled: true,
			requiresDirty: true,
			blocksDirty: false,
			operation: "clear-staged-preview",
			reason: "clears staged editor UI edits and requests dev-preview cleanup",
		},
		{
			id: "build",
			label: "Build",
			enabled: buildReady,
			requiresDirty: false,
			blocksDirty: true,
			operation: "build-plan",
			reason: buildReady
				? `available as ${options.commandPlans.build.stepCount} explicit local command steps`
				: `build is blocked: ${firstError([
						...options.validation.errors,
						...options.commandPlans.build.errors,
					])}`,
		},
		{
			id: "publish",
			label: "Publish Level",
			enabled: saveReady && publishReady,
			requiresDirty: true,
			blocksDirty: false,
			operation: "publish-owner-write",
			reason:
				saveReady && publishReady
					? `publishes supported staged level owner writes and runs ${options.commandPlans.publish.stepCount} local validation/build gates`
					: `publish is blocked: ${firstError([
							...options.validation.errors,
							...options.commandPlans.publish.errors,
						])}`,
		},
	];
}

function buildWorkspaceAuthoringState(
	manifest: RuntimeSceneManifestData,
): LevelEditorWorkspaceAuthoringState {
	const ownerRegistry = buildLevelEditorOwnerRegistry();
	const ownerTargets = ownerRegistry.targets.filter(
		(target) => target.runtimeSceneId === manifest.id,
	);
	const errors: string[] = [];
	const provenance = authoringProvenanceForManifest({
		manifest,
		ownerRegistry,
		ownerTargets,
		errors,
	});
	const saveTarget =
		ownerTargets.find(
			(target) =>
				target.generatedOwnerKind === "authoring-save" &&
				target.writableByAuthoringSave,
		) ?? null;

	if (saveTarget === null) {
		errors.push(
			`runtime scene "${manifest.id}" has no writable generated authoring-save target.`,
		);
	}

	if (provenance === null) {
		return {
			status: "blocked",
			documentContentHash: null,
			sourceManifestContentHash: null,
			recordCount: 0,
			ownerTargetCount: ownerTargets.length,
			writableTargetCount: ownerTargets.filter(
				(target) => target.writableByAuthoringSave,
			).length,
			saveTarget: summarizeSaveTarget(saveTarget),
			errors,
		};
	}

	const authoringDocument = projectRuntimeSceneManifestToAuthoringDocument(
		manifest,
		{
			provenance,
			runtimeSceneCatalogIds: ownerRegistry.runtimeSceneIds,
		},
	);
	const authoringValidation =
		validateLevelEditorAuthoringDocument(authoringDocument);

	if (!authoringValidation.ok) {
		errors.push(...authoringValidation.errors);
	}

	return {
		status: errors.length === 0 ? "ready" : "blocked",
		documentContentHash: authoringDocument.contentHash,
		sourceManifestContentHash: authoringDocument.sourceManifest.contentHash,
		recordCount: authoringDocument.records.length,
		ownerTargetCount: ownerTargets.length,
		writableTargetCount: ownerTargets.filter(
			(target) => target.writableByAuthoringSave,
		).length,
		saveTarget: summarizeSaveTarget(saveTarget),
		errors,
	};
}

function authoringProvenanceForManifest(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly ownerRegistry: LevelEditorOwnerRegistry;
	readonly ownerTargets: readonly LevelEditorOwnerTarget[];
	readonly errors: string[];
}): LevelEditorAuthoringDocumentProvenance | null {
	const level = requiredOwnerTarget(options, "level");
	const prefabs = requiredOwnerTarget(options, "prefab");
	const assetManifest = requiredOwnerTarget(options, "asset");
	const renderProfile = requiredOwnerTarget(options, "render-profile");

	if (!level || !prefabs || !assetManifest || !renderProfile) {
		return null;
	}

	return {
		runtimeSceneManifest: {
			ownerId: `${options.manifest.id}:runtime-scene-manifest`,
			kind: "runtime-scene-manifest",
			targetFile: "src/game/levels/runtimeSceneManifests.ts",
			exportName:
				runtimeSceneManifestExportNames[options.manifest.id] ??
				`${options.manifest.id}RuntimeSceneManifest`,
			contentHash: options.ownerRegistry.contentHash,
		},
		level: ownerProvenance(level, "level", options.ownerRegistry),
		prefabs: ownerProvenance(prefabs, "prefabs", options.ownerRegistry),
		assetManifest: ownerProvenance(
			assetManifest,
			"asset-manifest",
			options.ownerRegistry,
		),
		renderProfile: ownerProvenance(
			renderProfile,
			"render-profile",
			options.ownerRegistry,
		),
		generatedModules: options.ownerTargets
			.filter(
				(target) =>
					target.ownerKind === "generated-module" &&
					target.generatedOwnerKind !== "authoring-save",
			)
			.map((target) =>
				ownerProvenance(target, "generated-module", options.ownerRegistry),
			),
	};
}

function requiredOwnerTarget(
	options: {
		readonly manifest: RuntimeSceneManifestData;
		readonly ownerTargets: readonly LevelEditorOwnerTarget[];
		readonly errors: string[];
	},
	ownerKind: LevelEditorOwnerTarget["ownerKind"],
): LevelEditorOwnerTarget | undefined {
	const target = options.ownerTargets.find(
		(ownerTarget) => ownerTarget.ownerKind === ownerKind,
	);

	if (!target) {
		options.errors.push(
			`runtime scene "${options.manifest.id}" is missing ${ownerKind} owner target metadata.`,
		);
	}

	return target;
}

function ownerProvenance(
	target: LevelEditorOwnerTarget,
	kind: LevelEditorAuthoringDocumentProvenance["level"]["kind"],
	ownerRegistry: LevelEditorOwnerRegistry,
): LevelEditorAuthoringDocumentProvenance["level"] {
	return {
		ownerId: target.id,
		kind,
		targetFile: target.targetFile,
		exportName: target.ownerExport,
		contentHash: `${ownerRegistry.contentHash}:${target.id}`,
	};
}

function summarizeSaveTarget(
	target: LevelEditorOwnerTarget | null,
): LevelEditorWorkspaceAuthoringSaveTarget | null {
	if (target === null) {
		return null;
	}

	return {
		id: target.id,
		targetFile: target.targetFile,
		ownerExport: target.ownerExport,
		writeStrategy: target.writeStrategy,
	};
}

function buildWorkspaceCommandPlans(
	manifest: RuntimeSceneManifestData,
): LevelEditorWorkspaceModel["commandPlans"] {
	return {
		build: summarizeCommandPlan(
			"Build",
			buildEditorBuildPublishPlan({
				mode: "build",
				targetRuntimeSceneId: manifest.id,
				includeLiveReload: true,
			}),
		),
		publish: summarizeCommandPlan(
			"Publish",
			buildEditorBuildPublishPlan({
				mode: "publish-local",
				targetRuntimeSceneId: manifest.id,
				includeLiveReload: true,
			}),
		),
	};
}

function summarizeCommandPlan(
	label: string,
	plan: EditorBuildPublishPlan,
): LevelEditorWorkspaceCommandPlan {
	const errors = validateEditorBuildPublishPlan(plan);

	return {
		mode: plan.mode,
		label,
		localOnly: plan.localOnly,
		productionBuildHasHiddenCook: plan.productionBuildHasHiddenCook,
		stepCount: plan.steps.length,
		steps: plan.steps.map((step) => ({
			id: step.id,
			label: step.label,
			phase: step.phase,
			commandKind: step.commandKind,
			...(step.commandKind === "package-script"
				? {
						scriptName: step.scriptName,
						command: step.command.join(" "),
					}
				: { action: step.action }),
			writesAuthoredSource: step.writesAuthoredSource,
			productionBuildStep: step.productionBuildStep,
		})),
		errors,
	};
}

function buildInitialOutputLog(options: {
	readonly manifest: RuntimeSceneManifestData;
	readonly validationReport: LevelEditorValidationReport;
	readonly authoring: LevelEditorWorkspaceAuthoringState;
	readonly commandPlans: LevelEditorWorkspaceModel["commandPlans"];
}): readonly LevelEditorWorkspaceOutputLogEntry[] {
	return [
		{
			id: "catalog:selected-runtime-scene",
			level: "info",
			source: "catalog",
			message: `Loaded ${options.manifest.level.id} from runtime scene catalog entry ${options.manifest.id}.`,
		},
		{
			id: "authoring:save-target",
			level: options.authoring.status === "ready" ? "success" : "warning",
			source: "authoring",
			message:
				options.authoring.saveTarget === null
					? "No writable generated authoring-save target is registered for this runtime scene."
					: `Save Draft writes generated authoring transactions to ${options.authoring.saveTarget.targetFile}; it does not mark staged edits clean as a permanent level save.`,
		},
		{
			id: "commands:build-publish",
			level:
				options.commandPlans.build.errors.length === 0 &&
				options.commandPlans.publish.errors.length === 0
					? "info"
					: "warning",
			source: "commands",
			message: `Build and local publish command surfaces expose ${options.commandPlans.build.stepCount}/${options.commandPlans.publish.stepCount} explicit steps with hidden production cook disabled; publish errors are reported through the validation report and output log.`,
		},
		...options.validationReport.items.map((item) => ({
			id: item.id,
			level: item.severity,
			source: item.category,
			message: item.message,
		})),
	];
}

function firstError(errors: readonly string[]): string {
	return errors[0] ?? "no valid command owner is registered";
}

const runtimeSceneManifestExportNames: Record<string, string> = {
	portal_arena_runtime: "portalArenaRuntimeSceneManifest",
	prototype_arena_runtime: "prototypeRuntimeSceneManifest",
	miranda_deck_runtime: "mirandaDeckRuntimeSceneManifest",
	observatory_runtime: "observatoryRuntimeSceneManifest",
	sci_fi_room_runtime: "sciFiRoomRuntimeSceneManifest",
	solitude_runtime: "solitudeRuntimeSceneManifest",
	yggdrasil_runtime: "yggdrasilRuntimeSceneManifest",
};

function countBy(values: readonly string[]): ReadonlyMap<string, number> {
	const counts = new Map<string, number>();

	for (const value of values) {
		counts.set(value, (counts.get(value) ?? 0) + 1);
	}

	return counts;
}

function compareLibraryItems(
	left: LevelEditorWorkspaceLibraryItem,
	right: LevelEditorWorkspaceLibraryItem,
): number {
	return (
		right.usageCount - left.usageCount || left.label.localeCompare(right.label)
	);
}

function titleCase(value: string): string {
	return value
		.split("-")
		.map((part) =>
			part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`,
		)
		.join(" ");
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
	return cloneValue(value);
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
