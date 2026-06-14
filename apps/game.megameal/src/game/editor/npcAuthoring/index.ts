import type {
	LevelPrefabInstanceData,
	PrefabData,
	RuntimeSceneManifestData,
} from "../../../engine/data/index.js";
import type { LevelEditorAuthoringEditOperation } from "../../../engine/data/levelAuthoring/index.js";
import { defaultRuntimeSceneManifests } from "../../levels/index.js";
import {
	type FireflyPopulationDefinition,
	type FireflyPopulationMemberDefinition,
	deterministicFireflySeed,
	validateFireflyPopulationDefinition,
} from "../../populations/fireflyPopulation.js";

export type NpcAuthoringContractName =
	| "FireflyPopulationContract"
	| "InteractionRegistry"
	| "AuthoredLightContract";

export type NpcAuthoringRuntimeSupport = {
	readonly aiStack: "not-implemented";
	readonly conversation: "story-note-owner-only";
	readonly liveFlicker: "future-runtime-system";
};

export type FireflyNpcAuthoringTemplate = {
	readonly id: string;
	readonly kind: "firefly";
	readonly label: string;
	readonly prefabId: string;
	readonly stableIdPrefix: string;
	readonly contracts: readonly NpcAuthoringContractName[];
	readonly supportedOperations: readonly (
		| "insert"
		| "remove"
		| "duplicate"
		| "attach-to-selection"
	)[];
	readonly defaults: {
		readonly transform: {
			readonly position: readonly [number, number, number];
			readonly rotation: readonly [number, number, number, number];
			readonly scale: readonly [number, number, number];
		};
		readonly presentation: {
			readonly color: string;
			readonly size: number;
			readonly lightIntensity: number;
			readonly lightDistance: number;
			readonly twinkleFrequencyHz: number;
			readonly twinkleAmplitude: number;
		};
		readonly behavior: {
			readonly mode: "static" | "hover-wander";
			readonly interaction: "click";
			readonly activationRadius: number;
		};
	};
	readonly runtimeSupport: NpcAuthoringRuntimeSupport;
};

export type NpcAuthoringCatalog = {
	readonly schemaVersion: 1;
	readonly source: "game-editor-npc-authoring";
	readonly templates: readonly FireflyNpcAuthoringTemplate[];
	readonly currentPopulations: readonly FireflyPopulationDefinition[];
};

export type NpcAuthoringOperationDraft = {
	readonly operation:
		| "insert-instance"
		| "remove-instance"
		| "duplicate-instance";
	readonly status: "ready" | "requires-source-instance";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly writesFiles: false;
	readonly requiresAuthoringTransaction: true;
	readonly authoringOperations: readonly LevelEditorAuthoringEditOperation[];
};

export type InsertFireflyNpcAuthoringOperation = {
	readonly operation: "insert-firefly-npc";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly memberId: string;
	readonly instance: LevelPrefabInstanceData;
	readonly writesFiles: false;
	readonly requiresAuthoringTransaction: true;
	readonly operationDraft: NpcAuthoringOperationDraft;
};

export type RemoveNpcAuthoringOperation = {
	readonly operation: "remove-npc";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
	readonly writesFiles: false;
	readonly requiresAuthoringTransaction: true;
	readonly operationDraft: NpcAuthoringOperationDraft;
};

export type DuplicateNpcAuthoringOperation = {
	readonly operation: "duplicate-npc";
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourceStableId: string;
	readonly nextStableId: string;
	readonly writesFiles: false;
	readonly requiresAuthoringTransaction: true;
	readonly operationDraft: NpcAuthoringOperationDraft;
};

export type NpcAuthoringOperation =
	| InsertFireflyNpcAuthoringOperation
	| RemoveNpcAuthoringOperation
	| DuplicateNpcAuthoringOperation;

export const defaultFireflyNpcAuthoringTemplate =
	createFireflyNpcAuthoringTemplate(defaultFireflyPopulation());

export const defaultNpcAuthoringCatalog = buildNpcAuthoringCatalog();

export function buildNpcAuthoringCatalog(
	populations: readonly FireflyPopulationDefinition[] = fireflyPopulationsFromRuntimeScenes(
		defaultRuntimeSceneManifests,
	),
	manifests: readonly RuntimeSceneManifestData[] = defaultRuntimeSceneManifests,
): NpcAuthoringCatalog {
	const prefabsById = prefabMapFromRuntimeScenes(manifests);

	return {
		schemaVersion: 1,
		source: "game-editor-npc-authoring",
		templates: populations.map((population) =>
			createFireflyNpcAuthoringTemplate(
				population,
				prefabsById.get(population.prefabId),
			),
		),
		currentPopulations: populations,
	};
}

