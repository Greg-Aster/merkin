<script lang="ts">
import StructuredValueEditor from "./StructuredValueEditor.svelte";
import {
	type JsonValue,
	type LevelNpcPackage,
	npcCollectionSections,
	npcGroupCollections,
	npcGroupInstances,
	unassignedNpcCollectionId,
	updateNpcGroup,
	updateNpcInstance,
} from "./npcEditorModel.js";

type Props = {
	npcPackage: LevelNpcPackage;
	disabled?: boolean;
	onChange: (npcPackage: LevelNpcPackage) => void;
	onSave: (label: string) => void;
};

const { npcPackage, disabled = false, onChange, onSave }: Props = $props();

const npcGroupCount = $derived(npcPackage.groups.length);
const npcArchetypeCount = $derived(npcPackage.archetypes.length);

function updateGroupDefaultRecordField(
	groupIndex: number,
	recordKey: string,
	key: string,
	value: JsonValue,
): void {
	onChange(
		updateNpcGroup(npcPackage, groupIndex, (group) => {
			const defaults = toRecord(group.data.defaults);
			const record = toRecord(defaults[recordKey]);
			return {
				...group,
				data: {
					...group.data,
					defaults: {
						...defaults,
						[recordKey]: {
							...record,
							[key]: value,
						},
					},
				},
			};
		}),
	);
}

function updateGroupLightPeriodValue(
	groupIndex: number,
	periodIndex: number,
	value: number,
): void {
	const modulation = groupDefaultRecord(groupIndex, "lightModulation");
	const period = numberTuple2(modulation.blinkPeriodSeconds, [8, 15]);
	period[periodIndex] = value;
	updateGroupDefaultRecordField(
		groupIndex,
		"lightModulation",
		"blinkPeriodSeconds",
		period,
	);
}

function updateGroupPlacementField(
	groupIndex: number,
	key: string,
	value: JsonValue,
): void {
	updateGroupDefaultRecordField(groupIndex, "placement", key, value);
}

function updateCollectionField(
	groupIndex: number,
	collectionIndex: number,
	key: string,
	value: JsonValue,
): void {
	onChange(
		updateNpcGroup(npcPackage, groupIndex, (group) => {
			const collections = npcGroupCollections(group);
			return {
				...group,
				data: {
					...group.data,
					collections: collections.map((collection, currentIndex) =>
						currentIndex === collectionIndex
							? { ...collection, [key]: value }
							: collection,
					),
				},
			};
		}),
	);
}

function addCollection(groupIndex: number): void {
	onChange(
		updateNpcGroup(npcPackage, groupIndex, (group) => {
			const collections = npcGroupCollections(group);
			const nextIndex = collections.length + 1;
			return {
				...group,
				data: {
					...group.data,
					collections: [
						...collections,
						{
							id: `collection-${nextIndex}`,
							label: `Collection ${nextIndex}`,
						},
					],
				},
			};
		}),
	);
}

function updateInstanceField(
	groupIndex: number,
	instanceIndex: number,
	key: string,
	value: JsonValue,
): void {
	onChange(
		updateNpcInstance(npcPackage, groupIndex, instanceIndex, (instance) => ({
			...instance,
			[key]: value,
		})),
	);
}

function updateInstanceRecordField(
	groupIndex: number,
	instanceIndex: number,
	recordKey: string,
	key: string,
	value: JsonValue,
): void {
	const instance = npcGroupInstances(
		npcPackage.groups[groupIndex] ?? {
			name: "",
			path: "",
			sourceHash: "",
			data: {},
		},
	)[instanceIndex];
	if (!instance) {
		return;
	}
	updateInstanceField(groupIndex, instanceIndex, recordKey, {
		...toRecord(instance[recordKey]),
		[key]: value,
	});
}

