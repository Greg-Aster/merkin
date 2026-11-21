import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const GAME_DEV_BRIDGE_RELAY_PATH = "/__megameal-dev-bridge";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_FRAME_BYTES = 4 * 1024 * 1024;
const BRIDGE_ENABLED_CACHE_TTL_MS = 1000;
const bridgeEnabledCache = new Map();
const roles = {
	game: new Set(),
	controller: new Set(),
	"robot-sim": new Set(),
};

export function installGameDevBridgeRelay(server, options) {
	const settingsFilePath = options?.settingsFilePath;

	if (!server.httpServer || !settingsFilePath) {
		return;
	}

	server.httpServer.on("upgrade", async (request, socket) => {
		if (!isBridgeRelayRequest(request)) {
			return;
		}

		if (!(await bridgeEnabled(settingsFilePath))) {
			rejectUpgrade(socket, 403, "Megameal dev bridge is disabled.");
			return;
		}

		const acceptKey = websocketAcceptKey(request.headers["sec-websocket-key"]);
		if (!acceptKey) {
			rejectUpgrade(socket, 400, "Invalid WebSocket upgrade request.");
			return;
		}

		socket.write(
			[
				"HTTP/1.1 101 Switching Protocols",
				"Upgrade: websocket",
				"Connection: Upgrade",
				`Sec-WebSocket-Accept: ${acceptKey}`,
				"",
				"",
			].join("\r\n"),
		);

		registerSocket(createRelaySocket(socket), settingsFilePath);
	});
}

function isBridgeRelayRequest(request) {
	try {
		const url = new URL(request.url ?? "", "http://127.0.0.1");
		return url.pathname === GAME_DEV_BRIDGE_RELAY_PATH;
	} catch {
		return false;
	}
}

async function bridgeEnabled(settingsFilePath) {
	try {
		const source = await readFile(settingsFilePath, "utf8");
		const devBridgeMatch = /devBridge\s*:\s*\{([\s\S]*?)\n\s*\}/m.exec(source);
		const sourceToCheck = devBridgeMatch?.[1] ?? "";
		const enabled = /enabled\s*:\s*true\b/.test(sourceToCheck);
		bridgeEnabledCache.set(settingsFilePath, {
			enabled,
			checkedAt: Date.now(),
			refreshing: false,
		});
		return enabled;
	} catch {
		bridgeEnabledCache.set(settingsFilePath, {
			enabled: false,
			checkedAt: Date.now(),
			refreshing: false,
		});
		return false;
	}
}

function isBridgeEnabledCached(settingsFilePath) {
	const entry = bridgeEnabledCache.get(settingsFilePath);
	const now = Date.now();
	if (!entry) {
		void bridgeEnabled(settingsFilePath);
		return true;
	}
	if (
		!entry.refreshing &&
		now - entry.checkedAt >= BRIDGE_ENABLED_CACHE_TTL_MS
	) {
		entry.refreshing = true;
		void bridgeEnabled(settingsFilePath);
	}
	return entry.enabled;
}

function websocketAcceptKey(key) {
	if (typeof key !== "string" || key.trim().length === 0) {
		return "";
	}

	return createHash("sha1").update(`${key.trim()}${WS_GUID}`).digest("base64");
}

function rejectUpgrade(socket, statusCode, message) {
	socket.write(
		[
			`HTTP/1.1 ${statusCode} ${statusCode === 403 ? "Forbidden" : "Bad Request"}`,
			"Connection: close",
			"Content-Type: text/plain; charset=utf-8",
			`Content-Length: ${Buffer.byteLength(message)}`,
			"",
			message,
		].join("\r\n"),
	);
	socket.destroy();
}

function createRelaySocket(socket) {
	return {
		socket,
		role: undefined,
		sessionId: undefined,
		buffer: Buffer.alloc(0),
		fragmentOpcode: 0,
		fragmentChunks: [],
		fragmentBytes: 0,
		closed: false,
		send(message) {
			if (this.closed || socket.destroyed) {
				return;
			}
			socket.write(encodeTextFrame(JSON.stringify(message)));
		},
		sendBinary(payload) {
			if (this.closed || socket.destroyed) {
				return;
			}
			socket.write(encodeFrame(0x2, payload));
		},
		close() {
			if (this.closed) {
				return;
			}
			this.closed = true;
			try {
				socket.end(encodeCloseFrame());
			} catch {
				socket.destroy();
			}
		},
	};
}

