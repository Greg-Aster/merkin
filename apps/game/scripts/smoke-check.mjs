import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '..', '..')

const requiredPaths = [
  ['Build output index', resolve(appRoot, 'dist/index.html')],
  ['Shared favicon', resolve(repoRoot, 'apps/megameal/public/favicon.ico')],
  ['Game editor tools API handler', resolve(appRoot, 'scripts/editor-tools/server.cjs')],
]

function run(cmd, cwd = repoRoot) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  })
}

console.log('[smoke] running game build')
run('pnpm --dir apps/game build')

let missing = 0
for (const [label, target] of requiredPaths) {
  if (!existsSync(target)) {
    console.error(`[smoke] missing: ${label} -> ${target}`)
    missing += 1
  } else {
    console.log(`[smoke] ok: ${label}`)
  }
}

if (missing > 0) {
  console.error(`[smoke] failed: ${missing} required path(s) missing`)
  process.exit(1)
}

console.log('[smoke] build-path validation passed')
console.log('[smoke] remaining manual checks:')
console.log('  1. Boot / and confirm no console errors plus ready diagnostics')
console.log('  2. Boot /?editor=1 and confirm editor/tools diagnostics')
console.log('  3. Switch levels, spawn player, open settings')
console.log('  4. Run AI Mesh generate and verify runtime remains stable')
