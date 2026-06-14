import type {
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringSetTransformOperation,
	LevelEditorAuthoringTransaction,
} from "../../engine/data/levelAuthoring/index.js";
import type {
	LevelEditorWorkspaceCommandPlan,
	LevelEditorWorkspaceField,
	LevelEditorWorkspaceModel,
	LevelEditorWorkspaceObject,
	LevelEditorWorkspaceOutputLogEntry,
	LevelEditorWorkspacePreviewTargetKind,
} from "./levelEditorWorkspaceModel.js";

type LevelEditorAuthoringTransformPatch = NonNullable<
	LevelEditorAuthoringSetTransformOperation["transform"]
>;

export type LevelEditorFieldValue = string | number | boolean;

export type LevelEditorStagedFieldEdit = {
	readonly stableId: string;
	readonly path: string;
	readonly label: string;
	readonly before: LevelEditorFieldValue;
	readonly after: LevelEditorFieldValue;
};

export function fieldEditKey(stableId: string, path: string): string {
	return `${stableId}\u0000${path}`;
}

export function findStagedFieldEdit(
	edits: readonly LevelEditorStagedFieldEdit[],
	stableId: string,
	path: string,
): LevelEditorStagedFieldEdit | undefined {
	const key = fieldEditKey(stableId, path);

	return edits.find((edit) => fieldEditKey(edit.stableId, edit.path) === key);
}

export function upsertStagedFieldEdit(
	edits: readonly LevelEditorStagedFieldEdit[],
	nextEdit: LevelEditorStagedFieldEdit,
): readonly LevelEditorStagedFieldEdit[] {
	const key = fieldEditKey(nextEdit.stableId, nextEdit.path);
	const filtered = edits.filter(
		(edit) => fieldEditKey(edit.stableId, edit.path) !== key,
	);

	if (sameEditorFieldValue(nextEdit.before, nextEdit.after)) {
		return filtered;
	}

	return [...filtered, nextEdit].sort((left, right) =>
		fieldEditKey(left.stableId, left.path).localeCompare(
			fieldEditKey(right.stableId, right.path),
		),
	);
}

export function sameEditorFieldValue(
	left: LevelEditorFieldValue,
	right: LevelEditorFieldValue,
): boolean {
	if (typeof left === "number" || typeof right === "number") {
		return Number(left) === Number(right);
	}

	return left === right;
}

export function readEditorInputValue(
	input: HTMLInputElement,
	field: LevelEditorWorkspaceField,
): LevelEditorFieldValue {
	if (field.input === "checkbox") {
		return input.checked;
	}

	if (field.input === "number") {
		const value = Number(input.value);
		return Number.isFinite(value) ? value : Number(field.value) || 0;
	}

	return input.value;
}

export function createWorkspaceOutputLogEntry(options: {
	readonly level: LevelEditorWorkspaceOutputLogEntry["level"];
	readonly source: string;
	readonly message: string;
}): LevelEditorWorkspaceOutputLogEntry {
	return {
		id: `ui:${Date.now().toString(36)}:${slugify(options.source)}:${slugify(
			options.message,
		)}`,
		level: options.level,
		source: options.source,
		message: options.message,
	};
}

export function buildWorkspaceAuthoringTransaction(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
	readonly transactionId: string;
	readonly createdAt: string;
}): LevelEditorAuthoringTransaction {
	if (options.workspace.authoring.documentContentHash === null) {
		throw new Error("Workspace authoring document is not available.");
	}

	const operations = buildAuthoringOperations({
		workspace: options.workspace,
		edits: options.edits,
		transactionId: options.transactionId,
	});

	if (operations.length === 0) {
		throw new Error("Workspace has no staged edits to save.");
	}

	return {
		schemaVersion: 1,
		id: options.transactionId,
		runtimeSceneId: options.workspace.selectedRuntimeSceneId,
		baseDocumentHash: options.workspace.authoring.documentContentHash,
		createdAt: options.createdAt,
		persistence: "saved",
		operations,
	};
}

export function previewTargetsForStagedEdits(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
}): {
	readonly stableIds: readonly string[];
	readonly targetKinds: readonly LevelEditorWorkspacePreviewTargetKind[];
} {
	const objectsByStableId = new Map(
		options.workspace.objects.map((object) => [object.stableId, object]),
	);
	const stableIds = new Set<string>();
	const targetKinds = new Set<LevelEditorWorkspacePreviewTargetKind>();

	for (const edit of options.edits) {
		const object = objectsByStableId.get(edit.stableId);

		if (!object?.previewTargetKind) {
			continue;
		}

		stableIds.add(object.stableId);
		targetKinds.add(object.previewTargetKind);
	}

	return {
		stableIds: [...stableIds].sort(),
		targetKinds: [...targetKinds].sort(),
	};
}

