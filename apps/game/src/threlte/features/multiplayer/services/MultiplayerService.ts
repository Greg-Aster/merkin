import Peer, { type DataConnection } from 'peerjs'
import { get } from 'svelte/store'
import { type ChatMessage, addMessage } from '../stores/chatStore'
import { logStore } from '../stores/logStore'
import { type PlayerState, multiplayerStore } from '../stores/multiplayerStore'

const WORKER_URL = 'https://megameal-room-directory.greggles.workers.dev'

function getAppPath(pathname: string) {
  const basePath =
    import.meta.env.BASE_URL === '/'
      ? '/'
      : `/${import.meta.env.BASE_URL.replace(/^\/+|\/+$/g, '')}/`
  return new URL(
    pathname.replace(/^\/+/, ''),
    `${window.location.origin}${basePath}`,
  ).toString()
}

type MultiplayerPlayerListItem = {
  peerId: string
}

type MultiplayerServiceEvents = {
  error: [message: string]
  'host-open': [hostId: string]
  'player-connected': [peerId: string]
  'player-list-changed': [players: MultiplayerPlayerListItem[]]
}

type MultiplayerMessage =
  | {
      type: 'chat_message'
      payload: ChatMessage
    }
  | {
      type: 'full_state'
      payload: Record<string, PlayerState>
    }
  | {
      type: 'player_update'
      payload: PlayerState
    }

class EventEmitter<Events extends Record<string, unknown[]>> {
  private listeners: {
    [EventName in keyof Events]?: Array<(...args: Events[EventName]) => void>
  } = {}

  on<EventName extends keyof Events>(
    event: EventName,
    fn: (...args: Events[EventName]) => void,
  ) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(fn)
  }

  emit<EventName extends keyof Events>(
    event: EventName,
    ...args: Events[EventName]
  ) {
    this.listeners[event]?.forEach(fn => fn(...args))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRoomLookupResponse(value: unknown): value is { hostId: string } {
  return isRecord(value) && typeof value.hostId === 'string'
}

function isMultiplayerMessage(value: unknown): value is MultiplayerMessage {
  return isRecord(value) && typeof value.type === 'string'
}

class UnifiedMultiplayerService extends EventEmitter<MultiplayerServiceEvents> {
  private peer: Peer | null = null
  private connections: Map<string, DataConnection> = new Map()
  private isHost: boolean = false
  private hostId: string | null = null
  private playerStates: Record<string, PlayerState> = {}

  public initializeAsHost() {
    this.isHost = true
    if (this.peer) return
    this.peer = new Peer()
    this.peer.on('open', id => {
      this.hostId = id
      this.emit('host-open', this.hostId)
    })
    this.peer.on('connection', conn => {
      logStore.addLog(`Received connection from ${conn.peer}`)
      this.setupConnection(conn)
    })
    this.peer.on('error', err => {
      logStore.addLog(`Service Error: ${err.message}`, 'error')
      this.emit('error', err.message)
    })
  }

  public async initializeAsClient(roomName: string) {
    if (this.peer) return
    logStore.addLog(`Looking up room: ${roomName}...`)
    try {
      const response = await fetch(
        `${WORKER_URL}/lookup/${roomName.toLowerCase()}`,
      )
      if (!response.ok) {
        const err = await response
          .json()
          .catch(() => ({ error: 'Room not found.' }))
        throw new Error(err.error)
      }
      const data = await response.json()
      if (!isRoomLookupResponse(data)) {
        throw new Error('Room lookup returned an invalid host response.')
      }
      this.connectToHost(data.hostId)
    } catch (error) {
      logStore.addLog(`Failed to join: ${(error as Error).message}`, 'error')
      this.emit('error', (error as Error).message)
    }
  }

  private connectToHost(hostId: string) {
    this.hostId = hostId
    this.peer = new Peer()
    this.peer.on('open', id => {
      multiplayerStore.update(s => ({ ...s, peerId: id }))
      const conn = this.peer!.connect(hostId, { reliable: true })
      this.setupConnection(conn)
    })
    this.peer.on('error', err => {
      logStore.addLog(`Connection Error: ${err.message}`, 'error')
      this.emit('error', err.message)
    })
  }

  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn)
      this.emit('player-connected', conn.peer)

      if (this.isHost) {
        // Host-specific logic
        this.broadcastPlayerList()
        this.broadcastFullState()
      } else {
        // --- THIS IS THE CRUCIAL FIX FOR THE CLIENT ---
        // When the connection opens, the client must update its store to reflect this.
        multiplayerStore.update(s => ({
          ...s,
          isConnected: true,
          hostId: this.hostId,
          status: 'Connected!',
        }))
      }
    })

    conn.on('data', (data: unknown) => {
      if (!isMultiplayerMessage(data)) return

      if (this.isHost) {
        if (data.type === 'player_update') {
          this.playerStates[conn.peer] = data.payload
          this.broadcastFullState()
        } else if (data.type === 'chat_message') {
          this.connections.forEach(c => c.send(data))
        }
      } else {
        if (data.type === 'full_state') {
          multiplayerStore.update(s => ({ ...s, players: data.payload }))
        } else if (data.type === 'chat_message') {
          addMessage(data.payload as ChatMessage)
        }
      }
    })

    conn.on('close', () => {
      logStore.addLog(`Player disconnected: ${conn.peer}`, 'warn')
      this.connections.delete(conn.peer)
      if (this.isHost) {
        delete this.playerStates[conn.peer]
        this.broadcastFullState()
        this.broadcastPlayerList()
      } else {
        // If the client gets disconnected, reset the store.
        multiplayerStore.set({
          peerId: null,
          hostId: null,
          isHost: false,
          isConnected: false,
          players: {},
          error: 'Disconnected from host.',
          status: 'Disconnected.',
        })
      }
    })
  }

  private broadcastFullState() {
    if (!this.isHost) return
    const message = { type: 'full_state', payload: this.playerStates }
    this.connections.forEach(conn => conn.send(message))
  }

  private broadcastPlayerList() {
    if (!this.isHost) return
    const playerList = Array.from(this.connections.keys()).map(peerId => ({
      peerId,
    }))
    this.emit('player-list-changed', playerList)
  }

  public send(data: MultiplayerMessage) {
    if (!this.hostId) return

    const conn = this.connections.get(this.hostId)
    if (conn) conn.send(data)
  }
}

const service = new UnifiedMultiplayerService()

export function initializeHostService() {
  service.initializeAsHost()
  return service
}

export function initializeClient(roomName: string) {
  service.initializeAsClient(roomName)
}

export function sendPlayerUpdate(playerState: PlayerState) {
  service.send({ type: 'player_update', payload: playerState })
}

export function sendChatMessage(message: string) {
  const state = get(multiplayerStore)
  if (!state.peerId) return
  service.send({
    type: 'chat_message',
    payload: {
      senderId: state.peerId,
      text: message,
      timestamp: new Date().toISOString(),
    },
  })
}

export function createRoom() {
  window.open(getAppPath('host'), '_blank', 'noopener,noreferrer')
}