export function createInsertFireflyNpcOperation(options: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly memberId: string;
	readonly position: readonly [number, number, number];
	readonly scale?: readonly [number, number, number];
	readonly population?: FireflyPopulationDefinition;
}): InsertFireflyNpcAuthoringOperation {
	const population = options.population ?? defaultFireflyPopulation();
	const template = createFireflyNpcAuthoringTemplate(
		population,
		prefabMapFromRuntimeScenes(defaultRuntimeSceneManifests).get(
			population.prefabId,
		),
	);
	const seed = deterministicFireflySeed(population.id, options.memberId);
	const scale = options.scale ?? [1, 1, 1];

	return {
		operation: "insert-firefly-npc",
		runtimeSceneId: options.runtimeSceneId,
		levelId: options.levelId,
		memberId: options.memberId,
		instance: {
			id: `${population.id}-${options.memberId}`,
			prefabId: population.prefabId,
			stableId: `${population.stableIdPrefix}:${options.memberId}`,
			transform: {
				position: options.position,
				scale,
			},
			components: {
				FireflyPopulationMember: {
					populationId: population.id,
					memberId: options.memberId,
					seed,
					phase: Number(((seed % 10_000) / 10_000).toFixed(4)),
					flicker: {
						frequencyHz: template.defaults.presentation.twinkleFrequencyHz,
						amplitude: template.defaults.presentation.twinkleAmplitude,
					},
				},
			},
		},
		writesFiles: false,
		requiresAuthoringTransaction: true,
		operationDraft: {
			operation: "insert-instance",
			status: "ready",
			runtimeSceneId: options.runtimeSceneId,
			levelId: options.levelId,
			writesFiles: false,
			requiresAuthoringTransaction: true,
			authoringOperations: [
				{
					id: `npc:${options.runtimeSceneId}:insert:${population.id}:${options.memberId}`,
					kind: "insert-instance",
					persistence: "saved",
					instance: {
						id: `${population.id}-${options.memberId}`,
						prefabId: population.prefabId,
						stableId: `${population.stableIdPrefix}:${options.memberId}`,
						transform: {
							position: options.position,
							scale,
						},
						components: {
							FireflyPopulationMember: {
								populationId: population.id,
								memberId: options.memberId,
								seed,
								phase: Number(((seed % 10_000) / 10_000).toFixed(4)),
								flicker: {
									frequencyHz:
										template.defaults.presentation.twinkleFrequencyHz,
									amplitude: template.defaults.presentation.twinkleAmplitude,
								},
							},
						},
					},
					note: "NPC/firefly insert draft; save transaction owns file writes.",
				},
			],
		},
	};
}

export function createRemoveNpcOperation(options: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly stableId: string;
}): RemoveNpcAuthoringOperation {
	return {
		operation: "remove-npc",
		runtimeSceneId: options.runtimeSceneId,
		levelId: options.levelId,
		stableId: options.stableId,
		writesFiles: false,
		requiresAuthoringTransaction: true,
		operationDraft: {
			operation: "remove-instance",
			status: "ready",
			runtimeSceneId: options.runtimeSceneId,
			levelId: options.levelId,
			writesFiles: false,
			requiresAuthoringTransaction: true,
			authoringOperations: [
				{
					id: `npc:${options.runtimeSceneId}:remove:${options.stableId}`,
					kind: "remove-instance",
					persistence: "saved",
					stableId: options.stableId,
					note: "NPC/firefly remove draft; save transaction owns file writes.",
				},
			],
		},
	};
}

export function createDuplicateNpcOperation(options: {
	readonly runtimeSceneId: string;
	readonly levelId: string;
	readonly sourceStableId: string;
	readonly nextStableId: string;
	readonly sourceInstance?: LevelPrefabInstanceData;
}): DuplicateNpcAuthoringOperation {
	const duplicatedInstance =
		options.sourceInstance === undefined
			? undefined
			: duplicateNpcInstance(options.sourceInstance, options.nextStableId);

	return {
		operation: "duplicate-npc",
		runtimeSceneId: options.runtimeSceneId,
		levelId: options.levelId,
		sourceStableId: options.sourceStableId,
		nextStableId: options.nextStableId,
		writesFiles: false,
		requiresAuthoringTransaction: true,
		operationDraft: {
			operation: "duplicate-instance",
			status:
				duplicatedInstance === undefined ? "requires-source-instance" : "ready",
			runtimeSceneId: options.runtimeSceneId,
			levelId: options.levelId,
			writesFiles: false,
			requiresAuthoringTransaction: true,
			authoringOperations:
				duplicatedInstance === undefined
					? []
					: [
							{
								id: `npc:${options.runtimeSceneId}:duplicate:${options.sourceStableId}:to:${options.nextStableId}`,
								kind: "insert-instance",
								persistence: "saved",
								instance: duplicatedInstance,
								note: "NPC/firefly duplicate draft; save transaction owns file writes.",
							},
						],
		},
	};
}

