import { strict as assert } from "node:assert";

import {
	type ThreeMaterialFactoryAsset,
	type ThreeMaterialLike,
	type ThreeObject3DLike,
	type ThreeRuntime,
	type ThreeShaderLike,
	type ThreeTextureAsset,
	type ThreeTextureLike,
	createThreeAssetObjectResolver,
	registerThreeAssetLoaders,
} from "../src/engine/adapters/three/index.js";
import {
	AssetManager,
	type AssetManifest,
	type AssetManifestEntry,
	type RuntimeSceneManifestData,
	runtimeSceneManifestValidator,
	validateRuntimeSceneManifest,
} from "../src/engine/index.js";

const terrainTextureIds = [
	"texture_splat",
	"texture_rock_albedo",
	"texture_rock_normal",
	"texture_rock_roughness",
	"texture_dirt_albedo",
	"texture_dirt_normal",
	"texture_dirt_roughness",
] as const;

const terrainMaterialAsset = {
	id: "material_terrain_layered",
	kind: "material",
	url: "builtin://materials/terrain/layered-splat",
	material: {
		roughness: 0.8,
		terrain: {
			kind: "layered-splat",
			coordinateSpace: "world-xz",
			splatTextureId: "texture_splat",
			sourceBaseStrength: 1,
			detailBlendStrength: 0.35,
			layers: [
				{
					channel: "r",
					label: "Rock",
					albedoTextureId: "texture_rock_albedo",
					normalTextureId: "texture_rock_normal",
					roughnessTextureId: "texture_rock_roughness",
					metersPerTile: 5,
					normalScale: 0.7,
					strength: 0.9,
				},
				{
					channel: "g",
					label: "Dirt",
					albedoTextureId: "texture_dirt_albedo",
					normalTextureId: "texture_dirt_normal",
					roughnessTextureId: "texture_dirt_roughness",
					metersPerTile: 4,
					normalScale: 0.5,
					strength: 0.8,
				},
			],
		},
	},
	tags: ["terrain", "layered-splat"],
} satisfies AssetManifestEntry;

const terrainTextureAssets = terrainTextureIds.map(
	(id): AssetManifestEntry => ({
		id,
		kind: "texture",
		url: `/terrain/${id}.jpg`,
		projection: "uv",
		colorSpace: id.includes("albedo") ? "srgb" : "linear",
	}),
);

const assetManifest = {
	assets: [
		{
			id: "mesh_ground",
			kind: "mesh",
			url: "builtin://meshes/box",
		},
		...terrainTextureAssets,
		terrainMaterialAsset,
	],
} satisfies AssetManifest;

const runtimeManifest = createRuntimeManifest();

runtimeSceneManifestValidator.parse(runtimeManifest);
assert.deepEqual(
	validateRuntimeSceneManifest(runtimeManifest),
	[],
	"runtime scene validator must accept level-owned layered terrain material data",
);

{
	const invalid = createMutableRuntimeManifest();
	const material = invalid.assets.assets.find(
		(asset) => asset.id === "material_terrain_layered",
	);
	if (!material?.material?.terrain) {
		throw new Error("Expected test material terrain data.");
	}
	material.material.terrain.splatTextureId = "texture_missing";

	assertErrorIncludes(
		() => runtimeSceneManifestValidator.parse(invalid),
		`material.terrain.splatTextureId references unknown asset "texture_missing"`,
	);
}

{
	const invalid = createMutableRuntimeManifest();
	invalid.level.preload = (invalid.level.preload ?? []).filter(
		(assetId) => assetId !== "texture_dirt_roughness",
	);
	invalid.readiness.requiredAssetIds = (
		invalid.readiness.requiredAssetIds ?? []
	).filter((assetId) => assetId !== "texture_dirt_roughness");

	assertErrorIncludes(
		() => runtimeSceneManifestValidator.parse(invalid),
		`material asset "material_terrain_layered" references texture asset "texture_dirt_roughness" that is not declared in the level preload set`,
	);
}

{
	const invalid = createMutableRuntimeManifest();
	const material = invalid.assets.assets.find(
		(asset) => asset.id === "material_terrain_layered",
	);
	if (!material?.material?.terrain) {
		throw new Error("Expected test material terrain data.");
	}
	const layer = material.material.terrain.layers[1];
	if (!layer) {
		throw new Error("Expected second test material terrain layer.");
	}
	layer.channel = "r";

	assertErrorIncludes(
		() => runtimeSceneManifestValidator.parse(invalid),
		"material.terrain.layers.1.channel must be unique.",
	);
}

