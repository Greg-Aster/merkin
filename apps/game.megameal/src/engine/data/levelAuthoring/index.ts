export { projectRuntimeSceneManifestToAuthoringDocument } from "./projection.js";
export {
	buildLevelEditorAuthoringWritePlan,
	serializeLevelEditorAuthoringWritePlan,
} from "./writePlan.js";
export {
	validateLevelEditorAuthoringDocument,
	validateLevelEditorAuthoringTransaction,
} from "./validation.js";
export type {
	LevelEditorAuthoringBaseOperation,
	LevelEditorAuthoringDocument,
	LevelEditorAuthoringDocumentProvenance,
	LevelEditorAuthoringEditOperation,
	LevelEditorAuthoringInsertInstanceOperation,
	LevelEditorAuthoringOperationPersistence,
	LevelEditorAuthoringOperationTarget,
	LevelEditorAuthoringOwnerKind,
	LevelEditorAuthoringOwnerProvenance,
	LevelEditorAuthoringProjectionOptions,
	LevelEditorAuthoringRecord,
	LevelEditorAuthoringRemoveComponentOperation,
	LevelEditorAuthoringRemoveInstanceOperation,
	LevelEditorAuthoringReplacePrefabOperation,
	LevelEditorAuthoringSetComponentOperation,
	LevelEditorAuthoringSetPortalTargetOperation,
	LevelEditorAuthoringSetTransformOperation,
	LevelEditorAuthoringSourceSnapshot,
	LevelEditorAuthoringTransaction,
	LevelEditorAuthoringValidationResult,
	LevelEditorAuthoringWriteArtifact,
	LevelEditorAuthoringWriteArtifactPayload,
	LevelEditorAuthoringWriteArtifactPurpose,
	LevelEditorAuthoringWritePlan,
} from "./types.js";
export { LEVEL_EDITOR_AUTHORING_CONTRACT } from "./types.js";
