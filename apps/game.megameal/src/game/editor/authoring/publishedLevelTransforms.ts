import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defaultRuntimeSceneManifests } from "../../levels/index.js";
import type { LevelPrefabInstance } from "../../levels/index.js";
import type {
	PublishedLevelInstanceComponentOverride,
	PublishedLevelInstanceComponentRemoval,
	PublishedLevelInstanceInsertion,
	PublishedLevelInstancePrefabOverride,
	PublishedLevelInstanceRemoval,
	PublishedLevelInstanceTransformOverride,
} from "../../levels/publishedLevelOverrides.js";
import type { TransformOverride } from "../../prefabs/index.js";
import {
	buildLevelEditorFeatureCoverageRegistry,
	getLevelEditorFeatureFamilyForOperationKind,
} from "./ownerRegistry.js";
import {
	LEVEL_EDITOR_MISSING_FILE_HASH,
	type LevelEditorAuthoringOperationData,
	type LevelEditorAuthoringSaveTransactionData,
	hashLevelEditorAuthoringFileContent,
	validateLevelEditorAuthoringSaveTransaction,
} from "./saveTransaction.js";
import {
	cloneValue,
	hashStableValue,
	isRecord,
	serializeStableValue,
} from "./stableValue.js";

export const LEVEL_EDITOR_PUBLISHED_TRANSFORMS_GENERATOR =
	"levelEditorPublishedTransforms.v1";
export const PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE =
	"src/game/generated/publishedLevelTransforms.ts";

export type LevelEditorPublishedTransformPersistenceOptions = {
	readonly appRoot: string | URL;
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
	readonly baseHash: string;
	readonly dryRun?: boolean;
};

export type LevelEditorPublishedTransformPersistenceResult = {
	readonly dryRun: boolean;
	readonly targetFile: typeof PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE;
	readonly absolutePath: string;
	readonly baseHash: string;
	readonly currentHash: string;
	readonly contentHash: string;
	readonly wroteFile: boolean;
	readonly changeset: LevelEditorPublishChangeset;
	readonly overrides: readonly PublishedLevelInstanceTransformOverride[];
	readonly insertions: readonly PublishedLevelInstanceInsertion[];
	readonly prefabOverrides: readonly PublishedLevelInstancePrefabOverride[];
	readonly componentOverrides: readonly PublishedLevelInstanceComponentOverride[];
	readonly componentRemovals: readonly PublishedLevelInstanceComponentRemoval[];
	readonly removals: readonly PublishedLevelInstanceRemoval[];
	readonly publishedStableIds: readonly string[];
};

export type LevelEditorPublishChangesetEntry = {
	readonly targetFile: string;
	readonly absolutePath: string;
	readonly priorContent: string | undefined;
	readonly priorHash: string;
	readonly currentContent: string;
	readonly currentHash: string;
	readonly noOp: boolean;
};

export type LevelEditorPublishChangeset = {
	readonly schemaVersion: 1;
	readonly entries: readonly LevelEditorPublishChangesetEntry[];
	readonly contentHash: string;
};

export async function publishLevelEditorTransformTransaction(
	options: LevelEditorPublishedTransformPersistenceOptions,
): Promise<LevelEditorPublishedTransformPersistenceResult> {
	const staged = await stagePublishedLevelTransformChangeset(options);
	const committed =
		options.dryRun === true
			? false
			: await commitLevelEditorPublishChangeset(staged.changeset);

	return {
		dryRun: options.dryRun === true,
		targetFile: PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
		absolutePath: staged.absolutePath,
		baseHash: options.baseHash,
		currentHash: staged.changeset.entries[0]?.priorHash ?? options.baseHash,
		contentHash:
			staged.changeset.entries[0]?.currentHash ??
			LEVEL_EDITOR_MISSING_FILE_HASH,
		wroteFile: committed,
		changeset: staged.changeset,
		overrides: staged.overrides,
		insertions: staged.insertions,
		prefabOverrides: staged.prefabOverrides,
		componentOverrides: staged.componentOverrides,
		componentRemovals: staged.componentRemovals,
		removals: staged.removals,
		publishedStableIds: staged.publishedStableIds,
	};
}

