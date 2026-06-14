import { createLevelEditorCameraModeOperationDraft } from "../src/app/editor/levelEditorEnvironmentPanels.js";
import {
	buildLevelEditorObjectLibraryPanelModel,
	createObjectLibraryReplacementPreviewMessage,
	objectLibrarySubjectFromSelection,
} from "../src/app/editor/levelEditorObjectLibrary.js";
import {
	buildEditorBuildPublishPlan,
	validateEditorBuildPublishPlan,
} from "../src/game/editor/buildPublish/index.js";
import { buildEnvironmentAuthoringModel } from "../src/game/editor/environmentAuthoring/index.js";
import {
	buildNpcAuthoringCatalog,
	createDuplicateNpcOperation,
	createInsertFireflyNpcOperation,
	createRemoveNpcOperation,
	defaultFireflyNpcAuthoringTemplate,
	validateNpcAuthoringCatalog,
	validateNpcAuthoringOperationDraft,
} from "../src/game/editor/npcAuthoring/index.js";
import {
	buildManifestBackedObjectLibrary,
	createObjectLibraryReplacementDraft,
	validateObjectLibraryCatalog,
	validateObjectLibraryReplacementDraft,
} from "../src/game/editor/objectLibrary/index.js";
import {
	defaultRuntimeSceneManifest,
	mirandaDeckRuntimeSceneManifest,
	portalArenaRuntimeSceneManifest,
} from "../src/game/levels/index.js";
import {
	assertDeepEqual,
	assertDefined,
	assertEqual,
} from "./contractTestHelpers.js";

const objectLibrary = buildManifestBackedObjectLibrary();

assertDeepEqual(
	validateObjectLibraryCatalog(objectLibrary),
	[],
	"Expected manifest-backed object library to validate.",
);
assertEqual(
	objectLibrary.source,
	"runtime-scene-manifests",
	"Expected object library to be built from runtime scene manifests.",
);
assertAtLeast(
	objectLibrary.scenes.length,
	5,
	"Expected object library to include the runtime scene catalog.",
);

const groupIds = objectLibrary.groups.map((group) => group.id);
for (const groupId of [
	"assets:audio",
	"assets:environment",
	"prefabs:collision",
	"prefabs:npc",
	"prefabs:portals",
]) {
	assertIncludes(
		groupIds,
		groupId,
		`Expected object library group ${groupId}.`,
	);
}

const fireflyEntry = assertDefined(
	objectLibrary.groups
		.find((group) => group.id === "prefabs:npc")
		?.entries.find((entry) => entry.prefabId === "observatory_firefly_marker"),
	"Expected firefly prefab to appear in the NPC object library group.",
);
assertEqual(
	fireflyEntry.placement?.writesFiles,
	false,
	"Expected object library insertion drafts not to write files directly.",
);
assertIncludes(
	fireflyEntry.runtimeSceneIds,
	"observatory_runtime",
	"Expected firefly library entry to be backed by Observatory manifest data.",
);

const portalEntry = assertDefined(
	objectLibrary.groups
		.find((group) => group.id === "prefabs:portals")
		?.entries.find((entry) => entry.prefabId === "portal_gate"),
	"Expected shared portal prefab to appear in portal object library group.",
);
assertIncludes(
	portalEntry.runtimeSceneIds,
	defaultRuntimeSceneManifest.id,
	"Expected portal library entry to include the default runtime scene manifest.",
);

