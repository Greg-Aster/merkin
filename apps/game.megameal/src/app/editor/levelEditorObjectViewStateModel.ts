export const LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT =
	"LevelEditorObjectViewStateModelContract" as const;

export type LevelEditorObjectViewStatePickability =
	| "projected-pickable"
	| "outliner-only";

export type LevelEditorObjectViewStateObject = {
	readonly stableId: string;
	readonly outliner?: {
		readonly pickability?: {
			readonly state: LevelEditorObjectViewStatePickability;
		};
	};
};

export type LevelEditorObjectViewStatePatch = {
	readonly visible?: boolean;
	readonly locked?: boolean;
	readonly isolated?: boolean;
};

export type LevelEditorObjectViewStateEntry = {
	readonly stableId: string;
	readonly visible: boolean;
	readonly locked: boolean;
	readonly isolated: boolean;
};

export type LevelEditorObjectViewStateModelObject =
	LevelEditorObjectViewStateEntry & {
		readonly sourcePickability: LevelEditorObjectViewStatePickability;
		readonly hiddenByIsolation: boolean;
		readonly includedInFilteredView: boolean;
		readonly pickable: boolean;
		readonly reason: string;
	};

export type LevelEditorObjectViewStateModel = {
	readonly schemaVersion: 1;
	readonly contract: typeof LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT;
	readonly stateSource: "editor-memory" | "browser-local-editor-workspace";
	readonly key: "stableId";
	readonly runtimeOwnership: {
		readonly editorOnly: true;
		readonly writesRuntimeData: false;
		readonly writesOwnerFiles: false;
		readonly persistsOwnerWrites: false;
	};
	readonly objectCount: number;
	readonly hasIsolation: boolean;
	readonly stateByStableId: Readonly<
		Record<string, LevelEditorObjectViewStateEntry>
	>;
	readonly objects: readonly LevelEditorObjectViewStateModelObject[];
	readonly visibleStableIds: readonly string[];
	readonly pickableStableIds: readonly string[];
	readonly lockedStableIds: readonly string[];
	readonly isolatedStableIds: readonly string[];
	readonly hiddenStableIds: readonly string[];
	readonly unknownStateStableIds: readonly string[];
};

export type LevelEditorObjectViewStatePersistenceEnvelope = {
	readonly schemaVersion: 1;
	readonly contract: typeof LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT;
	readonly stateSource: "browser-local-editor-workspace";
	readonly runtimeSceneId: string;
	readonly savedAtIso: string;
	readonly stateByStableId: Readonly<
		Record<string, LevelEditorObjectViewStatePatch>
	>;
	readonly runtimeOwnership: {
		readonly editorOnly: true;
		readonly writesRuntimeData: false;
		readonly writesOwnerFiles: false;
		readonly persistsOwnerWrites: false;
	};
};

export type LevelEditorObjectViewStateParseResult =
	| {
			readonly ok: true;
			readonly envelope: LevelEditorObjectViewStatePersistenceEnvelope;
	  }
	| {
			readonly ok: false;
			readonly reason: string;
	  };

export function levelEditorObjectViewStateForStableId(
	model: LevelEditorObjectViewStateModel,
	stableId: string,
): LevelEditorObjectViewStateModelObject {
	return (
		model.objects.find((object) => object.stableId === stableId) ?? {
			stableId,
			visible: true,
			locked: false,
			isolated: false,
			sourcePickability: "outliner-only",
			hiddenByIsolation: false,
			includedInFilteredView: true,
			pickable: false,
			reason: "Object is not present in the current editor view-state model.",
		}
	);
}

export function buildLevelEditorObjectViewStateModel(options: {
	readonly objects: readonly LevelEditorObjectViewStateObject[];
	readonly stateByStableId?: Readonly<
		Record<string, LevelEditorObjectViewStatePatch | undefined>
	>;
	readonly stateSource?: "editor-memory" | "browser-local-editor-workspace";
}): LevelEditorObjectViewStateModel {
	const stableIds = uniqueStableIds(options.objects);
	const requestedState = options.stateByStableId ?? {};
	const isolatedStableIds = stableIds.filter(
		(stableId) => requestedState[stableId]?.isolated === true,
	);
	const isolatedStableIdSet = new Set(isolatedStableIds);
	const hasIsolation = isolatedStableIdSet.size > 0;
	const stateEntries = stableIds.map((stableId) =>
		normalizeObjectViewState(stableId, requestedState[stableId]),
	);
	const stateByStableId = Object.fromEntries(
		stateEntries.map((entry) => [entry.stableId, entry]),
	);
	const stateObjects = stateEntries.map((entry) =>
		projectObjectViewState({
			entry,
			object: options.objects.find(
				(object) => object.stableId === entry.stableId,
			),
			hasIsolation,
			isolatedStableIdSet,
		}),
	);

	return {
		schemaVersion: 1,
		contract: LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT,
		stateSource: options.stateSource ?? "editor-memory",
		key: "stableId",
		runtimeOwnership: {
			editorOnly: true,
			writesRuntimeData: false,
			writesOwnerFiles: false,
			persistsOwnerWrites: false,
		},
		objectCount: stateObjects.length,
		hasIsolation,
		stateByStableId,
		objects: stateObjects,
		visibleStableIds: stateObjects
			.filter((object) => object.includedInFilteredView)
			.map((object) => object.stableId),
		pickableStableIds: stateObjects
			.filter((object) => object.pickable)
			.map((object) => object.stableId),
		lockedStableIds: stateObjects
			.filter((object) => object.locked)
			.map((object) => object.stableId),
		isolatedStableIds,
		hiddenStableIds: stateObjects
			.filter((object) => !object.visible)
			.map((object) => object.stableId),
		unknownStateStableIds: Object.keys(requestedState)
			.filter((stableId) => !stableIds.includes(stableId))
			.sort(),
	};
}

