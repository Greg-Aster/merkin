import {
	buildCollisionCookBakeFile,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	buildLightAuthoringPlan,
	serializeCollisionCookPreviewPatch,
} from "../../engine/data/index.js";
import type {
	CollisionCookDraftData,
	CollisionCookShapeData,
	CollisionCookVector3Data,
	LevelPrefabInstanceData,
	PrefabData,
	RuntimeSceneManifestData,
	TerrainChunkPackageData,
	TerrainVisualBindingData,
} from "../../engine/data/index.js";
import type { CollisionIntentData } from "../../engine/data/schemas/index.js";
import {
	getCollisionCookDraftForRuntimeScene,
	listCollisionCookDraftRuntimeSceneIds,
} from "../../game/editor/collisionDrafts/collisionDraftRegistry.js";
import { buildCollisionOverlayViewModel } from "../../game/editor/collisionDrafts/collisionOverlayViewModel.js";
import { getLightAuthoringDraftForRuntimeScene } from "../../game/editor/lightDrafts/lightDraftRegistry.js";
import {
	defaultRuntimeSceneManifest,
	getRuntimeSceneManifest,
} from "../../game/levels/index.js";
import {
	type LevelEditorWorkspaceModel,
	buildLevelEditorWorkspaceModel,
} from "./levelEditorWorkspaceModel.js";

const collisionIntentOptions = ["solid", "trigger", "walkable"] as const;
const collisionChannelOptions = ["worldStatic", "trigger"] as const;
const axisLabels = ["x", "y", "z"] as const;

export type LevelEditorCollisionOverlaySummary = {
	readonly stableId: string;
	readonly prefabId: string;
	readonly shapeType: string;
	readonly intent: string;
	readonly channel: string;
	readonly requiredCollision: boolean;
	readonly requiredWalkable: boolean;
};

export type LevelEditorVectorField = {
	readonly axis: (typeof axisLabels)[number];
	readonly name: string;
	readonly label: string;
	readonly value: number;
};

export type LevelEditorVectorControl = {
	readonly label: string;
	readonly fields: readonly LevelEditorVectorField[];
};

export type LevelEditorSelectControl<TValue extends string = string> = {
	readonly name: string;
	readonly value: TValue;
	readonly options: readonly TValue[];
};

export type LevelEditorBoundsSummary = {
	readonly min: CollisionCookVector3Data;
	readonly max: CollisionCookVector3Data;
	readonly center: CollisionCookVector3Data;
	readonly size: CollisionCookVector3Data;
};

export type LevelEditorMeshMetadata = {
	readonly vertexCount: number;
	readonly indexCount: number;
	readonly triangleCount: number;
};

export type LevelEditorBoxMetadata = {
	readonly halfExtents: CollisionCookVector3Data;
};

export type LevelEditorCollisionEntryEditor = {
	readonly stableId: string;
	readonly prefabId: string;
	readonly shapeType: CollisionCookShapeData["type"];
	readonly selected: boolean;
	readonly canEditTransform: boolean;
	readonly transformControls:
		| {
				readonly position: LevelEditorVectorControl;
				readonly scale: LevelEditorVectorControl;
		  }
		| undefined;
	readonly intentControl: LevelEditorSelectControl<CollisionIntentData>;
	readonly channelControl: LevelEditorSelectControl;
	readonly bounds: LevelEditorBoundsSummary;
	readonly meshMetadata?: LevelEditorMeshMetadata;
	readonly boxMetadata?: LevelEditorBoxMetadata;
};

export type LevelEditorTerrainChunkStatus = {
	readonly stableId: string;
	readonly prefabId: string;
	readonly shapeType: CollisionCookShapeData["type"];
	readonly intent: string;
	readonly channel: string;
	readonly colliderTarget: string;
	readonly requiredCollision: boolean;
	readonly requiredWalkable: boolean;
	readonly bounds: LevelEditorBoundsSummary;
	readonly geometry: {
		readonly vertexCount: number | null;
		readonly indexCount: number | null;
		readonly triangleCount: number | null;
		readonly gridSize: number | null;
		readonly cellSize: number | null;
		readonly halfExtent: number | null;
		readonly heightRange: { readonly min: number; readonly max: number } | null;
		readonly halfExtents: CollisionCookVector3Data | null;
	};
};

export type LevelEditorTerrainCookArtifactStatus = {
	readonly id: string;
	readonly purpose: string;
	readonly format: string;
	readonly targetFile: string;
	readonly contentHash: string;
	readonly writesRuntimeData: boolean;
};

