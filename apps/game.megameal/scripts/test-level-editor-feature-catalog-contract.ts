import { createLevelEditorCameraModeOperationDraft } from "../src/app/editor/levelEditorEnvironmentPanels.js";
import {
	buildLevelEditorObjectLibraryPanelModel,
	createObjectLibraryReplacementPreviewMessage,
	objectLibrarySubjectFromSelection,
} from "../src/app/editor/levelEditorObjectLibrary.js";
import { buildLevelEditorWorkspaceModel } from "../src/app/editor/levelEditorWorkspaceModel.js";
import {
	type LevelEditorFeatureFamilyCoverage,
	buildLevelEditorFeatureCoverageRegistry,
	buildLevelEditorOwnerRegistry,
	validateLevelEditorFeatureCoverageRegistry,
} from "../src/game/editor/authoring/ownerRegistry.js";
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

const ownerRegistry = buildLevelEditorOwnerRegistry();
const featureCoverage = buildLevelEditorFeatureCoverageRegistry(ownerRegistry);
assertDeepEqual(
	validateLevelEditorFeatureCoverageRegistry(featureCoverage, ownerRegistry),
	[],
	"Expected level editor feature-family publish coverage to validate.",
);

const featureFamiliesById = new Map(
	featureCoverage.families.map((family) => [family.id, family] as const),
);
for (const familyId of [
	"runtime-scene-selection",
	"level-instance-transform",
	"level-instance-structure",
	"level-instance-removal",
	"level-instance-prefab-replacement",
	"component-editing",
	"object-library-placement",
	"object-library-replacement",
	"portal-interaction-targets",
	"story-notes-and-gameplay-markers",
	"environment-render-profile",
	"authored-lighting",
	"audio-authoring",
	"terrain-packages",
	"collision-authoring",
	"npc-firefly-authoring",
	"ai-generated-assets",
	"camera-live-preview",
	"build-publish-plan",
]) {
	assertDefined(
		featureFamiliesById.get(familyId),
		`Expected feature coverage for ${familyId}.`,
	);
}

for (const family of featureCoverage.families) {
	assertFeatureFamilyDoesNotPersistUnsupportedFields(family);
}

const componentEditingFeatureFamily = assertDefined(
	featureFamiliesById.get("component-editing"),
	"Expected component editing feature coverage.",
);
assertFeatureFamilyPublishableWithOwners(componentEditingFeatureFamily);
assertIncludes(
	componentEditingFeatureFamily.optionalGeneratedOwnerKinds,
	"published-transforms",
	"Expected component editing to publish level-instance component set/removal operations through the generated level authoring owner.",
);
assertIncludes(
	componentEditingFeatureFamily.operationKinds,
	"set-component",
	"Expected component editing to cover level-instance set-component overrides.",
);
assertIncludes(
	componentEditingFeatureFamily.operationKinds,
	"remove-component",
	"Expected component editing to cover level-instance remove-component operations.",
);
assertIncludes(
	componentEditingFeatureFamily.requiredOwnerKinds,
	"level",
	"Expected component editing to require the level owner for publishable component set/removal operations.",
);

const levelInstanceRemovalFeatureFamily = assertDefined(
	featureFamiliesById.get("level-instance-removal"),
	"Expected level-instance removal feature coverage.",
);
assertFeatureFamilyPublishableWithOwners(levelInstanceRemovalFeatureFamily);
assertIncludes(
	levelInstanceRemovalFeatureFamily.optionalGeneratedOwnerKinds,
	"published-transforms",
	"Expected level-instance removal to publish through the generated level authoring owner.",
);
assertIncludes(
	levelInstanceRemovalFeatureFamily.operationKinds,
	"remove-instance",
	"Expected level-instance removal to cover authoring remove-instance operations.",
);
assertIncludes(
	levelInstanceRemovalFeatureFamily.operationKinds,
	"remove-level-instance",
	"Expected level-instance removal to cover persisted remove-level-instance save operations.",
);
assertIncludes(
	levelInstanceRemovalFeatureFamily.requiredOwnerKinds,
	"level",
	"Expected level-instance removal to require the level owner.",
);

