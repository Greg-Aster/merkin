<script lang="ts">
import type { BrowserMultiplayerClient } from "../../app/multiplayerClient";
import type { MultiplayerSnapshot } from "../../multiplayer/index.js";

type Props = {
	readonly client?: BrowserMultiplayerClient;
	readonly snapshot?: MultiplayerSnapshot;
	readonly onInputFocusChange?: (focused: boolean) => void;
};

const { client, snapshot, onInputFocusChange }: Props = $props();
// biome-ignore lint/style/useConst: Svelte bind:value mutates this state.
let roomName = $state("");
let chatText = $state("");

function openHostPanel(): void {
	const basePath =
		import.meta.env.BASE_URL === "/"
			? "/"
			: `/${import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, "")}/`;

	window.open(`${window.location.origin}${basePath}host/`, "_blank");
}

function joinRoom(): void {
	void client?.joinRoom(roomName);
}

function sendChat(): void {
	if (!chatText.trim()) return;
	client?.sendChat(chatText);
	chatText = "";
}

function playerCount(snapshot: MultiplayerSnapshot): number {
	return Math.max(
		snapshot.connectedPeers.length,
		snapshot.remotePlayers.length,
	) + 1;
}
</script>

{#if snapshot?.enabled}
	<section class="multiplayer-panel" aria-label="Multiplayer">
		<div class="status-row">
			<strong>Multiplayer</strong>
			<span class:connected={snapshot.status === "connected"}>
				{snapshot.status}
			</span>
		</div>
		{#if snapshot.status === "connected"}
			<div class="session-line">
				<span>{snapshot.roomName ?? "room"}</span>
				<span>{playerCount(snapshot)} peers</span>
			</div>
			<button type="button" onclick={() => client?.disconnect()}>
				Disconnect
			</button>
		{:else}
			<button type="button" onclick={openHostPanel}>Create Room</button>
			<form
				class="join-row"
				onsubmit={(event) => {
					event.preventDefault();
					joinRoom();
				}}
			>
				<input
					type="text"
					bind:value={roomName}
					placeholder="room name"
					minlength="3"
					onfocus={() => onInputFocusChange?.(true)}
					onblur={() => onInputFocusChange?.(false)}
				/>
				<button
					type="submit"
					disabled={roomName.trim().length < 3 || snapshot.status === "connecting"}
				>
					Join
				</button>
			</form>
		{/if}
		{#if snapshot.error}
			<p class="error">{snapshot.error}</p>
		{/if}
	</section>

	{#if snapshot.status === "connected"}
		<section class="chat-panel" aria-label="Multiplayer chat">
			{#if snapshot.chatMessages.length > 0}
				<div class="messages">
					{#each snapshot.chatMessages.slice(-4) as message (message.id)}
						<p>
							<strong>{message.senderId === snapshot.localPeerId ? "You" : message.senderId}</strong>
							{message.text}
						</p>
					{/each}
				</div>
			{/if}
			<form
				class="chat-row"
				onsubmit={(event) => {
					event.preventDefault();
					sendChat();
				}}
			>
				<input
					type="text"
					bind:value={chatText}
					maxlength="200"
					placeholder="message"
					onfocus={() => onInputFocusChange?.(true)}
					onblur={() => onInputFocusChange?.(false)}
				/>
				<button type="submit" disabled={chatText.trim().length === 0}>Send</button>
			</form>
		</section>
	{/if}
{/if}

<style>
	.multiplayer-panel,
	.chat-panel {
		position: absolute;
		z-index: 20;
		border: 1px solid rgb(184 242 207 / 22%);
		border-radius: 8px;
		background: rgb(10 15 19 / 78%);
		color: #f7f3e8;
		backdrop-filter: blur(12px);
	}

	.multiplayer-panel {
		top: 16px;
		right: 16px;
		width: min(300px, calc(100vw - 32px));
		padding: 12px;
	}

	.status-row,
	.session-line,
	.join-row,
	.chat-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.status-row,
	.session-line {
		justify-content: space-between;
	}

	.status-row span {
		border: 1px solid rgb(232 243 226 / 18%);
		border-radius: 999px;
		padding: 3px 8px;
		font-size: 0.72rem;
		text-transform: uppercase;
	}

	.status-row span.connected {
		color: #b8f2cf;
	}

	.session-line {
		margin: 10px 0;
		font-size: 0.78rem;
		color: #dbe8f4;
	}

	button,
	input {
		border: 1px solid rgb(232 243 226 / 18%);
		border-radius: 6px;
		font: inherit;
	}

	button {
		background: rgb(35 78 88 / 88%);
		color: #f7f3e8;
		padding: 7px 10px;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	input {
		min-width: 0;
		flex: 1;
		background: rgb(4 7 10 / 72%);
		color: #f7f3e8;
		padding: 7px 9px;
	}

	.join-row {
		margin-top: 8px;
	}

	.error {
		margin: 8px 0 0;
		color: #ffb096;
		font-size: 0.78rem;
		overflow-wrap: anywhere;
	}

	.chat-panel {
		left: 50%;
		bottom: 20px;
		width: min(620px, calc(100vw - 32px));
		padding: 10px;
		transform: translateX(-50%);
	}

	.messages {
		display: grid;
		gap: 4px;
		margin-bottom: 8px;
		font-size: 0.78rem;
	}

	.messages p {
		margin: 0;
		overflow-wrap: anywhere;
	}

	.messages strong {
		margin-right: 6px;
		color: #b8f2cf;
	}

	@media (max-width: 720px) {
		.multiplayer-panel {
			top: 10px;
			right: 10px;
			left: 10px;
			width: auto;
		}

		.chat-panel {
			bottom: 142px;
		}
	}
</style>
