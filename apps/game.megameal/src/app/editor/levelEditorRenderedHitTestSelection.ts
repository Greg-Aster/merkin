import type {
	LevelEditorRenderedSceneBoxSelectRect,
	LevelEditorRenderedSceneBoxSelectRequest,
	LevelEditorRenderedSceneBoxSelectResultPayload,
	LevelEditorRenderedSceneHitTestRequest,
	LevelEditorRenderedSceneHitTestResultPayload,
	LevelEditorRenderedSceneHitTestScreenPoint,
	LevelEditorRenderedSceneHitTestViewport,
} from "../../engine/data/index.js";
import type { LevelEditorPreviewChannelPort } from "../devPreview/index.js";
import {
	sendRenderedSceneBoxSelectRequest,
	sendRenderedSceneHitTestRequest,
} from "./levelEditorPreviewSender.js";

export const LEVEL_EDITOR_RENDERED_HIT_TEST_SELECTION_CONTRACT =
	"LevelEditorRenderedHitTestSelectionContract" as const;

export type LevelEditorRenderedHitTestSelectableObject = {
	readonly stableId: string;
};

export type LevelEditorRenderedHitTestSelectionRequestInput = {
	readonly runtimeSceneId: string;
	readonly viewport: LevelEditorRenderedSceneHitTestViewport;
	readonly screenPoint: LevelEditorRenderedSceneHitTestScreenPoint;
	readonly pickableStableIds: readonly string[];
	readonly sourcePlanHash?: string;
};

export type LevelEditorRenderedBoxSelectSelectionRequestInput = {
	readonly runtimeSceneId: string;
	readonly viewport: LevelEditorRenderedSceneHitTestViewport;
	readonly rect: LevelEditorRenderedSceneBoxSelectRect;
	readonly pickableStableIds: readonly string[];
	readonly sourcePlanHash?: string;
};

export type LevelEditorRenderedHitTestViewportRequestOptions = Pick<
	LevelEditorRenderedHitTestSelectionRequestInput,
	"screenPoint" | "viewport"
> & {
	readonly additive?: boolean;
};

export type LevelEditorRenderedBoxSelectViewportRequestOptions = Pick<
	LevelEditorRenderedBoxSelectSelectionRequestInput,
	"rect" | "viewport"
> & {
	readonly additive?: boolean;
};

export type LevelEditorRenderedSelectionPendingRequest = {
	readonly requestId: string;
	readonly additive: boolean;
};

export type LevelEditorRenderedSelectionRequestDispatchResult =
	| {
			readonly status: "sent";
			readonly pendingRequest: LevelEditorRenderedSelectionPendingRequest;
			readonly label: string;
	  }
	| {
			readonly status: "error";
			readonly label: string;
			readonly message: string;
	  };

export type LevelEditorRenderedHitTestSelectionResult =
	| {
			readonly status: "selected";
			readonly stableId: string;
			readonly additive: boolean;
			readonly reason: "rendered-hit";
			readonly message: string;
	  }
	| {
			readonly status: "miss" | "ignored" | "stale";
			readonly reason:
				| "request-id-mismatch"
				| "runtime-scene-mismatch"
				| "no-rendered-hit"
				| "runtime-ignored"
				| "missing-hit-stable-id"
				| "unknown-stable-id"
				| "not-pickable";
			readonly message: string;
	  };

export type LevelEditorRenderedBoxSelectSelectionResult =
	| {
			readonly status: "selected";
			readonly stableIds: readonly string[];
			readonly additive: boolean;
			readonly reason: "rendered-box-hit";
			readonly message: string;
	  }
	| {
			readonly status: "miss" | "ignored" | "stale";
			readonly reason:
				| "request-id-mismatch"
				| "runtime-scene-mismatch"
				| "no-rendered-hit"
				| "runtime-ignored"
				| "empty-hit-set";
			readonly message: string;
	  };

export function buildLevelEditorRenderedHitTestSelectionRequest(
	input: LevelEditorRenderedHitTestSelectionRequestInput,
): LevelEditorRenderedSceneHitTestRequest {
	return {
		runtimeSceneId: input.runtimeSceneId,
		coordinateSpace: "viewport-css-pixels",
		viewport: input.viewport,
		screenPoint: input.screenPoint,
		pickableStableIds: input.pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		...(input.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: input.sourcePlanHash }),
	};
}

export function buildLevelEditorRenderedBoxSelectSelectionRequest(
	input: LevelEditorRenderedBoxSelectSelectionRequestInput,
): LevelEditorRenderedSceneBoxSelectRequest {
	return {
		runtimeSceneId: input.runtimeSceneId,
		coordinateSpace: "viewport-css-pixels",
		viewport: input.viewport,
		rect: input.rect,
		pickableStableIds: input.pickableStableIds,
		objectViewStateGate: "visible-and-pickable-only",
		writesRuntimeData: false,
		...(input.sourcePlanHash === undefined
			? {}
			: { sourcePlanHash: input.sourcePlanHash }),
	};
}

export function requestLevelEditorRenderedHitTestSelection(options: {
	readonly channel: LevelEditorPreviewChannelPort;
	readonly requestId: string;
	readonly request: LevelEditorRenderedHitTestSelectionRequestInput;
	readonly additive?: boolean;
}): LevelEditorRenderedSelectionRequestDispatchResult {
	const request = buildLevelEditorRenderedHitTestSelectionRequest(
		options.request,
	);

	try {
		sendRenderedSceneHitTestRequest(options.channel, {
			requestId: options.requestId,
			request,
		});
		return {
			status: "sent",
			pendingRequest: {
				requestId: options.requestId,
				additive: options.additive ?? false,
			},
			label: "Rendered viewport selection requested",
		};
	} catch (error) {
		return {
			status: "error",
			label: "Rendered viewport selection request failed",
			message:
				error instanceof Error
					? error.message
					: "Rendered viewport selection request failed.",
		};
	}
}

