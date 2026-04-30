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
const editorApiBase = String(process.env.PUBLIC_EDITOR_API_BASE || 'http://127.0.0.1:3001').replace(/\/+$/, '')
const gameDevPort = String(process.env.GAME_DEV_PORT || 4322)
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const useShell = process.platform === 'win32'
const args = process.argv.slice(2)
const browserName = normalizeBrowserName(
  parseArgValue(args, 'browser', process.env.GAME_BROWSER || 'chromium'),
)
const noServer = args.includes('--no-server') || process.env.GAME_NO_SERVER === '1'

async function runBootCheck() {
  const devProcess = noServer ? null : spawnGameDev(repoRoot)

  try {
    await waitForUrl(`${editorApiBase}/favicon.ico`)
    await waitForUrl(`http://127.0.0.1:${gameDevPort}/`)

    const browserProcess = spawn(
      pnpmBin,
      [
        '--dir',
        'apps/game',
        'exec',
        'node',
        './scripts/boot-check-browser.mjs',
        '--browser',
        browserName,
      ],
      {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: useShell,
        env: process.env,
      }
    )

    const exitCode = await new Promise((resolve, reject) => {
      browserProcess.on('error', reject)
      browserProcess.on('exit', resolve)
    })

    if (exitCode !== 0) {
      throw new Error(`Browser boot check failed with exit code ${exitCode}`)
    }
  } finally {
    await stopChildProcess(devProcess)
  }
}

await runBootCheck()
