import type {
	RuntimeSceneManifestData,
	TerrainCookManifestData,
	TerrainCookPlan,
	TerrainCookRuntimeValidationResult,
	TerrainCookWritePlan,
} from "../src/engine/data/index.js";
import {
	buildTerrainCookPlan,
	buildTerrainCookWritePlan,
	getTerrainCookRuntimeModuleArtifact,
	parseTerrainCookManifest,
	serializeTerrainCookRuntimeModule,
	serializeTerrainCookWritePlan,
	terrainCookManifestValidator,
	validateTerrainCookPlanAgainstRuntimeScene,
	validateTerrainCookRuntimeWriteSafety,
} from "../src/engine/data/index.js";

const terrainManifest = {
	schemaVersion: 1,
	id: "synthetic_terrain_import_v1",
	runtimeSceneId: "synthetic_runtime",
	levelId: "synthetic_level",
	targetFiles: {
		assetManifestModule: "src/game/assets/syntheticTerrainAssets.ts",
		prefabModule: "src/game/prefabs/syntheticTerrainPrefabs.ts",
		levelModule: "src/game/levels/syntheticLevel.ts",
		runtimeSceneManifestModule: "src/game/levels/runtimeSceneManifests.ts",
		generatedTerrainRuntimeModule:
			"src/game/generated/syntheticTerrainRuntime.ts",
		generatedTerrainMetadata:
			"public/assets/generated/game/synthetic/terrain/terrain.json",
	},
	source: {
		id: "synthetic-source-field",
		kind: "glb",
		uri: "public/assets/source/game/synthetic/terrain/source-field.glb",
		contentHash: "sha256:aaaaaaaa",
		unitsPerMeter: 1,
		upAxis: "y",
		coordinateSpace: "engine-world",
		bounds: {
			min: [-16, 0, -16],
			max: [16, 4, 16],
		},
	},
	policy: {
		sourceScaleBakedIntoOutputs: true,
		collisionSource: "heightfield",
		chunking: {
			strategy: "grid",
			chunkSizeMeters: 16,
		},
	},
	provenance: {
		contract: "TerrainImportCookContract",
		generator: "terrainCook.test.synthetic.v1",
		sourceContentHash: "sha256:aaaaaaaa",
		hashAlgorithm: "fnv1a32",
		generatedAt: "2026-06-06T00:00:00.000Z",
		evidence: ["synthetic terrain cook contract fixture"],
	},
	visualOutputs: [
		{
			id: "synthetic-field-visual",
			stableId: "synthetic:terrain:visual",
			prefabId: "prefab_synthetic_terrain_visual",
			asset: {
				id: "mesh_synthetic_terrain_visual",
				kind: "mesh",
				url: "/assets/generated/game/synthetic/terrain/field.glb",
				contentHash: "sha256:bbbbbbbb",
				tags: ["terrain", "generated"],
			},
			materialAssetIds: ["material_synthetic_field"],
			bounds: {
				min: [-16, 0, -16],
				max: [16, 4, 16],
			},
			sourceChunkIds: ["chunk_0_0", "chunk_1_0"],
			readiness: {
				requiredAsset: true,
			},
		},
	],
	collisionChunks: [
		{
			id: "chunk_0_0",
			stableId: "synthetic:terrain:collision:0:0",
			prefabId: "prefab_synthetic_terrain_collision_heightfield",
			colliderTarget: "level-instance",
			chunkKey: [0, 0],
			bounds: {
				min: [-8, 0, -8],
				max: [8, 2, 8],
			},
			intent: "walkable",
			channel: "worldStatic",
			shape: {
				type: "heightfield",
				rows: 3,
				columns: 3,
				heights: [0, 0.25, 0, 0.2, 0.5, 0.1, 0, 0.15, 0],
				cellSize: [8, 8],
				origin: [-8, 0, -8],
			},
			readiness: {
				requiredCollision: true,
				requiredWalkable: true,
			},
			materialId: "field-grass",
		},
		{
			id: "chunk_1_0",
			stableId: "synthetic:terrain:collision:1:0",
			prefabId: "prefab_synthetic_terrain_collision_wall",
			colliderTarget: "prefab",
			chunkKey: [1, 0],
			bounds: {
				min: [8, 0, -8],
				max: [16, 4, 8],
			},
			intent: "solid",
			channel: "worldStatic",
			shape: {
				type: "mesh",
				vertices: [
					[8, 0, -8],
					[16, 0, -8],
					[8, 4, -8],
					[16, 4, -8],
				],
				indices: [0, 1, 2, 2, 1, 3],
			},
			readiness: {
				requiredCollision: true,
			},
		},
	],
} satisfies TerrainCookManifestData;