export function commandPlanOutputMessage(
	plan: LevelEditorWorkspaceCommandPlan,
): string {
	const scripts = plan.steps
		.filter((step) => step.commandKind === "package-script")
		.map((step) => step.scriptName)
		.filter((scriptName): scriptName is string => scriptName !== undefined);
	const manualStepCount = plan.steps.length - scripts.length;

	return `${plan.label} plan ready: ${scripts.join(", ")}${
		manualStepCount > 0 ? ` plus ${manualStepCount} manual gate steps` : ""
	}.`;
}

function buildAuthoringOperations(options: {
	readonly workspace: LevelEditorWorkspaceModel;
	readonly edits: readonly LevelEditorStagedFieldEdit[];
	readonly transactionId: string;
}): readonly LevelEditorAuthoringEditOperation[] {
	const objectsByStableId = new Map(
		options.workspace.objects.map((object) => [object.stableId, object]),
	);
	const editsByStableId = groupEditsByStableId(options.edits);
	const operations: LevelEditorAuthoringEditOperation[] = [];

	for (const [stableId, edits] of [...editsByStableId.entries()].sort(
		([left], [right]) => left.localeCompare(right),
	)) {
		const object = objectsByStableId.get(stableId);

		if (!object) {
			continue;
		}

		const transform = transformOperationValue(object, edits);

		if (Object.keys(transform).length > 0) {
			operations.push({
				id: `${options.transactionId}:${slugify(stableId)}:transform`,
				kind: "set-transform",
				stableId,
				persistence: "saved",
				transform,
			});
		}

		for (const componentName of ["Light", "Portal", "SoundEmitter"] as const) {
			if (!edits.some((edit) => edit.path.startsWith(`${componentName}.`))) {
				continue;
			}

			operations.push({
				id: `${options.transactionId}:${slugify(stableId)}:${slugify(
					componentName,
				)}`,
				kind: "set-component",
				stableId,
				target: "level-instance",
				componentName,
				persistence: "saved",
				value: componentOperationValue(object, componentName, edits),
			});
		}
	}

	return operations;
}

function groupEditsByStableId(
	edits: readonly LevelEditorStagedFieldEdit[],
): ReadonlyMap<string, readonly LevelEditorStagedFieldEdit[]> {
	const groups = new Map<string, LevelEditorStagedFieldEdit[]>();

	for (const edit of edits) {
		const group = groups.get(edit.stableId) ?? [];
		group.push(edit);
		groups.set(edit.stableId, group);
	}

	return groups;
}

function transformOperationValue(
	object: LevelEditorWorkspaceObject,
	edits: readonly LevelEditorStagedFieldEdit[],
): LevelEditorAuthoringTransformPatch {
	const hasPosition = edits.some((edit) =>
		edit.path.startsWith("Transform.position."),
	);
	const hasScale = edits.some((edit) =>
		edit.path.startsWith("Transform.scale."),
	);

	return {
		...(hasPosition
			? { position: vectorValue(object, edits, "Transform.position") }
			: {}),
		...(hasScale
			? { scale: vectorValue(object, edits, "Transform.scale") }
			: {}),
	};
}

function vectorValue(
	object: LevelEditorWorkspaceObject,
	edits: readonly LevelEditorStagedFieldEdit[],
	path: "Transform.position" | "Transform.scale",
): readonly [number, number, number] {
	return ["x", "y", "z"].map((axis) => {
		const fieldPath = `${path}.${axis}`;
		const edit = edits.find((item) => item.path === fieldPath);
		const field = object.fields.find((item) => item.path === fieldPath);

		return Number(edit?.after ?? field?.value ?? 0);
	}) as [number, number, number];
}

function componentOperationValue(
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
	const value = cloneRecord(object.previewSeed?.[seedKey]);

	for (const field of object.fields) {
		if (!field.path.startsWith(`${componentName}.`)) {
			continue;
		}

		const property = field.path.slice(componentName.length + 1);
		const edit = edits.find((item) => item.path === field.path);
		value[property] = edit?.after ?? field.value;
	}

	return value;
}

function cloneRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "")
			.slice(0, 48) || "entry"
	);
}
