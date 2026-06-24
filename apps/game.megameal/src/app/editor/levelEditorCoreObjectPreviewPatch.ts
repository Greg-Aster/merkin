import type { LevelEditorCoreObjectPreviewPatchEntry } from "../../engine/data/index.js";
import type { EditorObjectLibraryReplacementSubject } from "../../game/editor/objectLibrary/index.js";
import type {
	LevelEditorWorkspaceField,
	LevelEditorWorkspaceObject,
} from "./levelEditorWorkspaceModel.js";
import type { LevelEditorStagedFieldEdit } from "./levelEditorWorkspaceUi.js";

export function buildCoreObjectPreviewEntry(options: {
	readonly object: LevelEditorWorkspaceObject;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
}): LevelEditorCoreObjectPreviewPatchEntry {
	const transform = readTransformPatch(options.object, options.edits);

	switch (options.object.previewTargetKind) {
		case "light":
			return {
				stableId: options.object.stableId,
				targetKind: "light",
				...(transform === undefined ? {} : { transform }),
				light: readComponentPatch(options.object, "Light", options.edits),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		case "spawn":
			return {
				stableId: options.object.stableId,
				targetKind: "spawn",
				transform: transform ?? {},
			};
		case "portal":
			return {
				stableId: options.object.stableId,
				targetKind: "portal",
				...(transform === undefined ? {} : { transform }),
				portal: readComponentPatch(options.object, "Portal", options.edits),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		case "audio-emitter":
			return {
				stableId: options.object.stableId,
				targetKind: "audio-emitter",
				...(transform === undefined ? {} : { transform }),
				soundEmitter: readComponentPatch(
					options.object,
					"SoundEmitter",
					options.edits,
				),
			} as LevelEditorCoreObjectPreviewPatchEntry;
		default:
			throw new Error("Selected object is not previewable.");
	}
}

export function objectLibraryComponentSnapshots(
	object: LevelEditorWorkspaceObject,
): Pick<
	EditorObjectLibraryReplacementSubject,
	"currentRenderable" | "currentSoundEmitter"
> {
	const renderable =
		object.previewSeed?.renderable &&
		typeof object.previewSeed.renderable === "object"
			? (object.previewSeed.renderable as Record<string, unknown>)
			: undefined;
	const soundEmitter =
		object.previewSeed?.soundEmitter &&
		typeof object.previewSeed.soundEmitter === "object"
			? (object.previewSeed.soundEmitter as Record<string, unknown>)
			: undefined;

	return {
		...(renderable === undefined
			? {}
			: {
					currentRenderable: {
						...(typeof renderable.meshId === "string"
							? { meshId: renderable.meshId }
							: {}),
						...(typeof renderable.materialId === "string"
							? { materialId: renderable.materialId }
							: {}),
					},
				}),
		...(soundEmitter === undefined
			? {}
			: {
					currentSoundEmitter: {
						...(typeof soundEmitter.soundId === "string"
							? { soundId: soundEmitter.soundId }
							: {}),
						...(typeof soundEmitter.volume === "number"
							? { volume: soundEmitter.volume }
							: {}),
					},
				}),
	};
}

function readTransformPatch(
	object: LevelEditorWorkspaceObject,
	edits: readonly LevelEditorStagedFieldEdit[],
):
	| {
			readonly position?: readonly [number, number, number];
			readonly rotation?: readonly [number, number, number, number];
			readonly scale?: readonly [number, number, number];
	  }
	| undefined {
	const position = readVectorField(object, "Transform.position", edits);
	const rotation = readQuaternionField(object, "Transform.rotation", edits);
	const scale = readVectorField(object, "Transform.scale", edits);
	const transform = {
		...(position === undefined ? {} : { position }),
		...(rotation === undefined ? {} : { rotation }),
		...(scale === undefined ? {} : { scale }),
	};

	return Object.keys(transform).length === 0 ? undefined : transform;
}

function readComponentPatch(
	object: LevelEditorWorkspaceObject,
	componentName: "Light" | "Portal" | "SoundEmitter",
	edits: readonly LevelEditorStagedFieldEdit[],
): Record<string, unknown> {
	const seedKey =
		componentName === "SoundEmitter"
			? "soundEmitter"
			: componentName === "Portal"
				? "portal"
				: "light";
	const component = cloneRecord(object.previewSeed?.[seedKey]);

	for (const field of object.fields) {
		if (!field.path.startsWith(`${componentName}.`)) {
			continue;
		}

		const property = field.path.slice(componentName.length + 1);
		component[property] = readFieldValue(object, field, edits);
	}

	return component;
}

function readVectorField(
	object: LevelEditorWorkspaceObject,
	path: "Transform.position" | "Transform.scale",
	edits: readonly LevelEditorStagedFieldEdit[],
): readonly [number, number, number] | undefined {
	const fields = ["x", "y", "z"].map((axis) =>
		object.fields.find((field) => field.path === `${path}.${axis}`),
	);

	if (fields.some((field) => field === undefined)) {
		return undefined;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceField => field !== undefined,
	);

	return resolvedFields.map((field) =>
		Number(readFieldValue(object, field, edits)),
	) as [number, number, number];
}

function readQuaternionField(
	object: LevelEditorWorkspaceObject,
	path: "Transform.rotation",
	edits: readonly LevelEditorStagedFieldEdit[],
): readonly [number, number, number, number] | undefined {
	const fields = ["x", "y", "z", "w"].map((axis) =>
		object.fields.find((field) => field.path === `${path}.${axis}`),
	);

	if (fields.some((field) => field === undefined)) {
		return undefined;
	}

	const resolvedFields = fields.filter(
		(field): field is LevelEditorWorkspaceField => field !== undefined,
	);

	return resolvedFields.map((field) =>
		Number(readFieldValue(object, field, edits)),
	) as [number, number, number, number];
}

function readFieldValue(
	object: LevelEditorWorkspaceObject,
	field: LevelEditorWorkspaceField,
	edits: readonly LevelEditorStagedFieldEdit[],
): string | number | boolean {
	return (
		edits.find(
			(edit) => edit.stableId === object.stableId && edit.path === field.path,
		)?.after ?? field.value
	);
}

function cloneRecord(value: unknown): Record<string, unknown> {
	return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
}