export async function stagePublishedLevelTransformChangeset(
	options: LevelEditorPublishedTransformPersistenceOptions,
): Promise<{
	readonly absolutePath: string;
	readonly changeset: LevelEditorPublishChangeset;
	readonly overrides: readonly PublishedLevelInstanceTransformOverride[];
	readonly insertions: readonly PublishedLevelInstanceInsertion[];
	readonly prefabOverrides: readonly PublishedLevelInstancePrefabOverride[];
	readonly componentOverrides: readonly PublishedLevelInstanceComponentOverride[];
	readonly componentRemovals: readonly PublishedLevelInstanceComponentRemoval[];
	readonly removals: readonly PublishedLevelInstanceRemoval[];
	readonly publishedStableIds: readonly string[];
}> {
	const validationErrors = validateLevelEditorAuthoringSaveTransaction({
		transaction: options.transaction,
	});

	if (validationErrors.length > 0) {
		throw new Error(
			`Invalid level editor publish transaction:\n${validationErrors.join("\n")}`,
		);
	}

	const absolutePath = resolveTargetPath(options.appRoot);
	const currentSource = await readOptionalFile(absolutePath);
	const currentHash = hashLevelEditorAuthoringFileContent(currentSource);

	if (currentHash !== options.baseHash) {
		throw new Error(
			`Refusing level editor publish: base hash mismatch for ${PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE}. Expected ${options.baseHash}, found ${currentHash}.`,
		);
	}

	if (
		currentSource !== undefined &&
		!currentSource.includes(
			`@generated by ${LEVEL_EDITOR_PUBLISHED_TRANSFORMS_GENERATOR}`,
		)
	) {
		throw new Error(
			`Refusing level editor publish: ${PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE} is not marked as a generated published transform module.`,
		);
	}

	const existingOverrides =
		currentSource === undefined
			? []
			: parsePublishedLevelTransformOverrides(currentSource);
	const existingInsertions =
		currentSource === undefined
			? []
			: parsePublishedLevelInstanceInsertions(currentSource);
	const existingPrefabOverrides =
		currentSource === undefined
			? []
			: parsePublishedLevelInstancePrefabOverrides(currentSource);
	const existingComponentOverrides =
		currentSource === undefined
			? []
			: parsePublishedLevelInstanceComponentOverrides(currentSource);
	const existingComponentRemovals =
		currentSource === undefined
			? []
			: parsePublishedLevelInstanceComponentRemovals(currentSource);
	const existingRemovals =
		currentSource === undefined
			? []
			: parsePublishedLevelInstanceRemovals(currentSource);
	const nextOverrides = mergePublishedTransformOverrides({
		existingOverrides,
		transaction: options.transaction,
	});
	const nextInsertions = mergePublishedLevelInstanceInsertions({
		existingInsertions,
		transaction: options.transaction,
	});
	const nextPrefabOverrides = mergePublishedLevelInstancePrefabOverrides({
		existingPrefabOverrides,
		existingInsertions: nextInsertions,
		transaction: options.transaction,
	});
	const nextRemovals = mergePublishedLevelInstanceRemovals({
		existingRemovals,
		existingInsertions,
		transaction: options.transaction,
	});
	const nextComponentOverrides = mergePublishedLevelInstanceComponentOverrides({
		existingComponentOverrides,
		existingInsertions: nextInsertions,
		transaction: options.transaction,
	});
	const nextComponentRemovals = mergePublishedLevelInstanceComponentRemovals({
		existingComponentRemovals,
		existingInsertions: nextInsertions,
		transaction: options.transaction,
	});
	const serializedSource = serializePublishedLevelTransformOverridesSource(
		nextOverrides,
		nextInsertions,
		nextPrefabOverrides,
		nextComponentOverrides,
		nextComponentRemovals,
		nextRemovals,
	);
	const contentHash = hashLevelEditorAuthoringFileContent(serializedSource);
	const entry = {
		targetFile: PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
		absolutePath,
		priorContent: currentSource,
		priorHash: currentHash,
		currentContent: serializedSource,
		currentHash: contentHash,
		noOp: currentSource === serializedSource,
	} satisfies LevelEditorPublishChangesetEntry;
	const changesetBase = {
		schemaVersion: 1 as const,
		entries: [entry],
	};

	return {
		absolutePath,
		changeset: {
			...changesetBase,
			contentHash: hashStableValue(
				changesetBase.entries.map((changesetEntry) => ({
					currentHash: changesetEntry.currentHash,
					noOp: changesetEntry.noOp,
					priorHash: changesetEntry.priorHash,
					targetFile: changesetEntry.targetFile,
				})),
			),
		},
		overrides: nextOverrides,
		insertions: nextInsertions,
		prefabOverrides: nextPrefabOverrides,
		componentOverrides: nextComponentOverrides,
		componentRemovals: nextComponentRemovals,
		removals: nextRemovals,
		publishedStableIds: publishedStableIdsFromTransaction(options.transaction),
	};
}

export async function commitLevelEditorPublishChangeset(
	changeset: LevelEditorPublishChangeset,
): Promise<boolean> {
	const writableEntries = changeset.entries.filter((entry) => !entry.noOp);

	try {
		for (const entry of writableEntries) {
			await mkdir(dirname(entry.absolutePath), { recursive: true });
			await writeFile(entry.absolutePath, entry.currentContent, "utf8");
		}
	} catch (error) {
		await rollbackLevelEditorPublishChangeset(changeset);
		throw error;
	}

	return writableEntries.length > 0;
}

export async function rollbackLevelEditorPublishChangeset(
	changeset: LevelEditorPublishChangeset,
): Promise<void> {
	for (const entry of [...changeset.entries].reverse()) {
		if (entry.priorContent === undefined) {
			await rm(entry.absolutePath, { force: true });
			continue;
		}

		await mkdir(dirname(entry.absolutePath), { recursive: true });
		await writeFile(entry.absolutePath, entry.priorContent, "utf8");
	}
}

