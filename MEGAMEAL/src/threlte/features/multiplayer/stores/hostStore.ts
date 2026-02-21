import { writable } from 'svelte/store';
import { initializeHostService } from '../services/MultiplayerService';
import { logStore } from './logStore';

export interface HostState {
  hostId: string | null;
  players: { peerId: string }[];
  error: string | null;
  // New properties for the feature-rich UI
  serverName: string;
  password: string;
  roomName: string;
  isRoomRegistered: boolean;
}

const createHostStore = () => {
  const { subscribe, update, set } = writable<HostState>({
    hostId: null,
    players: [],
    error: null,
    serverName: 'MEGAMEAL Session',
    password: '',
    roomName: '',
    isRoomRegistered: false,
  });

  return {
    subscribe,
    set,
    // Add setter methods for the new properties
    setServerName: (name: string) => update(s => ({ ...s, serverName: name })),
    setPassword: (pass: string) => update(s => ({ ...s, password: pass })),
    setRoomName: (name: string) => update(s => ({ ...s, roomName: name })),
    setRoomRegistered: (isRoomRegistered: boolean) => update(s => ({ ...s, isRoomRegistered })),
    // Methods from the previous version
    setHostId: (hostId: string) => update(s => ({ ...s, hostId, error: null })),
    setError: (error: string) => update(s => ({ ...s, error })),
    updatePlayers: (players: { peerId: string }[]) => update(s => ({ ...s, players })),
  };
};

export const hostStore = createHostStore(); // Corrected initialization

// --- Service Initialization ---
let isInitialized = false;
export const initializeHost = () => {
  if (isInitialized) return;
  isInitialized = true;

  logStore.addLog('Initializing host service...');
  const hostService = initializeHostService();

  hostService.on('host-open', (hostId: string) => {
    hostStore.setHostId(hostId);
    logStore.addLog(`Host service ready! Host ID: ${hostId}`, 'success');
  });

  hostService.on('error', (error: string) => {
    hostStore.setError(error.toString());
    logStore.addLog(`Host error: ${error}`, 'error');
  });

  hostService.on('player-connected', (peerId: string) => {
    logStore.addLog(`Player connected: ${peerId}`, 'success');
  });

  hostService.on('player-list-changed', (players: { peerId: string }[]) => {
    hostStore.updatePlayers(players);
  });
};

// --- Room Registration ---
export async function registerRoom(roomName: string, hostId: string): Promise<boolean> {
  const WORKER_URL = 'https://megameal-room-directory.greggles.workers.dev';

  logStore.addLog(`Registering room "${roomName}"...`);

  try {
    const response = await fetch(`${WORKER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, hostId }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Network request failed. Status: ${response.status}, Body: ${errorBody}`);
    }

    logStore.addLog(`Successfully registered room "${roomName}"`, 'success');
    return true;

  } catch (error) {
    logStore.addLog(`Error during registration: ${(error as Error).message}`, 'error');
    return false;
  }
}