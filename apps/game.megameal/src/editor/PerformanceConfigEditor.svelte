<script lang="ts">
type PerformanceSystemId = "lod" | "culling" | "streaming" | "collision";
type PerformanceSystemMode =
	| "off"
	| "diagnostic"
	| "distance"
	| "plan"
	| "spatial";
type PerformanceLodTier = {
	id: string;
	minDistance: number;
	maxDistance?: number;
	qualityRatio?: number;
};
type PerformanceDistanceWindow = {
	maxDistance?: number;
	hysteresis?: number;
};
type PerformanceResidencyWindow = {
	loadDistance?: number;
	unloadDistance?: number;
};
type PerformancePrimitiveShape = "box" | "sphere" | "capsule" | "cylinder";
type PerformanceConfig = {
	schemaVersion: 1;
	systems: {
		lod: {
			mode: PerformanceSystemMode;
			tiers?: PerformanceLodTier[];
		};
		culling: {
			mode: PerformanceSystemMode;
			visibility?: {
				frustum?: boolean;
				distance?: PerformanceDistanceWindow;
			};
		};
		streaming: {
			mode: PerformanceSystemMode;
			residency?: {
				assets?: PerformanceResidencyWindow;
				renderables?: PerformanceResidencyWindow;
				collision?: PerformanceResidencyWindow;
			};
		};
		collision: {
			mode: PerformanceSystemMode;
			diagnostics?: {
				primitiveShapes?: PerformancePrimitiveShape[];
				includeMeshColliders?: boolean;
				includeWalkableOnly?: boolean;
			};
		};
	};
};

type Props = {
	value: PerformanceConfig;
	disabled?: boolean;
	onChange: (value: PerformanceConfig) => void;
};

const { value, disabled = false, onChange }: Props = $props();

const systemModeOptions: Record<
	PerformanceSystemId,
	readonly { readonly value: PerformanceSystemMode; readonly label: string }[]
> = {
	lod: [
		{ value: "off", label: "Off" },
		{ value: "diagnostic", label: "Diagnostic" },
		{ value: "distance", label: "Distance" },
	],
	culling: [
		{ value: "off", label: "Off" },
		{ value: "diagnostic", label: "Diagnostic" },
		{ value: "distance", label: "Distance" },
	],
	streaming: [
		{ value: "off", label: "Off" },
		{ value: "diagnostic", label: "Diagnostic" },
		{ value: "plan", label: "Plan" },
	],
	collision: [
		{ value: "off", label: "Off" },
		{ value: "diagnostic", label: "Diagnostic" },
		{ value: "spatial", label: "Spatial" },
	],
};
const systemLabels: Record<PerformanceSystemId, string> = {
	lod: "LOD",
	culling: "Culling",
	streaming: "Streaming",
	collision: "Collision",
};
const primitiveShapes: readonly PerformancePrimitiveShape[] = [
	"box",
	"sphere",
	"capsule",
	"cylinder",
];
const residencyGroups = ["assets", "renderables", "collision"] as const;

function updateSystem<TSystem extends PerformanceSystemId>(
	systemId: TSystem,
	nextSystem: PerformanceConfig["systems"][TSystem],
): void {
	onChange({
		...value,
		systems: {
			...value.systems,
			[systemId]: nextSystem,
		},
	});
}

function updateMode(
	systemId: PerformanceSystemId,
	mode: PerformanceSystemMode,
): void {
	updateSystem(systemId, {
		...value.systems[systemId],
		mode,
	} as PerformanceConfig["systems"][typeof systemId]);
}

function addLodTier(): void {
	const tiers = value.systems.lod.tiers ?? [];
	updateSystem("lod", {
		...value.systems.lod,
		tiers: [
			...tiers,
			{
				id: `tier-${tiers.length + 1}`,
				minDistance: tiers.at(-1)?.maxDistance ?? 0,
				qualityRatio: 1,
			},
		],
	});
}