export function mergePublishedTransformOverrides(options: {
	readonly existingOverrides: readonly PublishedLevelInstanceTransformOverride[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstanceTransformOverride[] {
	const nextOverridesByKey = new Map(
		options.existingOverrides.map(
			(override) => [overrideKey(override), cloneValue(override)] as const,
		),
	);

	for (const operation of publishableTransformOperations(options.transaction)) {
		const override = publishedTransformOverrideForOperation(
			options.transaction,
			operation,
		);
		nextOverridesByKey.set(overrideKey(override), override);
	}

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const removalKeyBase = publishedLevelInstanceKeyBaseForRemovalOperation(
			options.transaction,
			operation,
		);
		nextOverridesByKey.delete(overrideKey(removalKeyBase));
	}

	return [...nextOverridesByKey.values()].sort((left, right) =>
		overrideKey(left).localeCompare(overrideKey(right)),
	);
}

export function mergePublishedLevelInstanceInsertions(options: {
	readonly existingInsertions: readonly PublishedLevelInstanceInsertion[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstanceInsertion[] {
	const nextInsertionsByKey = new Map(
		options.existingInsertions.map(
			(insertion) => [insertionKey(insertion), cloneValue(insertion)] as const,
		),
	);

	for (const operation of publishableLevelInsertionOperations(
		options.transaction,
	)) {
		const insertion = publishedLevelInstanceInsertionForOperation(
			options.transaction,
			operation,
			options.existingInsertions,
		);
		nextInsertionsByKey.set(insertionKey(insertion), insertion);
	}

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const target = publishedLevelInstanceRemovalTargetForOperation(
			options.transaction,
			operation,
			[...nextInsertionsByKey.values()],
		);

		if (target.kind === "generated-insertion") {
			nextInsertionsByKey.delete(insertionKey(target.insertion));
		}
	}

	return [...nextInsertionsByKey.values()].sort((left, right) =>
		insertionKey(left).localeCompare(insertionKey(right)),
	);
}

export function mergePublishedLevelInstancePrefabOverrides(options: {
	readonly existingPrefabOverrides: readonly PublishedLevelInstancePrefabOverride[];
	readonly existingInsertions?: readonly PublishedLevelInstanceInsertion[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstancePrefabOverride[] {
	const nextOverridesByKey = new Map(
		options.existingPrefabOverrides.map(
			(override) =>
				[prefabOverrideKey(override), cloneValue(override)] as const,
		),
	);

	for (const operation of publishableLevelPrefabReplacementOperations(
		options.transaction,
	)) {
		const override = publishedLevelInstancePrefabOverrideForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);
		nextOverridesByKey.set(prefabOverrideKey(override), override);
	}

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const removalKeyBase = publishedLevelInstanceKeyBaseForRemovalOperation(
			options.transaction,
			operation,
		);
		nextOverridesByKey.delete(prefabOverrideKey(removalKeyBase));
	}

	return [...nextOverridesByKey.values()].sort((left, right) =>
		prefabOverrideKey(left).localeCompare(prefabOverrideKey(right)),
	);
}

export function mergePublishedLevelInstanceRemovals(options: {
	readonly existingRemovals: readonly PublishedLevelInstanceRemoval[];
	readonly existingInsertions?: readonly PublishedLevelInstanceInsertion[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstanceRemoval[] {
	const nextRemovalsByKey = new Map(
		options.existingRemovals.map(
			(removal) => [removalKey(removal), cloneValue(removal)] as const,
		),
	);

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const removal = publishedLevelInstanceRemovalForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);

		if (removal) {
			nextRemovalsByKey.set(removalKey(removal), removal);
		}
	}

	return [...nextRemovalsByKey.values()].sort((left, right) =>
		removalKey(left).localeCompare(removalKey(right)),
	);
}

export function mergePublishedLevelInstanceComponentOverrides(options: {
	readonly existingComponentOverrides: readonly PublishedLevelInstanceComponentOverride[];
	readonly existingInsertions?: readonly PublishedLevelInstanceInsertion[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstanceComponentOverride[] {
	const nextOverridesByKey = new Map(
		options.existingComponentOverrides.map(
			(override) =>
				[componentOverrideKey(override), cloneValue(override)] as const,
		),
	);

	for (const operation of publishableLevelComponentOperations(
		options.transaction,
	)) {
		const override = publishedLevelInstanceComponentOverrideForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);
		nextOverridesByKey.set(componentOverrideKey(override), override);
	}

	for (const operation of publishableLevelComponentRemovalOperations(
		options.transaction,
	)) {
		const removal = publishedLevelInstanceComponentRemovalForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);
		nextOverridesByKey.delete(componentRemovalKey(removal));
	}

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const removalKeyBase = publishedLevelInstanceKeyBaseForRemovalOperation(
			options.transaction,
			operation,
		);
		const prefix = instanceComponentKeyPrefix(removalKeyBase);

		for (const key of nextOverridesByKey.keys()) {
			if (key.startsWith(prefix)) {
				nextOverridesByKey.delete(key);
			}
		}
	}

	return [...nextOverridesByKey.values()].sort((left, right) =>
		componentOverrideKey(left).localeCompare(componentOverrideKey(right)),
	);
}

export function mergePublishedLevelInstanceComponentRemovals(options: {
	readonly existingComponentRemovals: readonly PublishedLevelInstanceComponentRemoval[];
	readonly existingInsertions?: readonly PublishedLevelInstanceInsertion[];
	readonly transaction: LevelEditorAuthoringSaveTransactionData;
}): readonly PublishedLevelInstanceComponentRemoval[] {
	const nextRemovalsByKey = new Map(
		options.existingComponentRemovals.map(
			(removal) => [componentRemovalKey(removal), cloneValue(removal)] as const,
		),
	);

	for (const operation of publishableLevelComponentRemovalOperations(
		options.transaction,
	)) {
		const removal = publishedLevelInstanceComponentRemovalForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);
		nextRemovalsByKey.set(componentRemovalKey(removal), removal);
	}

	for (const operation of publishableLevelComponentOperations(
		options.transaction,
	)) {
		const override = publishedLevelInstanceComponentOverrideForOperation(
			options.transaction,
			operation,
			options.existingInsertions ?? [],
		);
		nextRemovalsByKey.delete(componentOverrideKey(override));
	}

	for (const operation of publishableLevelRemovalOperations(
		options.transaction,
	)) {
		const removalKeyBase = publishedLevelInstanceKeyBaseForRemovalOperation(
			options.transaction,
			operation,
		);
		const prefix = instanceComponentKeyPrefix(removalKeyBase);

		for (const key of nextRemovalsByKey.keys()) {
			if (key.startsWith(prefix)) {
				nextRemovalsByKey.delete(key);
			}
		}
	}

	return [...nextRemovalsByKey.values()].sort((left, right) =>
		componentRemovalKey(left).localeCompare(componentRemovalKey(right)),
	);
}

export function serializePublishedLevelTransformOverridesSource(
	overrides: readonly PublishedLevelInstanceTransformOverride[],
	insertions: readonly PublishedLevelInstanceInsertion[] = [],
	prefabOverrides: readonly PublishedLevelInstancePrefabOverride[] = [],
	componentOverrides: readonly PublishedLevelInstanceComponentOverride[] = [],
	componentRemovals: readonly PublishedLevelInstanceComponentRemoval[] = [],
	removals: readonly PublishedLevelInstanceRemoval[] = [],
): string {
	return [
		`// @generated by ${LEVEL_EDITOR_PUBLISHED_TRANSFORMS_GENERATOR}`,
		"// Source: LevelEditorPublishedLevelTransformContract. Do not edit by hand.",
		"import type {",
		"\tPublishedLevelInstanceComponentRemoval,",
		"\tPublishedLevelInstanceComponentOverride,",
		"\tPublishedLevelInstanceInsertion,",
		"\tPublishedLevelInstancePrefabOverride,",
		"\tPublishedLevelInstanceRemoval,",
		"\tPublishedLevelInstanceTransformOverride,",
		'} from "../levels/publishedLevelOverrides.js";',
		"",
		`export const publishedLevelInstanceTransformOverrides: readonly PublishedLevelInstanceTransformOverride[] = ${serializeStableValue(
			overrides,
		).trimEnd()};`,
		`export const publishedLevelInstanceInsertions: readonly PublishedLevelInstanceInsertion[] = ${serializeStableValue(
			insertions,
		).trimEnd()};`,
		`export const publishedLevelInstancePrefabOverrides: readonly PublishedLevelInstancePrefabOverride[] = ${serializeStableValue(
			prefabOverrides,
		).trimEnd()};`,
		`export const publishedLevelInstanceComponentOverrides: readonly PublishedLevelInstanceComponentOverride[] = ${serializeStableValue(
			componentOverrides,
		).trimEnd()};`,
		`export const publishedLevelInstanceComponentRemovals: readonly PublishedLevelInstanceComponentRemoval[] = ${serializeStableValue(
			componentRemovals,
		).trimEnd()};`,
		`export const publishedLevelInstanceRemovals: readonly PublishedLevelInstanceRemoval[] = ${serializeStableValue(
			removals,
		).trimEnd()};`,
		"",
	].join("\n");
}

export function parsePublishedLevelTransformOverrides(
	source: string,
): readonly PublishedLevelInstanceTransformOverride[] {
	const marker =
		"export const publishedLevelInstanceTransformOverrides: readonly PublishedLevelInstanceTransformOverride[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		throw new Error(
			"Published transform module is missing the override export.",
		);
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error("Published transform module has an unsupported shape.");
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error("Published transform override export must be an array.");
	}

	return parsed.map(parsePublishedTransformOverride);
}

export function parsePublishedLevelInstanceInsertions(
	source: string,
): readonly PublishedLevelInstanceInsertion[] {
	const marker =
		"export const publishedLevelInstanceInsertions: readonly PublishedLevelInstanceInsertion[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		return [];
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			"Published level insertion export has an unsupported shape.",
		);
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error("Published level insertion export must be an array.");
	}

	return parsed.map(parsePublishedLevelInstanceInsertion);
}

export function parsePublishedLevelInstancePrefabOverrides(
	source: string,
): readonly PublishedLevelInstancePrefabOverride[] {
	const marker =
		"export const publishedLevelInstancePrefabOverrides: readonly PublishedLevelInstancePrefabOverride[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		return [];
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			"Published level prefab override export has an unsupported shape.",
		);
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error("Published level prefab override export must be an array.");
	}

	return parsed.map(parsePublishedLevelInstancePrefabOverride);
}

