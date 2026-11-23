import {
	type MultiplayerSession,
	type MultiplayerSnapshot,
	createMultiplayerSession,
	normalizeRoomName,
} from "../multiplayer/index.js";

const DEFAULT_ROOM_DIRECTORY_URL =
	"https://megameal-room-directory.greggles.workers.dev";

export type BrowserMultiplayerClient = MultiplayerSession & {
	hostRoom(roomName: string): Promise<void>;
	joinRoom(roomName: string): Promise<void>;
};

export function createBrowserMultiplayerClient(
	options: {
		readonly enabled?: boolean;
		readonly roomDirectoryUrl?: string;
	} = {},
): BrowserMultiplayerClient {
	const session = createMultiplayerSession({
		enabled: options.enabled ?? multiplayerEnabledFromEnv(),
	});
	const roomDirectoryUrl =
		options.roomDirectoryUrl ?? multiplayerRoomDirectoryUrlFromEnv();

	return {
		...session,
		async hostRoom(roomName) {
			const normalizedRoomName = normalizeRoomName(roomName);

			if (!canStartConnection(session.snapshot(), normalizedRoomName)) {
				return;
			}

			session.markConnecting("host", normalizedRoomName);

			try {
				const [{ createPeerHostTransport }, { createHttpRoomDirectory }] =
					await Promise.all([
						import("../engine/adapters/browser/networking/peerTransport.js"),
						import("../engine/adapters/browser/networking/roomDirectory.js"),
					]);
				const transport = await createPeerHostTransport();
				const directory = createHttpRoomDirectory({
					baseUrl: roomDirectoryUrl,
				});

				try {
					await directory.register(normalizedRoomName, transport.peerId);
				} catch (error) {
					transport.dispose();
					throw error;
				}

				session.attachTransport({
					transport,
					roomName: normalizedRoomName,
				});
			} catch (error) {
				session.setError(
					errorMessage(error, "Failed to host multiplayer room."),
				);
			}
		},
		async joinRoom(roomName) {
			const normalizedRoomName = normalizeRoomName(roomName);

			if (!canStartConnection(session.snapshot(), normalizedRoomName)) {
				return;
			}

			session.markConnecting("client", normalizedRoomName);

			try {
				const [{ createPeerClientTransport }, { createHttpRoomDirectory }] =
					await Promise.all([
						import("../engine/adapters/browser/networking/peerTransport.js"),
						import("../engine/adapters/browser/networking/roomDirectory.js"),
					]);
				const directory = createHttpRoomDirectory({
					baseUrl: roomDirectoryUrl,
				});
				const hostPeerId = await directory.lookup(normalizedRoomName);
				const transport = await createPeerClientTransport(hostPeerId);

				session.attachTransport({
					transport,
					roomName: normalizedRoomName,
				});
			} catch (error) {
				session.setError(
					errorMessage(error, "Failed to join multiplayer room."),
				);
			}
		},
	};
}

function canStartConnection(
	snapshot: MultiplayerSnapshot,
	roomName: string,
): boolean {
	return (
		snapshot.enabled &&
		roomName.length >= 3 &&
		snapshot.status !== "connecting" &&
		snapshot.status !== "connected"
	);
}

function multiplayerEnabledFromEnv(): boolean {
	return import.meta.env.PUBLIC_MEGAMEAL_MULTIPLAYER_ENABLED !== "0";
}

function multiplayerRoomDirectoryUrlFromEnv(): string {
	const envUrl = import.meta.env.PUBLIC_MEGAMEAL_ROOM_DIRECTORY_URL;

	return typeof envUrl === "string" && envUrl.trim().length > 0
		? envUrl.trim()
		: DEFAULT_ROOM_DIRECTORY_URL;
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}