export function buildLevelEditorObjectViewStateStorageKey(
	runtimeSceneId: string,
): string {
	return `megameal:level-editor:object-view-state:v1:${runtimeSceneId}`;
}

export function serializeLevelEditorObjectViewStatePersistence(options: {
	readonly runtimeSceneId: string;
	readonly stateByStableId: Readonly<
		Record<string, LevelEditorObjectViewStatePatch>
	>;
	readonly savedAtIso?: string;
}): string {
	return JSON.stringify({
		schemaVersion: 1,
		contract: LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT,
		stateSource: "browser-local-editor-workspace",
		runtimeSceneId: options.runtimeSceneId,
		savedAtIso: options.savedAtIso ?? new Date().toISOString(),
		stateByStableId: pruneDefaultObjectViewState(options.stateByStableId),
		runtimeOwnership: {
			editorOnly: true,
			writesRuntimeData: false,
			writesOwnerFiles: false,
			persistsOwnerWrites: false,
		},
	} satisfies LevelEditorObjectViewStatePersistenceEnvelope);
}

export function parseLevelEditorObjectViewStatePersistence(options: {
	readonly serialized: string;
	readonly expectedRuntimeSceneId: string;
}): LevelEditorObjectViewStateParseResult {
	let parsed: unknown;

	try {
		parsed = JSON.parse(options.serialized);
	} catch {
		return { ok: false, reason: "Saved object view state is not valid JSON." };
	}

	if (!isObjectViewStatePersistenceEnvelope(parsed)) {
		return {
			ok: false,
			reason: "Saved object view state has an invalid shape.",
		};
	}

	if (parsed.runtimeSceneId !== options.expectedRuntimeSceneId) {
		return {
			ok: false,
			reason: `Saved object view state targets ${parsed.runtimeSceneId}, not ${options.expectedRuntimeSceneId}.`,
		};
	}

	return {
		ok: true,
		envelope: {
			...parsed,
			stateByStableId: pruneDefaultObjectViewState(parsed.stateByStableId),
		},
	};
}

export function resetLevelEditorObjectViewState(): Readonly<
	Record<string, LevelEditorObjectViewStatePatch>
> {
	return {};
}

export function clearLevelEditorObjectViewStateForStableId(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
	stableId: string,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	const nextState = { ...stateByStableId };

	delete nextState[stableId];
	return pruneDefaultObjectViewState(nextState);
}

export function clearLevelEditorObjectIsolation(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	return pruneDefaultObjectViewState(
		Object.fromEntries(
			Object.entries(stateByStableId).map(([stableId, state]) => [
				stableId,
				{
					...state,
					isolated: false,
				},
			]),
		),
	);
}

export function setLevelEditorObjectVisible(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
	stableId: string,
	visible: boolean,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	return updateLevelEditorObjectViewState(stateByStableId, stableId, {
		visible,
	});
}

export function setLevelEditorObjectLocked(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
	stableId: string,
	locked: boolean,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	return updateLevelEditorObjectViewState(stateByStableId, stableId, {
		locked,
	});
}

export function setLevelEditorObjectIsolated(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
	stableId: string,
	isolated: boolean,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	return updateLevelEditorObjectViewState(stateByStableId, stableId, {
		isolated,
	});
}

function updateLevelEditorObjectViewState(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
	stableId: string,
	patch: LevelEditorObjectViewStatePatch,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	return pruneDefaultObjectViewState({
		...stateByStableId,
		[stableId]: {
			...stateByStableId[stableId],
			...patch,
		},
	});
}