export function validateNpcAuthoringCatalog(
	catalog: NpcAuthoringCatalog,
): readonly string[] {
	const errors: string[] = [];
	const templateIds = new Set<string>();

	if (catalog.schemaVersion !== 1) {
		errors.push("npcAuthoringCatalog.schemaVersion must be 1.");
	}

	if (catalog.templates.length === 0) {
		errors.push(
			"npcAuthoringCatalog.templates must contain at least one entry.",
		);
	}

	for (const population of catalog.currentPopulations) {
		errors.push(...validateFireflyPopulationDefinition(population));
	}

	for (const template of catalog.templates) {
		if (templateIds.has(template.id)) {
			errors.push(
				`npcAuthoringCatalog template "${template.id}" is duplicated.`,
			);
		}

		templateIds.add(template.id);

		if (!template.contracts.includes("FireflyPopulationContract")) {
			errors.push(
				`npcAuthoringCatalog template "${template.id}" must declare FireflyPopulationContract.`,
			);
		}

		if (template.runtimeSupport.aiStack !== "not-implemented") {
			errors.push(
				`npcAuthoringCatalog template "${template.id}" must not claim a runtime NPC AI stack.`,
			);
		}

		if (!template.supportedOperations.includes("insert")) {
			errors.push(
				`npcAuthoringCatalog template "${template.id}" must support explicit insert operations.`,
			);
		}
	}

	return errors;
}

export function validateNpcAuthoringOperationDraft(
	operation: NpcAuthoringOperation,
): readonly string[] {
	const errors: string[] = [];
	const draft = operation.operationDraft;

	if (operation.writesFiles !== false || draft.writesFiles !== false) {
		errors.push("NPC authoring operations must not write files directly.");
	}

	if (
		operation.requiresAuthoringTransaction !== true ||
		draft.requiresAuthoringTransaction !== true
	) {
		errors.push(
			"NPC authoring operations must require an authoring transaction.",
		);
	}

	if (draft.status === "ready" && draft.authoringOperations.length === 0) {
		errors.push(
			"Ready NPC authoring operation drafts must include operations.",
		);
	}

	for (const authoringOperation of draft.authoringOperations) {
		if (authoringOperation.persistence !== "saved") {
			errors.push(
				`NPC authoring operation "${authoringOperation.id}" must be saved by the authoring transaction.`,
			);
		}

		if (
			operation.operation === "insert-firefly-npc" &&
			authoringOperation.kind !== "insert-instance"
		) {
			errors.push("Firefly insert drafts must use insert-instance.");
		}

		if (
			operation.operation === "remove-npc" &&
			authoringOperation.kind !== "remove-instance"
		) {
			errors.push("NPC remove drafts must use remove-instance.");
		}

		if (
			operation.operation === "duplicate-npc" &&
			authoringOperation.kind !== "insert-instance"
		) {
			errors.push("NPC duplicate drafts must insert a cloned instance.");
		}
	}

	return errors;
}

function createFireflyNpcAuthoringTemplate(
	population: FireflyPopulationDefinition,
	prefab?: PrefabData,
): FireflyNpcAuthoringTemplate {
	const light = asRecord(prefab?.components.Light);

	return {
		id: `${population.id}_authoring_template`,
		kind: "firefly",
		label: "Firefly NPC",
		prefabId: population.prefabId,
		stableIdPrefix: population.stableIdPrefix,
		contracts: [
			"FireflyPopulationContract",
			"InteractionRegistry",
			"AuthoredLightContract",
		],
		supportedOperations: [
			"insert",
			"remove",
			"duplicate",
			"attach-to-selection",
		],
		defaults: {
			transform: {
				position: [0, 4, 0],
				rotation: [0, 0, 0, 1],
				scale: [1, 1, 1],
			},
			presentation: {
				color: stringValue(light.color) ?? "#f4ffb8",
				size: 1,
				lightIntensity: numberValue(light.intensity) ?? 8,
				lightDistance: numberValue(light.distance) ?? 34,
				twinkleFrequencyHz: 0.64,
				twinkleAmplitude: 0.2,
			},
			behavior: {
				mode: "static",
				interaction: "click",
				activationRadius: 2.4,
			},
		},
		runtimeSupport: {
			aiStack: "not-implemented",
			conversation: "story-note-owner-only",
			liveFlicker: "future-runtime-system",
		},
	};
}

