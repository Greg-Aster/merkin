import {
	buildCollisionCookBakeFile,
	buildCollisionCookPlan,
	buildCollisionCookPreviewPatch,
	buildCollisionCookWritePlan,
	getCollisionCookRuntimeModuleArtifact,
	serializeCollisionCookBakeFile,
	serializeCollisionCookPreviewPatch,
	serializeCollisionCookWritePlan,
	validateCollisionCookPlanAgainstRuntimeScene,
	validateCollisionCookRuntimeWriteSafety,
} from "../src/engine/index.js";
import { observatoryCollisionCookDraft } from "../src/game/editor/collisionDrafts/observatoryCollisionDraft.js";

type NodeFsPromises = {
	readonly mkdir: (
		path: string | URL,
		options: { readonly recursive: true },
	) => Promise<unknown>;
	readonly readFile: (path: string | URL, encoding: "utf8") => Promise<string>;
	readonly writeFile: (
		path: string | URL,
		data: string,
		encoding: "utf8",
	) => Promise<void>;
};

const args = new Set(readProcessArguments());
const shouldPrintWritePlan =
	args.has("--print-write-plan") || args.has("--dry-run");
const shouldPrintPreviewPatch = args.has("--print-preview-patch");
const shouldPrintBakeFile = args.has("--print-bake-file");
const shouldWriteGeneratedBake = args.has("--write-generated-bake");
const shouldWriteRuntimeCollision = args.has("--write-runtime-collision");
const generatedBakeDirectoryUrl = new URL(
	"../src/game/editor/collisionDrafts/generated/",
	import.meta.url,
);
const generatedBakeFileUrl = new URL(
	"observatoryCollisionBake.json",
	generatedBakeDirectoryUrl,
);

if (args.has("--write")) {
	throw new Error(
		"Observatory collision cook --write is not supported. Use --write-runtime-collision for the generated runtime collision module, --write-generated-bake for the provenance artifact, or --print-write-plan to inspect target payloads without writing runtime files.",
	);
}

const plan = buildCollisionCookPlan(observatoryCollisionCookDraft);
const writePlan = buildCollisionCookWritePlan(plan);
const previewPatch = buildCollisionCookPreviewPatch(plan);
const bakeFile = buildCollisionCookBakeFile(plan);
let runtimeCollisionWritten = false;

if (shouldWriteRuntimeCollision) {
	const { mkdir, readFile, writeFile } = await importNodeFsPromises();
	const runtimeModuleArtifact =
		getCollisionCookRuntimeModuleArtifact(writePlan);

	if (!runtimeModuleArtifact) {
		throw new Error(
			"Observatory collision cook write plan did not include a runtime collision module artifact.",
		);
	}

	const runtimeModuleFileUrl = appFileUrl(runtimeModuleArtifact.targetFile);
	const existingRuntimeModuleSource = await readOptionalUtf8(
		readFile,
		runtimeModuleFileUrl,
	);
	const safety = validateCollisionCookRuntimeWriteSafety({
		writePlan,
		allowedTargetFiles: getAllowedRuntimeCollisionTargetFiles(),
		...(existingRuntimeModuleSource === undefined
			? {}
			: { existingRuntimeModuleSource }),
	});

	if (!safety.ok) {
		throw new Error(
			`Observatory collision runtime module write refused:\n${safety.errors.join("\n")}`,
		);
	}

	await mkdir(new URL("./", runtimeModuleFileUrl), { recursive: true });
	await writeFile(
		runtimeModuleFileUrl,
		runtimeModuleArtifact.serializedPayload,
		"utf8",
	);

	const postWriteResult = await validateCurrentRuntimeCollision();

	if (!postWriteResult.ok) {
		throw new Error(
			`Observatory generated runtime collision module was written but failed runtime validation:\n${postWriteResult.errors.join("\n")}`,
		);
	}

	console.log(
		[
			"Observatory generated collision runtime module written.",
			`Artifact: ${runtimeModuleFileUrl.pathname}`,
			`Generated runtime module hash: ${runtimeModuleArtifact.contentHash}`,
			"Only the generated runtime collision module was written; normal build paths still write nothing.",
		].join("\n"),
	);
	runtimeCollisionWritten = true;
} else {
	const { observatoryRuntimeSceneManifest } = await import(
		"../src/game/levels/index.js"
	);
	const result = validateCollisionCookPlanAgainstRuntimeScene({
		plan,
		manifest: observatoryRuntimeSceneManifest,
	});

	if (!result.ok) {
		throw new Error(
			`Observatory collision cook check failed:\n${result.errors.join("\n")}`,
		);
	}
}