export type LevelEditorTerrainLodCounts = {
	readonly near: number;
	readonly far: number;
	readonly mergedFloor: number;
};

export type LevelEditorTerrainChunkLodReferenceCounts = {
	readonly near: number;
	readonly far: number;
};

export type LevelEditorTerrainPackageStatus = {
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly sourceManifestId: string;
	readonly status: "ready" | "stale";
	readonly required: boolean;
	readonly chunkCount: number;
	readonly startupChunkCount: number;
	readonly streamableChunkCount: number;
	readonly activeCollisionChunkCount: number | null;
	readonly visualBindingCount: number;
	readonly lodBindingCounts: LevelEditorTerrainLodCounts;
	readonly chunkLodReferenceCounts: LevelEditorTerrainChunkLodReferenceCounts;
	readonly materialSetCount: number;
	readonly materialLayerCount: number;
	readonly materialAssetCount: number;
	readonly driftHash: string;
	readonly errors: readonly string[];
};

export type LevelEditorTerrainStreamingState = {
	readonly packageIds?: readonly string[];
	readonly activeCollisionChunkStableIds?: readonly string[];
	readonly errors?: readonly string[];
};

export type LevelEditorSessionOptions = {
	readonly selectedRuntimeSceneId?: string;
	readonly terrainStreamingStatus?: LevelEditorTerrainStreamingState;
};

export type LevelEditorCollisionDraftState =
	| {
			readonly status: "registered";
			readonly id: string;
			readonly runtimeSceneId: string;
			readonly levelId: string;
			readonly entryCount: number;
			readonly missingReason: null;
			readonly registeredRuntimeSceneIds: readonly string[];
	  }
	| {
			readonly status: "missing";
			readonly id: null;
			readonly runtimeSceneId: string;
			readonly levelId: string;
			readonly entryCount: 0;
			readonly missingReason: string;
			readonly registeredRuntimeSceneIds: readonly string[];
	  };

export type LevelEditorSessionSummary = {
	readonly selectedRuntimeSceneId: string;
	readonly selectedLevelInstanceStableId: string | null;
	readonly collisionDraft: LevelEditorCollisionDraftState;
	readonly collisionDraftId: string | null;
	readonly collisionDraftEntryCount: number;
	readonly lightDraftId: string | null;
	readonly lightDraftEntryCount: number;
	readonly collisionOverlayEntries: readonly LevelEditorCollisionOverlaySummary[];
	readonly collisionEntryEditors: readonly LevelEditorCollisionEntryEditor[];
	readonly preview: {
		readonly protocolChannel: "megameal-level-editor-preview-v1";
		readonly channel: "level-editor-collision-preview";
		readonly mode: "temporary-preview";
		readonly status: "ready" | "missing-draft";
		readonly missingReason: string | null;
		readonly entryCount: number;
		readonly sourcePlanHash: string | null;
		readonly serializedPatch: string | null;
	};
	readonly bake: {
		readonly mode: "derived-in-memory";
		readonly derivedBakeHash: string | null;
		readonly writePlanHash: string | null;
		readonly writeArtifactCount: number;
		readonly writesRuntimeData: false;
	};
	readonly terrain: {
		readonly selectedRuntimeSceneId: string;
		readonly packageCount: number;
		readonly requiredPackageCount: number;
		readonly packageIds: readonly string[];
		readonly requiredPackageIds: readonly string[];
		readonly startupChunkCount: number;
		readonly activeCollisionChunkCount: number | null;
		readonly visualBindingCount: number;
		readonly lodBindingCounts: LevelEditorTerrainLodCounts;
		readonly chunkLodReferenceCounts: LevelEditorTerrainChunkLodReferenceCounts;
		readonly materialAssetCount: number;
		readonly packageErrors: readonly string[];
		readonly packages: readonly LevelEditorTerrainPackageStatus[];
		readonly collisionChunkCount: number;
		readonly meshChunkCount: number;
		readonly boxChunkCount: number;
		readonly walkableChunkCount: number;
		readonly collisionTriangleCount: number;
		readonly sourcePlanHash: string | null;
		readonly chunks: readonly LevelEditorTerrainChunkStatus[];
		readonly cookArtifacts: readonly LevelEditorTerrainCookArtifactStatus[];
	};
	readonly workspace: LevelEditorWorkspaceModel;
};