const plan = buildTerrainCookPlan(terrainManifest);
const runtimeManifest = createRuntimeManifest(plan);
const runtimeValidation = validateTerrainCookPlanAgainstRuntimeScene({
	plan,
	manifest: runtimeManifest,
});

if (!runtimeValidation.ok) {
	throw new Error(
		`Expected synthetic terrain cook plan to match runtime manifest:\n${runtimeValidation.errors.join("\n")}`,
	);
}

assertManifestValidation();
assertPlanDerivation(plan);
assertWritePlan(plan, runtimeValidation);
assertRuntimeDriftCases(plan, runtimeManifest);
assertHashChanges();
await assertEngineDataBoundary();

console.log(
	`Terrain cook contract passed for ${plan.visualOutputs.length} visual output and ${plan.collisionChunks.length} collision chunks.`,
);

function assertManifestValidation(): void {
	parseTerrainCookManifest(terrainManifest);

	expectInvalidManifest(
		{
			...terrainManifest,
			provenance: {
				...terrainManifest.provenance,
				sourceContentHash: "sha256:cccccccc",
			},
		},
		"sourceContentHash must match source.contentHash",
	);

	expectInvalidManifest(
		{
			...terrainManifest,
			policy: {
				...terrainManifest.policy,
				sourceScaleBakedIntoOutputs: false,
			},
		},
		"sourceScaleBakedIntoOutputs must be true",
	);

	expectInvalidManifest(
		{
			...terrainManifest,
			visualOutputs: [
				...terrainManifest.visualOutputs,
				{
					...terrainManifest.visualOutputs[0],
					id: "duplicate-visual-stable-id",
				},
			],
		},
		'stableId contains duplicate value "synthetic:terrain:visual"',
	);

	expectInvalidManifest(
		{
			...terrainManifest,
			collisionChunks: terrainManifest.collisionChunks.map((chunk) =>
				chunk.id === "chunk_0_0"
					? {
							...chunk,
							shape: {
								...chunk.shape,
								heights: [0, 1, 0],
							},
						}
					: chunk,
			),
		},
		"heights length must equal rows * columns",
	);
}

function assertPlanDerivation(cookPlan: TerrainCookPlan): void {
	assertEqual(
		cookPlan.requiredAssetIds,
		["mesh_synthetic_terrain_visual"],
		"Expected visual readiness to derive required terrain asset IDs.",
	);
	assertEqual(
		cookPlan.requiredCollisionStableIds,
		["synthetic:terrain:collision:0:0", "synthetic:terrain:collision:1:0"],
		"Expected terrain chunks to derive required collision stable IDs.",
	);
	assertEqual(
		cookPlan.requiredWalkableStableIds,
		["synthetic:terrain:collision:0:0"],
		"Expected walkable terrain chunks to derive required walkable stable IDs.",
	);

	const heightfieldChunk = cookPlan.collisionChunks.find(
		(chunk) => chunk.id === "chunk_0_0",
	);

	if (!heightfieldChunk) {
		throw new Error("Expected synthetic heightfield terrain chunk.");
	}

	if (heightfieldChunk.colliderComponent.shape.type !== "mesh") {
		throw new Error(
			"Expected synthetic heightfield terrain chunk to cook into mesh collider data.",
		);
	}

	assertEqual(
		heightfieldChunk.colliderComponent.shape.vertices.length,
		9,
		"Expected 3x3 heightfield terrain chunk to generate 9 collider vertices.",
	);
	assertEqual(
		heightfieldChunk.colliderComponent.shape.indices.length,
		24,
		"Expected 3x3 heightfield terrain chunk to generate 8 triangles.",
	);
}

