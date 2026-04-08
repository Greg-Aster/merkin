import { writable } from 'svelte/store';

export interface PlayerState {
  position: [number, number, number];
  // Add rotation, animation state, etc. in the future
}

export interface MultiplayerState {
  peerId: string | null;
  hostId: string | null;
  isHost: boolean;
  isConnected: boolean;
  players: Record<string, PlayerState>; // A dictionary of players, keyed by their peerId
  error: string | null;
  status: string | null;
}

const initialState: MultiplayerState = {
  peerId: null,
  hostId: null,
  isHost: false,
  isConnected: false,
  players: {},
  error: null,
  status: null,
};

export const multiplayerStore = writable<MultiplayerState>(initialState);