{
	const fakeThree = createFakeThreeRuntime();
	const assets = new AssetManager({
		assets: assetManifest.assets.filter((asset) => asset.kind !== "mesh"),
	});
	registerThreeAssetLoaders(assets, { three: fakeThree });

	const terrainAsset = (await assets.load(
		"material_terrain_layered",
	)) as ThreeMaterialFactoryAsset;
	const materialWithoutSource = terrainAsset.createMaterial();
	const splatAsset = assets.get("texture_splat") as ThreeTextureAsset;
	const albedoAsset = assets.get("texture_rock_albedo") as ThreeTextureAsset;
	const sourceTexture = createFakeTexture("source_base");
	const sourceMaterial = createFakeMaterial({ map: sourceTexture });
	const material = terrainAsset.createMaterial(sourceMaterial);

	assert.equal(
		materialWithoutSource.map,
		splatAsset.texture,
		"terrain material without a source material should fall back to the splat mask to keep UV varyings active",
	);
	assert.equal(
		material.map,
		sourceTexture,
		"terrain material should preserve the GLB source material map as the macro base texture",
	);
	assert.equal(
		albedoAsset.texture.wrapS,
		fakeThree.RepeatWrapping,
		"terrain layer textures should repeat for world-space detail tiling",
	);
	assert.equal(typeof material.onBeforeCompile, "function");
	assert.match(
		material.customProgramCacheKey?.() ?? "",
		/layered-splat:material_terrain_layered/,
	);

	const shader: ThreeShaderLike = {
		uniforms: {},
		vertexShader: "#include <common>\n#include <project_vertex>",
		fragmentShader:
			"#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>",
	};
	material.onBeforeCompile?.(shader);

	assert.match(shader.vertexShader, /vMegamealTerrainWorldPosition/);
	assert.match(shader.fragmentShader, /megamealTerrainSplatMap/);
	assert.match(shader.fragmentShader, /megamealTerrainSourceBaseMap/);
	assert.equal(
		shader.uniforms.megamealTerrainSourceBaseMap?.value,
		sourceTexture,
	);
	assert.equal(shader.uniforms.megamealTerrainSourceBaseStrength?.value, 1);
	assert.equal(shader.uniforms.megamealTerrainDetailBlendStrength?.value, 0.35);
	assert.match(shader.fragmentShader, /megamealTerrainAlbedo0/);
	assert.match(shader.fragmentShader, /megamealTerrainNormal0/);
	assert.match(shader.fragmentShader, /megamealTerrainRoughness0/);
}

{
	const originalMaterial = createFakeMaterial({
		map: createFakeTexture("original_glb_base"),
	});
	const sourceMaterials: Array<ThreeMaterialLike | undefined> = [];
	const overrideMaterials: ThreeMaterialLike[] = [];
	const child = createFakeObject({
		geometry: createFakeGeometry(),
		material: originalMaterial,
	});
	const root = createFakeObject({
		children: [child],
	});
	const replacementFactory: ThreeMaterialFactoryAsset = {
		kind: "three:material-factory",
		entry: terrainMaterialAsset,
		createMaterial(sourceMaterial) {
			sourceMaterials.push(sourceMaterial);
			const material = createFakeMaterial();
			overrideMaterials.push(material);
			return material;
		},
	};
	const resolver = createThreeAssetObjectResolver({
		assets: {
			has(id) {
				return id === "mesh_ground" || id === "material_terrain_layered";
			},
			get(id) {
				if (id === "mesh_ground") {
					return {
						kind: "three:gltf",
						entry: assetManifest.assets[0],
						scene: root,
						animations: [],
						clone() {
							return root;
						},
					};
				}
				if (id === "material_terrain_layered") {
					return replacementFactory;
				}
				return undefined;
			},
		},
		createCanvas: () => ({
			width: 1,
			height: 1,
			getContext: () => null,
		}),
		three: {} as ThreeRuntime,
	});
	const resolved = resolver({
		meshId: "mesh_ground",
		materialId: "material_terrain_layered",
	}) as { readonly disposeOnDetachMaterials?: readonly ThreeMaterialLike[] };

	assert.equal(child.material, overrideMaterials[0]);
	assert.equal(sourceMaterials[0], originalMaterial);
	assert.deepEqual(resolved.disposeOnDetachMaterials, overrideMaterials);
}