function assertWritePlan(
	cookPlan: TerrainCookPlan,
	validation: TerrainCookRuntimeValidationResult,
): void {
	const writePlan = buildTerrainCookWritePlan(cookPlan);
	const repeatedWritePlan = buildTerrainCookWritePlan(
		buildTerrainCookPlan(terrainManifest),
	);

	if (writePlan.writesFiles !== false || writePlan.writeMode !== "dry-run") {
		throw new Error("Expected terrain cook write plan to be dry-run only.");
	}

	if (
		serializeTerrainCookWritePlan(writePlan) !==
		serializeTerrainCookWritePlan(repeatedWritePlan)
	) {
		throw new Error(
			"Expected terrain cook write plan serialization to be deterministic.",
		);
	}

	expectArtifact(writePlan, "visual-terrain-outputs");
	expectArtifact(writePlan, "collision-chunks");
	expectArtifact(writePlan, "level-terrain-instances");
	expectArtifact(writePlan, "runtime-readiness");
	const runtimeModuleArtifact = expectArtifact(
		writePlan,
		"terrain-runtime-module",
	);

	if (runtimeModuleArtifact.format !== "typescript") {
		throw new Error(
			"Expected terrain runtime module artifact to be TypeScript.",
		);
	}

	if (
		runtimeModuleArtifact.serializedPayload !==
		serializeTerrainCookRuntimeModule(writePlan)
	) {
		throw new Error(
			"Expected terrain runtime module serialization helper to match the artifact.",
		);
	}

	if (
		!runtimeModuleArtifact.serializedPayload.startsWith(
			"// @generated by terrainCook.runtimeModule.v1",
		)
	) {
		throw new Error("Expected terrain runtime module generated marker.");
	}

	if (
		!runtimeModuleArtifact.serializedPayload.includes(
			"TerrainImportCookContract",
		)
	) {
		throw new Error(
			"Expected terrain runtime module to preserve provenance contract metadata.",
		);
	}

	assertRuntimeWriteSafety(writePlan, validation);
}

function assertRuntimeWriteSafety(
	writePlan: TerrainCookWritePlan,
	validation: TerrainCookRuntimeValidationResult,
): void {
	const allowedTargetFiles = [
		terrainManifest.targetFiles.assetManifestModule,
		terrainManifest.targetFiles.prefabModule,
		terrainManifest.targetFiles.levelModule,
		terrainManifest.targetFiles.runtimeSceneManifestModule,
		terrainManifest.targetFiles.generatedTerrainRuntimeModule,
		terrainManifest.targetFiles.generatedTerrainMetadata,
	].filter((value): value is string => typeof value === "string");
	const cleanSafety = validateTerrainCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		runtimeValidation: validation,
		existingRuntimeModuleSource:
			"// @generated by terrainCook.runtimeModule.v1\n",
	});

	if (!cleanSafety.ok) {
		throw new Error(
			`Expected terrain runtime write safety to accept allowed targets:\n${cleanSafety.errors.join("\n")}`,
		);
	}

	const unexpectedTargetSafety = validateTerrainCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles: allowedTargetFiles.filter(
			(file) =>
				file !== terrainManifest.targetFiles.generatedTerrainRuntimeModule,
		),
	});

	if (
		unexpectedTargetSafety.ok ||
		!unexpectedTargetSafety.errors.some((error) =>
			error.includes("terrain runtime module target"),
		)
	) {
		throw new Error(
			"Expected terrain runtime write safety to reject unexpected generated module targets.",
		);
	}

	const dirtyUnexpectedSafety = validateTerrainCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		dirtyFiles: ["src/game/levels/unrelatedLevel.ts"],
	});

	if (
		dirtyUnexpectedSafety.ok ||
		!dirtyUnexpectedSafety.errors.some((error) =>
			error.includes("dirty unexpected target"),
		)
	) {
		throw new Error(
			"Expected terrain runtime write safety to reject dirty unexpected targets.",
		);
	}

	const invalidRuntimeSafety = validateTerrainCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		runtimeValidation: {
			ok: false,
			plan,
			errors: ["synthetic terrain drift"],
		},
	});

	if (
		invalidRuntimeSafety.ok ||
		!invalidRuntimeSafety.errors.some((error) =>
			error.includes("invalid runtime drift"),
		)
	) {
		throw new Error(
			"Expected terrain runtime write safety to reject invalid runtime drift.",
		);
	}

	const unmarkedExistingFileSafety = validateTerrainCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles,
		existingRuntimeModuleSource: "export const handAuthored = true;\n",
	});

	if (
		unmarkedExistingFileSafety.ok ||
		!unmarkedExistingFileSafety.errors.some((error) =>
			error.includes(
				"without the terrainCook.runtimeModule.v1 generated marker",
			),
		)
	) {
		throw new Error(
			"Expected terrain runtime write safety to reject unmarked existing runtime module files.",
		);
	}
}

