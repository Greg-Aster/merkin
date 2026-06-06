export type DataLoader<TData = unknown> = {
	load(id: string): Promise<TData>;
};

export class InMemoryDataLoader<TData = unknown> implements DataLoader<TData> {
	readonly #entries: ReadonlyMap<string, TData>;

	constructor(entries: Iterable<readonly [string, TData]>) {
		this.#entries = new Map(entries);
	}

	async load(id: string): Promise<TData> {
		const value = this.#entries.get(id);

		if (value === undefined) {
			throw new Error(`Data entry "${id}" is not registered.`);
		}

		return value;
	}
}