const levelInstanceDuplicationFeatureFamily = assertDefined(
	featureFamiliesById.get("level-instance-duplication"),
	"Expected level-instance duplication feature coverage.",
);
assertFeatureFamilyPublishableWithOwners(levelInstanceDuplicationFeatureFamily);
assertIncludes(
	levelInstanceDuplicationFeatureFamily.optionalGeneratedOwnerKinds,
	"published-transforms",
	"Expected level-instance duplication to publish through the generated level authoring owner.",
);
assertIncludes(
	levelInstanceDuplicationFeatureFamily.operationKinds,
	"insert-instance",
	"Expected level-instance duplication to cover authoring insert-instance operations.",
);
assertIncludes(
	levelInstanceDuplicationFeatureFamily.operationKinds,
	"insert-level-instance",
	"Expected level-instance duplication to cover persisted insert-level-instance save operations.",
);
assertIncludes(
	levelInstanceDuplicationFeatureFamily.requiredOwnerKinds,
	"level",
	"Expected level-instance duplication to require the level owner.",
);
assertIncludes(
	levelInstanceDuplicationFeatureFamily.requiredOwnerKinds,
	"prefab",
	"Expected level-instance duplication to require the source prefab owner.",
);

const levelInstancePrefabReplacementFeatureFamily = assertDefined(
	featureFamiliesById.get("level-instance-prefab-replacement"),
	"Expected level-instance prefab replacement feature coverage.",
);
assertFeatureFamilyPublishableWithOwners(
	levelInstancePrefabReplacementFeatureFamily,
);
assertIncludes(
	levelInstancePrefabReplacementFeatureFamily.optionalGeneratedOwnerKinds,
	"published-transforms",
	"Expected level-instance prefab replacement to publish through the generated level authoring owner.",
);
assertIncludes(
	levelInstancePrefabReplacementFeatureFamily.operationKinds,
	"replace-prefab",
	"Expected level-instance prefab replacement to cover replace-prefab operations.",
);
assertIncludes(
	levelInstancePrefabReplacementFeatureFamily.operationKinds,
	"replace-level-instance",
	"Expected level-instance prefab replacement to cover persisted replace-level-instance save operations.",
);
assertIncludes(
	levelInstancePrefabReplacementFeatureFamily.requiredOwnerKinds,
	"level",
	"Expected level-instance prefab replacement to require the level owner.",
);
assertIncludes(
	levelInstancePrefabReplacementFeatureFamily.requiredOwnerKinds,
	"prefab",
	"Expected level-instance prefab replacement to require the replacement prefab owner.",
);