type LevelEditorCollisionSessionState = {
	readonly selectedStableId: string | null;
	readonly collisionDraft: LevelEditorCollisionDraftState;
	readonly collisionOverlayEntries: readonly LevelEditorCollisionOverlaySummary[];
	readonly collisionEntryEditors: readonly LevelEditorCollisionEntryEditor[];
	readonly terrainChunks: readonly LevelEditorTerrainChunkStatus[];
	readonly collisionTriangleCount: number;
	readonly terrainSourcePlanHash: string | null;
	readonly preview: LevelEditorSessionSummary["preview"];
	readonly bake: LevelEditorSessionSummary["bake"];
	readonly cookArtifacts: readonly LevelEditorTerrainCookArtifactStatus[];
};

export function getDefaultLevelEditorSessionSummary(
	options: LevelEditorSessionOptions = {},
): LevelEditorSessionSummary {
	const selectedRuntimeSceneManifest = resolveLevelEditorRuntimeSceneManifest(
		options.selectedRuntimeSceneId,
	);
	const selectedRuntimeSceneId = selectedRuntimeSceneManifest.id;
	const collisionDraft = getCollisionCookDraftForRuntimeScene(
		selectedRuntimeSceneId,
	);
	const collisionSession =
		collisionDraft === undefined
			? buildMissingCollisionDraftSession(selectedRuntimeSceneManifest)
			: buildRegisteredCollisionDraftSession(collisionDraft);
	const lightDraft = getLightAuthoringDraftForRuntimeScene(
		selectedRuntimeSceneId,
	);
	const lightPlan =
		lightDraft === undefined ? null : buildLightAuthoringPlan(lightDraft);
	const terrainPackageSummary = buildTerrainPackageSummary(
		selectedRuntimeSceneId,
		selectedRuntimeSceneManifest,
		options.terrainStreamingStatus,
	);
	const workspace = buildLevelEditorWorkspaceModel({
		selectedRuntimeSceneId,
		...(collisionSession.selectedStableId === null
			? {}
			: { selectedStableId: collisionSession.selectedStableId }),
	});

	return {
		selectedRuntimeSceneId,
		selectedLevelInstanceStableId: collisionSession.selectedStableId,
		collisionDraft: collisionSession.collisionDraft,
		collisionDraftId: collisionSession.collisionDraft.id,
		collisionDraftEntryCount: collisionSession.collisionDraft.entryCount,
		lightDraftId: lightPlan?.draftId ?? null,
		lightDraftEntryCount: lightPlan?.entries.length ?? 0,
		collisionOverlayEntries: collisionSession.collisionOverlayEntries,
		collisionEntryEditors: collisionSession.collisionEntryEditors,
		preview: collisionSession.preview,
		bake: collisionSession.bake,
		terrain: {
			selectedRuntimeSceneId,
			packageCount: terrainPackageSummary.packageCount,
			requiredPackageCount: terrainPackageSummary.requiredPackageCount,
			packageIds: terrainPackageSummary.packageIds,
			requiredPackageIds: terrainPackageSummary.requiredPackageIds,
			startupChunkCount: terrainPackageSummary.startupChunkCount,
			activeCollisionChunkCount:
				terrainPackageSummary.activeCollisionChunkCount,
			visualBindingCount: terrainPackageSummary.visualBindingCount,
			lodBindingCounts: terrainPackageSummary.lodBindingCounts,
			chunkLodReferenceCounts: terrainPackageSummary.chunkLodReferenceCounts,
			materialAssetCount: terrainPackageSummary.materialAssetCount,
			packageErrors: terrainPackageSummary.packageErrors,
			packages: terrainPackageSummary.packages,
			collisionChunkCount: collisionSession.terrainChunks.length,
			meshChunkCount: collisionSession.terrainChunks.filter(
				(entry) => entry.shapeType === "mesh",
			).length,
			boxChunkCount: collisionSession.terrainChunks.filter(
				(entry) => entry.shapeType === "box",
			).length,
			walkableChunkCount: collisionSession.terrainChunks.filter(
				(entry) => entry.requiredWalkable,
			).length,
			collisionTriangleCount: collisionSession.collisionTriangleCount,
			sourcePlanHash: collisionSession.terrainSourcePlanHash,
			chunks: collisionSession.terrainChunks,
			cookArtifacts: collisionSession.cookArtifacts,
		},
		workspace,
	};
}

function resolveLevelEditorRuntimeSceneManifest(
	selectedRuntimeSceneId: string | undefined,
): RuntimeSceneManifestData {
	return (
		getRuntimeSceneManifest(
			selectedRuntimeSceneId ?? defaultRuntimeSceneManifest.id,
		) ?? defaultRuntimeSceneManifest
	);
}

