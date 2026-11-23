<script lang="ts">
type JsonValue =
	| string
	| number
	| boolean
	| null
	| readonly JsonValue[]
	| { readonly [key: string]: JsonValue };

type Props = {
	value: JsonValue;
	path?: string;
	label?: string;
	disabled?: boolean;
	onChange: (value: JsonValue) => void;
};

const {
	value,
	path = "value",
	label = path,
	disabled = false,
	onChange,
}: Props = $props();

const valueType = $derived(
	Array.isArray(value) ? "array" : value === null ? "null" : typeof value,
);
const entries = $derived(
	isRecord(value)
		? Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
		: [],
);

function updateObjectKey(key: string, nextValue: JsonValue): void {
	if (!isRecord(value)) {
		return;
	}
	onChange({
		...value,
		[key]: nextValue,
	});
}

function updateArrayIndex(index: number, nextValue: JsonValue): void {
	if (!Array.isArray(value)) {
		return;
	}
	const nextArray = [...value];
	nextArray[index] = nextValue;
	onChange(nextArray);
}

function removeArrayIndex(index: number): void {
	if (!Array.isArray(value)) {
		return;
	}
	onChange(value.filter((_, currentIndex) => currentIndex !== index));
}

function addArrayItem(): void {
	if (!Array.isArray(value)) {
		return;
	}
	const template = value[0];
	onChange([...value, cloneTemplate(template)]);
}

function cloneTemplate(template: JsonValue | undefined): JsonValue {
	if (template === undefined) {
		return "";
	}
	if (Array.isArray(template)) {
		return [];
	}
	if (isRecord(template)) {
		return Object.fromEntries(
			Object.entries(template).map(([key, entry]) => [
				key,
				cloneTemplate(entry),
			]),
		);
	}
	switch (typeof template) {
		case "number":
			return 0;
		case "boolean":
			return false;
		case "string":
			return "";
		default:
			return null;
	}
}

function parseNumber(valueText: string): number {
	const number = Number(valueText);
	return Number.isFinite(number) ? number : 0;
}

function isRecord(
	value: JsonValue,
): value is { readonly [key: string]: JsonValue } {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function itemLabel(value: JsonValue, index: number): string {
	if (isRecord(value)) {
		const id = value.id;
		const stableId = value.stableId;
		if (typeof id === "string" && id) {
			return id;
		}
		if (typeof stableId === "string" && stableId) {
			return stableId;
		}
	}
	return `Item ${index + 1}`;
}
</script>

<div class="structured-editor" data-type={valueType}>
	{#if valueType === "string"}
		<label>
			<span>{label}</span>
			<input
				value={value as string}
				{disabled}
				oninput={(event) => onChange(event.currentTarget.value)}
			/>
		</label>
	{:else if valueType === "number"}
		<label>
			<span>{label}</span>
			<input
				type="number"
				step="0.001"
				value={value as number}
				{disabled}
				oninput={(event) => onChange(parseNumber(event.currentTarget.value))}
			/>
		</label>
	{:else if valueType === "boolean"}
		<label class="checkbox-field">
			<input
				type="checkbox"
				checked={value as boolean}
				{disabled}
				onchange={(event) => onChange(event.currentTarget.checked)}
			/>
			<span>{label}</span>
		</label>
	{:else if valueType === "null"}
		<label>
			<span>{label}</span>
			<input value="null" disabled />
		</label>
	{:else if Array.isArray(value)}
		<section class="nested-group">
			<header>
				<h3>{label}</h3>
				<button type="button" {disabled} onclick={addArrayItem}>Add</button>
			</header>
			{#if value.length === 0}
				<p>No items.</p>
			{/if}
			{#each value as item, index}
				<div class="array-item">
					<div class="array-item-header">
						<span>{index + 1}</span>
						<button
							type="button"
							{disabled}
							onclick={() => removeArrayIndex(index)}
						>
							Remove
						</button>
					</div>
					<svelte:self
						value={item}
						path={`${path}.${index}`}
						label={itemLabel(item, index)}
						{disabled}
						onChange={(nextValue) => updateArrayIndex(index, nextValue)}
					/>
				</div>
			{/each}
		</section>
	{:else if isRecord(value)}
		<section class="nested-group">
			<header>
				<h3>{label}</h3>
			</header>
			<div class="object-grid">
				{#each entries as [key, entry]}
					<svelte:self
						value={entry}
						path={`${path}.${key}`}
						label={key}
						{disabled}
						onChange={(nextValue) => updateObjectKey(key, nextValue)}
					/>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.structured-editor {
		min-width: 0;
	}

	label {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
	}

	label span,
	h3,
	.array-item-header span,
	p {
		color: rgba(244, 240, 232, 0.68);
		font-size: 0.78rem;
	}

	input {
		min-height: 2.15rem;
		box-sizing: border-box;
		border: 1px solid rgba(244, 240, 232, 0.18);
		border-radius: 6px;
		background: rgba(11, 14, 19, 0.92);
		color: #f4f0e8;
		padding: 0 0.65rem;
		font: inherit;
	}

	.checkbox-field {
		display: flex;
		gap: 0.55rem;
		align-items: center;
		min-height: 2.15rem;
	}

	.checkbox-field input {
		min-height: 0;
		width: 1rem;
		height: 1rem;
		padding: 0;
	}

	.nested-group {
		display: grid;
		gap: 0.75rem;
		min-width: 0;
		padding: 0.85rem;
		border: 1px solid rgba(244, 240, 232, 0.14);
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.032);
	}

	header,
	.array-item-header {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		justify-content: space-between;
	}

	h3,
	p {
		margin: 0;
	}

	button {
		min-height: 2rem;
		border: 1px solid rgba(101, 211, 200, 0.38);
		border-radius: 6px;
		background: rgba(101, 211, 200, 0.12);
		color: #f4f0e8;
		cursor: pointer;
		font: inherit;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.object-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(12rem, 1fr));
		gap: 0.75rem;
		min-width: 0;
	}

	.array-item {
		display: grid;
		gap: 0.6rem;
		min-width: 0;
		padding: 0.75rem;
		border: 1px solid rgba(244, 240, 232, 0.12);
		border-radius: 8px;
		background: rgba(11, 14, 19, 0.45);
	}

	@media (max-width: 760px) {
		.object-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
