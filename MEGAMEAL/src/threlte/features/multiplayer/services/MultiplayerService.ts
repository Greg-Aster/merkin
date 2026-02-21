import Peer, { type DataConnection } from 'peerjs';
import { get } from 'svelte/store';
import { multiplayerStore, type PlayerState } from '../stores/multiplayerStore';
import { addMessage, type ChatMessage } from '../stores/chatStore';
import { logStore } from '../index';

const WORKER_URL = 'https://megameal-room-directory.greggles.workers.dev';

class EventEmitter {
  private listeners: { [key: string]: Function[] } = {};
  on(event: string, fn: Function) { this.listeners[event] = this.listeners[event] || []; this.listeners[event].push(fn); }
  emit(event: string, ...args: any[]) { if (this.listeners[event]) { this.listeners[event].forEach(fn => fn(...args)); } }
}

class UnifiedMultiplayerService extends EventEmitter {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private isHost: boolean = false;
  private hostId: string | null = null;
  private playerStates: Record<string, PlayerState> = {};

  public initializeAsHost() {
    this.isHost = true;
    if (this.peer) return;
    this.peer = new Peer();
    this.peer.on('open', (id) => { this.hostId = id; this.emit('host-open', this.hostId); });
    this.peer.on('connection', (conn) => { logStore.addLog(`Received connection from ${conn.peer}`); this.setupConnection(conn); });
    this.peer.on('error', (err) => { logStore.addLog(`Service Error: ${err.message}`, 'error'); this.emit('error', err.message); });
  }

  public async initializeAsClient(roomName: string) {
    if (this.peer) return;
    logStore.addLog(`Looking up room: ${roomName}...`);
    try {
      const response = await fetch(`${WORKER_URL}/lookup/${roomName.toLowerCase()}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Room not found.' }));
        throw new Error(err.error);
      }
      const data = await response.json();
      this.connectToHost(data.hostId);
    } catch (error) {
      logStore.addLog(`Failed to join: ${(error as Error).message}`, 'error');
      this.emit('error', (error as Error).message);
    }
  }

  private connectToHost(hostId: string) {
    this.hostId = hostId;
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      multiplayerStore.update(s => ({ ...s, peerId: id }));
      const conn = this.peer!.connect(hostId, { reliable: true });
      this.setupConnection(conn);
    });
    this.peer.on('error', (err) => { logStore.addLog(`Connection Error: ${err.message}`, 'error'); this.emit('error', err.message); });
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emit('player-connected', conn.peer);

      if (this.isHost) {
        // Host-specific logic
        this.broadcastPlayerList();
        this.broadcastFullState();
      } else {
        // --- THIS IS THE CRUCIAL FIX FOR THE CLIENT ---
        // When the connection opens, the client must update its store to reflect this.
        multiplayerStore.update(s => ({
          ...s,
          isConnected: true,
          hostId: this.hostId,
          status: 'Connected!'
        }));
      }
    });

    conn.on('data', (data: any) => {
      if (this.isHost) {
        if (data.type === 'player_update') {
          this.playerStates[conn.peer] = data.payload;
          this.broadcastFullState();
        } else if (data.type === 'chat_message') {
          this.connections.forEach(c => c.send(data));
        }
      } else {
        if (data.type === 'full_state') {
          multiplayerStore.update(s => ({ ...s, players: data.payload }));
        } else if (data.type === 'chat_message') {
          addMessage(data.payload as ChatMessage);
        }
      }
    });

    conn.on('close', () => {
      logStore.addLog(`Player disconnected: ${conn.peer}`, 'warn');
      this.connections.delete(conn.peer);
      if (this.isHost) {
        delete this.playerStates[conn.peer];
        this.broadcastFullState();
        this.broadcastPlayerList();
      } else {
        // If the client gets disconnected, reset the store.
        multiplayerStore.set({
          peerId: null, hostId: null, isHost: false, isConnected: false,
          players: {}, error: 'Disconnected from host.', status: 'Disconnected.'
        });
      }
    });
  }

  private broadcastFullState() {
    if (!this.isHost) return;
    const message = { type: 'full_state', payload: this.playerStates };
    this.connections.forEach(conn => conn.send(message));
  }

  private broadcastPlayerList() {
    if (!this.isHost) return;
    const playerList = Array.from(this.connections.keys()).map(peerId => ({ peerId }));
    this.emit('player-list-changed', playerList);
  }

  public send(data: any) {
    // The client's connection to the host is the first and only one in its map.
    const conn = this.connections.get(this.hostId!);
    if (conn) conn.send(data);
  }
}

const service = new UnifiedMultiplayerService();

export function initializeHostService() {
  service.initializeAsHost();
  return service;
}

export function initializeClient(roomName: string) {
  service.initializeAsClient(roomName);
}

export function sendPlayerUpdate(playerState: PlayerState) {
  service.send({ type: 'player_update', payload: playerState });
}

export function sendChatMessage(message: string) {
  const state = get(multiplayerStore);
  if (!state.peerId) return;
  service.send({
    type: 'chat_message',
    payload: {
      senderId: state.peerId,
      text: message,
      timestamp: new Date().toISOString(),
    },
  });
}

export function createRoom() {
  window.open('/host', '_blank');
}