function updateLodTier(
	index: number,
	field: keyof PerformanceLodTier,
	nextValue: string | number | undefined,
): void {
	const tiers = [...(value.systems.lod.tiers ?? [])];
	const current = tiers[index];

	if (!current) {
		return;
	}

	const nextTier: PerformanceLodTier = { ...current };

	if (field === "id") {
		nextTier.id = String(nextValue ?? "");
	} else if (field === "minDistance") {
		nextTier.minDistance = Number(nextValue ?? 0);
	} else if (nextValue === undefined) {
		delete nextTier[field];
	} else {
		nextTier[field] = Number(nextValue);
	}

	tiers[index] = nextTier;
	updateSystem("lod", {
		...value.systems.lod,
		tiers,
	});
}

function removeLodTier(index: number): void {
	updateSystem("lod", {
		...value.systems.lod,
		tiers: (value.systems.lod.tiers ?? []).filter(
			(_, currentIndex) => currentIndex !== index,
		),
	});
}

function updateCullingDistance(
	field: keyof PerformanceDistanceWindow,
	nextValue: number | undefined,
): void {
	const distance = withOptionalNumber(
		value.systems.culling.visibility?.distance ?? {},
		field,
		nextValue,
	);
	updateSystem("culling", {
		...value.systems.culling,
		visibility: {
			...(value.systems.culling.visibility ?? {}),
			distance,
		},
	});
}

function updateCullingFrustum(enabled: boolean): void {
	updateSystem("culling", {
		...value.systems.culling,
		visibility: {
			...(value.systems.culling.visibility ?? {}),
			frustum: enabled,
		},
	});
}

function updateResidencyWindow(
	group: (typeof residencyGroups)[number],
	field: keyof PerformanceResidencyWindow,
	nextValue: number | undefined,
): void {
	const window = withOptionalNumber(
		value.systems.streaming.residency?.[group] ?? {},
		field,
		nextValue,
	);
	updateSystem("streaming", {
		...value.systems.streaming,
		residency: {
			...(value.systems.streaming.residency ?? {}),
			[group]: window,
		},
	});
}

function updateCollisionDiagnosticFlag(
	field: "includeMeshColliders" | "includeWalkableOnly",
	enabled: boolean,
): void {
	updateSystem("collision", {
		...value.systems.collision,
		diagnostics: {
			...(value.systems.collision.diagnostics ?? {}),
			[field]: enabled,
		},
	});
}

function updateCollisionPrimitiveShape(
	shape: PerformancePrimitiveShape,
	enabled: boolean,
): void {
	const current = new Set(
		value.systems.collision.diagnostics?.primitiveShapes ?? [],
	);

	if (enabled) {
		current.add(shape);
	} else {
		current.delete(shape);
	}

	updateSystem("collision", {
		...value.systems.collision,
		diagnostics: {
			...(value.systems.collision.diagnostics ?? {}),
			primitiveShapes: [...current],
		},
	});
}

function optionalNumberFromInput(rawValue: string): number | undefined {
	const trimmed = rawValue.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return Number(trimmed);
}

function withOptionalNumber<TRecord extends Record<string, number | undefined>>(
	record: TRecord,
	field: keyof TRecord,
	nextValue: number | undefined,
): TRecord {
	const next = { ...record };
	if (nextValue === undefined) {
		delete next[field];
	} else {
		next[field] = nextValue as TRecord[keyof TRecord];
	}
	return next;
}
</script>