function assertRuntimeDriftCases(
	cookPlan: TerrainCookPlan,
	manifest: RuntimeSceneManifestData,
): void {
	expectRuntimeDrift(
		cookPlan,
		{
			...manifest,
			readiness: {
				...manifest.readiness,
				requiredAssetIds: [],
			},
		},
		'required asset "mesh_synthetic_terrain_visual" is missing from readiness.requiredAssetIds',
	);

	expectRuntimeDrift(
		cookPlan,
		{
			...manifest,
			assets: {
				...manifest.assets,
				assets: manifest.assets.assets.map((asset) =>
					asset.id === "mesh_synthetic_terrain_visual"
						? {
								...asset,
								url: "/assets/generated/game/synthetic/terrain/stale.glb",
							}
						: asset,
				),
			},
		},
		"asset URL does not match cooked output",
	);

	expectRuntimeDrift(
		cookPlan,
		{
			...manifest,
			level: {
				...manifest.level,
				instances: manifest.level.instances.map((instance) =>
					instance.stableId === "synthetic:terrain:collision:0:0"
						? {
								...instance,
								components: {
									...instance.components,
									Collider: {
										...getHeightfieldChunk(cookPlan).colliderComponent,
										shape: {
											...getHeightfieldChunk(cookPlan).colliderComponent.shape,
											indices: [0, 1, 2],
										},
									},
								},
							}
						: instance,
				),
			},
		},
		"effective runtime Collider does not match cooked terrain chunk data",
	);
}

function assertHashChanges(): void {
	const baseWritePlan = buildTerrainCookWritePlan(plan);
	const shiftedManifest = {
		...terrainManifest,
		collisionChunks: terrainManifest.collisionChunks.map((chunk) =>
			chunk.id === "chunk_0_0"
				? {
						...chunk,
						shape:
							chunk.shape.type === "heightfield"
								? {
										...chunk.shape,
										heights: chunk.shape.heights.map((height, index) =>
											index === 4 ? height + 0.25 : height,
										),
									}
								: chunk.shape,
					}
				: chunk,
		),
	} satisfies TerrainCookManifestData;
	const shiftedWritePlan = buildTerrainCookWritePlan(
		buildTerrainCookPlan(shiftedManifest),
	);

	if (shiftedWritePlan.contentHash === baseWritePlan.contentHash) {
		throw new Error(
			"Expected terrain cook write plan hash to change when terrain chunk heights change.",
		);
	}
}

async function assertEngineDataBoundary(): Promise<void> {
	const fs = await import("node:fs/promises");
	const moduleSource = await fs.readFile(
		new URL("../src/engine/data/terrainCook/index.ts", import.meta.url),
		"utf8",
	);
	const forbiddenSnippets = [
		'from "../../app',
		'from "../../game',
		'from "../../adapters',
		'from "three',
		"@dimforge",
		"svelte",
		"astro",
		"window.",
		"document.",
	];

	for (const snippet of forbiddenSnippets) {
		if (moduleSource.includes(snippet)) {
			throw new Error(
				`Terrain cook engine-data module contains forbidden boundary snippet ${JSON.stringify(snippet)}.`,
			);
		}
	}
}