function buildRegisteredCollisionDraftSession(
	collisionDraft: CollisionCookDraftData,
): LevelEditorCollisionSessionState {
	const plan = buildCollisionCookPlan(collisionDraft);
	const overlay = buildCollisionOverlayViewModel(collisionDraft);
	const previewPatch = buildCollisionCookPreviewPatch(plan);
	const writePlan = buildCollisionCookWritePlan(plan);
	const bakeFile = buildCollisionCookBakeFile(plan);
	const selectedStableId = collisionDraft.entries[0]?.stableId ?? null;
	const planEntriesByStableId = new Map(
		plan.entries.map((entry) => [entry.stableId, entry]),
	);
	const collisionEntryEditors = overlay.entries.map((entry) => {
		const planEntry = planEntriesByStableId.get(entry.stableId);

		if (!planEntry) {
			throw new Error(
				`Collision overlay entry ${entry.stableId} is missing from the cook plan.`,
			);
		}

		return {
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			shapeType: entry.shapeType,
			selected: entry.stableId === selectedStableId,
			canEditTransform: entry.shapeType === "box",
			transformControls:
				entry.shapeType === "box"
					? {
							position: vectorControl(
								"Position",
								`collision.${entry.stableId}.position`,
								entry.transform.position,
							),
							scale: vectorControl(
								"Scale",
								`collision.${entry.stableId}.scale`,
								entry.transform.scale,
							),
						}
					: undefined,
			intentControl: {
				name: `collision.${entry.stableId}.intent`,
				value: entry.intent,
				options: collisionIntentOptions,
			},
			channelControl: {
				name: `collision.${entry.stableId}.channel`,
				value: entry.channel,
				options: optionsWithCurrent(collisionChannelOptions, entry.channel),
			},
			bounds: entry.bounds,
			...(entry.shapeType === "mesh"
				? { meshMetadata: meshMetadata(planEntry.colliderComponent.shape) }
				: {}),
			...(entry.shapeType === "box"
				? { boxMetadata: boxMetadata(planEntry.colliderComponent.shape) }
				: {}),
		};
	});
	const terrainChunks = collisionEntryEditors.map((entry) => {
		const planEntry = planEntriesByStableId.get(entry.stableId);

		if (!planEntry) {
			throw new Error(
				`Collision editor entry ${entry.stableId} is missing from the cook plan.`,
			);
		}

		return {
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			shapeType: entry.shapeType,
			intent: entry.intentControl.value,
			channel: entry.channelControl.value,
			colliderTarget: planEntry.colliderTarget,
			requiredCollision: planEntry.readiness.requiredCollision,
			requiredWalkable: planEntry.readiness.requiredWalkable === true,
			bounds: entry.bounds,
			geometry: chunkGeometrySummary(
				planEntry.colliderComponent.shape,
				entry.bounds,
			),
		};
	});
	const collisionTriangleCount = terrainChunks.reduce(
		(total, entry) => total + (entry.geometry.triangleCount ?? 0),
		0,
	);

	return {
		selectedStableId,
		collisionDraft: {
			status: "registered",
			id: collisionDraft.id,
			runtimeSceneId: collisionDraft.runtimeSceneId,
			levelId: collisionDraft.levelId,
			entryCount: collisionDraft.entries.length,
			missingReason: null,
			registeredRuntimeSceneIds: listCollisionCookDraftRuntimeSceneIds(),
		},
		collisionOverlayEntries: overlay.entries.map((entry) => ({
			stableId: entry.stableId,
			prefabId: entry.prefabId,
			shapeType: entry.shapeType,
			intent: entry.intent,
			channel: entry.channel,
			requiredCollision: entry.readiness.requiredCollision,
			requiredWalkable: entry.readiness.requiredWalkable,
		})),
		collisionEntryEditors,
		preview: {
			protocolChannel: "megameal-level-editor-preview-v1",
			channel: previewPatch.channel,
			mode: previewPatch.mode,
			status: "ready",
			missingReason: null,
			entryCount: previewPatch.entries.length,
			sourcePlanHash: previewPatch.sourcePlanHash,
			serializedPatch: serializeCollisionCookPreviewPatch(previewPatch),
		},
		bake: {
			mode: "derived-in-memory",
			derivedBakeHash: bakeFile.contentHash,
			writePlanHash: writePlan.contentHash,
			writeArtifactCount: writePlan.artifacts.length,
			writesRuntimeData: bakeFile.writesRuntimeData,
		},
		terrainChunks,
		collisionTriangleCount,
		terrainSourcePlanHash: writePlan.provenance.sourcePlanHash,
		cookArtifacts: writePlan.artifacts.map((artifact) => ({
			id: artifact.id,
			purpose: artifact.purpose,
			format: artifact.format,
			targetFile: artifact.targetFile,
			contentHash: artifact.contentHash,
			writesRuntimeData: artifact.purpose === "runtime-collision-module",
		})),
	};
}

