import type {
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringSetTransformOperation,
	LevelEditorAuthoringTransaction,
} from "../../engine/data/levelAuthoring/index.js";
import type { LevelEditorAuthoringOperationData } from "../../game/editor/authoring/saveTransaction.js";
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

export type LevelEditorStagedPublishReadinessQueuedOperation = {
	readonly id: string;
	readonly label?: string;
	readonly operations?: readonly LevelEditorAuthoringEditOperation[];
	readonly saveOperations?: readonly LevelEditorAuthoringOperationData[];
};

export type LevelEditorStagedPublishReadiness = {
	readonly status: "clean" | "publish-ready" | "draft-only" | "mixed";
	readonly label: string;
	readonly canRunOwnerWrite: boolean;
	readonly supportedOperationCount: number;
	readonly unsupportedOperationCount: number;
	readonly reasons: readonly string[];
};

export type LevelEditorQueuedOperationSummaryStatus =
	| "publish-ready"
	| "draft-only"
	| "mixed"
	| "preview-only";

export type LevelEditorQueuedOperationSummary = {
	readonly id: string;
	readonly label: string;
	readonly editOperationCount: number;
	readonly saveOperationCount: number;
	readonly status: LevelEditorQueuedOperationSummaryStatus;
	readonly statusLabel: string;
	readonly persistenceLabel: string;
	readonly detail: string;
	readonly reasons: readonly string[];
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

export function buildStagedPublishReadiness(options: {
	readonly stagedFieldEdits: readonly LevelEditorStagedFieldEdit[];
	readonly queuedOperations: readonly LevelEditorStagedPublishReadinessQueuedOperation[];
}): LevelEditorStagedPublishReadiness {
	const unsupportedReasons: string[] = [];
	let supportedOperationCount = 0;

	for (const edit of options.stagedFieldEdits) {
		if (isPublishableTransformFieldPath(edit.path)) {
			supportedOperationCount += 1;
			continue;
		}

		unsupportedReasons.push(
			`${edit.label} (${edit.path}) is not publishable by the current generated level owner writer.`,
		);
	}

	for (const entry of options.queuedOperations) {
		const entryPublishability = queuedEntryPublishability(entry);
		supportedOperationCount += entryPublishability.supportedOperationCount;
		unsupportedReasons.push(...entryPublishability.unsupportedReasons);
	}

	const unsupportedOperationCount = unsupportedReasons.length;
	const status =
		supportedOperationCount === 0 && unsupportedOperationCount === 0
			? "clean"
			: unsupportedOperationCount === 0
				? "publish-ready"
				: supportedOperationCount === 0
					? "draft-only"
					: "mixed";

	return {
		status,
		label: stagedPublishReadinessLabel(status),
		canRunOwnerWrite: status === "publish-ready",
		supportedOperationCount,
		unsupportedOperationCount,
		reasons: unsupportedReasons.slice(0, 4),
	};
}

export function buildQueuedOperationSummaries(
	entries: readonly LevelEditorStagedPublishReadinessQueuedOperation[],
): readonly LevelEditorQueuedOperationSummary[] {
	return entries.map((entry) => {
		const publishability = queuedEntryPublishability(entry);
		const editOperationCount = entry.operations?.length ?? 0;
		const saveOperationCount = entry.saveOperations?.length ?? 0;
		const status = queuedOperationSummaryStatus({
			totalOperationCount: editOperationCount + saveOperationCount,
			supportedOperationCount: publishability.supportedOperationCount,
			unsupportedOperationCount: publishability.unsupportedReasons.length,
		});

		return {
			id: entry.id,
			label: entry.label ?? entry.id,
			editOperationCount,
			saveOperationCount,
			status,
			statusLabel: queuedOperationStatusLabel(status),
			persistenceLabel: queuedOperationPersistenceLabel(status),
			detail: queuedOperationDetail(status),
			reasons:
				status === "preview-only"
					? ["No durable authoring operations are queued."]
					: publishability.unsupportedReasons.slice(0, 4),
		};
	});
}

function queuedEntryPublishability(
	entry: LevelEditorStagedPublishReadinessQueuedOperation,
): {
	readonly supportedOperationCount: number;
	readonly unsupportedReasons: readonly string[];
} {
	const operationLabel = entry.label ?? entry.id;

	if ((entry.saveOperations?.length ?? 0) > 0) {
		return classifyQueuedSaveOperations(entry, operationLabel);
	}

	return classifyQueuedEditOperations(entry, operationLabel);
}

function queuedOperationSummaryStatus(options: {
	readonly totalOperationCount: number;
	readonly supportedOperationCount: number;
	readonly unsupportedOperationCount: number;
}): LevelEditorQueuedOperationSummaryStatus {
	if (options.totalOperationCount === 0) {
		return "preview-only";
	}

	if (options.unsupportedOperationCount === 0) {
		return "publish-ready";
	}

	return options.supportedOperationCount === 0 ? "draft-only" : "mixed";
}

function classifyQueuedSaveOperations(
	entry: LevelEditorStagedPublishReadinessQueuedOperation,
	operationLabel: string,
): {
	readonly supportedOperationCount: number;
	readonly unsupportedReasons: readonly string[];
} {
	let supportedOperationCount = 0;
	const unsupportedReasons: string[] = [];

	for (const operation of entry.saveOperations ?? []) {
		if (
			isPublishableLevelTransformSaveOperation(operation) ||
			isPublishableLevelInsertionSaveOperation(operation) ||
			isPublishableLevelPrefabReplacementSaveOperation(operation) ||
			isPublishableLevelRemovalSaveOperation(operation) ||
			isPublishableLevelComponentSaveOperation(operation) ||
			isPublishableLevelComponentRemovalSaveOperation(operation)
		) {
			supportedOperationCount += 1;
			continue;
		}

		unsupportedReasons.push(
			`${operationLabel} stages ${operation.kind}; Save Level/Publish currently accepts only level-owned set-transform, insert-level-instance, replace-prefab, remove-level-instance, set-component, and remove-component operations.`,
		);
	}

	return { supportedOperationCount, unsupportedReasons };
}

function classifyQueuedEditOperations(
	entry: LevelEditorStagedPublishReadinessQueuedOperation,
	operationLabel: string,
): {
	readonly supportedOperationCount: number;
	readonly unsupportedReasons: readonly string[];
} {
	let supportedOperationCount = 0;
	const unsupportedReasons: string[] = [];

	for (const operation of entry.operations ?? []) {
		if (
			(operation.kind === "set-transform" && !("target" in operation)) ||
			(operation.kind === "set-transform" && operation.target !== "prefab") ||
			operation.kind === "insert-instance" ||
			operation.kind === "replace-prefab" ||
			operation.kind === "remove-instance" ||
			(operation.kind === "set-component" &&
				operation.target === "level-instance") ||
			(operation.kind === "remove-component" &&
				operation.target === "level-instance")
		) {
			supportedOperationCount += 1;
			continue;
		}

		unsupportedReasons.push(
			`${operationLabel} stages ${operation.kind}; Save Level/Publish currently accepts only level-owned set-transform, insert-level-instance, replace-prefab, remove-level-instance, set-component, and remove-component operations.`,
		);
	}

	return { supportedOperationCount, unsupportedReasons };
}

function isPublishableTransformFieldPath(path: string): boolean {
	return (
		path.startsWith("Transform.position.") ||
		path.startsWith("Transform.rotation.") ||
		path.startsWith("Transform.scale.") ||
		path.startsWith("Light.") ||
		path.startsWith("Portal.") ||
		path.startsWith("SoundEmitter.")
	);
}

function isPublishableLevelTransformSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	const payloadOperation = payloadOperationRecord(operation.payload);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation !== null &&
		payloadOperation.kind === "set-transform"
	);
}

function isPublishableLevelInsertionSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	return (
		operation.kind === "insert-level-instance" &&
		operation.ownerKind === "level" &&
		operation.payload !== null &&
		typeof operation.payload === "object" &&
		"instance" in operation.payload
	);
}

function isPublishableLevelRemovalSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	const payloadOperation = payloadOperationRecord(operation.payload);

	return (
		operation.kind === "remove-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation !== null &&
		payloadOperation.kind === "remove-instance"
	);
}

function isPublishableLevelPrefabReplacementSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	const payloadOperation = payloadOperationRecord(operation.payload);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation !== null &&
		payloadOperation.kind === "replace-prefab" &&
		"prefabId" in payloadOperation &&
		typeof payloadOperation.prefabId === "string"
	);
}

function isPublishableLevelComponentSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	const payloadOperation = payloadOperationRecord(operation.payload);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation !== null &&
		payloadOperation.kind === "set-component" &&
		"target" in payloadOperation &&
		payloadOperation.target === "level-instance"
	);
}

function isPublishableLevelComponentRemovalSaveOperation(operation: {
	readonly kind: string;
	readonly ownerKind: string;
	readonly payload?: unknown;
}): boolean {
	const payloadOperation = payloadOperationRecord(operation.payload);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation !== null &&
		payloadOperation.kind === "remove-component" &&
		"target" in payloadOperation &&
		payloadOperation.target === "level-instance"
	);
}