function registerSocket(client, settingsFilePath) {
	client.socket.on("data", (chunk) => {
		if (!isBridgeEnabledCached(settingsFilePath)) {
			client.close();
			removeClient(client);
			return;
		}

		try {
			client.buffer = Buffer.concat([client.buffer, chunk]);
			for (;;) {
				const frame = decodeFrame(client.buffer);
				if (!frame) {
					break;
				}
				client.buffer = client.buffer.subarray(frame.bytesRead);
				handleRawFrame(client, frame);
			}
		} catch {
			client.close();
			removeClient(client);
		}
	});
	client.socket.on("close", () => removeClient(client));
	client.socket.on("error", () => removeClient(client));
}

function handleRawFrame(client, frame) {
	// Control frames (close/ping/pong) may be interleaved between fragments.
	if (frame.opcode >= 0x8) {
		handleFrame(client, frame);
		return;
	}

	if (frame.opcode === 0x0) {
		if (client.fragmentOpcode === 0) {
			throw new Error("Unexpected continuation WebSocket frame.");
		}
		client.fragmentBytes += frame.payload.length;
		if (client.fragmentBytes > MAX_FRAME_BYTES) {
			throw new Error("Fragmented WebSocket message is too large.");
		}
		client.fragmentChunks.push(frame.payload);
		if (frame.fin) {
			const opcode = client.fragmentOpcode;
			const payload = Buffer.concat(
				client.fragmentChunks,
				client.fragmentBytes,
			);
			client.fragmentOpcode = 0;
			client.fragmentChunks = [];
			client.fragmentBytes = 0;
			handleFrame(client, { fin: true, opcode, payload });
		}
		return;
	}

	if (!frame.fin) {
		client.fragmentOpcode = frame.opcode;
		client.fragmentChunks = [frame.payload];
		client.fragmentBytes = frame.payload.length;
		return;
	}

	handleFrame(client, frame);
}

function handleFrame(client, frame) {
	if (frame.opcode === 0x8) {
		client.close();
		removeClient(client);
		return;
	}
	if (frame.opcode === 0x9) {
		client.socket.write(encodeFrame(0xa, frame.payload));
		return;
	}
	if (frame.opcode === 0x2) {
		// Binary media routing between robot-sim (face/speaker) and game (camera/mic).
		if (client.role === "robot-sim") {
			broadcastBinary(roles.game, frame.payload);
		} else if (client.role === "game") {
			broadcastBinary(roles["robot-sim"], frame.payload);
		}
		return;
	}
	if (frame.opcode !== 0x1) {
		return;
	}

	let message;
	try {
		message = JSON.parse(frame.payload.toString("utf8"));
	} catch {
		client.send({ type: "bridge:error", message: "Invalid JSON message." });
		return;
	}

	handleMessage(client, message);
}

function handleMessage(client, message) {
	if (message?.type === "bridge:hello") {
		const role =
			message.role === "game"
				? "game"
				: message.role === "controller"
					? "controller"
					: message.role === "robot-sim"
						? "robot-sim"
						: "";
		if (!role) {
			client.send({ type: "bridge:error", message: "Invalid bridge role." });
			return;
		}

		removeClient(client);
		client.role = role;
		client.sessionId =
			typeof message.sessionId === "string" ? message.sessionId : undefined;
		roles[role].add(client);
		client.send({
			type: "bridge:ready",
			role,
			sessionId: client.sessionId,
			gameSessions: [...roles.game]
				.map((game) => game.sessionId)
				.filter(Boolean),
			robotSimSessions: [...roles["robot-sim"]]
				.map((sim) => sim.sessionId)
				.filter(Boolean),
		});
		return;
	}

	if (client.role === "game") {
		if (isGameMessage(message)) {
			broadcast(roles.controller, message);
			return;
		}
		if (isRobotClientOutboundMessage(message)) {
			broadcast(roles["robot-sim"], message);
			return;
		}
	}

	if (client.role === "robot-sim" && isRobotSimMessage(message)) {
		broadcast(roles.game, message);
		return;
	}

	if (client.role === "controller" && isControllerMessage(message)) {
		broadcast(
			roles.game,
			message.command.targetSessionId
				? { ...message, targetSessionId: message.command.targetSessionId }
				: message,
		);
		return;
	}

	client.send({
		type: "bridge:error",
		message: "Message is not allowed for this bridge role.",
	});
}