function buildMissingCollisionDraftSession(
	manifest: RuntimeSceneManifestData,
): LevelEditorCollisionSessionState {
	const registeredRuntimeSceneIds = listCollisionCookDraftRuntimeSceneIds();
	const missingReason =
		registeredRuntimeSceneIds.length === 0
			? `Runtime scene "${manifest.id}" has no registered collision cook draft.`
			: `Runtime scene "${manifest.id}" has no registered collision cook draft. Registered collision draft runtime scenes: ${registeredRuntimeSceneIds.join(", ")}.`;

	return {
		selectedStableId: manifest.readiness.playerStableId ?? null,
		collisionDraft: {
			status: "missing",
			id: null,
			runtimeSceneId: manifest.id,
			levelId: manifest.level.id,
			entryCount: 0,
			missingReason,
			registeredRuntimeSceneIds,
		},
		collisionOverlayEntries: [],
		collisionEntryEditors: [],
		terrainChunks: [],
		collisionTriangleCount: 0,
		terrainSourcePlanHash: null,
		preview: {
			protocolChannel: "megameal-level-editor-preview-v1",
			channel: "level-editor-collision-preview",
			mode: "temporary-preview",
			status: "missing-draft",
			missingReason,
			entryCount: 0,
			sourcePlanHash: null,
			serializedPatch: null,
		},
		bake: {
			mode: "derived-in-memory",
			derivedBakeHash: null,
			writePlanHash: null,
			writeArtifactCount: 0,
			writesRuntimeData: false,
		},
		cookArtifacts: [],
	};
}

function vectorControl(
	label: string,
	namePrefix: string,
	value: CollisionCookVector3Data,
): LevelEditorVectorControl {
	return {
		label,
		fields: axisLabels.map((axis, index) => ({
			axis,
			name: `${namePrefix}.${axis}`,
			label: axis.toUpperCase(),
			value: value[index] ?? 0,
		})),
	};
}

function optionsWithCurrent<TValue extends string>(
	options: readonly TValue[],
	value: TValue,
): readonly TValue[] {
	return options.includes(value)
		? options
		: ([...options, value] satisfies readonly TValue[]);
}

function meshMetadata(shape: CollisionCookShapeData): LevelEditorMeshMetadata {
	if (shape.type !== "mesh") {
		throw new Error("Mesh metadata requires a mesh collision shape.");
	}

	return {
		vertexCount: shape.vertices.length,
		indexCount: shape.indices.length,
		triangleCount: shape.indices.length / 3,
	};
}

function boxMetadata(shape: CollisionCookShapeData): LevelEditorBoxMetadata {
	if (shape.type !== "box") {
		throw new Error("Box metadata requires a box collision shape.");
	}

	return {
		halfExtents: shape.halfExtents,
	};
}

type LevelEditorTerrainPackageSummary = {
	readonly packageCount: number;
	readonly requiredPackageCount: number;
	readonly packageIds: readonly string[];
	readonly requiredPackageIds: readonly string[];
	readonly startupChunkCount: number;
	readonly activeCollisionChunkCount: number | null;
	readonly visualBindingCount: number;
	readonly lodBindingCounts: LevelEditorTerrainLodCounts;
	readonly chunkLodReferenceCounts: LevelEditorTerrainChunkLodReferenceCounts;
	readonly materialAssetCount: number;
	readonly packageErrors: readonly string[];
	readonly packages: readonly LevelEditorTerrainPackageStatus[];
};