console.log("Material parameter contract passed.");

type MutableTerrainRuntimeManifest = {
	assets: {
		assets: Array<{
			id: string;
			material?: {
				terrain?: {
					splatTextureId: string;
					layers: Array<{
						channel: string;
					}>;
				};
			};
		}>;
	};
	level: {
		preload?: string[];
	};
	readiness: {
		requiredAssetIds?: string[];
	};
};

function createMutableRuntimeManifest(): MutableTerrainRuntimeManifest {
	return createRuntimeManifest() as unknown as MutableTerrainRuntimeManifest;
}

function createRuntimeManifest(): RuntimeSceneManifestData {
	return JSON.parse(
		JSON.stringify({
			schemaVersion: 1,
			id: "terrain_material_contract_runtime",
			generatedAt: "2026-07-01T00:00:00.000Z",
			source: {
				kind: "authored",
				id: "terrain_material_contract",
			},
			assets: assetManifest,
			prefabs: [
				{
					id: "ground_prefab",
					assetIds: [
						"mesh_ground",
						"material_terrain_layered",
						...terrainTextureIds,
					],
					components: {
						Transform: {},
						Renderable: {
							meshId: "mesh_ground",
							materialId: "material_terrain_layered",
						},
					},
				},
				{
					id: "player_prefab",
					components: {
						Transform: {},
					},
				},
			],
			level: {
				id: "terrain_material_contract_level",
				preload: [
					"mesh_ground",
					"material_terrain_layered",
					...terrainTextureIds,
				],
				instances: [
					{
						id: "ground",
						stableId: "ground",
						prefabId: "ground_prefab",
					},
					{
						id: "player",
						stableId: "player",
						prefabId: "player_prefab",
					},
				],
			},
			renderProfile: {
				id: "terrain_material_contract_render_profile",
				renderer: {
					clearColor: "#000000",
					clearAlpha: 1,
					antialias: true,
					maxPixelRatio: 2,
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
				requiredAssetIds: [
					"mesh_ground",
					"material_terrain_layered",
					...terrainTextureIds,
				],
			},
		}),
	) as RuntimeSceneManifestData;
}

function assertErrorIncludes(action: () => void, expected: string): void {
	try {
		action();
	} catch (error) {
		const message =
			error instanceof Error ? error.message : JSON.stringify(error);

		if (!message.includes(expected)) {
			throw new Error(
				`Expected error to include ${JSON.stringify(expected)}, received ${JSON.stringify(message)}.`,
			);
		}

		return;
	}

	throw new Error(`Expected error including ${JSON.stringify(expected)}.`);
}

function createFakeThreeRuntime(): ThreeRuntime & {
	readonly RepeatWrapping: symbol;
} {
	const repeatWrapping = Symbol("RepeatWrapping");

	class FakeTextureLoader {
		load(
			url: string,
			onLoad?: (texture: ThreeTextureLike) => void,
		): ThreeTextureLike {
			const texture = createFakeTexture(url);
			onLoad?.(texture);
			return texture;
		}
	}

	class FakeMeshStandardMaterial {
		readonly isMaterial = true;
		map?: ThreeTextureLike | null;
		onBeforeCompile?: (shader: ThreeShaderLike) => void;
		customProgramCacheKey?: () => string;
		needsUpdate?: boolean;

		dispose(): void {}
	}

	return {
		TextureLoader: FakeTextureLoader,
		MeshStandardMaterial: FakeMeshStandardMaterial,
		SRGBColorSpace: Symbol("SRGBColorSpace"),
		LinearSRGBColorSpace: Symbol("LinearSRGBColorSpace"),
		RepeatWrapping: repeatWrapping,
	} as unknown as ThreeRuntime & { readonly RepeatWrapping: symbol };
}

function createFakeTexture(url: string): ThreeTextureLike {
	return {
		isTexture: true,
		url,
		dispose() {},
	} as ThreeTextureLike;
}

function createFakeMaterial(
	options: Partial<ThreeMaterialLike> = {},
): ThreeMaterialLike {
	return {
		isMaterial: true,
		dispose() {},
		...options,
	};
}

function createFakeGeometry() {
	return {
		dispose() {},
	};
}

function createFakeObject(
	options: Partial<ThreeObject3DLike> = {},
): ThreeObject3DLike {
	return {
		userData: {},
		visible: true,
		position: { set() {} },
		quaternion: { set() {} },
		scale: { set() {} },
		...options,
	};
}