function isGameMessage(message) {
	return (
		message?.type === "game:snapshot" ||
		message?.type === "game:command-result" ||
		message?.type === "game:log"
	);
}

function isRobotSimMessage(message) {
	return (
		message?.type === "robot:state" ||
		message?.type === "robot:camera-request" ||
		message?.type === "robot:audio-stop" ||
		message?.type === "robot:arena-meta"
	);
}

function isRobotClientOutboundMessage(message) {
	return (
		typeof message?.type === "string" &&
		(message.type.startsWith("robot:interact:") ||
			message.type.startsWith("robot:record:"))
	);
}

function isControllerMessage(message) {
	return (
		message?.type === "controller:command" &&
		message.command &&
		typeof message.command === "object"
	);
}

function broadcast(clients, message) {
	for (const client of clients) {
		if (
			message.targetSessionId &&
			client.sessionId !== message.targetSessionId
		) {
			continue;
		}
		client.send(message);
	}
}

function broadcastBinary(clients, payload) {
	for (const client of clients) {
		client.sendBinary(payload);
	}
}

function removeClient(client) {
	if (client.role) {
		roles[client.role].delete(client);
	}
	client.closed = client.socket.destroyed;
}

function decodeFrame(buffer) {
	if (buffer.length < 2) {
		return null;
	}

	const first = buffer[0];
	const second = buffer[1];
	let offset = 2;
	let payloadLength = second & 0x7f;
	const masked = (second & 0x80) === 0x80;

	if (payloadLength === 126) {
		if (buffer.length < offset + 2) return null;
		payloadLength = buffer.readUInt16BE(offset);
		offset += 2;
	} else if (payloadLength === 127) {
		if (buffer.length < offset + 8) return null;
		const high = buffer.readUInt32BE(offset);
		const low = buffer.readUInt32BE(offset + 4);
		if (high !== 0) {
			throw new Error("WebSocket frame is too large.");
		}
		payloadLength = low;
		offset += 8;
	}

	if (payloadLength > MAX_FRAME_BYTES) {
		throw new Error("WebSocket frame is too large.");
	}

	const maskOffset = offset;
	const payloadOffset = masked ? offset + 4 : offset;
	const bytesRead = payloadOffset + payloadLength;
	if (buffer.length < bytesRead) {
		return null;
	}

	const payload = Buffer.from(buffer.subarray(payloadOffset, bytesRead));
	if (masked) {
		const mask = buffer.subarray(maskOffset, maskOffset + 4);
		for (let index = 0; index < payload.length; index += 1) {
			payload[index] ^= mask[index % 4];
		}
	}

	return {
		fin: (first & 0x80) !== 0,
		opcode: first & 0x0f,
		payload,
		bytesRead,
	};
}

function encodeTextFrame(text) {
	return encodeFrame(0x1, Buffer.from(text, "utf8"));
}

function encodeCloseFrame() {
	return encodeFrame(0x8, Buffer.alloc(0));
}

function encodeFrame(opcode, payload) {
	const length = payload.length;
	if (length < 126) {
		return Buffer.concat([Buffer.from([0x80 | opcode, length]), payload]);
	}
	if (length <= 0xffff) {
		const header = Buffer.alloc(4);
		header[0] = 0x80 | opcode;
		header[1] = 126;
		header.writeUInt16BE(length, 2);
		return Buffer.concat([header, payload]);
	}

	const header = Buffer.alloc(10);
	header[0] = 0x80 | opcode;
	header[1] = 127;
	header.writeUInt32BE(0, 2);
	header.writeUInt32BE(length, 6);
	return Buffer.concat([header, payload]);
}