function payloadOperationRecord(
	payload: unknown,
): Record<string, unknown> | null {
	if (
		payload === null ||
		typeof payload !== "object" ||
		!("operation" in payload)
	) {
		return null;
	}

	const operation = payload.operation;

	return operation !== null && typeof operation === "object"
		? (operation as Record<string, unknown>)
		: null;
}

function stagedPublishReadinessLabel(
	status: LevelEditorStagedPublishReadiness["status"],
): string {
	switch (status) {
		case "clean":
			return "No staged owner writes";
		case "publish-ready":
			return "Save Level/Publish ready";
		case "draft-only":
			return "Draft-only staged work";
		case "mixed":
			return "Mixed publish readiness";
	}
}

function queuedOperationStatusLabel(
	status: LevelEditorQueuedOperationSummaryStatus,
): string {
	switch (status) {
		case "publish-ready":
			return "Save Level/Publish ready";
		case "draft-only":
			return "Save Draft only";
		case "mixed":
			return "Mixed persistence";
		case "preview-only":
			return "Preview only";
	}
}

function queuedOperationPersistenceLabel(
	status: LevelEditorQueuedOperationSummaryStatus,
): string {
	switch (status) {
		case "publish-ready":
			return "Bounded owner write";
		case "draft-only":
			return "Generated draft persistence";
		case "mixed":
			return "Split before publishing";
		case "preview-only":
			return "No durable operation";
	}
}

function queuedOperationDetail(
	status: LevelEditorQueuedOperationSummaryStatus,
): string {
	switch (status) {
		case "publish-ready":
			return "All queued operations fit current generated level owner-write families.";
		case "draft-only":
			return "Save Draft can preserve this entry; Save Level/Publish will block until an owner-write contract exists.";
		case "mixed":
			return "Contains publishable and unsupported operations; split or remove unsupported work before Save Level/Publish.";
		case "preview-only":
			return "This entry can affect editor review, but it has no durable authoring operation to save or publish.";
	}
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
	const hasRotation = edits.some((edit) =>
		edit.path.startsWith("Transform.rotation."),
	);

	return {
		...(hasPosition
			? { position: vectorValue(object, edits, "Transform.position") }
			: {}),
		...(hasRotation
			? { rotation: quaternionValue(object, edits, "Transform.rotation") }
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

function quaternionValue(
	object: LevelEditorWorkspaceObject,
	edits: readonly LevelEditorStagedFieldEdit[],
	path: "Transform.rotation",
): readonly [number, number, number, number] {
	return ["x", "y", "z", "w"].map((axis) => {
		const fieldPath = `${path}.${axis}`;
		const edit = edits.find((item) => item.path === fieldPath);
		const field = object.fields.find((item) => item.path === fieldPath);

		return Number(edit?.after ?? field?.value ?? (axis === "w" ? 1 : 0));
	}) as [number, number, number, number];
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