export function requestLevelEditorRenderedBoxSelectSelection(options: {
	readonly channel: LevelEditorPreviewChannelPort;
	readonly requestId: string;
	readonly request: LevelEditorRenderedBoxSelectSelectionRequestInput;
	readonly additive?: boolean;
}): LevelEditorRenderedSelectionRequestDispatchResult {
	const request = buildLevelEditorRenderedBoxSelectSelectionRequest(
		options.request,
	);

	try {
		sendRenderedSceneBoxSelectRequest(options.channel, {
			requestId: options.requestId,
			request,
		});
		return {
			status: "sent",
			pendingRequest: {
				requestId: options.requestId,
				additive: options.additive ?? false,
			},
			label: "Rendered viewport box selection requested",
		};
	} catch (error) {
		return {
			status: "error",
			label: "Rendered viewport box selection request failed",
			message:
				error instanceof Error
					? error.message
					: "Rendered viewport box selection request failed.",
		};
	}
}

export function consumeLevelEditorRenderedHitTestSelectionResult(options: {
	readonly requestId: string;
	readonly pendingRequestId: string | null;
	readonly expectedRuntimeSceneId: string;
	readonly payload: LevelEditorRenderedSceneHitTestResultPayload;
	readonly objects: readonly LevelEditorRenderedHitTestSelectableObject[];
	readonly pickableStableIds: readonly string[];
	readonly additive?: boolean;
}): LevelEditorRenderedHitTestSelectionResult {
	if (options.pendingRequestId !== options.requestId) {
		return {
			status: "stale",
			reason: "request-id-mismatch",
			message: "Ignored rendered selection result for a stale request.",
		};
	}

	if (options.payload.runtimeSceneId !== options.expectedRuntimeSceneId) {
		return {
			status: "stale",
			reason: "runtime-scene-mismatch",
			message: `Ignored rendered selection result for ${options.payload.runtimeSceneId}; editor is on ${options.expectedRuntimeSceneId}.`,
		};
	}

	if (options.payload.status === "miss") {
		return {
			status: "miss",
			reason: "no-rendered-hit",
			message: "Rendered selection missed all pickable objects.",
		};
	}

	if (options.payload.status === "ignored") {
		return {
			status: "ignored",
			reason: "runtime-ignored",
			message: `Rendered selection ignored by runtime${
				options.payload.reason ? `: ${options.payload.reason}` : "."
			}`,
		};
	}

	const stableId = options.payload.hit?.stableId;

	if (!stableId) {
		return {
			status: "ignored",
			reason: "missing-hit-stable-id",
			message: "Rendered selection hit did not include a stable object ID.",
		};
	}

	if (!options.objects.some((object) => object.stableId === stableId)) {
		return {
			status: "ignored",
			reason: "unknown-stable-id",
			message: `Rendered selection hit unknown object ${stableId}.`,
		};
	}

	if (!options.pickableStableIds.includes(stableId)) {
		return {
			status: "ignored",
			reason: "not-pickable",
			message: `Rendered selection hit ${stableId}, but editor view-state marks it non-pickable.`,
		};
	}

	return {
		status: "selected",
		stableId,
		additive: options.additive ?? false,
		reason: "rendered-hit",
		message: `Selected ${stableId} from rendered viewport hit-test.`,
	};
}

export function consumeLevelEditorRenderedBoxSelectSelectionResult(options: {
	readonly requestId: string;
	readonly pendingRequestId: string | null;
	readonly expectedRuntimeSceneId: string;
	readonly payload: LevelEditorRenderedSceneBoxSelectResultPayload;
	readonly objects: readonly LevelEditorRenderedHitTestSelectableObject[];
	readonly pickableStableIds: readonly string[];
	readonly additive?: boolean;
}): LevelEditorRenderedBoxSelectSelectionResult {
	if (options.pendingRequestId !== options.requestId) {
		return {
			status: "stale",
			reason: "request-id-mismatch",
			message: "Ignored rendered box selection result for a stale request.",
		};
	}

	if (options.payload.runtimeSceneId !== options.expectedRuntimeSceneId) {
		return {
			status: "stale",
			reason: "runtime-scene-mismatch",
			message: `Ignored rendered box selection result for ${options.payload.runtimeSceneId}; editor is on ${options.expectedRuntimeSceneId}.`,
		};
	}

	if (options.payload.status === "miss") {
		return {
			status: "miss",
			reason: "no-rendered-hit",
			message: "Rendered box selection missed all pickable objects.",
		};
	}

	if (options.payload.status === "ignored") {
		return {
			status: "ignored",
			reason: "runtime-ignored",
			message: `Rendered box selection ignored by runtime${
				options.payload.reason ? `: ${options.payload.reason}` : "."
			}`,
		};
	}

	const objectStableIds = new Set(
		options.objects.map((object) => object.stableId),
	);
	const pickableStableIds = new Set(options.pickableStableIds);
	const stableIds = [
		...new Set(options.payload.hits?.map((hit) => hit.stableId)),
	]
		.filter((stableId) => objectStableIds.has(stableId))
		.filter((stableId) => pickableStableIds.has(stableId));

	if (stableIds.length === 0) {
		return {
			status: "ignored",
			reason: "empty-hit-set",
			message:
				"Rendered box selection returned no known editor-pickable stable IDs.",
		};
	}

	return {
		status: "selected",
		stableIds,
		additive: options.additive ?? false,
		reason: "rendered-box-hit",
		message: `Selected ${stableIds.length} object${
			stableIds.length === 1 ? "" : "s"
		} from rendered viewport box selection.`,
	};
}
