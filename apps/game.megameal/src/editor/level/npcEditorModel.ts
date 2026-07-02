export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export type LevelNpcSourceFile = {
	readonly name: string;
	readonly path: string;
	readonly sourceHash: string;
	readonly data: Record<string, JsonValue>;
};

export type LevelNpcPackage = {
	readonly groups: readonly LevelNpcSourceFile[];
	readonly archetypes: readonly LevelNpcSourceFile[];
};

export type NpcCollection = {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
};

export type NpcCollectionSection = {
	readonly id: string;
	readonly label: string;
	readonly description?: string;
	readonly instances: readonly {
		readonly instance: Record<string, JsonValue>;
		readonly instanceIndex: number;
	}[];
};

type MutableNpcCollectionSection = Omit<NpcCollectionSection, "instances"> & {
	instances: {
		instance: Record<string, JsonValue>;
		instanceIndex: number;
	}[];
};

export const unassignedNpcCollectionId = "__unassigned";

export function npcGroupInstances(
	group: LevelNpcSourceFile,
): Record<string, JsonValue>[] {
	return Array.isArray(group.data.instances)
		? group.data.instances.filter(hasRecordValue)
		: [];
}

export function npcGroupCollections(
	group: LevelNpcSourceFile,
): readonly NpcCollection[] {
	return Array.isArray(group.data.collections)
		? group.data.collections.filter(isNpcCollection)
		: [];
}

export function npcCollectionSections(
	group: LevelNpcSourceFile,
): readonly NpcCollectionSection[] {
	const collections = npcGroupCollections(group);
	const collectionIds = new Set(collections.map((collection) => collection.id));
	const sections: MutableNpcCollectionSection[] = collections.map(
		(collection) => ({
			...collection,
			instances: [],
		}),
	);
	const unassigned: MutableNpcCollectionSection = {
		id: unassignedNpcCollectionId,
		label: "Unassigned",
		description: "NPCs without a collection assignment.",
		instances: [],
	};

	for (const [instanceIndex, instance] of npcGroupInstances(group).entries()) {
		const collectionId =
			typeof instance.collectionId === "string" ? instance.collectionId : "";
		const section = collectionIds.has(collectionId)
			? sections.find((entry) => entry.id === collectionId)
			: unassigned;
		section?.instances.push({ instance, instanceIndex });
	}

	return [...sections, unassigned].filter(
		(section) => section.instances.length > 0 || section.id !== unassigned.id,
	);
}

export function updateNpcGroup(
	npcPackage: LevelNpcPackage,
	groupIndex: number,
	update: (group: LevelNpcSourceFile) => LevelNpcSourceFile,
): LevelNpcPackage {
	return {
		...npcPackage,
		groups: npcPackage.groups.map((group, currentGroupIndex) =>
			currentGroupIndex === groupIndex ? update(group) : group,
		),
	};
}

export function updateNpcInstance(
	npcPackage: LevelNpcPackage,
	groupIndex: number,
	instanceIndex: number,
	update: (instance: Record<string, JsonValue>) => Record<string, JsonValue>,
): LevelNpcPackage {
	return updateNpcGroup(npcPackage, groupIndex, (group) => {
		const instances = npcGroupInstances(group);
		return {
			...group,
			data: {
				...group.data,
				instances: instances.map((instance, currentInstanceIndex) =>
					currentInstanceIndex === instanceIndex ? update(instance) : instance,
				),
			},
		};
	});
}

function isNpcCollection(value: unknown): value is NpcCollection {
	return (
		hasRecordValue(value) &&
		typeof value.id === "string" &&
		typeof value.label === "string"
	);
}

function hasRecordValue(value: unknown): value is Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
