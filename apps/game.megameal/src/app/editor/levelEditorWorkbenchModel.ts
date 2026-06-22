import {
	type LevelEditorWorkspaceCommandId,
	type LevelEditorWorkspaceModel,
	type LevelEditorWorkspaceObject,
	buildLevelEditorWorkspaceModel,
} from "./levelEditorWorkspaceModel.js";

export type LevelEditorWorkbenchRegionId =
	| "top-toolbar"
	| "hierarchy"
	| "viewport"
	| "inspector"
	| "bottom-dock";

export type LevelEditorWorkbenchRegionBase = {
	readonly id: LevelEditorWorkbenchRegionId;
	readonly label: string;
	readonly contractRole: string;
	readonly ownsRuntimeState: false;
};

export type LevelEditorWorkbenchCommandSummary = {
	readonly id: LevelEditorWorkspaceCommandId;
	readonly label: string;
	readonly enabled: boolean;
	readonly requiresDirty: boolean;
	readonly operation: LevelEditorWorkspaceModel["commands"][number]["operation"];
};

export type LevelEditorWorkbenchTopToolbarRegion =
	LevelEditorWorkbenchRegionBase & {
		readonly id: "top-toolbar";
		readonly selectedRuntimeSceneId: string;
		readonly selectedLevelId: string;
		readonly levelBrowserCount: number;
		readonly commands: readonly LevelEditorWorkbenchCommandSummary[];
		readonly commandGroups: readonly {
			readonly id: "draft" | "level-owner" | "build-publish";
			readonly label: string;
			readonly commandIds: readonly LevelEditorWorkspaceCommandId[];
		}[];
		readonly validationSummary: {
			readonly errorCount: number;
			readonly warningCount: number;
			readonly blocksPublish: boolean;
		};
	};

export type LevelEditorWorkbenchHierarchyRegion =
	LevelEditorWorkbenchRegionBase & {
		readonly id: "hierarchy";
		readonly source: "workspace.sceneTree";
		readonly selectedStableId: string | null;
		readonly groups: readonly {
			readonly category: LevelEditorWorkspaceModel["sceneTree"][number]["category"];
			readonly label: string;
			readonly objectCount: number;
			readonly selectedObjectStableId: string | null;
			readonly stableIdPaths: readonly {
				readonly stableId: string;
				readonly label: string;
				readonly sourceOwner: string;
			}[];
		}[];
	};

export type LevelEditorWorkbenchViewportRegion =
	LevelEditorWorkbenchRegionBase & {
		readonly id: "viewport";
		readonly surface: "live-game-viewport-bridge";
		readonly route: LevelEditorWorkspaceModel["routes"]["liveGame"];
		readonly selectionSource: "workspace.selectedStableId";
		readonly selectedStableId: string | null;
		readonly previewOnly: true;
		readonly directManipulation: false;
		readonly supportedPreviewTargetKinds: readonly NonNullable<
			LevelEditorWorkspaceObject["previewTargetKind"]
		>[];
		readonly limitation: string;
	};

export type LevelEditorWorkbenchInspectorRegion =
	LevelEditorWorkbenchRegionBase & {
		readonly id: "inspector";
		readonly source: "workspace.objects";
		readonly selectedStableId: string | null;
		readonly selectedObject: {
			readonly stableId: string;
			readonly label: string;
			readonly sourceOwner: string;
			readonly category: LevelEditorWorkspaceObject["category"];
			readonly componentNames: readonly string[];
			readonly capabilityReason: string;
			readonly fieldCount: number;
			readonly editableFieldCount: number;
			readonly readOnlyFieldCount: number;
			readonly previewTargetKind?: LevelEditorWorkspaceObject["previewTargetKind"];
		} | null;
	};

export type LevelEditorWorkbenchBottomDockRegion =
	LevelEditorWorkbenchRegionBase & {
		readonly id: "bottom-dock";
		readonly tabs: readonly {
			readonly id:
				| "content-browser"
				| "output-log"
				| "validation-report"
				| "command-plan"
				| "publish-gates";
			readonly label: string;
			readonly itemCount: number;
		}[];
		readonly contentBrowser: {
			readonly source: "workspace.objectLibrary";
			readonly groupCount: number;
			readonly itemCount: number;
		};
		readonly outputLog: {
			readonly source: "workspace.outputLog";
			readonly entryCount: number;
			readonly errorCount: number;
			readonly warningCount: number;
		};
		readonly validationReport: {
			readonly source: "workspace.validationReport";
			readonly itemCount: number;
			readonly blocksPublish: boolean;
		};
		readonly commandPlan: {
			readonly buildStepCount: number;
			readonly publishStepCount: number;
			readonly localOnly: true;
			readonly productionBuildHasHiddenCook: false;
		};
		readonly publishGates: {
			readonly commandEnabled: boolean;
			readonly validationBlocksPublish: boolean;
			readonly publishPlanErrors: readonly string[];
		};
	};