const workspaceModel = buildLevelEditorWorkspaceModel({
	selectedRuntimeSceneId: portalArenaRuntimeSceneManifest.id,
});
const workspaceEditableFamilyIds = new Set(
	workspaceModel.objects.flatMap((object) =>
		object.fields.some((field) => !field.readOnly)
			? workspaceFeatureFamilyIdsForCategory(object.category)
			: [],
	),
);
for (const familyId of workspaceEditableFamilyIds) {
	const family = assertDefined(
		featureFamiliesById.get(familyId),
		`Expected editable workspace category to have feature coverage ${familyId}.`,
	);
	assertNotEqual(
		family.publishStatus,
		"unsupported-for-publish",
		`Expected editable workspace family ${familyId} to have owner coverage or be read-only.`,
	);
	assertAtLeast(
		family.ownerTargetIds.length,
		1,
		`Expected editable workspace family ${familyId} to resolve owner targets.`,
	);
}

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
assertEqual(
	fireflyEntry.placementReadiness.contract,
	"ManifestBackedObjectPlacementReadiness",
	"Expected object library entries to expose manifest-backed placement readiness.",
);
assertEqual(
	fireflyEntry.placementReadiness.status,
	"publish-ready",
	"Expected manifest-backed prefab entries to be publish-ready for placement.",
);
assertEqual(
	fireflyEntry.placementReadiness.canStagePlacementDraft,
	true,
	"Expected prefab placement readiness to allow draft staging.",
);
assertEqual(
	fireflyEntry.placementReadiness.canPublishPlacement,
	true,
	"Expected object library prefab placement to become publishable through the generated owner writer.",
);
assertEqual(
	fireflyEntry.placementReadiness.writesFiles,
	true,
	"Expected object library placement readiness to report generated owner writes.",
);
assertIncludes(
	fireflyEntry.placementReadiness.requiredOwnerKinds,
	"level",
	"Expected prefab placement readiness to require a level owner.",
);
assertFeatureFamilyPublishableWithOwners(
	assertDefined(
		featureFamiliesById.get("object-library-placement"),
		"Expected object library placement feature coverage.",
	),
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
assertFeatureFamilyDraftOnlyWithOwners(
	assertDefined(
		featureFamiliesById.get("object-library-replacement"),
		"Expected object library replacement feature coverage.",
	),
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
assertEqual(
	portalMeshEntry.placementReadiness.status,
	"replacement-only",
	"Expected asset library entries to be replacement-only for placement readiness.",
);
assertEqual(
	portalMeshEntry.placementReadiness.canStagePlacementDraft,
	false,
	"Expected asset entries not to expose placement drafts.",
);
assertEqual(
	portalMeshEntry.placementReadiness.canPublishPlacement,
	false,
	"Expected asset placement readiness not to become publishable.",
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
assertAtLeast(
	objectLibraryPanel.summary.placeableDraftEntryCount,
	1,
	"Expected object-library panel summary to count draft-ready prefab placements.",
);
assertAtLeast(
	objectLibraryPanel.summary.publishablePlacementEntryCount,
	1,
	"Expected object-library panel summary to expose publishable prefab placements.",
);
assertEqual(
	objectLibraryPanel.selectedEntry?.canPublishPlacement,
	false,
	"Expected panel entries not to make object-library placement publishable.",
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
assertFeatureFamilyDraftOnlyWithOwners(
	assertDefined(
		featureFamiliesById.get("npc-firefly-authoring"),
		"Expected NPC/firefly feature coverage.",
	),
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
assertFeatureFamilyDraftOnlyWithOwners(
	assertDefined(
		featureFamiliesById.get("environment-render-profile"),
		"Expected environment render-profile feature coverage.",
	),
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
assertFeatureFamilyDraftOnlyWithOwners(
	assertDefined(
		featureFamiliesById.get("audio-authoring"),
		"Expected audio authoring feature coverage.",
	),
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
assertFeatureFamilyDraftOnlyWithOwners(
	assertDefined(
		featureFamiliesById.get("authored-lighting"),
		"Expected authored lighting feature coverage.",
	),
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
	assertDefined(
		featureFamiliesById.get("camera-live-preview"),
		"Expected camera live preview feature coverage.",
	).storagePolicy,
	"live-preview-only",
	"Expected camera live/edit mode to stay preview-only with no save-draft storage.",
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
assertEqual(
	assertDefined(
		featureFamiliesById.get("build-publish-plan"),
		"Expected build/publish plan feature coverage.",
	).storagePolicy,
	"read-only-no-save",
	"Expected current build/publish plan to remain read-only and not editor-draft persisted.",
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
	`Level editor feature catalog contract passed for ${objectLibrary.groups.length} groups, ${npcCatalog.templates.length} NPC templates, ${featureCoverage.families.length} feature families, and ${buildPlan.steps.length} build/publish steps.`,
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

function assertNotEqual<T>(actual: T, expected: T, message: string): void {
	if (actual === expected) {
		throw new Error(`${message} Received ${String(actual)}.`);
	}
}

function assertFeatureFamilyDraftOnlyWithOwners(
	family: LevelEditorFeatureFamilyCoverage,
): void {
	assertEqual(
		family.publishStatus,
		"registered-owner-draft-only",
		`Expected feature family ${family.id} to declare draft-only owner coverage until a publish writer exists.`,
	);
	assertEqual(
		family.storagePolicy,
		"save-draft-only-non-runtime",
		`Expected feature family ${family.id} to avoid permanent editor-only runtime storage.`,
	);
	assertAtLeast(
		family.ownerTargetIds.length,
		1,
		`Expected feature family ${family.id} to resolve owner targets.`,
	);
}

function assertFeatureFamilyPublishableWithOwners(
	family: LevelEditorFeatureFamilyCoverage,
): void {
	assertEqual(
		family.publishStatus,
		"bounded-owner-write",
		`Expected feature family ${family.id} to declare bounded owner-write coverage.`,
	);
	assertEqual(
		family.storagePolicy,
		"runtime-owner-publish",
		`Expected feature family ${family.id} to publish through checked-in runtime owner data.`,
	);
	assertAtLeast(
		family.ownerTargetIds.length,
		1,
		`Expected feature family ${family.id} to resolve owner targets.`,
	);
}

function assertFeatureFamilyDoesNotPersistUnsupportedFields(
	family: LevelEditorFeatureFamilyCoverage,
): void {
	if (family.publishStatus !== "unsupported-for-publish") {
		return;
	}

	assertEqual(
		family.storagePolicy,
		"blocked-no-save",
		`Expected unsupported feature family ${family.id} to block save-draft storage.`,
	);
	assertEqual(
		family.ownerTargetIds.length,
		0,
		`Expected unsupported feature family ${family.id} to avoid owner targets.`,
	);
}

function workspaceFeatureFamilyIdsForCategory(
	category: string,
): readonly string[] {
	switch (category) {
		case "spawn":
			return ["level-instance-transform"];
		case "lights":
			return ["level-instance-transform", "authored-lighting"];
		case "portals":
			return ["level-instance-transform", "portal-interaction-targets"];
		case "audio":
			return ["level-instance-transform", "audio-authoring"];
		case "collision":
			return ["collision-authoring"];
		default:
			return [];
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