export function parsePublishedLevelInstanceComponentOverrides(
	source: string,
): readonly PublishedLevelInstanceComponentOverride[] {
	const marker =
		"export const publishedLevelInstanceComponentOverrides: readonly PublishedLevelInstanceComponentOverride[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		return [];
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			"Published level component override export has an unsupported shape.",
		);
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(
			"Published level component override export must be an array.",
		);
	}

	return parsed.map(parsePublishedLevelInstanceComponentOverride);
}

export function parsePublishedLevelInstanceComponentRemovals(
	source: string,
): readonly PublishedLevelInstanceComponentRemoval[] {
	const marker =
		"export const publishedLevelInstanceComponentRemovals: readonly PublishedLevelInstanceComponentRemoval[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		return [];
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			"Published level component removal export has an unsupported shape.",
		);
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(
			"Published level component removal export must be an array.",
		);
	}

	return parsed.map(parsePublishedLevelInstanceComponentRemoval);
}

export function parsePublishedLevelInstanceRemovals(
	source: string,
): readonly PublishedLevelInstanceRemoval[] {
	const marker =
		"export const publishedLevelInstanceRemovals: readonly PublishedLevelInstanceRemoval[] = ";
	const start = source.indexOf(marker);

	if (start === -1) {
		return [];
	}

	const valueStart = start + marker.length;
	const valueEnd = source.indexOf(";", valueStart);

	if (valueEnd === -1) {
		throw new Error(
			"Published level instance removal export has an unsupported shape.",
		);
	}

	const parsed = JSON.parse(source.slice(valueStart, valueEnd)) as unknown;

	if (!Array.isArray(parsed)) {
		throw new Error(
			"Published level instance removal export must be an array.",
		);
	}

	return parsed.map(parsePublishedLevelInstanceRemoval);
}

