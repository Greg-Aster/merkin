<script lang="ts">
import { setRuntimeDiagnostic } from '../stores/runtimeDiagnosticsStore'
import {
  createGameWorldLifecycleDiagnostics,
  createGameWorldLifecycleSnapshot,
  getGameWorldDiagnostic,
  isGameWorldPlayable,
} from './gameWorldLifecycle'

export let currentLevel = ''
export let shellReady = false
export let levelComponentReady = false
export let staticWorldReady = false
export let physicsReady = false
export let playerReady = false
export let gameplayEnabled = false
export let editorEnabled = false
export let unloading = false
export let error: string | null = null

$: setRuntimeDiagnostic('mode', {
  level: 'ready',
  message: editorEnabled ? 'Editor mode active.' : 'Gameplay mode active.',
})

$: gameWorldLifecycle = createGameWorldLifecycleSnapshot({
  levelId: currentLevel,
  shellReady,
  levelComponentReady,
  staticWorldReady,
  physicsReady,
  playerComponentReady: editorEnabled || playerReady,
  gameplayEnabled: editorEnabled || gameplayEnabled,
  editorEnabled,
  unloading,
  error,
})

$: gameWorldDiagnostic = getGameWorldDiagnostic(gameWorldLifecycle)
$: gameWorldLifecycleDiagnostics =
  createGameWorldLifecycleDiagnostics(gameWorldLifecycle)

$: setRuntimeDiagnostic('world', {
  label: 'Game World',
  level: gameWorldDiagnostic.level,
  message: gameWorldDiagnostic.message,
  meta: gameWorldLifecycle as unknown as Record<string, unknown>,
})

$: gameWorldLifecycleDiagnostics.forEach(entry => {
  setRuntimeDiagnostic(entry.key, {
    label: entry.label,
    level: entry.level,
    message: entry.message,
    meta: {
      active: entry.active,
      phase: gameWorldLifecycle.phase,
      levelId: gameWorldLifecycle.levelId,
    },
  })
})

$: setRuntimeDiagnostic('engine', {
  level: isGameWorldPlayable(gameWorldLifecycle) ? 'ready' : 'loading',
  message: isGameWorldPlayable(gameWorldLifecycle)
    ? `Engine ready on level ${currentLevel}.`
    : `Engine waiting for world phase: ${gameWorldLifecycle.phase}.`,
})

$: setRuntimeDiagnostic('staticWorld', {
  label: 'Static World',
  level: staticWorldReady ? 'ready' : 'loading',
  message: staticWorldReady
    ? 'Static render/collision world is ready.'
    : 'Waiting for active level static world readiness.',
})

$: setRuntimeDiagnostic('physics', {
  level: physicsReady ? 'ready' : 'loading',
  message: physicsReady
    ? 'Physics world is active.'
    : 'Waiting for physics world to initialize.',
})

$: setRuntimeDiagnostic('player', {
  level: editorEnabled ? 'idle' : playerReady ? 'ready' : 'loading',
  message: editorEnabled
    ? 'Player runtime disabled while editor mode is active.'
    : playerReady
      ? 'Player component is ready at the level position.'
      : 'Waiting for player component readiness.',
})

$: setRuntimeDiagnostic('editor', {
  level: editorEnabled ? 'ready' : 'idle',
  message: editorEnabled
    ? 'Editor subsystems active.'
    : 'Editor subsystems inactive.',
})
</script>