function normalizeObjectViewState(
	stableId: string,
	state: LevelEditorObjectViewStatePatch | undefined,
): LevelEditorObjectViewStateEntry {
	return {
		stableId,
		visible: state?.visible ?? true,
		locked: state?.locked ?? false,
		isolated: state?.isolated ?? false,
	};
}

function projectObjectViewState(options: {
	readonly entry: LevelEditorObjectViewStateEntry;
	readonly object: LevelEditorObjectViewStateObject | undefined;
	readonly hasIsolation: boolean;
	readonly isolatedStableIdSet: ReadonlySet<string>;
}): LevelEditorObjectViewStateModelObject {
	const sourcePickability =
		options.object?.outliner?.pickability?.state ?? "outliner-only";
	const hiddenByIsolation =
		options.hasIsolation &&
		!options.isolatedStableIdSet.has(options.entry.stableId);
	const includedInFilteredView = options.entry.visible && !hiddenByIsolation;
	const pickable =
		includedInFilteredView &&
		!options.entry.locked &&
		sourcePickability === "projected-pickable";

	return {
		...options.entry,
		sourcePickability,
		hiddenByIsolation,
		includedInFilteredView,
		pickable,
		reason: objectViewStateReason({
			entry: options.entry,
			sourcePickability,
			hiddenByIsolation,
			includedInFilteredView,
			pickable,
		}),
	};
}

function objectViewStateReason(options: {
	readonly entry: LevelEditorObjectViewStateEntry;
	readonly sourcePickability: LevelEditorObjectViewStatePickability;
	readonly hiddenByIsolation: boolean;
	readonly includedInFilteredView: boolean;
	readonly pickable: boolean;
}): string {
	if (!options.entry.visible) {
		return "Object is hidden by editor-only view state.";
	}

	if (options.hiddenByIsolation) {
		return "Object is filtered out by editor-only isolation state.";
	}

	if (options.entry.locked) {
		return "Object is visible but locked, so viewport picking is disabled.";
	}

	if (options.sourcePickability !== "projected-pickable") {
		return "Object is visible but outliner-only in the current workspace projection.";
	}

	if (options.pickable) {
		return "Object is visible, unlocked, and projected-pickable.";
	}

	if (options.includedInFilteredView) {
		return "Object is visible in the filtered editor view.";
	}

	return "Object is not visible in the filtered editor view.";
}

function uniqueStableIds(
	objects: readonly LevelEditorObjectViewStateObject[],
): readonly string[] {
	const stableIds = new Set<string>();

	for (const object of objects) {
		if (object.stableId.length > 0) {
			stableIds.add(object.stableId);
		}
	}

	return [...stableIds];
}

function pruneDefaultObjectViewState(
	stateByStableId: Readonly<Record<string, LevelEditorObjectViewStatePatch>>,
): Readonly<Record<string, LevelEditorObjectViewStatePatch>> {
	const prunedState: Record<string, LevelEditorObjectViewStatePatch> = {};

	for (const [stableId, state] of Object.entries(stateByStableId)) {
		const nextState: LevelEditorObjectViewStatePatch = {
			...(state.visible === undefined || state.visible === true
				? {}
				: { visible: state.visible }),
			...(state.locked === undefined || state.locked === false
				? {}
				: { locked: state.locked }),
			...(state.isolated === undefined || state.isolated === false
				? {}
				: { isolated: state.isolated }),
		};

		if (Object.keys(nextState).length > 0) {
			prunedState[stableId] = nextState;
		}
	}

	return prunedState;
}

function isObjectViewStatePersistenceEnvelope(
	value: unknown,
): value is LevelEditorObjectViewStatePersistenceEnvelope {
	if (!isRecord(value) || !isRecord(value.runtimeOwnership)) {
		return false;
	}

	return (
		value.schemaVersion === 1 &&
		value.contract === LEVEL_EDITOR_OBJECT_VIEW_STATE_MODEL_CONTRACT &&
		value.stateSource === "browser-local-editor-workspace" &&
		typeof value.runtimeSceneId === "string" &&
		value.runtimeSceneId.length > 0 &&
		typeof value.savedAtIso === "string" &&
		isRecord(value.stateByStableId) &&
		Object.entries(value.stateByStableId).every(
			([stableId, patch]) =>
				stableId.length > 0 && isObjectViewStatePatch(patch),
		) &&
		value.runtimeOwnership.editorOnly === true &&
		value.runtimeOwnership.writesRuntimeData === false &&
		value.runtimeOwnership.writesOwnerFiles === false &&
		value.runtimeOwnership.persistsOwnerWrites === false
	);
}

function isObjectViewStatePatch(
	value: unknown,
): value is LevelEditorObjectViewStatePatch {
	if (!isRecord(value)) {
		return false;
	}

	return ["visible", "locked", "isolated"].every(
		(key) => value[key] === undefined || typeof value[key] === "boolean",
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