export function publishedStableIdsFromTransaction(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly string[] {
	return [
		...new Set(
			[
				...publishableTransformOperations(transaction),
				...publishableLevelInsertionOperations(transaction),
				...publishableLevelPrefabReplacementOperations(transaction),
				...publishableLevelComponentOperations(transaction),
				...publishableLevelComponentRemovalOperations(transaction),
				...publishableLevelRemovalOperations(transaction),
			].map((operation) => operation.subjectId),
		),
	].sort();
}

function publishableTransformOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(isPublishableLevelTransformOperation);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		const featureCoverage = buildLevelEditorFeatureCoverageRegistry();
		throw new Error(
			`Level editor publish currently supports only level-owned set-transform, insert-level-instance, replace-prefab, remove-level-instance, set-component, and remove-component operations. Unsupported operations: ${unsupportedOperations
				.map((operation) =>
					unsupportedPublishOperationDescription(operation, featureCoverage),
				)
				.join("; ")}`,
		);
	}

	if (publishable.length === 0) {
		if (
			publishableLevelInsertionOperations(transaction).length > 0 ||
			publishableLevelPrefabReplacementOperations(transaction).length > 0 ||
			publishableLevelComponentOperations(transaction).length > 0 ||
			publishableLevelComponentRemovalOperations(transaction).length > 0 ||
			publishableLevelRemovalOperations(transaction).length > 0
		) {
			return publishable;
		}

		throw new Error(
			"Level editor publish transaction does not contain any publishable level transform, insertion, prefab replacement, component set/remove, or instance removal operations.",
		);
	}

	return publishable;
}

function publishableLevelInsertionOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(isPublishableLevelInsertionOperation);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		return [];
	}

	return publishable;
}

function publishableLevelPrefabReplacementOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(
		isPublishableLevelPrefabReplacementOperation,
	);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		return [];
	}

	return publishable;
}

function publishableLevelComponentOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(isPublishableLevelComponentOperation);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		return [];
	}

	return publishable;
}

function publishableLevelComponentRemovalOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(
		isPublishableLevelComponentRemovalOperation,
	);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		return [];
	}

	return publishable;
}

function publishableLevelRemovalOperations(
	transaction: LevelEditorAuthoringSaveTransactionData,
): readonly LevelEditorAuthoringOperationData[] {
	const operations = transaction.targets.flatMap((target) => target.operations);
	const publishable = operations.filter(isPublishableLevelRemovalOperation);
	const unsupportedOperations = operations.filter(
		(operation) => !isPublishableLevelGeneratedOwnerOperation(operation),
	);

	if (unsupportedOperations.length > 0) {
		return [];
	}

	return publishable;
}

function unsupportedPublishOperationDescription(
	operation: LevelEditorAuthoringOperationData,
	featureCoverage: ReturnType<typeof buildLevelEditorFeatureCoverageRegistry>,
): string {
	const payloadOperation = payloadAuthoringOperation(operation);
	const payloadKind =
		typeof payloadOperation?.kind === "string"
			? payloadOperation.kind
			: undefined;
	const capabilityKind = payloadKind ?? operation.kind;
	const featureFamily =
		getLevelEditorFeatureFamilyForOperationKind(
			capabilityKind,
			featureCoverage,
		) ??
		getLevelEditorFeatureFamilyForOperationKind(
			operation.kind,
			featureCoverage,
		);
	const operationLabel = `${capabilityKind}:${operation.subjectId}`;

	if (!featureFamily) {
		return `${operationLabel} (${operation.ownerKind} owner ${operation.ownerTargetId}; no feature-family publish coverage is registered)`;
	}

	return `${operationLabel} (${featureFamily.label}; publish status ${featureFamily.publishStatus}; ${featureFamily.unsupportedReason ?? "no bounded publish writer is registered for this owner target"})`;
}

function isPublishableLevelTransformOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	const payloadOperation = payloadAuthoringOperation(operation);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation?.kind === "set-transform"
	);
}

function isPublishableLevelInsertionOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	return (
		operation.kind === "insert-level-instance" &&
		operation.ownerKind === "level" &&
		isRecord(operation.payload) &&
		isRecord(operation.payload.instance)
	);
}

function isPublishableLevelPrefabReplacementOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	const payloadOperation = payloadAuthoringOperation(operation);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation?.kind === "replace-prefab" &&
		typeof payloadOperation.prefabId === "string"
	);
}

function isPublishableLevelComponentOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	const payloadOperation = payloadAuthoringOperation(operation);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation?.kind === "set-component" &&
		payloadOperation.target === "level-instance" &&
		typeof payloadOperation.componentName === "string" &&
		isRecord(payloadOperation.value)
	);
}

function isPublishableLevelComponentRemovalOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	const payloadOperation = payloadAuthoringOperation(operation);

	return (
		operation.kind === "replace-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation?.kind === "remove-component" &&
		payloadOperation.target === "level-instance" &&
		typeof payloadOperation.componentName === "string"
	);
}

function isPublishableLevelRemovalOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	const payloadOperation = payloadAuthoringOperation(operation);

	return (
		operation.kind === "remove-level-instance" &&
		operation.ownerKind === "level" &&
		payloadOperation?.kind === "remove-instance" &&
		payloadOperation.stableId === operation.subjectId
	);
}

function isPublishableLevelGeneratedOwnerOperation(
	operation: LevelEditorAuthoringOperationData,
): boolean {
	return (
		isPublishableLevelTransformOperation(operation) ||
		isPublishableLevelInsertionOperation(operation) ||
		isPublishableLevelPrefabReplacementOperation(operation) ||
		isPublishableLevelComponentOperation(operation) ||
		isPublishableLevelComponentRemovalOperation(operation) ||
		isPublishableLevelRemovalOperation(operation)
	);
}

function publishedTransformOverrideForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
): PublishedLevelInstanceTransformOverride {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === operation.subjectId,
	);

	if (!instance) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" does not contain stable ID "${operation.subjectId}".`,
		);
	}

	const payloadOperation = payloadAuthoringOperation(operation);

	if (payloadOperation?.kind !== "set-transform") {
		throw new Error(
			`Operation "${operation.kind}:${operation.subjectId}" does not contain a set-transform payload.`,
		);
	}

	const transform = parseTransformOverride(payloadOperation.transform);
	const overrideBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		stableId: operation.subjectId,
		transform,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...overrideBase,
		contentHash: hashStableValue(overrideBase),
	};
}

function publishedLevelInstanceInsertionForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
): PublishedLevelInstanceInsertion {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	if (
		manifest.level.instances.some(
			(instance) => instance.stableId === operation.subjectId,
		)
	) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" already contains stable ID "${operation.subjectId}".`,
		);
	}

	const payload = operation.payload;
	const instance =
		isRecord(payload) && isRecord(payload.instance)
			? parseLevelPrefabInstance(payload.instance)
			: null;

	if (instance === null) {
		throw new Error(
			`insert-level-instance operation "${operation.subjectId}" must include a level instance payload.`,
		);
	}

	if (instance.stableId !== operation.subjectId) {
		throw new Error(
			`insert-level-instance operation "${operation.subjectId}" payload stable ID "${instance.stableId}" does not match the operation subject.`,
		);
	}

	if (!manifest.prefabs.some((prefab) => prefab.id === instance.prefabId)) {
		throw new Error(
			`insert-level-instance operation "${operation.subjectId}" references unknown prefab "${instance.prefabId}" in runtime scene "${transaction.runtimeSceneId}".`,
		);
	}

	const existingInsertion = existingInsertions.find(
		(insertion) =>
			insertion.runtimeSceneId === transaction.runtimeSceneId &&
			insertion.levelId === manifest.level.id &&
			insertion.instance.stableId === operation.subjectId,
	);

	if (
		existingInsertion &&
		existingInsertion.instance.prefabId !== instance.prefabId
	) {
		throw new Error(
			`insert-level-instance operation "${operation.subjectId}" conflicts with an existing generated insertion prefab "${existingInsertion.instance.prefabId}".`,
		);
	}

	const insertionBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		instance,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...insertionBase,
		contentHash: hashStableValue(insertionBase),
	};
}

function publishedLevelInstancePrefabOverrideForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
): PublishedLevelInstancePrefabOverride {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	const payloadOperation = payloadAuthoringOperation(operation);

	if (
		payloadOperation?.kind !== "replace-prefab" ||
		typeof payloadOperation.prefabId !== "string"
	) {
		throw new Error(
			`Operation "${operation.kind}:${operation.subjectId}" does not contain a replace-prefab payload.`,
		);
	}

	if (
		typeof payloadOperation.stableId === "string" &&
		payloadOperation.stableId !== operation.subjectId
	) {
		throw new Error(
			`replace-prefab operation "${operation.subjectId}" payload stable ID "${payloadOperation.stableId}" does not match the operation subject.`,
		);
	}

	if (
		!manifest.prefabs.some((prefab) => prefab.id === payloadOperation.prefabId)
	) {
		throw new Error(
			`replace-prefab operation "${operation.subjectId}" references unknown prefab "${payloadOperation.prefabId}" in runtime scene "${transaction.runtimeSceneId}".`,
		);
	}

	const hasCheckedInInstance = manifest.level.instances.some(
		(instance) => instance.stableId === operation.subjectId,
	);
	const hasGeneratedInsertion = existingInsertions.some(
		(insertion) =>
			insertion.runtimeSceneId === transaction.runtimeSceneId &&
			insertion.levelId === manifest.level.id &&
			insertion.instance.stableId === operation.subjectId,
	);

	if (!hasCheckedInInstance && !hasGeneratedInsertion) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" does not contain stable ID "${operation.subjectId}".`,
		);
	}

	if (hasCheckedInInstance) {
		assertRuntimeSceneCanReplaceCheckedInInstancePrefab({
			manifest,
			stableId: operation.subjectId,
		});
	}

	const overrideBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		stableId: operation.subjectId,
		prefabId: payloadOperation.prefabId,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...overrideBase,
		contentHash: hashStableValue(overrideBase),
	};
}

function publishedLevelInstanceComponentOverrideForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
): PublishedLevelInstanceComponentOverride {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	if (
		!manifest.level.instances.some(
			(instance) => instance.stableId === operation.subjectId,
		) &&
		!existingInsertions.some(
			(insertion) =>
				insertion.runtimeSceneId === transaction.runtimeSceneId &&
				insertion.levelId === manifest.level.id &&
				insertion.instance.stableId === operation.subjectId,
		)
	) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" does not contain stable ID "${operation.subjectId}".`,
		);
	}

	const payloadOperation = payloadAuthoringOperation(operation);

	if (payloadOperation?.kind !== "set-component") {
		throw new Error(
			`Operation "${operation.kind}:${operation.subjectId}" does not contain a set-component payload.`,
		);
	}

	const componentName = parseString(
		payloadOperation.componentName,
		"operation.componentName",
	);
	const value = parseRecord(payloadOperation.value, "operation.value");
	const overrideBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		stableId: operation.subjectId,
		componentName,
		value,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...overrideBase,
		contentHash: hashStableValue(overrideBase),
	};
}

function publishedLevelInstanceComponentRemovalForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
): PublishedLevelInstanceComponentRemoval {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	if (
		!manifest.level.instances.some(
			(instance) => instance.stableId === operation.subjectId,
		) &&
		!existingInsertions.some(
			(insertion) =>
				insertion.runtimeSceneId === transaction.runtimeSceneId &&
				insertion.levelId === manifest.level.id &&
				insertion.instance.stableId === operation.subjectId,
		)
	) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" does not contain stable ID "${operation.subjectId}".`,
		);
	}

	const payloadOperation = payloadAuthoringOperation(operation);

	if (payloadOperation?.kind !== "remove-component") {
		throw new Error(
			`Operation "${operation.kind}:${operation.subjectId}" does not contain a remove-component payload.`,
		);
	}

	const componentName = parseString(
		payloadOperation.componentName,
		"operation.componentName",
	);
	const removalBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		stableId: operation.subjectId,
		componentName,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...removalBase,
		contentHash: hashStableValue(removalBase),
	};
}

function publishedLevelInstanceRemovalForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
): PublishedLevelInstanceRemoval | undefined {
	const target = publishedLevelInstanceRemovalTargetForOperation(
		transaction,
		operation,
		existingInsertions,
	);

	if (target.kind === "generated-insertion") {
		return undefined;
	}

	const removalBase = {
		schemaVersion: 1 as const,
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: target.manifest.level.id,
		stableId: operation.subjectId,
		sourceTransactionId: transaction.transactionId,
	};

	return {
		...removalBase,
		contentHash: hashStableValue(removalBase),
	};
}

function publishedLevelInstanceRemovalTargetForOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
	existingInsertions: readonly PublishedLevelInstanceInsertion[],
):
	| {
			readonly kind: "checked-in";
			readonly manifest: (typeof defaultRuntimeSceneManifests)[number];
	  }
	| {
			readonly kind: "generated-insertion";
			readonly insertion: PublishedLevelInstanceInsertion;
	  } {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	const payloadOperation = payloadAuthoringOperation(operation);

	if (
		operation.kind !== "remove-level-instance" ||
		payloadOperation?.kind !== "remove-instance" ||
		payloadOperation.stableId !== operation.subjectId
	) {
		throw new Error(
			`Operation "${operation.kind}:${operation.subjectId}" does not contain a remove-instance payload.`,
		);
	}

	if (
		manifest.level.instances.some(
			(instance) => instance.stableId === operation.subjectId,
		)
	) {
		assertRuntimeSceneCanRemoveCheckedInInstance({
			manifest,
			stableId: operation.subjectId,
		});

		return { kind: "checked-in", manifest };
	}

	const insertion = existingInsertions.find(
		(candidate) =>
			candidate.runtimeSceneId === transaction.runtimeSceneId &&
			candidate.levelId === manifest.level.id &&
			candidate.instance.stableId === operation.subjectId,
	);

	if (insertion) {
		return { kind: "generated-insertion", insertion };
	}

	throw new Error(
		`Runtime scene "${transaction.runtimeSceneId}" does not contain stable ID "${operation.subjectId}".`,
	);
}

function assertRuntimeSceneCanRemoveCheckedInInstance(options: {
	readonly manifest: (typeof defaultRuntimeSceneManifests)[number];
	readonly stableId: string;
}): void {
	const readiness = options.manifest.readiness;
	const requiredStableIds = new Set([
		readiness.playerStableId,
		...(readiness.requiredCollisionStableIds ?? []),
		...(readiness.requiredWalkableStableIds ?? []),
		...(readiness.requiredLightStableIds ?? []),
	]);

	if (requiredStableIds.has(options.stableId)) {
		throw new Error(
			`Runtime scene "${options.manifest.id}" cannot remove readiness-required stable ID "${options.stableId}" without a matching manifest/readiness owner update.`,
		);
	}
}

function assertRuntimeSceneCanReplaceCheckedInInstancePrefab(options: {
	readonly manifest: (typeof defaultRuntimeSceneManifests)[number];
	readonly stableId: string;
}): void {
	const readiness = options.manifest.readiness;
	const requiredStableIds = new Set([
		readiness.playerStableId,
		...(readiness.requiredCollisionStableIds ?? []),
		...(readiness.requiredWalkableStableIds ?? []),
		...(readiness.requiredLightStableIds ?? []),
	]);

	if (requiredStableIds.has(options.stableId)) {
		throw new Error(
			`Runtime scene "${options.manifest.id}" cannot replace prefab for readiness-required stable ID "${options.stableId}" without a matching manifest/readiness owner update.`,
		);
	}
}

function publishedLevelInstanceKeyBaseForRemovalOperation(
	transaction: LevelEditorAuthoringSaveTransactionData,
	operation: LevelEditorAuthoringOperationData,
): {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
} {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === transaction.runtimeSceneId,
	);

	if (!manifest) {
		throw new Error(
			`Runtime scene "${transaction.runtimeSceneId}" is not in the runtime scene catalog.`,
		);
	}

	return {
		runtimeSceneId: transaction.runtimeSceneId,
		levelId: manifest.level.id,
		stableId: operation.subjectId,
	};
}

function payloadAuthoringOperation(
	operation: LevelEditorAuthoringOperationData,
): Record<string, unknown> | undefined {
	const payload = operation.payload;

	if (!isRecord(payload) || !isRecord(payload.operation)) {
		return undefined;
	}

	return payload.operation;
}

function parseTransformOverride(value: unknown): TransformOverride {
	if (!isRecord(value)) {
		throw new Error("set-transform payload must include a transform object.");
	}

	const transform = {
		...(value.position === undefined
			? {}
			: { position: parseVector3(value.position, "transform.position") }),
		...(value.rotation === undefined
			? {}
			: { rotation: parseQuaternion(value.rotation, "transform.rotation") }),
		...(value.scale === undefined
			? {}
			: { scale: parseVector3(value.scale, "transform.scale") }),
	};

	if (Object.keys(transform).length === 0) {
		throw new Error(
			"set-transform payload must include position, rotation, or scale.",
		);
	}

	return transform;
}

