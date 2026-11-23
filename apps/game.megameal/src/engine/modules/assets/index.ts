import {
	type CubemapFaceUrlsData,
	type MaterialParametersData,
	type SpriteAssetParametersData,
	type TextureProjectionData,
	type VideoAssetMetadataData,
	assetManifestValidator,
} from "../../data/index.js";

export type AssetId = string;

export type AssetKind =
	| "mesh"
	| "material"
	| "sprite"
	| "texture"
	| "cubemap"
	| "video"
	| "audio"
	| "animation"
	| "prefab"
	| "scene"
	| "data";

export type AssetManifestEntry = {
	readonly id: AssetId;
	readonly kind: AssetKind;
	readonly url: string;
	readonly faces?: CubemapFaceUrlsData;
	readonly projection?: TextureProjectionData;
	readonly video?: VideoAssetMetadataData;
	readonly material?: MaterialParametersData;
	readonly sprite?: SpriteAssetParametersData;
	readonly colorSpace?: "srgb" | "linear";
	readonly tags?: readonly string[];
};

export type AssetManifest = {
	readonly assets: readonly AssetManifestEntry[];
	readonly preloadGroups?: Record<string, readonly AssetId[]>;
};

export type AssetManagerPort = {
	registerManifest(manifest: AssetManifest): void;
	registerLoader(kind: AssetKind, loader: AssetLoader): void;
	registerDisposer(kind: AssetKind, disposer: AssetDisposer): void;
	load(id: AssetId): Promise<unknown>;
	preload(ids: readonly AssetId[]): Promise<void>;
	preloadGroup(groupId: string): Promise<void>;
	getPreloadGroup(groupId: string): readonly AssetId[];
	get(id: AssetId): unknown;
	getEntry(id: AssetId): AssetManifestEntry;
	has(id: AssetId): boolean;
	retain(id: AssetId): void;
	release(id: AssetId): void;
	unload(id: AssetId): void;
	refCount(id: AssetId): number;
	listLoaded(): readonly AssetId[];
};

export type AssetLoader = (entry: AssetManifestEntry) => Promise<unknown>;
export type AssetDisposer = (asset: unknown, entry: AssetManifestEntry) => void;

type AssetRecord = {
	readonly entry: AssetManifestEntry;
	asset?: unknown;
	refCount: number;
};

export class AssetManager implements AssetManagerPort {
	#assets = new Map<AssetId, AssetRecord>();
	#loaders = new Map<AssetKind, AssetLoader>();
	#disposers = new Map<AssetKind, AssetDisposer>();
	#preloadGroups = new Map<string, readonly AssetId[]>();

	constructor(manifest: AssetManifest = { assets: [] }) {
		this.registerManifest(manifest);
	}

	registerManifest(manifest: AssetManifest): void {
		assetManifestValidator.parse(manifest);

		for (const entry of manifest.assets) {
			const existing = this.#assets.get(entry.id);

			if (
				existing &&
				assetEntrySignature(existing.entry) !== assetEntrySignature(entry)
			) {
				throw new Error(
					`Asset "${entry.id}" is already registered with a different definition.`,
				);
			}
		}

		for (const [groupId, assetIds] of Object.entries(
			manifest.preloadGroups ?? {},
		)) {
			const existing = this.#preloadGroups.get(groupId);

			if (existing && existing.join("\u0000") !== assetIds.join("\u0000")) {
				throw new Error(
					`Asset preload group "${groupId}" is already registered with a different asset list.`,
				);
			}
		}

		for (const entry of manifest.assets) {
			if (this.#assets.has(entry.id)) {
				continue;
			}

			this.#assets.set(entry.id, {
				entry,
				refCount: 0,
			});
		}

		if (manifest.preloadGroups) {
			for (const [groupId, assetIds] of Object.entries(
				manifest.preloadGroups,
			)) {
				if (this.#preloadGroups.has(groupId)) {
					continue;
				}

				this.#preloadGroups.set(groupId, [...assetIds]);
			}
		}
	}

	registerLoader(kind: AssetKind, loader: AssetLoader): void {
		this.#loaders.set(kind, loader);
	}

	registerDisposer(kind: AssetKind, disposer: AssetDisposer): void {
		this.#disposers.set(kind, disposer);
	}

	async load(id: AssetId): Promise<unknown> {
		const record = this.#requireRecord(id);

		if (record.asset !== undefined) {
			return record.asset;
		}

		const loader = this.#loaders.get(record.entry.kind);

		if (!loader) {
			throw new Error(
				`No loader registered for asset kind "${record.entry.kind}".`,
			);
		}

		record.asset = await loader(record.entry);
		return record.asset;
	}

	async preload(ids: readonly AssetId[]): Promise<void> {
		await Promise.all(ids.map((id) => this.load(id)));
	}

	async preloadGroup(groupId: string): Promise<void> {
		const ids = this.getPreloadGroup(groupId);
		await this.preload(ids);
	}

	getPreloadGroup(groupId: string): readonly AssetId[] {
		const ids = this.#preloadGroups.get(groupId);

		if (!ids) {
			throw new Error(`Asset preload group "${groupId}" is not registered.`);
		}

		return [...ids];
	}

	get(id: AssetId): unknown {
		return this.#requireRecord(id).asset;
	}

	getEntry(id: AssetId): AssetManifestEntry {
		return this.#requireRecord(id).entry;
	}

	has(id: AssetId): boolean {
		return this.#assets.has(id);
	}

	retain(id: AssetId): void {
		this.#requireRecord(id).refCount += 1;
	}

	release(id: AssetId): void {
		const record = this.#requireRecord(id);

		if (record.refCount === 0) {
			throw new Error(
				`Asset "${id}" cannot be released below zero references.`,
			);
		}

		record.refCount -= 1;

		if (record.refCount === 0) {
			this.unload(id);
		}
	}

	unload(id: AssetId): void {
		const record = this.#requireRecord(id);

		if (record.asset !== undefined) {
			const disposer = this.#disposers.get(record.entry.kind);
			disposer?.(record.asset, record.entry);
		}

		record.asset = undefined;
	}

	refCount(id: AssetId): number {
		return this.#requireRecord(id).refCount;
	}

	listLoaded(): readonly AssetId[] {
		return [...this.#assets.entries()]
			.filter(([, record]) => record.asset !== undefined)
			.map(([id]) => id)
			.sort();
	}

	#requireRecord(id: AssetId): AssetRecord {
		const record = this.#assets.get(id);

		if (!record) {
			throw new Error(`Asset "${id}" is not registered.`);
		}

		return record;
	}
}

function assetEntrySignature(entry: AssetManifestEntry): string {
	return JSON.stringify({
		id: entry.id,
		kind: entry.kind,
		url: entry.url,
		faces: entry.faces ?? null,
		projection: entry.projection ?? null,
		video: entry.video ?? null,
		material: entry.material ?? null,
		colorSpace: entry.colorSpace ?? null,
		tags: entry.tags ?? [],
	});
}