function duplicateNpcInstance(
	sourceInstance: LevelPrefabInstanceData,
	nextStableId: string,
): LevelPrefabInstanceData {
	return {
		...cloneValue(sourceInstance),
		id: `${sourceInstance.id}-duplicate`,
		stableId: nextStableId,
	};
}

function defaultFireflyPopulation(): FireflyPopulationDefinition {
	const population = fireflyPopulationsFromRuntimeScenes(
		defaultRuntimeSceneManifests,
	)[0];

	if (!population) {
		return {
			id: "default_firefly_population",
			prefabId: "firefly_marker",
			stableIdPrefix: "firefly",
			members: [
				{
					id: "new",
					position: [0, 4, 0],
				},
			],
		};
	}

	return population;
}

function fireflyPopulationsFromRuntimeScenes(
	manifests: readonly RuntimeSceneManifestData[],
): readonly FireflyPopulationDefinition[] {
	const populations = new Map<
		string,
		{
			readonly id: string;
			readonly prefabId: string;
			readonly stableIdPrefix: string;
			readonly members: FireflyPopulationMemberDefinition[];
		}
	>();

	for (const manifest of manifests) {
		for (const instance of manifest.level.instances) {
			const member = asRecord(instance.components?.FireflyPopulationMember);
			const populationId = stringValue(member.populationId);
			const memberId = stringValue(member.memberId);

			if (!populationId || !memberId) {
				continue;
			}

			const existing = populations.get(populationId);
			const population = existing ?? {
				id: populationId,
				prefabId: instance.prefabId,
				stableIdPrefix: stableIdPrefixForMember(instance.stableId, memberId),
				members: [],
			};
			const position = tuple3(instance.transform?.position) ?? [0, 4, 0];
			const scale = tuple3(instance.transform?.scale);
			const seed = nonNegativeIntegerValue(member.seed);
			const phase = alphaValue(member.phase);
			const flicker = fireflyFlickerValue(member.flicker);
			let populationMember: FireflyPopulationMemberDefinition = {
				id: memberId,
				position,
			};

			if (scale !== undefined) {
				populationMember = { ...populationMember, scale };
			}

			if (seed !== undefined) {
				populationMember = { ...populationMember, seed };
			}

			if (phase !== undefined) {
				populationMember = { ...populationMember, phase };
			}

			if (flicker !== undefined) {
				populationMember = { ...populationMember, flicker };
			}

			population.members.push(populationMember);

			populations.set(populationId, population);
		}
	}

	return [...populations.values()]
		.map((population) => ({
			...population,
			members: [...population.members].sort((left, right) =>
				left.id.localeCompare(right.id),
			),
		}))
		.sort((left, right) => left.id.localeCompare(right.id));
}

function prefabMapFromRuntimeScenes(
	manifests: readonly RuntimeSceneManifestData[],
): ReadonlyMap<string, PrefabData> {
	const prefabs = new Map<string, PrefabData>();

	for (const manifest of manifests) {
		for (const prefab of manifest.prefabs) {
			prefabs.set(prefab.id, prefab);
		}
	}

	return prefabs;
}

function stableIdPrefixForMember(stableId: string, memberId: string): string {
	const memberSuffix = `:${memberId}`;

	if (stableId.endsWith(memberSuffix)) {
		return stableId.slice(0, -memberSuffix.length);
	}

	const lastSeparator = stableId.lastIndexOf(":");

	return lastSeparator === -1 ? stableId : stableId.slice(0, lastSeparator);
}

function tuple3(value: unknown): readonly [number, number, number] | undefined {
	if (!Array.isArray(value) || value.length !== 3) {
		return undefined;
	}

	const [x, y, z] = value;

	return typeof x === "number" &&
		Number.isFinite(x) &&
		typeof y === "number" &&
		Number.isFinite(y) &&
		typeof z === "number" &&
		Number.isFinite(z)
		? [x, y, z]
		: undefined;
}

function nonNegativeIntegerValue(value: unknown): number | undefined {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: undefined;
}

function alphaValue(value: unknown): number | undefined {
	return typeof value === "number" &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= 1
		? value
		: undefined;
}

function fireflyFlickerValue(
	value: unknown,
): FireflyPopulationMemberDefinition["flicker"] | undefined {
	const record = asRecord(value);
	const frequencyHz = numberValue(record.frequencyHz);
	const amplitude = alphaValue(record.amplitude);

	return frequencyHz !== undefined && frequencyHz > 0 && amplitude !== undefined
		? { frequencyHz, amplitude }
		: undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}

	return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

function cloneValue<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}
