export type Entity = number;

export const INVALID_ENTITY: Entity = 0;

export type EntityIdAllocatorOptions = {
	startAt?: Entity;
};

export class EntityIdAllocator {
	private nextId: Entity;
	private readonly startAt: Entity;

	constructor(options: EntityIdAllocatorOptions = {}) {
		const startAt = options.startAt ?? 1;

		if (!Number.isSafeInteger(startAt) || startAt <= INVALID_ENTITY) {
			throw new Error(
				`Entity IDs must start at a positive safe integer. Received ${startAt}.`,
			);
		}

		this.startAt = startAt;
		this.nextId = startAt;
	}

	allocate(): Entity {
		if (!Number.isSafeInteger(this.nextId)) {
			throw new Error("Entity ID allocator exhausted safe integer range.");
		}

		const entity = this.nextId;
		this.nextId += 1;
		return entity;
	}

	peek(): Entity {
		return this.nextId;
	}

	reset(startAt = this.startAt): void {
		if (!Number.isSafeInteger(startAt) || startAt <= INVALID_ENTITY) {
			throw new Error(
				`Entity IDs must reset to a positive safe integer. Received ${startAt}.`,
			);
		}

		this.nextId = startAt;
	}
}
