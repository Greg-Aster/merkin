<script lang="ts">
import { onDestroy, onMount } from "svelte";
import {
	type BrowserMultiplayerClient,
	createBrowserMultiplayerClient,
} from "../../app/multiplayerClient";
import type { MultiplayerSnapshot } from "../../multiplayer/index.js";

let client: BrowserMultiplayerClient | undefined = $state();
let snapshot: MultiplayerSnapshot | undefined = $state();
// biome-ignore lint/style/useConst: Svelte bind:value mutates this state.
let roomName = $state("");
let copyStatus = $state("Copy Link");
let unsubscribe: (() => void) | undefined;

onMount(() => {
	client = createBrowserMultiplayerClient();
	unsubscribe = client.subscribe((value) => {
		snapshot = value;
	});
});

onDestroy(() => {
	unsubscribe?.();
	client?.disconnect();
});

function hostRoom(): void {
	void client?.hostRoom(roomName);
}

function joinUrl(): string {
	if (!snapshot?.roomName) return "";
	const basePath =
		import.meta.env.BASE_URL === "/"
			? "/"
			: `/${import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, "")}/`;

	return `${window.location.origin}${basePath}?room=${snapshot.roomName}`;
}

async function copyJoinUrl(): Promise<void> {
	const url = joinUrl();

	if (!url) return;

	try {
		await navigator.clipboard.writeText(url);
		copyStatus = "Copied";
	} catch {
		copyStatus = "Copy Failed";
	}

	setTimeout(() => {
		copyStatus = "Copy Link";
	}, 1800);
}
</script>

<main class="host-shell">
	<section class="host-panel" aria-label="Multiplayer host panel">
		<header>
			<p>Megameal Multiplayer</p>
			<h1>Host Room</h1>
		</header>

		{#if snapshot?.status === "connected"}
			<div class="room-live">
				<span>Room Live</span>
				<strong>{snapshot.roomName}</strong>
			</div>
			<div class="join-url">{joinUrl()}</div>
			<button type="button" onclick={copyJoinUrl}>{copyStatus}</button>
		{:else}
			<form
				class="room-form"
				onsubmit={(event) => {
					event.preventDefault();
					hostRoom();
				}}
			>
				<label>
					Room name
					<input type="text" bind:value={roomName} minlength="3" />
				</label>
				<button
					type="submit"
					disabled={roomName.trim().length < 3 || snapshot?.status === "connecting"}
				>
					Start Host
				</button>
			</form>
		{/if}

		{#if snapshot?.error}
			<p class="error">{snapshot.error}</p>
		{/if}

		<section class="peer-list" aria-label="Connected players">
			<h2>Connected Players</h2>
			{#if snapshot && snapshot.connectedPeers.length > 0}
				<ul>
					{#each snapshot.connectedPeers as peerId}
						<li>{peerId}</li>
					{/each}
				</ul>
			{:else}
				<p>Waiting for players.</p>
			{/if}
		</section>

		<section class="log-list" aria-label="Host logs">
			<h2>Log</h2>
			{#if snapshot && snapshot.logs.length > 0}
				{#each snapshot.logs.slice(-10) as log}
					<p class={log.type}>{log.timestamp} {log.message}</p>
				{/each}
			{:else}
				<p>Host not started.</p>
			{/if}
		</section>
	</section>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #090d13;
		color: #f7f3e8;
		font-family:
			Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
			sans-serif;
	}

	.host-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
		background:
			radial-gradient(circle at 20% 10%, rgb(32 66 94 / 32%), transparent 34%),
			linear-gradient(180deg, #090d13, #111923 56%, #090d13);
	}

	.host-panel {
		width: min(760px, 100%);
		border: 1px solid rgb(184 242 207 / 18%);
		border-radius: 8px;
		background: rgb(12 18 24 / 82%);
		box-shadow: 0 24px 80px rgb(0 0 0 / 38%);
		padding: 24px;
	}

	header p {
		margin: 0 0 6px;
		color: #b8f2cf;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	h1,
	h2 {
		margin: 0;
	}

	h1 {
		font-size: 2rem;
	}

	h2 {
		font-size: 1rem;
	}

	.room-form {
		display: grid;
		gap: 12px;
		margin-top: 20px;
	}

	label {
		display: grid;
		gap: 6px;
		font-weight: 700;
	}

	input,
	button {
		border: 1px solid rgb(232 243 226 / 18%);
		border-radius: 6px;
		font: inherit;
	}

	input {
		background: rgb(4 7 10 / 72%);
		color: #f7f3e8;
		padding: 10px 12px;
	}

	button {
		width: fit-content;
		background: rgb(35 78 88 / 88%);
		color: #f7f3e8;
		padding: 10px 14px;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.room-live {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 20px;
		border: 1px solid rgb(184 242 207 / 20%);
		border-radius: 8px;
		padding: 14px;
		background: rgb(16 39 43 / 72%);
	}

	.room-live span {
		color: #b8f2cf;
		font-weight: 700;
	}

	.join-url {
		margin: 12px 0;
		border: 1px solid rgb(232 243 226 / 14%);
		border-radius: 6px;
		background: rgb(4 7 10 / 72%);
		padding: 10px;
		overflow-wrap: anywhere;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.peer-list,
	.log-list {
		margin-top: 20px;
		border-top: 1px solid rgb(232 243 226 / 12%);
		padding-top: 18px;
	}

	ul {
		margin: 10px 0 0;
		padding-left: 18px;
	}

	li,
	.log-list p,
	.peer-list p,
	.error {
		overflow-wrap: anywhere;
	}

	.error,
	.error p {
		color: #ffb096;
	}

	.success {
		color: #b8f2cf;
	}

	.warn {
		color: #ffe08a;
	}

	.info {
		color: #dbe8f4;
	}
</style>