function parsePublishedTransformOverride(
	value: unknown,
): PublishedLevelInstanceTransformOverride {
	if (!isRecord(value)) {
		throw new Error("Published transform override entries must be objects.");
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		stableId: parseString(value.stableId, "stableId"),
		transform: parseTransformOverride(value.transform),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parsePublishedLevelInstanceInsertion(
	value: unknown,
): PublishedLevelInstanceInsertion {
	if (!isRecord(value)) {
		throw new Error("Published level insertion entries must be objects.");
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		instance: parseLevelPrefabInstance(value.instance),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parsePublishedLevelInstancePrefabOverride(
	value: unknown,
): PublishedLevelInstancePrefabOverride {
	if (!isRecord(value)) {
		throw new Error("Published prefab override entries must be objects.");
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		stableId: parseString(value.stableId, "stableId"),
		prefabId: parseString(value.prefabId, "prefabId"),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parsePublishedLevelInstanceComponentOverride(
	value: unknown,
): PublishedLevelInstanceComponentOverride {
	if (!isRecord(value)) {
		throw new Error("Published component override entries must be objects.");
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		stableId: parseString(value.stableId, "stableId"),
		componentName: parseString(value.componentName, "componentName"),
		value: parseRecord(value.value, "value"),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parsePublishedLevelInstanceComponentRemoval(
	value: unknown,
): PublishedLevelInstanceComponentRemoval {
	if (!isRecord(value)) {
		throw new Error("Published component removal entries must be objects.");
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		stableId: parseString(value.stableId, "stableId"),
		componentName: parseString(value.componentName, "componentName"),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parsePublishedLevelInstanceRemoval(
	value: unknown,
): PublishedLevelInstanceRemoval {
	if (!isRecord(value)) {
		throw new Error(
			"Published level instance removal entries must be objects.",
		);
	}

	return {
		schemaVersion: 1,
		runtimeSceneId: parseString(value.runtimeSceneId, "runtimeSceneId"),
		levelId: parseString(value.levelId, "levelId"),
		stableId: parseString(value.stableId, "stableId"),
		sourceTransactionId: parseString(
			value.sourceTransactionId,
			"sourceTransactionId",
		),
		contentHash: parseString(value.contentHash, "contentHash"),
	};
}

function parseLevelPrefabInstance(value: unknown): LevelPrefabInstance {
	if (!isRecord(value)) {
		throw new Error("Published inserted level instance must be an object.");
	}

	return {
		id: parseString(value.id, "instance.id"),
		stableId: parseString(value.stableId, "instance.stableId"),
		prefabId: parseString(value.prefabId, "instance.prefabId"),
		...(value.components === undefined
			? {}
			: { components: parseRecord(value.components, "instance.components") }),
		...(value.transform === undefined
			? {}
			: { transform: parseInstanceTransform(value.transform) }),
	};
}

function parseInstanceTransform(value: unknown): TransformOverride {
	if (!isRecord(value)) {
		throw new Error("instance.transform must be an object.");
	}

	return {
		...(value.position === undefined
			? {}
			: {
					position: parseVector3(value.position, "instance.transform.position"),
				}),
		...(value.rotation === undefined
			? {}
			: {
					rotation: parseQuaternion(
						value.rotation,
						"instance.transform.rotation",
					),
				}),
		...(value.scale === undefined
			? {}
			: { scale: parseVector3(value.scale, "instance.transform.scale") }),
	};
}

function parseRecord(value: unknown, path: string): Record<string, unknown> {
	if (!isRecord(value)) {
		throw new Error(`${path} must be an object.`);
	}

	return cloneValue(value);
}

function parseVector3(
	value: unknown,
	path: string,
): readonly [number, number, number] {
	return parseNumberTuple(value, path, 3) as readonly [number, number, number];
}

function parseQuaternion(
	value: unknown,
	path: string,
): readonly [number, number, number, number] {
	return parseNumberTuple(value, path, 4) as readonly [
		number,
		number,
		number,
		number,
	];
}

function parseNumberTuple(
	value: unknown,
	path: string,
	length: number,
): readonly number[] {
	if (
		!Array.isArray(value) ||
		value.length !== length ||
		value.some((item) => typeof item !== "number" || !Number.isFinite(item))
	) {
		throw new Error(`${path} must be a finite ${length}-number tuple.`);
	}

	return [...value];
}

function parseString(value: unknown, path: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new Error(`${path} must be a non-empty string.`);
	}

	return value;
}

function overrideKey(override: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
}): string {
	return `${override.runtimeSceneId}\u0000${override.levelId}\u0000${override.stableId}`;
}

function insertionKey(insertion: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly instance: { readonly stableId: string };
}): string {
	return `${insertion.runtimeSceneId}\u0000${insertion.levelId}\u0000${insertion.instance.stableId}`;
}

function componentOverrideKey(override: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly componentName: string;
}): string {
	return `${override.runtimeSceneId}\u0000${override.levelId}\u0000${override.stableId}\u0000${override.componentName}`;
}

function prefabOverrideKey(override: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
}): string {
	return `${override.runtimeSceneId}\u0000${override.levelId}\u0000${override.stableId}`;
}

function componentRemovalKey(removal: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly componentName: string;
}): string {
	return `${removal.runtimeSceneId}\u0000${removal.levelId}\u0000${removal.stableId}\u0000${removal.componentName}`;
}

function removalKey(removal: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
}): string {
	return `${removal.runtimeSceneId}\u0000${removal.levelId}\u0000${removal.stableId}`;
}

function instanceComponentKeyPrefix(instance: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
}): string {
	return `${instance.runtimeSceneId}\u0000${instance.levelId}\u0000${instance.stableId}\u0000`;
}

function resolveTargetPath(appRoot: string | URL): string {
	return resolve(
		typeof appRoot === "string" ? appRoot : appRoot.pathname,
		PUBLISHED_LEVEL_TRANSFORMS_TARGET_FILE,
	);
}

async function readOptionalFile(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}

		throw error;
	}
}