function buildTerrainPackageSummary(
	selectedRuntimeSceneId: string,
	manifest: RuntimeSceneManifestData | undefined,
	terrainStreamingStatus: LevelEditorTerrainStreamingState | undefined,
): LevelEditorTerrainPackageSummary {
	const activeCollisionChunkStableIds =
		terrainStreamingStatus?.activeCollisionChunkStableIds === undefined
			? null
			: new Set(terrainStreamingStatus.activeCollisionChunkStableIds);
	const packageErrors: string[] = [];

	if (!manifest) {
		return {
			packageCount: 0,
			requiredPackageCount: 0,
			packageIds: [],
			requiredPackageIds: [],
			startupChunkCount: 0,
			activeCollisionChunkCount:
				activeCollisionChunkStableIds === null
					? null
					: activeCollisionChunkStableIds.size,
			visualBindingCount: 0,
			lodBindingCounts: emptyLodCounts(),
			chunkLodReferenceCounts: emptyChunkLodReferenceCounts(),
			materialAssetCount: 0,
			packageErrors: [
				`Selected runtime scene "${selectedRuntimeSceneId}" has no registered runtime scene manifest.`,
			],
			packages: [],
		};
	}

	const terrainPackages = manifest.terrainPackages ?? [];
	const packageIds = terrainPackages.map((terrainPackage) => terrainPackage.id);
	const packageIdsSet = new Set(packageIds);
	const requiredPackageIds = manifest.readiness.requiredTerrainPackageIds ?? [];
	const requiredPackageIdsSet = new Set(requiredPackageIds);
	const allChunkStableIds = new Set(
		terrainPackages.flatMap((terrainPackage) =>
			terrainPackage.chunks.map((chunk) => chunk.stableId),
		),
	);
	const instancesByStableId = new Map(
		manifest.level.instances.map((instance) => [instance.stableId, instance]),
	);
	const prefabsById = new Map(
		manifest.prefabs.map((prefab) => [prefab.id, prefab]),
	);

	for (const packageId of requiredPackageIds) {
		if (!packageIdsSet.has(packageId)) {
			packageErrors.push(
				`readiness.requiredTerrainPackageIds references missing terrain package "${packageId}".`,
			);
		}
	}

	for (const packageId of terrainStreamingStatus?.packageIds ?? []) {
		if (!packageIdsSet.has(packageId)) {
			packageErrors.push(
				`terrain streaming state references package "${packageId}" outside selected runtime scene "${manifest.id}".`,
			);
		}
	}

	if (activeCollisionChunkStableIds !== null) {
		for (const stableId of activeCollisionChunkStableIds) {
			if (!allChunkStableIds.has(stableId)) {
				packageErrors.push(
					`terrain streaming state active collision chunk "${stableId}" is not in selected runtime scene terrain packages.`,
				);
			}
		}
	}

	for (const error of terrainStreamingStatus?.errors ?? []) {
		packageErrors.push(`terrain streaming state reports: ${error}`);
	}

	const packages = terrainPackages.map((terrainPackage) =>
		buildTerrainPackageStatus(terrainPackage, {
			manifest,
			requiredPackageIds: requiredPackageIdsSet,
			instancesByStableId,
			prefabsById,
			activeCollisionChunkStableIds,
		}),
	);

	for (const terrainPackage of packages) {
		packageErrors.push(...terrainPackage.errors);
	}

	return {
		packageCount: terrainPackages.length,
		requiredPackageCount: requiredPackageIds.length,
		packageIds,
		requiredPackageIds,
		startupChunkCount: terrainPackages.reduce(
			(total, terrainPackage) =>
				total + terrainPackage.startupChunkStableIds.length,
			0,
		),
		activeCollisionChunkCount:
			activeCollisionChunkStableIds === null
				? null
				: packages.reduce(
						(total, terrainPackage) =>
							total + (terrainPackage.activeCollisionChunkCount ?? 0),
						0,
					),
		visualBindingCount: terrainPackages.reduce(
			(total, terrainPackage) => total + terrainPackage.visualBindings.length,
			0,
		),
		lodBindingCounts: sumLodCounts(
			terrainPackages.map((terrainPackage) =>
				lodBindingCounts(terrainPackage.visualBindings),
			),
		),
		chunkLodReferenceCounts: sumChunkLodReferenceCounts(
			terrainPackages.map(chunkLodReferenceCounts),
		),
		materialAssetCount: new Set(
			terrainPackages.flatMap(terrainPackageMaterialAssetIds),
		).size,
		packageErrors: uniqueStrings(packageErrors),
		packages,
	};
}

