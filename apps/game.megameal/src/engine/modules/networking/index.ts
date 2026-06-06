import type { Command, Entity } from "../../core/index.js";
import type { WorldSnapshot } from "../../data/index.js";

export type NetworkPeerId = string;
export type NetworkTick = number;

export type NetworkMessage =
	| {
			readonly type: "client-command";
			readonly peerId: NetworkPeerId;
			readonly tick: NetworkTick;
			readonly command: Command;
	  }
	| {
			readonly type: "state-snapshot";
			readonly tick: NetworkTick;
			readonly snapshot: WorldSnapshot;
	  }
	| {
			readonly type: "peer-joined";
			readonly peerId: NetworkPeerId;
	  }
	| {
			readonly type: "peer-left";
			readonly peerId: NetworkPeerId;
	  };

export type NetworkTransportPort = {
	readonly peerId: NetworkPeerId;
	send(message: NetworkMessage): void | Promise<void>;
	broadcast(message: NetworkMessage): void | Promise<void>;
	onMessage(handler: (message: NetworkMessage) => void): () => void;
	dispose(): void;
};

export type NetworkAuthorityMode =
	| "local"
	| "client-predicted"
	| "server-authoritative";

export type NetworkSessionState = {
	readonly mode: NetworkAuthorityMode;
	readonly localPeerId: NetworkPeerId;
	readonly connectedPeers: readonly NetworkPeerId[];
	readonly lastSnapshotTick?: NetworkTick;
};

export type NetworkReplicatedEntity = {
	readonly entity: Entity;
	readonly stableId: string;
	readonly ownerPeerId?: NetworkPeerId;
	readonly predicted?: boolean;
};

export type NetworkCommandEnvelope<TCommand extends Command = Command> = {
	readonly peerId: NetworkPeerId;
	readonly tick: NetworkTick;
	readonly command: TCommand;
};

export class InMemoryNetworkTransport implements NetworkTransportPort {
	readonly peerId: NetworkPeerId;

	readonly #handlers = new Set<(message: NetworkMessage) => void>();
	readonly #sent: NetworkMessage[] = [];

	constructor(peerId: NetworkPeerId) {
		if (peerId.length === 0) {
			throw new Error("Network peer ID must be non-empty.");
		}

		this.peerId = peerId;
	}

	sent(): readonly NetworkMessage[] {
		return [...this.#sent];
	}

	send(message: NetworkMessage): void {
		this.#sent.push(message);
	}

	broadcast(message: NetworkMessage): void {
		this.#sent.push(message);

		for (const handler of this.#handlers) {
			handler(message);
		}
	}

	onMessage(handler: (message: NetworkMessage) => void): () => void {
		this.#handlers.add(handler);

		return () => {
			this.#handlers.delete(handler);
		};
	}

	receive(message: NetworkMessage): void {
		for (const handler of this.#handlers) {
			handler(message);
		}
	}

	dispose(): void {
		this.#handlers.clear();
		this.#sent.length = 0;
	}
}

export function createClientCommandMessage<TCommand extends Command>(
	peerId: NetworkPeerId,
	tick: NetworkTick,
	command: TCommand,
): NetworkMessage {
	assertNetworkTick(tick);

	return {
		type: "client-command",
		peerId,
		tick,
		command,
	};
}

export function createStateSnapshotMessage(
	tick: NetworkTick,
	snapshot: WorldSnapshot,
): NetworkMessage {
	assertNetworkTick(tick);

	return {
		type: "state-snapshot",
		tick,
		snapshot,
	};
}

export function commandsFromNetworkMessages<TCommand extends Command>(
	messages: readonly NetworkMessage[],
	tick: NetworkTick,
): readonly NetworkCommandEnvelope<TCommand>[] {
	assertNetworkTick(tick);

	return messages
		.filter(
			(
				message,
			): message is Extract<NetworkMessage, { type: "client-command" }> =>
				message.type === "client-command" && message.tick === tick,
		)
		.map((message) => ({
			peerId: message.peerId,
			tick: message.tick,
			command: message.command as TCommand,
		}));
}

function assertNetworkTick(tick: number): void {
	if (!Number.isSafeInteger(tick) || tick < 0) {
		throw new Error(
			`Network tick must be a non-negative safe integer: ${tick}.`,
		);
	}
}
