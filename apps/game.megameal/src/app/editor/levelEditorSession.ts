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
} from "../../engine/data/index.js";
import type { CollisionIntentData } from "../../engine/data/schemas/index.js";
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
		collisionEntryEditors: overlay.entries.map((entry) => {
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
		}),
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