function createRuntimeManifest(
	cookPlan: TerrainCookPlan,
): RuntimeSceneManifestData {
	const visualOutput = cookPlan.visualOutputs[0];
	const heightfieldChunk = getHeightfieldChunk(cookPlan);
	const wallChunk = cookPlan.collisionChunks.find(
		(chunk) => chunk.id === "chunk_1_0",
	);

	if (!visualOutput || !wallChunk) {
		throw new Error("Expected synthetic terrain plan outputs.");
	}

	return {
		schemaVersion: 1,
		id: cookPlan.runtimeSceneId,
		generatedAt: "2026-06-06T00:00:00.000Z",
		source: {
			kind: "cook",
			id: cookPlan.manifestId,
		},
		level: {
			id: cookPlan.levelId,
			instances: [
				{
					id: "synthetic-terrain-visual-instance",
					stableId: visualOutput.stableId,
					prefabId: visualOutput.prefabId,
				},
				{
					id: "synthetic-terrain-heightfield-instance",
					stableId: heightfieldChunk.stableId,
					prefabId: heightfieldChunk.prefabId,
					components: {
						Collider: heightfieldChunk.colliderComponent,
					},
				},
				{
					id: "synthetic-terrain-wall-instance",
					stableId: wallChunk.stableId,
					prefabId: wallChunk.prefabId,
				},
			],
		},
		prefabs: [
			{
				id: visualOutput.prefabId,
				assetIds: [visualOutput.asset.id],
				components: {
					Renderable: {
						meshId: visualOutput.asset.id,
						materialIds: visualOutput.materialAssetIds,
					},
				},
			},
			{
				id: heightfieldChunk.prefabId,
				components: {
					TerrainCollisionChunk: {
						chunkKey: heightfieldChunk.chunkKey,
					},
				},
			},
			{
				id: wallChunk.prefabId,
				components: {
					Collider: wallChunk.colliderComponent,
				},
			},
		],
		assets: {
			assets: [
				visualOutput.assetEntry,
				{
					id: "material_synthetic_field",
					kind: "material",
					url: "material://synthetic-field",
					material: {
						color: "#405b35",
						roughness: 0.9,
					},
				},
			],
		},
		renderProfile: {
			id: "synthetic-render-profile",
			renderer: {
				clearColor: "#000000",
				clearAlpha: 1,
				antialias: true,
				maxPixelRatio: 1,
				fallbackMaterialColor: "#ff00ff",
			},
			lighting: {
				lights: [],
			},
			environment: {
				kind: "solid-color",
				color: "#000000",
				backgroundIntensity: 1,
			},
		},
		readiness: {
			playerStableId: "player",
			requiredAssetIds: cookPlan.requiredAssetIds,
			requiredCollisionStableIds: cookPlan.requiredCollisionStableIds,
			requiredWalkableStableIds: cookPlan.requiredWalkableStableIds,
		},
	};
}

function getHeightfieldChunk(
	cookPlan: TerrainCookPlan,
): TerrainCookPlan["collisionChunks"][number] {
	const heightfieldChunk = cookPlan.collisionChunks.find(
		(chunk) => chunk.id === "chunk_0_0",
	);

	if (!heightfieldChunk) {
		throw new Error("Expected synthetic heightfield terrain chunk.");
	}

	return heightfieldChunk;
}

function expectArtifact(
	writePlan: TerrainCookWritePlan,
	purpose: TerrainCookWritePlan["artifacts"][number]["purpose"],
): TerrainCookWritePlan["artifacts"][number] {
	const artifact = writePlan.artifacts.find((item) => item.purpose === purpose);

	if (!artifact) {
		throw new Error(`Expected terrain write plan artifact ${purpose}.`);
	}

	if (!artifact.serializedPayload.endsWith("\n")) {
		throw new Error(
			`Expected terrain write artifact ${purpose} to end newline.`,
		);
	}

	if (!artifact.contentHash.startsWith("fnv1a32:")) {
		throw new Error(`Expected terrain write artifact ${purpose} content hash.`);
	}

	if (
		purpose === "terrain-runtime-module" &&
		artifact !== getTerrainCookRuntimeModuleArtifact(writePlan)
	) {
		throw new Error(
			"Expected terrain runtime module artifact helper to match.",
		);
	}

	return artifact;
}

function expectInvalidManifest(data: unknown, expectedError: string): void {
	const result = terrainCookManifestValidator.validate(data);

	if (result.ok) {
		throw new Error(`Expected invalid terrain manifest: ${expectedError}`);
	}

	if (!result.errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected terrain manifest error containing ${JSON.stringify(expectedError)}, received:\n${result.errors.join("\n")}`,
		);
	}
}

function expectRuntimeDrift(
	cookPlan: TerrainCookPlan,
	manifest: RuntimeSceneManifestData,
	expectedError: string,
): void {
	const result = validateTerrainCookPlanAgainstRuntimeScene({
		plan: cookPlan,
		manifest,
	});

	if (result.ok) {
		throw new Error(`Expected terrain runtime drift: ${expectedError}`);
	}

	if (!result.errors.some((error) => error.includes(expectedError))) {
		throw new Error(
			`Expected terrain runtime drift containing ${JSON.stringify(expectedError)}, received:\n${result.errors.join("\n")}`,
		);
	}
}

function assertEqual<TValue>(
	actual: TValue,
	expected: TValue,
	message: string,
): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(
			`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
		);
	}
}