export type LevelEditorWorkbenchModel = {
	readonly schemaVersion: 1;
	readonly contractId: "LevelEditorWorkbenchContract";
	readonly generatedFrom: readonly [
		"levelEditorWorkspaceModel",
		"LevelEditorWorkbenchContract",
	];
	readonly selectedRuntimeSceneId: string;
	readonly selectedStableId: string | null;
	readonly runtimeOwnership: {
		readonly canonicalRuntimeSource: "RuntimeSceneManifest";
		readonly editorModelSource: "LevelEditorWorkspaceModel";
		readonly editorConsumesRuntimeSnapshots: true;
		readonly editorOwnsRuntimeState: false;
		readonly devPreviewWritesPermanentRuntimeData: false;
		readonly runtimeDependsOnWorkbenchModel: false;
	};
	readonly regionOrder: readonly LevelEditorWorkbenchRegionId[];
	readonly regions: {
		readonly topToolbar: LevelEditorWorkbenchTopToolbarRegion;
		readonly hierarchy: LevelEditorWorkbenchHierarchyRegion;
		readonly viewport: LevelEditorWorkbenchViewportRegion;
		readonly inspector: LevelEditorWorkbenchInspectorRegion;
		readonly bottomDock: LevelEditorWorkbenchBottomDockRegion;
	};
};

export function buildLevelEditorWorkbenchModel(
	options: {
		readonly workspace?: LevelEditorWorkspaceModel;
		readonly selectedRuntimeSceneId?: string;
		readonly selectedStableId?: string;
	} = {},
): LevelEditorWorkbenchModel {
	const workspace =
		options.workspace ??
		buildLevelEditorWorkspaceModel({
			...(options.selectedRuntimeSceneId === undefined
				? {}
				: { selectedRuntimeSceneId: options.selectedRuntimeSceneId }),
			...(options.selectedStableId === undefined
				? {}
				: { selectedStableId: options.selectedStableId }),
		});
	const selectedObject = workspace.objects.find(
		(object) => object.stableId === workspace.selectedStableId,
	);

	return {
		schemaVersion: 1,
		contractId: "LevelEditorWorkbenchContract",
		generatedFrom: [
			"levelEditorWorkspaceModel",
			"LevelEditorWorkbenchContract",
		],
		selectedRuntimeSceneId: workspace.selectedRuntimeSceneId,
		selectedStableId: workspace.selectedStableId,
		runtimeOwnership: {
			canonicalRuntimeSource: "RuntimeSceneManifest",
			editorModelSource: "LevelEditorWorkspaceModel",
			editorConsumesRuntimeSnapshots: true,
			editorOwnsRuntimeState: false,
			devPreviewWritesPermanentRuntimeData: false,
			runtimeDependsOnWorkbenchModel: false,
		},
		regionOrder: [
			"top-toolbar",
			"hierarchy",
			"viewport",
			"inspector",
			"bottom-dock",
		],
		regions: {
			topToolbar: buildTopToolbarRegion(workspace),
			hierarchy: buildHierarchyRegion(workspace),
			viewport: buildViewportRegion(workspace),
			inspector: buildInspectorRegion(workspace, selectedObject),
			bottomDock: buildBottomDockRegion(workspace),
		},
	};
}

function buildTopToolbarRegion(
	workspace: LevelEditorWorkspaceModel,
): LevelEditorWorkbenchTopToolbarRegion {
	return {
		id: "top-toolbar",
		label: "Top Toolbar",
		contractRole:
			"scene selection, tool/save/build/publish commands, and validation state",
		ownsRuntimeState: false,
		selectedRuntimeSceneId: workspace.selectedRuntimeSceneId,
		selectedLevelId: workspace.selectedLevelId,
		levelBrowserCount: workspace.levelBrowser.length,
		commands: workspace.commands.map((command) => ({
			id: command.id,
			label: command.label,
			enabled: command.enabled,
			requiresDirty: command.requiresDirty,
			operation: command.operation,
		})),
		commandGroups: [
			{
				id: "draft",
				label: "Draft",
				commandIds: ["save", "discard"],
			},
			{
				id: "level-owner",
				label: "Level Owner",
				commandIds: ["save-level"],
			},
			{
				id: "build-publish",
				label: "Build And Publish",
				commandIds: ["build", "publish"],
			},
		],
		validationSummary: {
			errorCount: workspace.validationReport.errorCount,
			warningCount: workspace.validationReport.warningCount,
			blocksPublish: workspace.validationReport.blocksPublish,
		},
	};
}

function buildHierarchyRegion(
	workspace: LevelEditorWorkspaceModel,
): LevelEditorWorkbenchHierarchyRegion {
	return {
		id: "hierarchy",
		label: "Scene Hierarchy",
		contractRole:
			"stable-ID scene hierarchy derived from manifest-owned workspace objects",
		ownsRuntimeState: false,
		source: "workspace.sceneTree",
		selectedStableId: workspace.selectedStableId,
		groups: workspace.sceneTree.map((group) => {
			const selectedObject = group.objects.find(
				(object) => object.stableId === workspace.selectedStableId,
			);

			return {
				category: group.category,
				label: group.label,
				objectCount: group.objects.length,
				selectedObjectStableId: selectedObject?.stableId ?? null,
				stableIdPaths: group.objects.map((object) => ({
					stableId: object.stableId,
					label: object.label,
					sourceOwner: object.sourceOwner,
				})),
			};
		}),
	};
}