const selectedPortalObject = objectLibrarySubjectFromSelection({
	stableId: "portal-arena:portal:observatory",
	label: "Observatory Portal",
	prefabId: "portal_gate",
	sourceOwner: "level:portal_arena prefab:portal_gate",
	componentNames: ["Transform", "Renderable", "Portal", "SoundEmitter"],
	assetIds: ["mesh_portal_gate", "audio_portal_cycle"],
	currentRenderable: {
		meshId: "mesh_portal_gate",
	},
	currentSoundEmitter: {
		soundId: "audio_portal_cycle",
		volume: 0.25,
	},
});
const portalReplacementDraft = createObjectLibraryReplacementDraft({
	runtimeSceneId: defaultRuntimeSceneManifest.id,
	levelId: defaultRuntimeSceneManifest.level.id,
	selectedObject: selectedPortalObject,
	replacementEntry: portalEntry,
});
assertDeepEqual(
	validateObjectLibraryReplacementDraft(portalReplacementDraft),
	[],
	"Expected prefab replacement draft to validate.",
);
assertEqual(
	portalReplacementDraft.mode,
	"preview-only",
	"Expected object-library replacements to stage preview-only data.",
);
assertEqual(
	portalReplacementDraft.writesFiles,
	false,
	"Expected object-library replacements not to write files directly.",
);
assertEqual(
	portalReplacementDraft.mutatesRuntimeDirectly,
	false,
	"Expected object-library replacements to stage preview patches, not runtime mutation.",
);
assertEqual(
	portalReplacementDraft.preserveStableId,
	true,
	"Expected replacement operations to preserve the selected stable ID.",
);
assertEqual(
	portalReplacementDraft.previewPatch.entries[0]?.stableId,
	selectedPortalObject.stableId,
	"Expected replacement preview patch to target the selected object.",
);

const portalMeshEntry = assertDefined(
	objectLibrary.groups
		.find((group) => group.id === "assets:meshes")
		?.entries.find((entry) => entry.assetId === "mesh_portal_gate"),
	"Expected portal gate mesh to appear in the manifest-backed asset library.",
);
const meshReplacementDraft = createObjectLibraryReplacementDraft({
	runtimeSceneId: defaultRuntimeSceneManifest.id,
	levelId: defaultRuntimeSceneManifest.level.id,
	selectedObject: selectedPortalObject,
	replacementEntry: portalMeshEntry,
});
assertEqual(
	meshReplacementDraft.replacementKind,
	"replace-renderable-mesh",
	"Expected mesh assets to stage Renderable mesh replacement data.",
);
assertEqual(
	meshReplacementDraft.previewPatch.entries[0]?.operation === "component-patch"
		? (
				meshReplacementDraft.previewPatch.entries[0].components?.Renderable as
					| { readonly meshId?: string }
					| undefined
			)?.meshId
		: undefined,
	"mesh_portal_gate",
	"Expected mesh replacement preview to patch Renderable.meshId.",
);

const objectLibraryPanel = buildLevelEditorObjectLibraryPanelModel({
	runtimeSceneId: defaultRuntimeSceneManifest.id,
	selectedObject: selectedPortalObject,
	selectedEntryId: portalMeshEntry.id,
});
assertEqual(
	objectLibraryPanel.selectedObject?.stableId,
	selectedPortalObject.stableId,
	"Expected object-library panel model to expose the current selected object.",
);
assertEqual(
	objectLibraryPanel.selectedObjectPreview?.contract,
	"model-preview-placeholder",
	"Expected selected mesh objects to expose the 3D preview placeholder contract.",
);
assertEqual(
	objectLibraryPanel.replacementDraft?.mode,
	"preview-only",
	"Expected object-library panel model to expose the selected preview replacement draft.",
);
assertEqual(
	objectLibraryPanel.summary.stagedWritesFiles,
	false,
	"Expected staged replacement summary not to claim direct file writes.",
);
const replacementMessage = createObjectLibraryReplacementPreviewMessage({
	requestId: "object-library-replacement-contract",
	draft: assertDefined(
		objectLibraryPanel.replacementDraft,
		"Expected panel model to include a replacement draft.",
	),
});
assertEqual(
	replacementMessage.type,
	"object-edit-preview-patch",
	"Expected object-library replacement preview to use the object edit preview protocol.",
);

const npcCatalog = buildNpcAuthoringCatalog();
assertDeepEqual(
	validateNpcAuthoringCatalog(npcCatalog),
	[],
	"Expected NPC/firefly authoring catalog to validate.",
);
assertIncludes(
	defaultFireflyNpcAuthoringTemplate.contracts,
	"FireflyPopulationContract",
	"Expected firefly NPC template to map to FireflyPopulationContract.",
);
assertEqual(
	defaultFireflyNpcAuthoringTemplate.runtimeSupport.aiStack,
	"not-implemented",
	"Expected NPC authoring not to claim runtime AI support.",
);

