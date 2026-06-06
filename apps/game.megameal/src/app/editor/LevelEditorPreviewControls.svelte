<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type CollisionCookPreviewPatch,
	createCollisionPreviewPatchMessage,
	parseCollisionCookPreviewPatch,
} from "../../engine/data/index.js";
import {
	type LevelEditorPreviewChannelPort,
	createBrowserLevelEditorPreviewChannel,
} from "../devPreview/index.js";
import {
	buildDefaultCollisionPreviewClearRequestMessage,
	buildDefaultRuntimeReloadRequestMessage,
	sendLevelEditorDevPreviewMessage,
} from "./levelEditorPreviewSender.js";

type Props = {
	readonly serializedPreviewPatch: string;
};

type PreviewStatus = {
	readonly kind: "idle" | "ready" | "sent" | "error";
	readonly label: string;
};

type Mutable<TValue> = {
	-readonly [TKey in keyof TValue]: TValue[TKey] extends object
		? Mutable<TValue[TKey]>
		: TValue[TKey];
};

const { serializedPreviewPatch }: Props = $props();
let channel: LevelEditorPreviewChannelPort | undefined = $state();
let status: PreviewStatus = $state({
	kind: "idle",
	label: "Initializing preview channel",
});

onMount(() => {
	channel = createBrowserLevelEditorPreviewChannel();
	status = channel
		? { kind: "ready", label: "Preview channel ready" }
		: { kind: "error", label: "Preview channel unavailable" };
});

onDestroy(() => {
	channel?.close();
});

function sendPreviewPatch(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const patch = buildEditedPreviewPatch(serializedPreviewPatch);
	const message = createCollisionPreviewPatchMessage({
		requestId: createRequestId("collision-preview"),
		patch,
	});
	sendLevelEditorDevPreviewMessage(channel, message);
	status = {
		kind: "sent",
		label: `Sent ${message.payload.entries.length} collision preview entries`,
	};
}

function sendReloadRequest(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const basePatch = parseCollisionCookPreviewPatch(
		JSON.parse(serializedPreviewPatch),
	);
	const message = buildDefaultRuntimeReloadRequestMessage(
		createRequestId("runtime-reload"),
	);
	sendLevelEditorDevPreviewMessage(channel, {
		...message,
		request: {
			...message.request,
			runtimeSceneId: basePatch.runtimeSceneId,
			sourcePlanHash: basePatch.sourcePlanHash,
		},
	});
	status = {
		kind: "sent",
		label: `Requested reload for ${basePatch.runtimeSceneId}`,
	};
}

function sendClearPreviewRequest(): void {
	if (!channel) {
		status = { kind: "error", label: "Preview channel unavailable" };
		return;
	}

	const basePatch = parseCollisionCookPreviewPatch(
		JSON.parse(serializedPreviewPatch),
	);
	const message = buildDefaultCollisionPreviewClearRequestMessage(
		createRequestId("clear-preview"),
	);
	sendLevelEditorDevPreviewMessage(channel, {
		...message,
		request: {
			...message.request,
			runtimeSceneId: basePatch.runtimeSceneId,
			sourcePlanHash: basePatch.sourcePlanHash,
			stableIds: basePatch.entries.map((entry) => entry.stableId),
		},
	});
	status = {
		kind: "sent",
		label: `Cleared ${basePatch.entries.length} collision preview entries`,
	};
}

function createRequestId(prefix: string): string {
	return `${prefix}:${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function buildEditedPreviewPatch(serializedPatch: string) {
	const patch = mutableClone(
		parseCollisionCookPreviewPatch(JSON.parse(serializedPatch)),
	);

	for (const entry of patch.entries) {
		for (const field of document.querySelectorAll<HTMLElement>(
			`[data-stable-id="${cssEscape(entry.stableId)}"][data-collision-field]`,
		)) {
			applyFieldValue(entry, field);
		}
	}

	return parseCollisionCookPreviewPatch(patch);
}

function applyFieldValue(
	entry: Mutable<CollisionCookPreviewPatch>["entries"][number],
	field: HTMLElement,
): void {
	const fieldName = field.dataset.collisionField;

	if (field instanceof HTMLSelectElement && fieldName === "intent") {
		entry.colliderComponent.intent =
			field.value as typeof entry.colliderComponent.intent;
		entry.colliderComponent.sensor =
			field.value === "trigger" ? true : undefined;
		return;
	}

	if (field instanceof HTMLSelectElement && fieldName === "channel") {
		entry.colliderComponent.channel = field.value;
		return;
	}

	if (!(field instanceof HTMLInputElement)) {
		return;
	}

	if (fieldName === "position") {
		entry.transform ??= {};
		entry.transform.position ??= [0, 0, 0];
		entry.transform.position[axisIndex(field.dataset.axis)] =
			numberValue(field);
		return;
	}

	if (fieldName === "scale") {
		entry.transform ??= {};
		entry.transform.scale ??= [1, 1, 1];
		entry.transform.scale[axisIndex(field.dataset.axis)] = numberValue(field);
		return;
	}

	if (
		fieldName === "halfExtents" &&
		entry.colliderComponent.shape.type === "box"
	) {
		const index = Number(field.dataset.axisIndex ?? 0);
		entry.colliderComponent.shape.halfExtents[index] = Math.max(
			0.01,
			numberValue(field),
		);
	}
}

function axisIndex(axis: string | undefined): 0 | 1 | 2 {
	return axis === "y" ? 1 : axis === "z" ? 2 : 0;
}

function numberValue(input: HTMLInputElement): number {
	const value = Number(input.value);
	return Number.isFinite(value) ? value : 0;
}

function cssEscape(value: string): string {
	return globalThis.CSS?.escape?.(value) ?? value.replace(/["\\]/g, "\\$&");
}

function mutableClone<TValue>(value: TValue): Mutable<TValue> {
	return JSON.parse(JSON.stringify(value)) as Mutable<TValue>;
}
</script>

<div class="editor-actions">
	<button type="button" disabled={!channel} onclick={sendPreviewPatch}>
		Preview Collision
	</button>
	<button type="button" disabled={!channel} onclick={sendClearPreviewRequest}>
		Clear Preview
	</button>
	<button type="button" disabled={!channel} onclick={sendReloadRequest}>
		Reload Game Window
	</button>
</div>
<p class="editor-status" data-state={status.kind}>{status.label}</p>
