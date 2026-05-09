import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  normalizeBrowserName,
  parseArgValue,
  spawnGameDev,
  stopChildProcess,
  waitForUrl,
} from './lib/browserHarness.mjs'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)
const appOrigin = `http://127.0.0.1:${gameDevPort}`
const editorApiBase = String(
  process.env.PUBLIC_EDITOR_API_BASE || process.env.EDITOR_API_BASE || appOrigin,
).replace(/\/+$/, '')
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const useShell = process.platform === 'win32'
const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const noServer = args.includes('--no-server') || process.env.GAME_NO_SERVER === '1'
const forwardedArgs = args.filter(arg => arg !== '--' && arg !== '--no-server')

async function runVisualSmoke() {
  const devProcess = noServer ? null : spawnGameDev(repoRoot)

  try {
    await waitForUrl(`${appOrigin}/`)
    await waitForUrl(`${editorApiBase}/api/level-registry`)

    const browserProcess = spawn(
      pnpmBin,
      [
        '--dir',
        'apps/game',
        'exec',
        'node',
        './scripts/visual-smoke-browser.mjs',
        '--browser',
        browserName,
        ...forwardedArgs,
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: useShell,
        env: process.env,
      },
    )

    const exitCode = await new Promise((resolve, reject) => {
      browserProcess.on('error', reject)
      browserProcess.on('exit', resolve)
    })

    if (exitCode !== 0) {
      throw new Error(`Visual smoke check failed with exit code ${exitCode}`)
    }
  } finally {
    await stopChildProcess(devProcess)
  }
}

await runVisualSmoke()