if (!runtimeCollisionWritten && shouldWriteGeneratedBake) {
	const { mkdir, writeFile } = await importNodeFsPromises();

	await mkdir(generatedBakeDirectoryUrl, { recursive: true });
	await writeFile(
		generatedBakeFileUrl,
		serializeCollisionCookBakeFile(bakeFile),
		"utf8",
	);

	console.log(
		[
			`Observatory generated collision bake artifact written for ${plan.entries.length} authored entries.`,
			`Artifact: ${generatedBakeFileUrl.pathname}`,
			`Generated bake artifact hash: ${bakeFile.contentHash}`,
			"No runtime level, prefab, or manifest files were written.",
		].join("\n"),
	);
} else if (shouldWriteRuntimeCollision) {
	// Runtime collision module write was handled before runtime manifest import.
} else if (!runtimeCollisionWritten && shouldPrintWritePlan) {
	console.log(serializeCollisionCookWritePlan(writePlan));
} else if (!runtimeCollisionWritten && shouldPrintPreviewPatch) {
	console.log(serializeCollisionCookPreviewPatch(previewPatch));
} else if (!runtimeCollisionWritten && shouldPrintBakeFile) {
	console.log(serializeCollisionCookBakeFile(bakeFile));
} else if (!runtimeCollisionWritten) {
	console.log(
		[
			`Observatory collision cook check passed for ${plan.entries.length} authored entries.`,
			`Required collision stable IDs: ${plan.requiredCollisionStableIds.join(", ")}`,
			`Required walkable stable IDs: ${plan.requiredWalkableStableIds.join(", ")}`,
			`Dry-run write plan hash: ${writePlan.contentHash}`,
			`Preview patch channel: ${previewPatch.channel}`,
			`Generated bake artifact hash: ${bakeFile.contentHash}`,
			`Target payloads: ${writePlan.artifacts.map((artifact) => `${artifact.targetFile}#${artifact.contentHash}`).join(", ")}`,
			"No files were written; run with --print-write-plan, --print-preview-patch, --print-bake-file, --write-generated-bake, or --write-runtime-collision for explicit outputs.",
		].join("\n"),
	);
}

function readProcessArguments(): readonly string[] {
	const maybeProcess = (
		globalThis as typeof globalThis & {
			readonly process?: {
				readonly argv?: readonly string[];
			};
		}
	).process;

	return maybeProcess?.argv?.slice(2) ?? [];
}

async function readOptionalUtf8(
	readFile: NodeFsPromises["readFile"],
	fileUrl: URL,
): Promise<string | undefined> {
	try {
		return await readFile(fileUrl, "utf8");
	} catch (error) {
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "ENOENT"
		) {
			return undefined;
		}

		throw error;
	}
}

function importNodeFsPromises(): Promise<NodeFsPromises> {
	const importModule = new Function(
		"specifier",
		"return import(specifier)",
	) as (specifier: string) => Promise<NodeFsPromises>;

	return importModule("node:fs/promises");
}

function getAllowedRuntimeCollisionTargetFiles(): readonly string[] {
	return [
		observatoryCollisionCookDraft.targetFiles.prefabModule,
		observatoryCollisionCookDraft.targetFiles.levelModule,
		observatoryCollisionCookDraft.targetFiles.runtimeSceneManifestModule,
		observatoryCollisionCookDraft.targetFiles.generatedRuntimeCollisionModule,
	].filter((item): item is string => item !== undefined);
}

function appFileUrl(targetFile: string): URL {
	if (targetFile.startsWith("/") || targetFile.includes("..")) {
		throw new Error(
			`Refusing collision cook target outside the app root: ${targetFile}`,
		);
	}

	return new URL(`../${targetFile}`, import.meta.url);
}

async function validateCurrentRuntimeCollision(): Promise<
	ReturnType<typeof validateCollisionCookPlanAgainstRuntimeScene>
> {
	const { observatoryRuntimeSceneManifest } = await import(
		"../src/game/levels/index.js"
	);

	return validateCollisionCookPlanAgainstRuntimeScene({
		plan,
		manifest: observatoryRuntimeSceneManifest,
	});
}