const insertFirefly = createInsertFireflyNpcOperation({
	runtimeSceneId: "observatory_runtime",
	levelId: "observatory",
	memberId: "test",
	position: [1, 2, 3],
});
assertEqual(
	insertFirefly.writesFiles,
	false,
	"Expected firefly insert operation to require an authoring transaction.",
);
assertEqual(
	insertFirefly.instance.prefabId,
	defaultFireflyNpcAuthoringTemplate.prefabId,
	"Expected firefly insert operation to use the firefly prefab default.",
);
assertDefined(
	insertFirefly.instance.components?.FireflyPopulationMember,
	"Expected firefly insert operation to include FireflyPopulationMember data.",
);
assertDeepEqual(
	validateNpcAuthoringOperationDraft(insertFirefly),
	[],
	"Expected firefly insert operation draft to validate.",
);
assertEqual(
	insertFirefly.operationDraft.authoringOperations[0]?.kind,
	"insert-instance",
	"Expected firefly insert draft to create an authoring insert operation.",
);

const removeFirefly = createRemoveNpcOperation({
	runtimeSceneId: "observatory_runtime",
	levelId: "observatory",
	stableId: "observatory:firefly:test",
});
assertDeepEqual(
	validateNpcAuthoringOperationDraft(removeFirefly),
	[],
	"Expected firefly remove operation draft to validate.",
);
assertEqual(
	removeFirefly.operationDraft.authoringOperations[0]?.kind,
	"remove-instance",
	"Expected firefly remove draft to create an authoring remove operation.",
);

const duplicateFirefly = createDuplicateNpcOperation({
	runtimeSceneId: "observatory_runtime",
	levelId: "observatory",
	sourceStableId: insertFirefly.instance.stableId,
	nextStableId: "observatory:firefly:test-copy",
	sourceInstance: insertFirefly.instance,
});
assertDeepEqual(
	validateNpcAuthoringOperationDraft(duplicateFirefly),
	[],
	"Expected firefly duplicate operation draft to validate when source data is supplied.",
);
assertEqual(
	duplicateFirefly.operationDraft.status,
	"ready",
	"Expected firefly duplicate draft to be ready when source data is supplied.",
);
assertEqual(
	duplicateFirefly.operationDraft.authoringOperations[0]?.kind,
	"insert-instance",
	"Expected firefly duplicate draft to insert a cloned instance.",
);

const portalEnvironment = buildEnvironmentAuthoringModel(
	portalArenaRuntimeSceneManifest,
);
assertDeepEqual(
	portalEnvironment.validation.errors,
	[],
	"Expected portal arena environment authoring model to validate.",
);
assertEqual(
	portalEnvironment.environment.contract,
	"SkyboxEnvironmentContract",
	"Expected environment editing to map to SkyboxEnvironmentContract.",
);
assertEqual(
	portalEnvironment.environment.assetId,
	"texture_portal_arena_equirectangular_sky",
	"Expected portal arena environment authoring to expose the manifest sky asset.",
);
assertIncludes(
	portalEnvironment.environment.assetOptions.map((option) => option.value),
	"texture_portal_arena_equirectangular_sky",
	"Expected portal arena environment asset options to be manifest-backed.",
);
assertIncludes(
	portalEnvironment.environment.controls.map((control) => control.path),
	"renderProfile.environment.environmentIntensity",
	"Expected portal arena environment intensity control.",
);
assertIncludes(
	portalEnvironment.audio.sceneMusicTrackIds,
	"audio_ambient_portal_deck",
	"Expected audio editing model to expose manifest scene music.",
);
assertIncludes(
	portalEnvironment.audio.availableTrackIds,
	"audio_ambient_portal_deck",
	"Expected audio editing model to expose manifest audio track IDs.",
);
assertEqual(
	portalEnvironment.audio.trackControls[0]?.operationDraft.writesFiles,
	false,
	"Expected audio track operation drafts not to write files directly.",
);