function buildTerrainPackageStatus(
	terrainPackage: TerrainChunkPackageData,
	options: {
		readonly manifest: RuntimeSceneManifestData;
		readonly requiredPackageIds: ReadonlySet<string>;
		readonly instancesByStableId: ReadonlyMap<string, LevelPrefabInstanceData>;
		readonly prefabsById: ReadonlyMap<string, PrefabData>;
		readonly activeCollisionChunkStableIds: ReadonlySet<string> | null;
	},
): LevelEditorTerrainPackageStatus {
	const errors: string[] = [];
	const required = options.requiredPackageIds.has(terrainPackage.id);
	const chunkStableIds = new Set(
		terrainPackage.chunks.map((chunk) => chunk.stableId),
	);
	const materialLayersBySetId = new Map(
		terrainPackage.materialSets.map((materialSet) => [
			materialSet.id,
			new Set(materialSet.layers.map((layer) => layer.id)),
		]),
	);

	if (!required) {
		errors.push(
			`terrain package "${terrainPackage.id}" is present but missing from readiness.requiredTerrainPackageIds.`,
		);
	}

	if (terrainPackage.runtimeSceneId !== options.manifest.id) {
		errors.push(
			`terrain package "${terrainPackage.id}" runtimeSceneId "${terrainPackage.runtimeSceneId}" does not match selected runtime scene "${options.manifest.id}".`,
		);
	}

	for (const chunk of terrainPackage.chunks) {
		const instance = options.instancesByStableId.get(chunk.stableId);

		if (!instance) {
			errors.push(
				`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" references missing level instance.`,
			);
		} else {
			const cellPackageId = terrainChunkCellPackageId(
				instance,
				options.prefabsById,
			);

			if (cellPackageId !== terrainPackage.id) {
				errors.push(
					`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" has TerrainChunkCell package "${cellPackageId ?? "missing"}".`,
				);
			}
		}

		const materialBinding = chunk.materialBinding;
		if (materialBinding) {
			const materialLayerIds = materialLayersBySetId.get(
				materialBinding.materialSetId,
			);

			if (!materialLayerIds) {
				errors.push(
					`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" references missing material set "${materialBinding.materialSetId}".`,
				);
			} else {
				for (const layerId of materialBinding.layerIds) {
					if (!materialLayerIds.has(layerId)) {
						errors.push(
							`terrain package "${terrainPackage.id}" chunk "${chunk.stableId}" references missing material layer "${layerId}".`,
						);
					}
				}
			}
		}
	}

	for (const stableId of terrainPackage.startupChunkStableIds) {
		if (!chunkStableIds.has(stableId)) {
			errors.push(
				`terrain package "${terrainPackage.id}" startupChunkStableIds references missing chunk "${stableId}".`,
			);
		}
	}

	for (const stableId of terrainPackage.streamableChunkStableIds) {
		if (!chunkStableIds.has(stableId)) {
			errors.push(
				`terrain package "${terrainPackage.id}" streamableChunkStableIds references missing chunk "${stableId}".`,
			);
		}
	}

	for (const binding of terrainPackage.visualBindings) {
		const instance = options.instancesByStableId.get(binding.stableId);

		if (!instance) {
			errors.push(
				`terrain package "${terrainPackage.id}" visual binding "${binding.stableId}" references missing level instance.`,
			);
			continue;
		}

		if (instance.prefabId !== binding.prefabId) {
			errors.push(
				`terrain package "${terrainPackage.id}" visual binding "${binding.stableId}" expects prefab "${binding.prefabId}", but level instance uses "${instance.prefabId}".`,
			);
		}

		for (const sourceStableId of binding.sourceChunkStableIds) {
			if (!chunkStableIds.has(sourceStableId)) {
				errors.push(
					`terrain package "${terrainPackage.id}" visual binding "${binding.stableId}" references missing source chunk "${sourceStableId}".`,
				);
			}
		}
	}

	const activeCollisionChunkStableIds = options.activeCollisionChunkStableIds;
	const activeCollisionChunkCount =
		activeCollisionChunkStableIds === null
			? null
			: terrainPackage.chunks.filter((chunk) =>
					activeCollisionChunkStableIds.has(chunk.stableId),
				).length;

	return {
		id: terrainPackage.id,
		runtimeSceneId: terrainPackage.runtimeSceneId,
		sourceManifestId: terrainPackage.sourceManifestId,
		status: errors.length === 0 ? "ready" : "stale",
		required,
		chunkCount: terrainPackage.chunks.length,
		startupChunkCount: terrainPackage.startupChunkStableIds.length,
		streamableChunkCount: terrainPackage.streamableChunkStableIds.length,
		activeCollisionChunkCount,
		visualBindingCount: terrainPackage.visualBindings.length,
		lodBindingCounts: lodBindingCounts(terrainPackage.visualBindings),
		chunkLodReferenceCounts: chunkLodReferenceCounts(terrainPackage),
		materialSetCount: terrainPackage.materialSets.length,
		materialLayerCount: terrainPackage.materialSets.reduce(
			(total, materialSet) => total + materialSet.layers.length,
			0,
		),
		materialAssetCount: terrainPackageMaterialAssetIds(terrainPackage).length,
		driftHash: terrainPackage.driftHash,
		errors: uniqueStrings(errors),
	};
}

