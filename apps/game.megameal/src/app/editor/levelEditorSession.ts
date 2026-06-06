import observatoryVisualTerrainMetadata from "../../../public/assets/generated/game/observatory/terrain/observatory-field-micro-displacement.json";
import {
	buildCollisionCookBakeFile,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	buildLightAuthoringPlan,
	serializeCollisionCookPreviewPatch,
} from "../../engine/data/index.js";
import type {
	CollisionCookShapeData,
	CollisionCookVector3Data,
	GeneratedGlbImportEntry,
} from "../../engine/data/index.js";
import type { CollisionIntentData } from "../../engine/data/schemas/index.js";
import { generatedGlbImportParityManifests } from "../../game/assets/generatedGlbImportParity.js";
import { buildCollisionOverlayViewModel } from "../../game/editor/collisionDrafts/collisionOverlayViewModel.js";
import { observatoryCollisionCookDraft } from "../../game/editor/collisionDrafts/observatoryCollisionDraft.js";
import { mirandaLightAuthoringDraft } from "../../game/editor/lightDrafts/mirandaLightDraft.js";

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

export type LevelEditorTerrainImportStatus = {
	readonly id: string;
	readonly runtimeSceneId: string;
	readonly generatedAt: string;
	readonly status: GeneratedGlbImportEntry["status"];
	readonly owner: string;
	readonly sourceUrl: string;
	readonly generatorScript: string | null;
	readonly metadataPath: string | null;
	readonly glbSha256: string | null;
	readonly source: {
		readonly collisionDraftId: string;
		readonly primaryCollisionStableId: string;
		readonly collisionStableIds: readonly string[];
		readonly sourceVisualAssetId: string;
		readonly sourceVisualStableId: string;
		readonly sourceVisualScale: CollisionCookVector3Data;
	};
	readonly output: {
		readonly meshAssetId: string;
		readonly prefabId: string;
		readonly stableId: string;
		readonly glbUrl: string;
		readonly scale: CollisionCookVector3Data;
	};
	readonly alignment: {
		readonly renderUsesCollisionAsImplicitCollision: boolean;
		readonly sourceGlbScale: CollisionCookVector3Data;
		readonly visualTerrainScale: CollisionCookVector3Data;
		readonly collisionGridSize: number;
		readonly collisionCellSize: number;
		readonly collisionVertexCount: number;
		readonly collisionTriangleCount: number;
		readonly visualGridSize: number;
		readonly visualCellSize: number;
		readonly visualVertexCount: number;
		readonly visualTriangleCount: number;
		readonly microDisplacementAmplitude: number;
		readonly maxCollisionSampleError: number;
		readonly heightRange: {
			readonly min: number;
			readonly max: number;
		};
		readonly anchorSampleCount: number;
	};
	readonly readiness: {
		readonly imported: boolean;
		readonly hasArtifactProvenance: boolean;
		readonly hasTargetRuntimeIds: boolean;
		readonly collisionLinked: boolean;
		readonly visualOnly: boolean;
	};
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

export type LevelEditorSessionSummary = {
	readonly selectedRuntimeSceneId: string;
	readonly selectedLevelInstanceStableId: string | null;
	readonly collisionDraftId: string;
	readonly collisionDraftEntryCount: number;
	readonly lightDraftId: string;
	readonly lightDraftEntryCount: number;
	readonly collisionOverlayEntries: readonly LevelEditorCollisionOverlaySummary[];
	readonly collisionEntryEditors: readonly LevelEditorCollisionEntryEditor[];
	readonly preview: {
		readonly protocolChannel: "megameal-level-editor-preview-v1";
		readonly channel: "level-editor-collision-preview";
		readonly mode: "temporary-preview";
		readonly entryCount: number;
		readonly sourcePlanHash: string;
		readonly serializedPatch: string;
	};
	readonly bake: {
		readonly generatedArtifactPath: string;
		readonly generatedArtifactHash: string;
		readonly writePlanHash: string;
		readonly writeArtifactCount: number;
		readonly writesRuntimeData: false;
	};
	readonly terrain: {
		readonly importCount: number;
		readonly importedCount: number;
		readonly collisionChunkCount: number;
		readonly meshChunkCount: number;
		readonly boxChunkCount: number;
		readonly walkableChunkCount: number;
		readonly collisionTriangleCount: number;
		readonly visualTriangleCount: number;
		readonly sourcePlanHash: string;
		readonly imports: readonly LevelEditorTerrainImportStatus[];
		readonly chunks: readonly LevelEditorTerrainChunkStatus[];
		readonly cookArtifacts: readonly LevelEditorTerrainCookArtifactStatus[];
	};
};

export function getDefaultLevelEditorSessionSummary(): LevelEditorSessionSummary {
	const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
	const overlay = buildCollisionOverlayViewModel(observatoryCollisionCookDraft);
	const previewPatch = buildCollisionCookPreviewPatch(plan);
	const writePlan = buildCollisionCookWritePlan(plan);
	const bakeFile = buildCollisionCookBakeFile(plan);
	const lightPlan = buildLightAuthoringPlan(mirandaLightAuthoringDraft);
	const selectedStableId =
		observatoryCollisionCookDraft.entries[0]?.stableId ?? null;
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
	const terrainImports = buildTerrainImportStatuses();
	const visualTriangleCount = terrainImports.reduce(
		(total, entry) => total + entry.alignment.visualTriangleCount,
		0,
	);
	const collisionTriangleCount = terrainChunks.reduce(
		(total, entry) => total + (entry.geometry.triangleCount ?? 0),
		0,
	);

	return {
		selectedRuntimeSceneId: observatoryCollisionCookDraft.runtimeSceneId,
		selectedLevelInstanceStableId: selectedStableId,
		collisionDraftId: observatoryCollisionCookDraft.id,
		collisionDraftEntryCount: observatoryCollisionCookDraft.entries.length,
		lightDraftId: lightPlan.draftId,
		lightDraftEntryCount: lightPlan.entries.length,
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
			entryCount: previewPatch.entries.length,
			sourcePlanHash: previewPatch.sourcePlanHash,
			serializedPatch: serializeCollisionCookPreviewPatch(previewPatch),
		},
		bake: {
			generatedArtifactPath:
				"src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json",
			generatedArtifactHash: bakeFile.contentHash,
			writePlanHash: writePlan.contentHash,
			writeArtifactCount: writePlan.artifacts.length,
			writesRuntimeData: bakeFile.writesRuntimeData,
		},
		terrain: {
			importCount: terrainImports.length,
			importedCount: terrainImports.filter(
				(entry) => entry.status === "imported",
			).length,
			collisionChunkCount: terrainChunks.length,
			meshChunkCount: terrainChunks.filter(
				(entry) => entry.shapeType === "mesh",
			).length,
			boxChunkCount: terrainChunks.filter((entry) => entry.shapeType === "box")
				.length,
			walkableChunkCount: terrainChunks.filter(
				(entry) => entry.requiredWalkable,
			).length,
			collisionTriangleCount,
			visualTriangleCount,
			sourcePlanHash: writePlan.provenance.sourcePlanHash,
			imports: terrainImports,
			chunks: terrainChunks,
			cookArtifacts: writePlan.artifacts.map((artifact) => ({
				id: artifact.id,
				purpose: artifact.purpose,
				format: artifact.format,
				targetFile: artifact.targetFile,
				contentHash: artifact.contentHash,
				writesRuntimeData: artifact.purpose === "runtime-collision-module",
			})),
		},
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

function buildTerrainImportStatuses(): readonly LevelEditorTerrainImportStatus[] {
	const metadataByPath = new Map([
		[
			observatoryVisualTerrainMetadata.output.metadataPath,
			observatoryVisualTerrainMetadata,
		],
	]);

	return generatedGlbImportParityManifests.flatMap((manifest) =>
		manifest.entries.flatMap((entry) => {
			const importEntry = entry as GeneratedGlbImportEntry;

			if (!importEntry.artifact) {
				return [];
			}

			const metadata = metadataByPath.get(importEntry.artifact.metadataPath);

			if (!metadata) {
				return [];
			}

			const collisionStableIds = collisionStableIdsFromMetadataSource(
				metadata.source,
			);

			return [
				{
					id: importEntry.id,
					runtimeSceneId: importEntry.runtimeSceneId,
					generatedAt: manifest.generatedAt,
					status: importEntry.status,
					owner: importEntry.owner,
					sourceUrl: importEntry.sourceUrl,
					generatorScript: importEntry.artifact.generatorScript,
					metadataPath: importEntry.artifact.metadataPath,
					glbSha256: importEntry.artifact.glbSha256,
					source: {
						collisionDraftId: metadata.source.collisionDraftId,
						primaryCollisionStableId: collisionStableIds[0] ?? "none",
						collisionStableIds,
						sourceVisualAssetId: metadata.source.sourceVisualAssetId,
						sourceVisualStableId: metadata.source.sourceVisualStableId,
						sourceVisualScale: vector3FromArray(
							metadata.source.sourceVisualScale,
							`${importEntry.id}.source.sourceVisualScale`,
						),
					},
					output: {
						meshAssetId: metadata.output.meshAssetId,
						prefabId: metadata.output.prefabId,
						stableId: metadata.output.stableId,
						glbUrl: metadata.output.glbUrl,
						scale: vector3FromArray(
							metadata.output.scale,
							`${importEntry.id}.output.scale`,
						),
					},
					alignment: {
						renderUsesCollisionAsImplicitCollision:
							metadata.alignment.renderUsesCollisionAsImplicitCollision,
						sourceGlbScale: vector3FromArray(
							metadata.alignment.sourceGlbScale,
							`${importEntry.id}.alignment.sourceGlbScale`,
						),
						visualTerrainScale: vector3FromArray(
							metadata.alignment.visualTerrainScale,
							`${importEntry.id}.alignment.visualTerrainScale`,
						),
						collisionGridSize: metadata.alignment.collisionGridSize,
						collisionCellSize: metadata.alignment.collisionCellSize,
						collisionVertexCount: metadata.alignment.collisionVertexCount,
						collisionTriangleCount: metadata.alignment.collisionTriangleCount,
						visualGridSize: metadata.alignment.visualGridSize,
						visualCellSize: metadata.alignment.visualCellSize,
						visualVertexCount: metadata.alignment.visualVertexCount,
						visualTriangleCount: metadata.alignment.visualTriangleCount,
						microDisplacementAmplitude:
							metadata.alignment.microDisplacementAmplitude,
						maxCollisionSampleError: metadata.alignment.maxCollisionSampleError,
						heightRange: {
							min: metadata.alignment.heightRange.min,
							max: metadata.alignment.heightRange.max,
						},
						anchorSampleCount: metadata.alignment.collisionAnchorSamples.length,
					},
					readiness: {
						imported: importEntry.status === "imported",
						hasArtifactProvenance: importEntry.artifact !== undefined,
						hasTargetRuntimeIds:
							(importEntry.target?.assetIds?.length ?? 0) > 0 &&
							(importEntry.target?.prefabIds?.length ?? 0) > 0 &&
							(importEntry.target?.stableIds?.length ?? 0) > 0,
						collisionLinked:
							metadata.source.collisionDraftId ===
								observatoryCollisionCookDraft.id &&
							collisionStableIdsMatchCurrentWalkableTerrain(collisionStableIds),
						visualOnly:
							metadata.alignment.renderUsesCollisionAsImplicitCollision ===
							false,
					},
				},
			];
		}),
	);
}

function collisionStableIdsFromMetadataSource(
	source: typeof observatoryVisualTerrainMetadata.source & {
		readonly collisionStableIds?: readonly string[];
		readonly collisionStableId?: string;
	},
): readonly string[] {
	if (Array.isArray(source.collisionStableIds)) {
		return [...source.collisionStableIds];
	}

	if (typeof source.collisionStableId === "string") {
		return [source.collisionStableId];
	}

	return [];
}

function collisionStableIdsMatchCurrentWalkableTerrain(
	stableIds: readonly string[],
): boolean {
	const baseStableId = "observatory:walkable-mesh";

	if (stableIds.includes(baseStableId)) {
		return true;
	}

	const currentWalkableChunkStableIds = observatoryCollisionCookDraft.entries
		.map((entry) => entry.stableId)
		.filter((stableId) => stableId.startsWith(`${baseStableId}:chunk:`));

	return (
		currentWalkableChunkStableIds.length > 0 &&
		currentWalkableChunkStableIds.every((stableId) =>
			stableIds.includes(stableId),
		)
	);
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

function vector3FromArray(
	value: readonly number[],
	label: string,
): CollisionCookVector3Data {
	if (value.length !== 3) {
		throw new Error(`Expected ${label} to have exactly three numbers.`);
	}

	const [x, y, z] = value;

	if (typeof x !== "number" || typeof y !== "number" || typeof z !== "number") {
		throw new Error(`Expected ${label} to have exactly three numbers.`);
	}

	return [x, y, z];
}
