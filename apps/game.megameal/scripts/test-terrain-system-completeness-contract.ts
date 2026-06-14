import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RuntimeSceneManifestData } from "../src/engine/index.js";
import { terrainRuntimeSceneIds } from "../src/game/generated/terrainRuntime.js";
import { defaultRuntimeSceneManifests } from "../src/game/levels/index.js";

const root = new URL("..", import.meta.url).pathname;
const errors: string[] = [];
const packageJson = JSON.parse(
	readFileSync(join(root, "package.json"), "utf8"),
) as {
	readonly scripts?: Record<string, string>;
};
const contractRegister = readFileSync(
	join(root, "ENGINE_CONTRACT_REGISTER.md"),
	"utf8",
);

const terrainStreamingContractLine = contractRegister
	.split("\n")
	.find((line) => line.includes("`TerrainChunkStreamingContract`"));

if (!terrainStreamingContractLine) {
	errors.push(
		"ENGINE_CONTRACT_REGISTER.md is missing TerrainChunkStreamingContract.",
	);
} else if (
	terrainStreamingContractLine.includes("Planned, not implemented") ||
	terrainStreamingContractLine.includes(
		"no `src/game/systems/terrainStreaming.ts`",
	)
) {
	errors.push(
		"TerrainChunkStreamingContract still documents active runtime streaming as planned-only.",
	);
}

const contractSuite = packageJson.scripts?.["test:contracts"] ?? "";

for (const scriptName of [
	"test:terrain-streaming-contract",
	"test:terrain-system-completeness-contract",
	"ci:terrain-drift",
]) {
	if (!(scriptName in (packageJson.scripts ?? {}))) {
		errors.push(`package.json is missing ${scriptName}.`);
	}
}

if (!contractSuite.includes("test:terrain-streaming-contract")) {
	errors.push("test:contracts must include test:terrain-streaming-contract.");
}

if (!contractSuite.includes("test:terrain-system-completeness-contract")) {
	errors.push(
		"test:contracts must include test:terrain-system-completeness-contract.",
	);
}

for (const runtimeSceneId of terrainRuntimeSceneIds) {
	const manifest = defaultRuntimeSceneManifests.find(
		(candidate) => candidate.id === runtimeSceneId,
	);

	if (!manifest) {
		errors.push(`terrain runtime scene "${runtimeSceneId}" has no manifest.`);
		continue;
	}

	if ((manifest.terrainPackages ?? []).length === 0) {
		errors.push(`manifest "${runtimeSceneId}" has no terrainPackages.`);
		continue;
	}

	if ((manifest.readiness.requiredTerrainPackageIds ?? []).length === 0) {
		errors.push(
			`manifest "${runtimeSceneId}" has no readiness.requiredTerrainPackageIds.`,
		);
	}

	validateTerrainPackageReadiness(manifest, errors);
}

if (errors.length > 0) {
	console.error("Terrain system completeness contract failed:");
	for (const error of errors) {
		console.error(`- ${error}`);
	}
	process.exit(1);
}

console.log(
	`Terrain system completeness contract passed for ${terrainRuntimeSceneIds.length} runtime scenes.`,
);

function validateTerrainPackageReadiness(
	manifest: RuntimeSceneManifestData,
	collector: string[],
): void {
	const requiredTerrainPackageIds = new Set(
		manifest.readiness.requiredTerrainPackageIds ?? [],
	);
	const requiredCollisionStableIds = new Set(
		manifest.readiness.requiredCollisionStableIds ?? [],
	);
	const requiredWalkableStableIds = new Set(
		manifest.readiness.requiredWalkableStableIds ?? [],
	);

	for (const terrainPackage of manifest.terrainPackages ?? []) {
		if (terrainPackage.runtimeSceneId !== manifest.id) {
			collector.push(
				`terrain package "${terrainPackage.id}" targets runtime scene "${terrainPackage.runtimeSceneId}" instead of manifest "${manifest.id}".`,
			);
		}

		if (!requiredTerrainPackageIds.has(terrainPackage.id)) {
			collector.push(
				`terrain package "${terrainPackage.id}" is missing from readiness.requiredTerrainPackageIds.`,
			);
		}

		if (terrainPackage.chunks.length === 0) {
			collector.push(`terrain package "${terrainPackage.id}" has no chunks.`);
		}

		for (const chunk of terrainPackage.chunks) {
			if (requiredCollisionStableIds.has(chunk.stableId)) {
				collector.push(
					`terrain package chunk "${chunk.stableId}" must not be listed in readiness.requiredCollisionStableIds.`,
				);
			}

			if (requiredWalkableStableIds.has(chunk.stableId)) {
				collector.push(
					`terrain package chunk "${chunk.stableId}" must not be listed in readiness.requiredWalkableStableIds.`,
				);
			}

			const components = componentsForStableId(
				manifest,
				chunk.stableId,
				collector,
			);

			if (components === undefined) {
				continue;
			}

			const terrainCell = asRecord(components.TerrainChunkCell);

			if (terrainCell.packageId !== terrainPackage.id) {
				collector.push(
					`terrain package chunk "${chunk.stableId}" must resolve to TerrainChunkCell.packageId "${terrainPackage.id}".`,
				);
			}

			if (isRecord(components.Collider)) {
				collector.push(
					`terrain package chunk "${chunk.stableId}" must not ship an active Collider component.`,
				);
			}

			if (isRecord(components.RigidBody)) {
				collector.push(
					`terrain package chunk "${chunk.stableId}" must not ship an active RigidBody component.`,
				);
			}
		}
	}
}

function componentsForStableId(
	manifest: RuntimeSceneManifestData,
	stableId: string,
	collector: string[],
): Record<string, unknown> | undefined {
	const instance = manifest.level.instances.find(
		(candidate) => candidate.stableId === stableId,
	);

	if (!instance) {
		collector.push(
			`terrain package chunk "${stableId}" is missing from level instances.`,
		);
		return undefined;
	}

	const prefab = manifest.prefabs.find(
		(candidate) => candidate.id === instance.prefabId,
	);

	if (!prefab) {
		collector.push(
			`terrain package chunk "${stableId}" references unknown prefab "${instance.prefabId}".`,
		);
		return undefined;
	}

	return {
		...prefab.components,
		...(instance.components ?? {}),
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
