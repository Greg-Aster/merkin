export type GameWorldPhase =
  | 'idle'
  | 'shell-loading'
  | 'loading-level'
  | 'unloading'
  | 'building-static-world'
  | 'building-physics'
  | 'placing-player'
  | 'playable'
  | 'error'

export interface GameWorldReadiness {
  levelId: string
  shellReady: boolean
  levelComponentReady: boolean
  staticWorldReady: boolean
  physicsReady: boolean
  playerComponentReady: boolean
  gameplayEnabled: boolean
  editorEnabled: boolean
  unloading: boolean
  error: string | null
}

export interface GameWorldLifecycleSnapshot extends GameWorldReadiness {
  phase: GameWorldPhase
}

export function resolveGameWorldPhase(
  readiness: GameWorldReadiness,
): GameWorldPhase {
  if (readiness.error) return 'error'
  if (readiness.unloading) return 'unloading'
  if (!readiness.shellReady) return 'shell-loading'
  if (!readiness.levelComponentReady) return 'loading-level'
  if (!readiness.staticWorldReady) return 'building-static-world'
  if (!readiness.physicsReady) return 'building-physics'
  if (
    !readiness.editorEnabled &&
    (!readiness.playerComponentReady || !readiness.gameplayEnabled)
  ) {
    return 'placing-player'
  }

  return 'playable'
}

export function createGameWorldLifecycleSnapshot(
  readiness: GameWorldReadiness,
): GameWorldLifecycleSnapshot {
  return {
    ...readiness,
    phase: resolveGameWorldPhase(readiness),
  }
}

export function isGameWorldPlayable(snapshot: GameWorldLifecycleSnapshot) {
  return snapshot.phase === 'playable'
}

export function getGameWorldDiagnostic(snapshot: GameWorldLifecycleSnapshot) {
  switch (snapshot.phase) {
    case 'error':
      return {
        level: 'error' as const,
        message: snapshot.error ?? 'World lifecycle entered an error state.',
      }
    case 'shell-loading':
      return {
        level: 'loading' as const,
        message: 'Game shell is initializing.',
      }
    case 'loading-level':
      return {
        level: 'loading' as const,
        message: `Loading level component for ${snapshot.levelId}.`,
      }
    case 'unloading':
      return {
        level: 'loading' as const,
        message: `Unloading current world before entering ${snapshot.levelId}.`,
      }
    case 'building-static-world':
      return {
        level: 'loading' as const,
        message: `Building static world for ${snapshot.levelId}.`,
      }
    case 'building-physics':
      return {
        level: 'loading' as const,
        message: `Building physics world for ${snapshot.levelId}.`,
      }
    case 'placing-player':
      return {
        level: 'loading' as const,
        message: `Placing player at level position in ${snapshot.levelId}.`,
      }
    case 'playable':
      return {
        level: 'ready' as const,
        message: `World is playable on ${snapshot.levelId}.`,
      }
    default:
      return {
        level: 'idle' as const,
        message: 'World lifecycle is idle.',
      }
  }
}

export function createGameWorldLifecycleDiagnostics(
  snapshot: GameWorldLifecycleSnapshot,
) {
  const isLoading =
    snapshot.phase === 'shell-loading' || snapshot.phase === 'loading-level'
  const isBuilding =
    snapshot.phase === 'building-static-world' ||
    snapshot.phase === 'building-physics' ||
    snapshot.phase === 'placing-player'

  return [
    {
      key: 'worldLoading',
      label: 'World Loading',
      level: isLoading ? ('loading' as const) : ('idle' as const),
      message: isLoading
        ? getGameWorldDiagnostic(snapshot).message
        : 'No world load is currently active.',
      active: isLoading,
    },
    {
      key: 'worldBuilding',
      label: 'World Building',
      level: isBuilding ? ('loading' as const) : ('idle' as const),
      message: isBuilding
        ? getGameWorldDiagnostic(snapshot).message
        : 'No world build step is currently active.',
      active: isBuilding,
    },
    {
      key: 'worldPlayable',
      label: 'World Playable',
      level:
        snapshot.phase === 'playable' ? ('ready' as const) : ('idle' as const),
      message:
        snapshot.phase === 'playable'
          ? `Gameplay is enabled on ${snapshot.levelId}.`
          : 'Gameplay is waiting for the world lifecycle to finish.',
      active: snapshot.phase === 'playable',
    },
    {
      key: 'worldUnloading',
      label: 'World Unloading',
      level:
        snapshot.phase === 'unloading'
          ? ('loading' as const)
          : ('idle' as const),
      message:
        snapshot.phase === 'unloading'
          ? `Unloading previous world state before ${snapshot.levelId}.`
          : 'No world unload is currently active.',
      active: snapshot.phase === 'unloading',
    },
    {
      key: 'worldError',
      label: 'World Error',
      level:
        snapshot.phase === 'error' ? ('error' as const) : ('idle' as const),
      message:
        snapshot.phase === 'error'
          ? snapshot.error ?? 'World lifecycle entered an error state.'
          : 'No world lifecycle error is active.',
      active: snapshot.phase === 'error',
    },
  ]
}
