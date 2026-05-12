import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const appRoot = process.cwd()
const inputContractPath = join(
  appRoot,
  'src/threlte/engine/runtimeInputBindings.ts',
)
const pillarContractPath = join(
  appRoot,
  'src/threlte/engine/runtimeEnginePillars.ts',
)
const playerPath = join(appRoot, 'src/threlte/features/player/Player.svelte')
const settingsPath = join(appRoot, 'src/threlte/ui/SettingsPanel.svelte')

const failures = []

function readSource(path) {
  return readFileSync(path, 'utf8')
}

const inputSource = readSource(inputContractPath)
const pillarSource = readSource(pillarContractPath)
const playerSource = readSource(playerPath)
const settingsSource = readSource(settingsPath)

const requiredActions = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
  'jump',
  'sprint',
  'lightPulse',
]
const requiredPillars = [
  'animationGraph',
  'navigation',
  'saveLoad',
  'inputBindings',
  'spatialAudio',
  'scriptingEvents',
  'runtimeProfiling',
]

for (const actionId of requiredActions) {
  if (!inputSource.includes(`id: '${actionId}'`)) {
    failures.push(`Runtime input action missing from contract: ${actionId}`)
  }
}

for (const pillarId of requiredPillars) {
  if (!pillarSource.includes(`id: '${pillarId}'`)) {
    failures.push(`Runtime engine pillar missing from contract: ${pillarId}`)
  }
}

for (const hardCodedInput of [
  "keyStates['KeyW']",
  "keyStates['KeyA']",
  "keyStates['KeyS']",
  "keyStates['KeyD']",
  "keyStates['Space']",
  "keyStates['KeyF']",
]) {
  if (playerSource.includes(hardCodedInput)) {
    failures.push(
      `Player controller still reads a hard-coded gameplay key: ${hardCodedInput}`,
    )
  }
}

if (!playerSource.includes('runtimeInputBindingsStore')) {
  failures.push('Player controller is not wired to runtime input bindings.')
}

if (!settingsSource.includes('rebindRuntimeInputAction')) {
  failures.push('Settings panel does not expose the input rebinding slice.')
}

if (failures.length > 0) {
  console.error('Engine pillar audit failed')
  console.error('==========================')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Engine pillar audit OK')
console.log(
  `Input actions=${requiredActions.length}  pillarContracts=${requiredPillars.length}`,
)