function buildViewportRegion(
	workspace: LevelEditorWorkspaceModel,
): LevelEditorWorkbenchViewportRegion {
	return {
		id: "viewport",
		label: "Viewport",
		contractRole:
			"future central viewport or live-game bridge that mirrors workspace selection",
		ownsRuntimeState: false,
		surface: "live-game-viewport-bridge",
		route: workspace.routes.liveGame,
		selectionSource: "workspace.selectedStableId",
		selectedStableId: workspace.selectedStableId,
		previewOnly: true,
		directManipulation: false,
		supportedPreviewTargetKinds: uniquePreviewTargetKinds(workspace.objects),
		limitation:
			"direct viewport picking and transform gizmos remain future workbench work",
	};
}

function buildInspectorRegion(
	workspace: LevelEditorWorkspaceModel,
	selectedObject: LevelEditorWorkspaceObject | undefined,
): LevelEditorWorkbenchInspectorRegion {
	return {
		id: "inspector",
		label: "Inspector",
		contractRole:
			"selected-object source owner, component groups, editability, and preview metadata",
		ownsRuntimeState: false,
		source: "workspace.objects",
		selectedStableId: workspace.selectedStableId,
		selectedObject:
			selectedObject === undefined
				? null
				: {
						stableId: selectedObject.stableId,
						label: selectedObject.label,
						sourceOwner: selectedObject.sourceOwner,
						category: selectedObject.category,
						componentNames: selectedObject.componentNames,
						capabilityReason: selectedObject.capabilityReason,
						fieldCount: selectedObject.fields.length,
						editableFieldCount: selectedObject.fields.filter(
							(field) => !field.readOnly,
						).length,
						readOnlyFieldCount: selectedObject.fields.filter(
							(field) => field.readOnly,
						).length,
						...(selectedObject.previewTargetKind === undefined
							? {}
							: { previewTargetKind: selectedObject.previewTargetKind }),
					},
	};
}

function buildBottomDockRegion(
	workspace: LevelEditorWorkspaceModel,
): LevelEditorWorkbenchBottomDockRegion {
	const contentItemCount = workspace.objectLibrary.reduce(
		(total, group) => total + group.items.length,
		0,
	);
	const publishCommand = workspace.commands.find(
		(command) => command.id === "publish",
	);

	return {
		id: "bottom-dock",
		label: "Bottom Dock",
		contractRole:
			"content browser, output log, validation report, command plan, and publish gates",
		ownsRuntimeState: false,
		tabs: [
			{
				id: "content-browser",
				label: "Content Browser",
				itemCount: contentItemCount,
			},
			{
				id: "output-log",
				label: "Output Log",
				itemCount: workspace.outputLog.length,
			},
			{
				id: "validation-report",
				label: "Validation Report",
				itemCount: workspace.validationReport.items.length,
			},
			{
				id: "command-plan",
				label: "Command Plan",
				itemCount:
					workspace.commandPlans.build.stepCount +
					workspace.commandPlans.publish.stepCount,
			},
			{
				id: "publish-gates",
				label: "Publish Gates",
				itemCount:
					workspace.validationReport.errorCount +
					workspace.commandPlans.publish.errors.length,
			},
		],
		contentBrowser: {
			source: "workspace.objectLibrary",
			groupCount: workspace.objectLibrary.length,
			itemCount: contentItemCount,
		},
		outputLog: {
			source: "workspace.outputLog",
			entryCount: workspace.outputLog.length,
			errorCount: workspace.outputLog.filter((entry) => entry.level === "error")
				.length,
			warningCount: workspace.outputLog.filter(
				(entry) => entry.level === "warning",
			).length,
		},
		validationReport: {
			source: "workspace.validationReport",
			itemCount: workspace.validationReport.items.length,
			blocksPublish: workspace.validationReport.blocksPublish,
		},
		commandPlan: {
			buildStepCount: workspace.commandPlans.build.stepCount,
			publishStepCount: workspace.commandPlans.publish.stepCount,
			localOnly: true,
			productionBuildHasHiddenCook: false,
		},
		publishGates: {
			commandEnabled: publishCommand?.enabled ?? false,
			validationBlocksPublish: workspace.validationReport.blocksPublish,
			publishPlanErrors: workspace.commandPlans.publish.errors,
		},
	};
}

function uniquePreviewTargetKinds(
	objects: readonly LevelEditorWorkspaceObject[],
): readonly NonNullable<LevelEditorWorkspaceObject["previewTargetKind"]>[] {
	return [
		...new Set(
			objects
				.map((object) => object.previewTargetKind)
				.filter(
					(
						kind,
					): kind is NonNullable<
						LevelEditorWorkspaceObject["previewTargetKind"]
					> => kind !== undefined,
				),
		),
	].sort((left, right) => left.localeCompare(right));
}