const mirandaEnvironment = buildEnvironmentAuthoringModel(
	mirandaDeckRuntimeSceneManifest,
);
assertEqual(
	mirandaEnvironment.lighting.draft.status,
	"registered",
	"Expected Miranda lighting model to find the checked-in light draft.",
);
assertIncludes(
	mirandaEnvironment.lighting.requiredLightStableIds,
	"miranda:archive-gallery:light",
	"Expected lighting model to expose readiness-required light IDs.",
);
const mirandaArchiveLightControls = assertDefined(
	mirandaEnvironment.lighting.lightControls.find(
		(group) => group.stableId === "miranda:archive-gallery:light",
	),
	"Expected Miranda lighting controls to include Archive light.",
);
assertIncludes(
	mirandaArchiveLightControls.controls.map((control) => control.path),
	"Light.intensity",
	"Expected light controls to expose Light intensity.",
);
assertEqual(
	mirandaArchiveLightControls.controls[0]?.operationDraft.writesFiles,
	false,
	"Expected light operation drafts not to write files directly.",
);
assertDeepEqual(
	mirandaEnvironment.validation.errors,
	[],
	"Expected Miranda environment authoring model to validate.",
);

const cameraEditDraft = createLevelEditorCameraModeOperationDraft({
	runtimeSceneId: "portal_arena_runtime",
	mode: "edit",
	pose: {
		position: [1, 2, 3],
		rotation: [0, 0, 0, 1],
		fovDegrees: 55,
		near: 0.1,
		far: 250,
	},
});
assertEqual(
	cameraEditDraft.operation,
	"camera-live-edit-mode",
	"Expected camera panel model to create a camera live/edit operation draft.",
);
assertEqual(
	cameraEditDraft.writesFiles,
	false,
	"Expected camera live/edit operation drafts not to write files.",
);
assertEqual(
	cameraEditDraft.request.mode,
	"edit",
	"Expected camera draft to request edit mode.",
);

const cameraGameplayDraft = createLevelEditorCameraModeOperationDraft({
	runtimeSceneId: "portal_arena_runtime",
	mode: "gameplay",
});
assertEqual(
	cameraGameplayDraft.request.pose,
	undefined,
	"Expected gameplay camera draft to restore runtime camera ownership.",
);

const buildPlan = buildEditorBuildPublishPlan({
	mode: "publish-local",
	targetRuntimeSceneId: "observatory_runtime",
	includeLiveReload: true,
});
assertDeepEqual(
	validateEditorBuildPublishPlan(buildPlan),
	[],
	"Expected build/publish plan to validate.",
);
assertEqual(
	buildPlan.productionBuildHasHiddenCook,
	false,
	"Expected production build plan to reject hidden cook work.",
);
assertEqual(
	buildPlan.localOnly,
	true,
	"Expected editor publish plan to stay local-only.",
);

const scripts = buildPlan.steps
	.filter((step) => step.commandKind === "package-script")
	.map((step) => step.scriptName);
for (const scriptName of [
	"test:level-editor-feature-catalog-contract",
	"test:level-authoring-contract",
	"test:runtime-scene-contract",
	"test:level-editor-collision-cook-contract",
	"test:production-editor-bundle-contract",
	"cook:terrain",
	"ci:terrain-drift",
	"audit:engine-boundaries",
	"type-check",
	"build",
]) {
	assertIncludes(
		scripts,
		scriptName,
		`Expected build plan script ${scriptName}.`,
	);
}
assertBefore(scripts, "cook:terrain", "ci:terrain-drift");
assertBefore(scripts, "type-check", "build");

const deployStep = scripts.find((scriptName) =>
	scriptName.startsWith("deploy"),
);
assertEqual(
	deployStep,
	undefined,
	"Expected editor publish plan not to include deploy commands.",
);

console.log(
	`Level editor feature catalog contract passed for ${objectLibrary.groups.length} groups, ${npcCatalog.templates.length} NPC templates, and ${buildPlan.steps.length} build/publish steps.`,
);

function assertIncludes<T>(
	items: readonly T[],
	item: T,
	message: string,
): void {
	if (!items.includes(item)) {
		throw new Error(`${message} Missing ${String(item)}.`);
	}
}

function assertAtLeast(actual: number, minimum: number, message: string): void {
	if (actual < minimum) {
		throw new Error(
			`${message} Expected at least ${minimum}, received ${actual}.`,
		);
	}
}

function assertBefore(
	items: readonly string[],
	left: string,
	right: string,
): void {
	const leftIndex = items.indexOf(left);
	const rightIndex = items.indexOf(right);

	if (leftIndex === -1 || rightIndex === -1 || leftIndex > rightIndex) {
		throw new Error(`Expected ${left} before ${right}.`);
	}
}
