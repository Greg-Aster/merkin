import type { RoomDirectoryPort } from "../../../../multiplayer/index.js";
import type { NetworkPeerId } from "../../../modules/networking/index.js";

export type RoomDirectoryFetch = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export function createHttpRoomDirectory(options: {
	readonly baseUrl: string;
	readonly fetch?: RoomDirectoryFetch;
}): RoomDirectoryPort {
	const fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
	const baseUrl = options.baseUrl.replace(/\/+$/, "");

	return {
		async register(roomName, hostId) {
			const response = await fetcher(`${baseUrl}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomName, hostId }),
			});

			if (!response.ok) {
				throw new Error(await responseErrorMessage(response));
			}
		},
		async lookup(roomName) {
			const response = await fetcher(`${baseUrl}/lookup/${roomName}`);

			if (!response.ok) {
				throw new Error(await responseErrorMessage(response));
			}

			const data = await response.json();

			if (!isRecord(data) || typeof data.hostId !== "string") {
				throw new Error("Room lookup returned an invalid host response.");
			}

			return data.hostId as NetworkPeerId;
		},
	};
}

async function responseErrorMessage(response: Response): Promise<string> {
	const text = await response.text().catch(() => "");

	return text.length > 0
		? `Room directory request failed (${response.status}): ${text}`
		: `Room directory request failed (${response.status}).`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
