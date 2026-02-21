// src/threlte/features/multiplayer/index.ts

// Components
export { default as MultiplayerManager } from './components/MultiplayerManager.svelte';
export { default as PlayerAvatar } from './components/PlayerAvatar.svelte';
export { default as RemotePlayerAvatar } from './components/RemotePlayerAvatar.svelte';

// Services
export * from './services/MultiplayerService';

// Stores
export { multiplayerStore } from './stores/multiplayerStore';
export { chatStore } from './stores/chatStore';
export { playerNameStore } from './stores/playerNameStore';
export { logStore, type LogEntry } from './stores/logStore';
export { hostStore, initializeHost, registerRoom } from './stores/hostStore';

// UI
export { default as MultiplayerControls } from './ui/MultiplayerControls.svelte';
export { default as ChatBox } from './ui/ChatBox.svelte';
export { default as HostPanel } from './ui/HostPanel.svelte';
export { default as LogTerminal } from './ui/LogTerminal.svelte';