function terrainChunkCellPackageId(
	instance: LevelPrefabInstanceData,
	prefabsById: ReadonlyMap<string, PrefabData>,
): string | null {
	return (
		componentPackageId(instance.components?.TerrainChunkCell) ??
		componentPackageId(
			prefabsById.get(instance.prefabId)?.components?.TerrainChunkCell,
		)
	);
}

function componentPackageId(component: unknown): string | null {
	if (!isRecord(component)) {
		return null;
	}

	return typeof component.packageId === "string" ? component.packageId : null;
}

function terrainPackageMaterialAssetIds(
	terrainPackage: TerrainChunkPackageData,
): readonly string[] {
	return uniqueStrings(
		terrainPackage.materialSets.flatMap((materialSet) => [
			materialSet.fallbackMaterialAssetId,
			...materialSet.layers.map((layer) => layer.materialAssetId),
		]),
	);
}

function lodBindingCounts(
	bindings: readonly TerrainVisualBindingData[],
): LevelEditorTerrainLodCounts {
	const counts = {
		near: 0,
		far: 0,
		mergedFloor: 0,
	};

	for (const binding of bindings) {
		counts[lodCountKey(binding.lod)] += 1;
	}

	return counts;
}

function chunkLodReferenceCounts(
	terrainPackage: TerrainChunkPackageData,
): LevelEditorTerrainChunkLodReferenceCounts {
	const counts = {
		near: 0,
		far: 0,
	};

	for (const chunk of terrainPackage.chunks) {
		counts.near += chunk.lod.nearVisualStableIds.length;
		counts.far += chunk.lod.farVisualStableIds.length;
	}

	return counts;
}

function sumLodCounts(
	values: readonly LevelEditorTerrainLodCounts[],
): LevelEditorTerrainLodCounts {
	return values.reduce(
		(total, item) => ({
			near: total.near + item.near,
			far: total.far + item.far,
			mergedFloor: total.mergedFloor + item.mergedFloor,
		}),
		emptyLodCounts(),
	);
}

function sumChunkLodReferenceCounts(
	values: readonly LevelEditorTerrainChunkLodReferenceCounts[],
): LevelEditorTerrainChunkLodReferenceCounts {
	return values.reduce(
		(total, item) => ({
			near: total.near + item.near,
			far: total.far + item.far,
		}),
		emptyChunkLodReferenceCounts(),
	);
}

function lodCountKey(
	lod: TerrainVisualBindingData["lod"],
): keyof LevelEditorTerrainLodCounts {
	return lod === "merged-floor" ? "mergedFloor" : lod;
}

function emptyLodCounts(): LevelEditorTerrainLodCounts {
	return {
		near: 0,
		far: 0,
		mergedFloor: 0,
	};
}

function emptyChunkLodReferenceCounts(): LevelEditorTerrainChunkLodReferenceCounts {
	return {
		near: 0,
		far: 0,
	};
}

function uniqueStrings(values: readonly string[]): readonly string[] {
	return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chunkGeometrySummary(
	shape: CollisionCookShapeData,
	bounds: LevelEditorBoundsSummary,
): LevelEditorTerrainChunkStatus["geometry"] {
	if (shape.type === "mesh") {
		const gridSize = squareGridSize(shape.vertices.length);

		return {
			vertexCount: shape.vertices.length,
			indexCount: shape.indices.length,
			triangleCount: shape.indices.length / 3,
			gridSize,
			cellSize:
				gridSize === null ? null : roundMetric(bounds.size[0] / (gridSize - 1)),
			halfExtent: roundMetric(Math.max(bounds.size[0], bounds.size[2]) / 2),
			heightRange: {
				min: bounds.min[1],
				max: bounds.max[1],
			},
			halfExtents: null,
		};
	}

	if (shape.type === "box") {
		return {
			vertexCount: null,
			indexCount: null,
			triangleCount: null,
			gridSize: null,
			cellSize: null,
			halfExtent: null,
			heightRange: null,
			halfExtents: shape.halfExtents,
		};
	}

	return {
		vertexCount: null,
		indexCount: null,
		triangleCount: null,
		gridSize: null,
		cellSize: null,
		halfExtent: null,
		heightRange: null,
		halfExtents: null,
	};
}

function squareGridSize(vertexCount: number): number | null {
	const gridSize = Math.sqrt(vertexCount);

	return Number.isInteger(gridSize) ? gridSize : null;
}

function roundMetric(value: number): number {
	return Number(value.toFixed(6));
}
