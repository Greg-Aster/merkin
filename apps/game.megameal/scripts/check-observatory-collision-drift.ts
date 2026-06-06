import {
	buildCollisionCookBakeFile,
	buildCollisionCookPlan,
	buildCollisionCookWritePlan,
	getCollisionCookRuntimeModuleArtifact,
	serializeCollisionCookBakeFile,
	validateCollisionCookPlanAgainstRuntimeScene,
} from "../src/engine/index.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";

type NodeFsPromises = {
	readonly readFile: (path: string | URL, encoding: "utf8") => Promise<string>;
};

const generatedBakeFileUrl = new URL(
	"../src/game/editor/collisionDrafts/generated/observatoryCollisionBake.json",
	import.meta.url,
);
const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
const bakeFile = buildCollisionCookBakeFile(plan);
const expectedBakeFile = serializeCollisionCookBakeFile(bakeFile);
const writePlan = buildCollisionCookWritePlan(plan);
const runtimeModuleArtifact = getCollisionCookRuntimeModuleArtifact(writePlan);

if (!runtimeModuleArtifact) {
	throw new Error(
		`Observatory collision drift gate failed for draft "${plan.draftId}": missing runtime collision module artifact.`,
	);
}

const { readFile } = await importNodeFsPromises();
const currentBakeFile = await readFile(generatedBakeFileUrl, "utf8");
parseGeneratedBakeFile(currentBakeFile);

if (currentBakeFile !== expectedBakeFile) {
	throw new Error(
		[
			`Observatory generated collision bake artifact is stale for draft "${plan.draftId}".`,
			`Expected file: ${generatedBakeFileUrl.pathname}`,
			`Expected hash: ${bakeFile.contentHash}`,
			"Run `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-generated-bake` to update it.",
			"No runtime files were written.",
		].join("\n"),
	);
}

const runtimeModuleFileUrl = appFileUrl(runtimeModuleArtifact.targetFile);
const currentRuntimeModule = await readFile(runtimeModuleFileUrl, "utf8");

if (currentRuntimeModule !== runtimeModuleArtifact.serializedPayload) {
	throw new Error(
		[
			`Observatory generated runtime collision module is stale for draft "${plan.draftId}".`,
			`Expected file: ${runtimeModuleFileUrl.pathname}`,
			`Expected hash: ${runtimeModuleArtifact.contentHash}`,
			"Run `pnpm --dir apps/game.megameal cook:observatory-collision -- --write-runtime-collision` to update it.",
			"No files were written.",
		].join("\n"),
	);
}

const { observatoryRuntimeSceneManifest } = await import(
	"../src/game/levels/index.js"
);
const result = validateCollisionCookPlanAgainstRuntimeScene({
	plan,
	manifest: observatoryRuntimeSceneManifest,
});

if (!result.ok) {
	throw new Error(
		[
			`Observatory collision drift gate failed for draft "${plan.draftId}".`,
			"The authored collision draft no longer matches checked-in runtime level/prefab/readiness data.",
			...result.errors,
			"No files were written. Run the explicit collision bake/update packet before committing runtime data changes.",
		].join("\n"),
	);
}

console.log(
	[
		`Observatory collision drift gate passed for draft "${plan.draftId}".`,
		`Runtime scene: ${plan.runtimeSceneId}`,
		`Authored collision entries: ${plan.entries.length}`,
		`Required collision stable IDs: ${plan.requiredCollisionStableIds.join(", ")}`,
		`Required walkable stable IDs: ${plan.requiredWalkableStableIds.join(", ")}`,
		`Generated bake artifact hash: ${bakeFile.contentHash}`,
		`Generated runtime module hash: ${runtimeModuleArtifact.contentHash}`,
		"No files were written.",
	].join("\n"),
);

function importNodeFsPromises(): Promise<NodeFsPromises> {
	const importModule = new Function(
		"specifier",
		"return import(specifier)",
	) as (specifier: string) => Promise<NodeFsPromises>;

	return importModule("node:fs/promises");
}

function parseGeneratedBakeFile(source: string): unknown {
	try {
		return JSON.parse(source) as unknown;
	} catch (error) {
		throw new Error(
			`Observatory generated collision bake artifact is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function appFileUrl(targetFile: string): URL {
	if (targetFile.startsWith("/") || targetFile.includes("..")) {
		throw new Error(
			`Refusing collision cook target outside the app root: ${targetFile}`,
		);
	}

	return new URL(`../${targetFile}`, import.meta.url);
}
