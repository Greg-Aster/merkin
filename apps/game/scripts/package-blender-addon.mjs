import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const BLENDER_TOOLS_ROOT = path.join(REPO_ROOT, 'apps', 'blender')
const ADDON_DIRECTORY_NAME = 'merkin_scene_bridge'
const OUTPUT_ROOT = BLENDER_TOOLS_ROOT
const OUTPUT_PATH = path.join(OUTPUT_ROOT, `${ADDON_DIRECTORY_NAME}.zip`)

function repoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath).replace(/\\/g, '/')
}

function main() {
  const addonDirectory = path.join(BLENDER_TOOLS_ROOT, ADDON_DIRECTORY_NAME)
  const addonEntry = path.join(addonDirectory, '__init__.py')
  if (!fs.existsSync(addonEntry)) {
    throw new Error(`Blender add-on entry not found: ${repoRelative(addonEntry)}`)
  }

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true })
  fs.rmSync(OUTPUT_PATH, { force: true })

  const result = spawnSync(
    'zip',
    [
      '-r',
      OUTPUT_PATH,
      ADDON_DIRECTORY_NAME,
      '-x',
      '*/__pycache__/*',
      '*.pyc',
    ],
    {
      cwd: BLENDER_TOOLS_ROOT,
      encoding: 'utf8',
    },
  )

  if (result.status !== 0) {
    throw new Error(
      result.stderr || result.stdout || `zip exited with ${result.status}`,
    )
  }

  console.log(`Blender add-on package written: ${repoRelative(OUTPUT_PATH)}`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