function updateInstanceCollectionId(
	groupIndex: number,
	instanceIndex: number,
	collectionId: string,
): void {
	onChange(
		updateNpcInstance(npcPackage, groupIndex, instanceIndex, (instance) => {
			if (collectionId === unassignedNpcCollectionId) {
				const { collectionId: _collectionId, ...nextInstance } = instance;
				return nextInstance;
			}
			return {
				...instance,
				collectionId,
			};
		}),
	);
}

function updateInstancePlacementMode(
	groupIndex: number,
	instanceIndex: number,
	mode: string,
): void {
	onChange(
		updateNpcInstance(npcPackage, groupIndex, instanceIndex, (instance) => {
			if (!mode) {
				const { placement: _placement, ...nextInstance } = instance;
				return nextInstance;
			}
			return {
				...instance,
				placement: {
					...toRecord(instance.placement),
					mode,
				},
			};
		}),
	);
}

function updateInstancePlacementHeightOffset(
	groupIndex: number,
	instanceIndex: number,
	heightOffset: number,
): void {
	onChange(
		updateNpcInstance(npcPackage, groupIndex, instanceIndex, (instance) => {
			const placement = toRecord(instance.placement);
			const mode =
				typeof placement.mode === "string" && placement.mode.length > 0
					? placement.mode
					: "walkable-ground";
			return {
				...instance,
				placement: {
					...placement,
					mode,
					heightOffset,
				},
			};
		}),
	);
}

function updateInstanceTransformVector(
	groupIndex: number,
	instanceIndex: number,
	key: "position" | "scale",
	axisIndex: number,
	value: number,
): void {
	const instance = npcGroupInstances(
		npcPackage.groups[groupIndex] ?? {
			name: "",
			path: "",
			sourceHash: "",
			data: {},
		},
	)[instanceIndex];
	if (!instance) {
		return;
	}
	const fallback = key === "scale" ? [1, 1, 1] : [0, 0, 0];
	const transform = toRecord(instance.transform);
	const vector = vector3Value(transform[key], fallback);
	vector[axisIndex] = value;
	updateInstanceField(groupIndex, instanceIndex, "transform", {
		...transform,
		[key]: vector,
	});
}

function groupDefaultRecord(
	groupIndex: number,
	recordKey: string,
): Record<string, JsonValue> {
	const group = npcPackage.groups[groupIndex];
	const defaults = toRecord(group?.data.defaults);
	return toRecord(defaults[recordKey]);
}

function toRecord(value: unknown): Record<string, JsonValue> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, JsonValue>)
		: {};
}

function vector3Value(
	value: unknown,
	fallback: readonly number[],
): [number, number, number] {
	return Array.isArray(value) && value.length === 3
		? [
				finiteNumber(value[0], fallback[0] ?? 0),
				finiteNumber(value[1], fallback[1] ?? 0),
				finiteNumber(value[2], fallback[2] ?? 0),
			]
		: [
				finiteNumber(fallback[0], 0),
				finiteNumber(fallback[1], 0),
				finiteNumber(fallback[2], 0),
			];
}

function numberTuple2(
	value: unknown,
	fallback: [number, number],
): [number, number] {
	return Array.isArray(value) && value.length === 2
		? [finiteNumber(value[0], fallback[0]), finiteNumber(value[1], fallback[1])]
		: [...fallback];
}

function finiteNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function numericField(value: unknown, fallback = 0): number {
	return finiteNumber(value, fallback);
}

function readFiniteNumberInput(input: HTMLInputElement): number {
	return Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
}

function readNonNegativeNumberInput(
	input: HTMLInputElement,
	fallback = 0,
): number {
	return Math.max(
		0,
		Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : fallback,
	);
}

function readAlphaNumberInput(input: HTMLInputElement, fallback = 0): number {
	return Math.max(
		0,
		Math.min(
			1,
			Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : fallback,
		),
	);
}
</script>