<div class="performance-config-editor">
	<section class="settings-section">
		<h3>Modes</h3>
		<div class="settings-grid">
			{#each Object.keys(systemLabels) as systemId}
				<label>
					<span>{systemLabels[systemId as PerformanceSystemId]}</span>
					<select
						value={value.systems[systemId as PerformanceSystemId].mode}
						{disabled}
						onchange={(event) =>
							updateMode(
								systemId as PerformanceSystemId,
								event.currentTarget.value as PerformanceSystemMode,
							)}
					>
						{#each systemModeOptions[systemId as PerformanceSystemId] as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</label>
			{/each}
		</div>
	</section>

	<section class="settings-section">
		<div class="settings-panel-header">
			<h3>LOD Tiers</h3>
			<button type="button" {disabled} onclick={addLodTier}>Add Tier</button>
		</div>
		<div class="settings-grid">
			{#each value.systems.lod.tiers ?? [] as tier, index}
				<label>
					<span>Tier ID</span>
					<input
						type="text"
						value={tier.id}
						{disabled}
						oninput={(event) =>
							updateLodTier(index, "id", event.currentTarget.value)}
					/>
				</label>
				<label>
					<span>Min Distance</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={String(tier.minDistance)}
						{disabled}
						oninput={(event) =>
							updateLodTier(index, "minDistance", Number(event.currentTarget.value))}
					/>
				</label>
				<label>
					<span>Max Distance</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={String(tier.maxDistance ?? "")}
						{disabled}
						oninput={(event) =>
							updateLodTier(
								index,
								"maxDistance",
								optionalNumberFromInput(event.currentTarget.value),
							)}
					/>
				</label>
				<label>
					<span>Quality Ratio</span>
					<input
						type="number"
						min="0.01"
						step="0.01"
						value={String(tier.qualityRatio ?? "")}
						{disabled}
						oninput={(event) =>
							updateLodTier(
								index,
								"qualityRatio",
								optionalNumberFromInput(event.currentTarget.value),
							)}
					/>
				</label>
				<button type="button" {disabled} onclick={() => removeLodTier(index)}>
					Remove
				</button>
			{/each}
		</div>
	</section>

	<section class="settings-section">
		<h3>Culling</h3>
		<div class="settings-grid">
			<label>
				<span>Max Distance</span>
				<input
					type="number"
					min="0"
					step="0.1"
					value={String(value.systems.culling.visibility?.distance?.maxDistance ?? "")}
					{disabled}
					oninput={(event) =>
						updateCullingDistance(
							"maxDistance",
							optionalNumberFromInput(event.currentTarget.value),
						)}
				/>
			</label>
			<label>
				<span>Hysteresis</span>
				<input
					type="number"
					min="0"
					step="0.1"
					value={String(value.systems.culling.visibility?.distance?.hysteresis ?? "")}
					{disabled}
					oninput={(event) =>
						updateCullingDistance(
							"hysteresis",
							optionalNumberFromInput(event.currentTarget.value),
						)}
				/>
			</label>
			<label>
				<span>Frustum</span>
				<input
					type="checkbox"
					checked={value.systems.culling.visibility?.frustum ?? false}
					{disabled}
					onchange={(event) => updateCullingFrustum(event.currentTarget.checked)}
				/>
			</label>
		</div>
	</section>

	<section class="settings-section">
		<h3>Streaming Residency</h3>
		<div class="settings-grid">
			{#each residencyGroups as group}
				<label>
					<span>{group} load</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={String(value.systems.streaming.residency?.[group]?.loadDistance ?? "")}
						{disabled}
						oninput={(event) =>
							updateResidencyWindow(
								group,
								"loadDistance",
								optionalNumberFromInput(event.currentTarget.value),
							)}
					/>
				</label>
				<label>
					<span>{group} unload</span>
					<input
						type="number"
						min="0"
						step="0.1"
						value={String(value.systems.streaming.residency?.[group]?.unloadDistance ?? "")}
						{disabled}
						oninput={(event) =>
							updateResidencyWindow(
								group,
								"unloadDistance",
								optionalNumberFromInput(event.currentTarget.value),
							)}
					/>
				</label>
			{/each}
		</div>
	</section>

	<section class="settings-section">
		<h3>Collision Diagnostics</h3>
		<div class="settings-grid">
			<label>
				<span>Mesh Colliders</span>
				<input
					type="checkbox"
					checked={value.systems.collision.diagnostics?.includeMeshColliders ?? false}
					{disabled}
					onchange={(event) =>
						updateCollisionDiagnosticFlag(
							"includeMeshColliders",
							event.currentTarget.checked,
						)}
				/>
			</label>
			<label>
				<span>Walkable Only</span>
				<input
					type="checkbox"
					checked={value.systems.collision.diagnostics?.includeWalkableOnly ?? false}
					{disabled}
					onchange={(event) =>
						updateCollisionDiagnosticFlag(
							"includeWalkableOnly",
							event.currentTarget.checked,
						)}
				/>
			</label>
			{#each primitiveShapes as shape}
				<label>
					<span>{shape}</span>
					<input
						type="checkbox"
						checked={value.systems.collision.diagnostics?.primitiveShapes?.includes(
							shape,
						) ?? false}
						{disabled}
						onchange={(event) =>
							updateCollisionPrimitiveShape(shape, event.currentTarget.checked)}
					/>
				</label>
			{/each}
		</div>
	</section>
</div>
