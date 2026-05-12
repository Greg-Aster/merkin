import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const appRoot = resolve(repoRoot, 'apps/game')
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const useShell = process.platform === 'win32'
const args = process.argv.slice(2)

function parseArgValue(name, fallback = '') {
  const prefix = `${name}=`
  const inline = args.find(arg => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)

  const index = args.indexOf(name)
  if (index >= 0 && args[index + 1]) return args[index + 1]

  return fallback
}

const profile = parseArgValue(
  '--profile',
  process.env.GAME_RELEASE_GATE_PROFILE || 'full',
)
const useGameDevPort =
  args.includes('--use-game-dev-port') ||
  process.env.GAME_RELEASE_GATE_USE_GAME_DEV_PORT === '1'
const releaseGateDevPort =
  process.env.GAME_RELEASE_GATE_PORT ||
  (useGameDevPort ? process.env.GAME_DEV_PORT : '') ||
  '4330'
const releaseReportPath = resolve(
  appRoot,
  parseArgValue(
    '--report-json',
    process.env.GAME_RELEASE_GATE_REPORT ||
      `reports/release-gate-${profile}.json`,
  ),
)
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  profile,
  gameDevPort: releaseGateDevPort,
  certificationPolicy: {
    hardGates: [
      'lint',
      'type-check',
      'generated runtime asset drift',
      'runtime purity',
      'runtime asset manifest audit',
      'runtime prefab audit',
      'engine audit',
      'build smoke',
    ],
    strictPerformanceGate:
      'Miranda desktop-high is available through certify:performance:strict but is not part of release:gate:quick until repeated preview captures meet production thresholds.',
    reportingOnly:
      'All migrated levels are covered by certify:performance:all-levels and profile:resources:all-levels; failures there are advisory unless those commands are run with --strict.',
    allLevelCoverage: [
      'miranda',
      'observatory',
      'sci-fi-room',
      'solitude',
      'yggdrasil',
    ],
  },
  status: 'running',
  steps: [],
}

const baseSteps = [
  {
    name: 'Lint game source',
    command: ['--dir', 'apps/game', 'lint'],
  },
  {
    name: 'Type check game',
    command: ['--dir', 'apps/game', 'type-check'],
  },
  {
    name: 'Check generated runtime asset drift',
    command: ['--dir', 'apps/game', 'check:generated-drift'],
  },
  {
    name: 'Audit runtime purity',
    command: ['--dir', 'apps/game', 'audit:runtime-purity'],
  },
  {
    name: 'Audit runtime asset manifest',
    command: ['--dir', 'apps/game', 'audit:runtime-assets'],
  },
  {
    name: 'Audit runtime prefab bake outputs',
    command: ['--dir', 'apps/game', 'audit:runtime-prefabs'],
  },
  {
    name: 'Audit engine architecture',
    command: ['--dir', 'apps/game', 'audit:engine'],
  },
  {
    name: 'Build smoke check',
    command: ['--dir', 'apps/game', 'smoke:engine'],
  },
]

const browserSteps = [
  {
    name: 'Browser boot smoke',
    command: ['--dir', 'apps/game', 'smoke:boot'],
  },
  {
    name: 'Visual smoke',
    command: ['--dir', 'apps/game', 'smoke:visual', '--', '--write-artifacts'],
    env: {
      GAME_VISUAL_ARTIFACTS: '1',
    },
  },
]

const profiles = {
  quick: baseSteps,
  full: [...baseSteps, ...browserSteps],
  ci: baseSteps,
  browser: browserSteps,
}

const steps = profiles[profile]

if (!steps) {
  console.error(
    `Unknown release gate profile "${profile}". Expected quick, full, or ci.`,
  )
  process.exit(1)
}

function writeReport() {
  mkdirSync(dirname(releaseReportPath), { recursive: true })
  writeFileSync(releaseReportPath, `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`[release-gate] profile=${profile}`)
console.log(`[release-gate] GAME_DEV_PORT=${releaseGateDevPort}`)
console.log(`[release-gate] report=${releaseReportPath}`)
console.log(
  '[release-gate] performance: strict Miranda certification is explicit but not part of this release gate; all-level performance coverage remains reporting-only.',
)

for (const [index, step] of steps.entries()) {
  const startedAt = Date.now()
  const reportStep = {
    name: step.name,
    command: ['pnpm', ...step.command].join(' '),
    status: 'running',
    startedAt: new Date(startedAt).toISOString(),
    durationMs: 0,
    exitCode: null,
  }
  report.steps.push(reportStep)
  writeReport()

  console.log('')
  console.log(`[release-gate] ${index + 1}/${steps.length}: ${step.name}`)
  console.log(`[release-gate] pnpm ${step.command.join(' ')}`)

  const result = spawnSync(pnpmBin, step.command, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: useShell,
    env: {
      ...process.env,
      GAME_DEV_PORT: releaseGateDevPort,
      ...step.env,
    },
  })

  if (result.error) {
    reportStep.status = 'failed-to-start'
    reportStep.durationMs = Date.now() - startedAt
    report.status = 'failed'
    report.failedStep = step.name
    writeReport()
    console.error(`[release-gate] ${step.name} failed to start`)
    console.error(result.error)
    process.exit(1)
  }

  if (result.status !== 0) {
    reportStep.status = 'failed'
    reportStep.durationMs = Date.now() - startedAt
    reportStep.exitCode = result.status
    report.status = 'failed'
    report.failedStep = step.name
    writeReport()
    console.error(
      `[release-gate] ${step.name} failed with exit code ${result.status}`,
    )
    process.exit(result.status ?? 1)
  }

  reportStep.status = 'passed'
  reportStep.durationMs = Date.now() - startedAt
  reportStep.exitCode = result.status
  writeReport()
}

report.status = 'passed'
report.completedAt = new Date().toISOString()
writeReport()

console.log('')
console.log(`[release-gate] ${profile} gate passed`)
