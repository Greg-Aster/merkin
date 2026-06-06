import {
	LEVEL_EDITOR_DEV_PREVIEW_BROADCAST_CHANNEL,
	type LevelEditorDevPreviewMessage,
	parseLevelEditorDevPreviewMessage,
} from "../../engine/data/index.js";

export type LevelEditorPreviewChannelMessageHandler = (
	message: unknown,
) => void;

export type LevelEditorPreviewChannelPort = {
	readonly name: string;
	post(message: unknown): void;
	subscribe(handler: LevelEditorPreviewChannelMessageHandler): () => void;
	close(): void;
};

type BroadcastChannelLike = {
	postMessage(message: unknown): void;
	addEventListener(
		type: "message",
		handler: (event: { readonly data: unknown }) => void,
	): void;
	removeEventListener(
		type: "message",
		handler: (event: { readonly data: unknown }) => void,
	): void;
	close(): void;
};

type BroadcastChannelConstructor = new (name: string) => BroadcastChannelLike;

export type BrowserLevelEditorPreviewChannelOptions = {
	readonly name?: string;
	readonly scope?: {
		readonly BroadcastChannel?: BroadcastChannelConstructor;
	};
};

export function createBrowserLevelEditorPreviewChannel(
	options: BrowserLevelEditorPreviewChannelOptions = {},
): LevelEditorPreviewChannelPort | undefined {
	const name = options.name ?? LEVEL_EDITOR_DEV_PREVIEW_BROADCAST_CHANNEL;
	const scope = options.scope ?? globalThis;
	const BroadcastChannelCtor = scope.BroadcastChannel;

	if (typeof BroadcastChannelCtor !== "function") {
		return undefined;
	}

	const channel = new BroadcastChannelCtor(name);

	return {
		name,
		post(message) {
			channel.postMessage(message);
		},
		subscribe(handler) {
			const listener = (event: { readonly data: unknown }) => {
				handler(event.data);
			};
			channel.addEventListener("message", listener);

			return () => {
				channel.removeEventListener("message", listener);
			};
		},
		close() {
			channel.close();
		},
	};
}

export function postLevelEditorDevPreviewMessage(
	channel: LevelEditorPreviewChannelPort,
	message: unknown,
): LevelEditorDevPreviewMessage {
	const parsedMessage = parseLevelEditorDevPreviewMessage(message);
	channel.post(parsedMessage);
	return parsedMessage;
}