<div class="npc-workbench">
	<section class="npc-panel" aria-label="NPC groups">
		<div class="npc-panel-header">
			<div>
				<p>Local NPC Groups</p>
				<h2>{npcGroupCount} Files</h2>
			</div>
			<span class="npc-badge">editable</span>
		</div>

		{#if npcPackage.groups.length}
			{#each npcPackage.groups as group, groupIndex (group.name)}
				<article class="npc-source">
					<div class="npc-source-header">
						<div>
							<h3>{String(group.data.archetype ?? group.name)}</h3>
							<p>{group.path}</p>
						</div>
						<button
							type="button"
							disabled={disabled}
							onclick={() => onSave(String(group.data.archetype ?? group.name))}
						>
							Save
						</button>
					</div>

					<div class="npc-section">
						<div class="npc-source-header">
							<div>
								<h3>Collections</h3>
								<p>{group.name} -> collections</p>
							</div>
							<button type="button" disabled={disabled} onclick={() => addCollection(groupIndex)}>
								Add Collection
							</button>
						</div>
						<div class="npc-fields">
							{#each npcGroupCollections(group) as collection, collectionIndex (collection.id)}
								<label>
									<span>Collection ID</span>
									<input
										value={collection.id}
										disabled={disabled}
										oninput={(event) =>
											updateCollectionField(
												groupIndex,
												collectionIndex,
												"id",
												event.currentTarget.value,
											)}
									/>
								</label>
								<label>
									<span>Collection Label</span>
									<input
										value={collection.label}
										disabled={disabled}
										oninput={(event) =>
											updateCollectionField(
												groupIndex,
												collectionIndex,
												"label",
												event.currentTarget.value,
											)}
									/>
								</label>
							{/each}
						</div>
					</div>

					<div class="npc-section">
						<div class="npc-source-header">
							<div>
								<h3>Population Light Defaults</h3>
								<p>{group.name} -> defaults.lightModulation</p>
							</div>
							<span class="npc-badge">group</span>
						</div>
						<div class="npc-fields">
							<label>
								<span>Placement Mode</span>
								<select
									value={String(groupDefaultRecord(groupIndex, "placement").mode ?? "absolute")}
									disabled={disabled}
									onchange={(event) =>
										updateGroupPlacementField(
											groupIndex,
											"mode",
											event.currentTarget.value,
										)}
								>
									<option value="absolute">Absolute</option>
									<option value="walkable-ground">Walkable Ground</option>
								</select>
							</label>
							<label>
								<span>Ground Height Offset</span>
								<input
									type="number"
									step="0.1"
									value={numericField(groupDefaultRecord(groupIndex, "placement").heightOffset)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupPlacementField(
											groupIndex,
											"heightOffset",
											readFiniteNumberInput(event.currentTarget),
										)}
								/>
							</label>
							<label>
								<span>Active Fraction</span>
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									value={numericField(groupDefaultRecord(groupIndex, "lightModulation").activeLightPercent, 1)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupDefaultRecordField(
											groupIndex,
											"lightModulation",
											"activeLightPercent",
											readAlphaNumberInput(event.currentTarget, 1),
										)}
								/>
							</label>
							<label>
								<span>Blink Min Seconds</span>
								<input
									type="number"
									min="0.25"
									step="0.1"
									value={numberTuple2(groupDefaultRecord(groupIndex, "lightModulation").blinkPeriodSeconds, [8, 15])[0]}
									disabled={disabled}
									oninput={(event) =>
										updateGroupLightPeriodValue(
											groupIndex,
											0,
											readNonNegativeNumberInput(event.currentTarget, 8),
										)}
								/>
							</label>
							<label>
								<span>Blink Max Seconds</span>
								<input
									type="number"
									min="0.25"
									step="0.1"
									value={numberTuple2(groupDefaultRecord(groupIndex, "lightModulation").blinkPeriodSeconds, [8, 15])[1]}
									disabled={disabled}
									oninput={(event) =>
										updateGroupLightPeriodValue(
											groupIndex,
											1,
											readNonNegativeNumberInput(event.currentTarget, 15),
										)}
								/>
							</label>
							<label>
								<span>Blink Fade Seconds</span>
								<input
									type="number"
									min="0"
									step="0.1"
									value={numericField(groupDefaultRecord(groupIndex, "lightModulation").blinkFadeSeconds)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupDefaultRecordField(
											groupIndex,
											"lightModulation",
											"blinkFadeSeconds",
											readNonNegativeNumberInput(event.currentTarget),
										)}
								/>
							</label>
							<label>
								<span>Minimum Intensity</span>
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									value={numericField(groupDefaultRecord(groupIndex, "lightModulation").minimumIntensityScale)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupDefaultRecordField(
											groupIndex,
											"lightModulation",
											"minimumIntensityScale",
											readAlphaNumberInput(event.currentTarget),
										)}
								/>
							</label>
							<label>
								<span>Pulse Speed</span>
								<input
									type="number"
									min="0"
									step="0.01"
									value={numericField(groupDefaultRecord(groupIndex, "lightModulation").pulseSpeed)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupDefaultRecordField(
											groupIndex,
											"lightModulation",
											"pulseSpeed",
											readNonNegativeNumberInput(event.currentTarget),
										)}
								/>
							</label>
							<label>
								<span>Pulse Softness</span>
								<input
									type="number"
									min="0"
									max="1"
									step="0.01"
									value={numericField(groupDefaultRecord(groupIndex, "lightModulation").pulseSoftness, 1)}
									disabled={disabled}
									oninput={(event) =>
										updateGroupDefaultRecordField(
											groupIndex,
											"lightModulation",
											"pulseSoftness",
											readAlphaNumberInput(event.currentTarget, 1),
										)}
								/>
							</label>
						</div>
					</div>

					{#each npcCollectionSections(group) as section (section.id)}
						<div class="npc-collection">
							<div class="npc-source-header">
								<div>
									<h3>{section.label}</h3>
									<p>{section.description ?? `${section.instances.length} NPCs`}</p>
								</div>
								<span class="npc-badge">{section.instances.length}</span>
							</div>
							{#if section.instances.length}
								{#each section.instances as row (String(row.instance.stableId ?? row.instance.id ?? row.instanceIndex))}
									<div class="npc-instance-form">
										<div class="npc-source-header">
											<div>
												<h3>{String(row.instance.displayName ?? row.instance.stableId ?? row.instance.id)}</h3>
												<p>{group.name} -> instances[{row.instanceIndex}]</p>
											</div>
											<span class="npc-badge">
												{String(row.instance.stableId ?? "unstable")}
											</span>
										</div>

										<div class="npc-fields">
											<label>
												<span>ID</span>
												<input
													value={String(row.instance.id ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceField(
															groupIndex,
															row.instanceIndex,
															"id",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Stable ID</span>
												<input
													value={String(row.instance.stableId ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceField(
															groupIndex,
															row.instanceIndex,
															"stableId",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Display Name</span>
												<input
													value={String(row.instance.displayName ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceField(
															groupIndex,
															row.instanceIndex,
															"displayName",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Collection</span>
												<select
													value={String(row.instance.collectionId ?? unassignedNpcCollectionId)}
													disabled={disabled}
													onchange={(event) =>
														updateInstanceCollectionId(
															groupIndex,
															row.instanceIndex,
															event.currentTarget.value,
														)}
												>
													<option value={unassignedNpcCollectionId}>Unassigned</option>
													{#each npcGroupCollections(group) as collection (collection.id)}
														<option value={collection.id}>{collection.label}</option>
													{/each}
												</select>
											</label>
											<label>
												<span>Placement Mode</span>
												<select
													value={String(toRecord(row.instance.placement).mode ?? "")}
													disabled={disabled}
													onchange={(event) =>
														updateInstancePlacementMode(
															groupIndex,
															row.instanceIndex,
															event.currentTarget.value,
														)}
												>
													<option value="">Group Default</option>
													<option value="absolute">Absolute</option>
													<option value="walkable-ground">Walkable Ground</option>
												</select>
											</label>
											<label>
												<span>Ground Height Offset</span>
												<input
													type="number"
													step="0.1"
													value={numericField(toRecord(row.instance.placement).heightOffset)}
													disabled={disabled}
													oninput={(event) =>
														updateInstancePlacementHeightOffset(
															groupIndex,
															row.instanceIndex,
															readFiniteNumberInput(event.currentTarget),
														)}
												/>
											</label>
											{#each vector3Value(toRecord(row.instance.transform).position, [0, 0, 0]) as positionValue, axisIndex}
												<label>
													<span>Position {["X", "Y", "Z"][axisIndex]}</span>
													<input
														type="number"
														step="0.1"
														value={positionValue}
														disabled={disabled}
														oninput={(event) =>
															updateInstanceTransformVector(
																groupIndex,
																row.instanceIndex,
																"position",
																axisIndex,
																readFiniteNumberInput(event.currentTarget),
															)}
													/>
												</label>
											{/each}
											{#each vector3Value(toRecord(row.instance.transform).scale, [1, 1, 1]) as scaleValue, axisIndex}
												<label>
													<span>Scale {["X", "Y", "Z"][axisIndex]}</span>
													<input
														type="number"
														min="0"
														step="0.1"
														value={scaleValue}
														disabled={disabled}
														oninput={(event) =>
															updateInstanceTransformVector(
																groupIndex,
																row.instanceIndex,
																"scale",
																axisIndex,
																readNonNegativeNumberInput(event.currentTarget, 1),
															)}
													/>
												</label>
											{/each}
											<label>
												<span>Movement Radius</span>
												<input
													type="number"
													min="0"
													step="0.1"
													value={numericField(toRecord(row.instance.movement).radius)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"movement",
															"radius",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Movement Speed</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={numericField(toRecord(row.instance.movement).speed)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"movement",
															"speed",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Hover Height</span>
												<input
													type="number"
													step="0.1"
													value={numericField(toRecord(row.instance.movement).hoverHeight)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"movement",
															"hoverHeight",
															readFiniteNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Bob Amplitude</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={numericField(toRecord(row.instance.movement).bobAmplitude)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"movement",
															"bobAmplitude",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Bob Speed</span>
												<input
													type="number"
													min="0"
													step="0.01"
													value={numericField(toRecord(row.instance.movement).bobSpeed)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"movement",
															"bobSpeed",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Light Phase</span>
												<input
													type="number"
													min="0"
													max="1"
													step="0.01"
													value={numericField(toRecord(row.instance.lightModulation).phase)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"lightModulation",
															"phase",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
											<label>
												<span>Prompt</span>
												<input
													value={String(toRecord(row.instance.interaction).prompt ?? "Listen")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"interaction",
															"prompt",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Activation Radius</span>
												<input
													type="number"
													min="0"
													step="0.1"
													value={numericField(toRecord(row.instance.interaction).activationRadius)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"interaction",
															"activationRadius",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
										</div>

										<div class="npc-conversation-fields">
											<label>
												<span>Conversation Title</span>
												<input
													value={String(toRecord(row.instance.conversation).title ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"conversation",
															"title",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Conversation Excerpt</span>
												<input
													value={String(toRecord(row.instance.conversation).excerpt ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"conversation",
															"excerpt",
															event.currentTarget.value,
														)}
												/>
											</label>
											<label>
												<span>Conversation Body</span>
												<textarea
													value={String(toRecord(row.instance.conversation).body ?? "")}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"conversation",
															"body",
															event.currentTarget.value,
														)}
												></textarea>
											</label>
											<label>
												<span>Dialog Duration Ms</span>
												<input
													type="number"
													min="0"
													step="100"
													value={numericField(toRecord(row.instance.conversation).durationMs)}
													disabled={disabled}
													oninput={(event) =>
														updateInstanceRecordField(
															groupIndex,
															row.instanceIndex,
															"conversation",
															"durationMs",
															readNonNegativeNumberInput(event.currentTarget),
														)}
												/>
											</label>
										</div>
									</div>
								{/each}
							{:else}
								<p class="empty-state">No NPC instances found in this collection.</p>
							{/if}
						</div>
					{/each}
				</article>
			{/each}
		{:else}
			<p class="empty-state">No local NPC group files found.</p>
		{/if}
	</section>

	<section class="npc-panel" aria-label="NPC archetypes">
		<div class="npc-panel-header">
			<div>
				<p>Global NPC Archetypes</p>
				<h2>{npcArchetypeCount} Files</h2>
			</div>
			<span class="npc-badge">read-only</span>
		</div>
		{#if npcPackage.archetypes.length}
			{#each npcPackage.archetypes as archetype (archetype.name)}
				<article class="npc-source readonly-source">
					<div class="npc-source-header">
						<div>
							<h3>{String(archetype.data.id ?? archetype.name)}</h3>
							<p>{archetype.path}</p>
						</div>
						<span class="npc-badge">archetype</span>
					</div>
					<StructuredValueEditor
						value={archetype.data as JsonValue}
						label={archetype.name}
						disabled
						onChange={() => undefined}
					/>
				</article>
			{/each}
		{:else}
			<p class="empty-state">No global NPC archetypes referenced.</p>
		{/if}
	</section>
</div>

<style>
	.npc-workbench {
		display: grid;
		gap: 1rem;
	}

	.npc-panel,
	.npc-source,
	.npc-section,
	.npc-collection,
	.npc-instance-form {
		border: 1px solid rgba(148, 163, 184, 0.22);
		border-radius: 8px;
		background: rgba(15, 23, 42, 0.44);
		padding: 1rem;
	}

	.npc-source,
	.npc-section,
	.npc-collection,
	.npc-instance-form {
		display: grid;
		gap: 1rem;
	}

	.npc-panel-header,
	.npc-source-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.npc-panel-header p,
	.npc-source-header p {
		margin: 0;
		color: #94a3b8;
		font-size: 0.78rem;
	}

	.npc-panel-header h2,
	.npc-source-header h3 {
		margin: 0;
	}

	.npc-badge {
		border: 1px solid rgba(148, 163, 184, 0.24);
		border-radius: 999px;
		color: #cbd5e1;
		font-size: 0.75rem;
		padding: 0.2rem 0.55rem;
		white-space: nowrap;
	}

	.npc-fields {
		display: grid;
		gap: 0.8rem;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
	}

	label {
		display: grid;
		gap: 0.35rem;
	}

	label span {
		color: #cbd5e1;
		font-size: 0.76rem;
	}

	input,
	select,
	textarea {
		width: 100%;
		border: 1px solid rgba(148, 163, 184, 0.28);
		border-radius: 6px;
		background: rgba(2, 6, 23, 0.74);
		color: #f8fafc;
		font: inherit;
		padding: 0.5rem 0.6rem;
	}

	textarea {
		min-height: 7rem;
		resize: vertical;
	}

	button {
		border: 1px solid rgba(148, 163, 184, 0.32);
		border-radius: 6px;
		background: rgba(15, 23, 42, 0.82);
		color: #f8fafc;
		cursor: pointer;
		font: inherit;
		padding: 0.48rem 0.75rem;
	}

	button:disabled,
	input:disabled,
	select:disabled,
	textarea:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.npc-conversation-fields {
		display: grid;
		gap: 0.8rem;
	}

	.empty-state {
		color: #94a3b8;
		margin: 0;
	}
</style>
