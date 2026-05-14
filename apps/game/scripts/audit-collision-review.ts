import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { reviewCollisionContracts } from '../src/threlte/engine/collisionReview'
import type { RuntimeSceneManifest } from '../src/threlte/engine/runtimeSceneManifest'
import type { SceneDocument } from '../src/threlte/engine/sceneDocumentTypes'

const sceneDir = join(process.cwd(), 'src/threlte/editor/scenes')
const runtimeSceneDir = join(
  process.cwd(),
  '../megameal/public/generated/runtime-game-assets/scenes',
)

function stripBom(source: string) {
  return source.replace(/^\uFEFF/, '')
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(stripBom(readFileSync(path, 'utf8'))) as T
}

function getSceneFiles() {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.scene.json'))
    .sort()
}

function readRuntimeScene(levelId: string) {
  const path = join(runtimeSceneDir, `${levelId}.runtime-scene.json`)
  return existsSync(path) ? readJsonFile<RuntimeSceneManifest>(path) : null
}

const reports = getSceneFiles().map(file => {
  const scenePath = join(sceneDir, file)
  const scene = readJsonFile<SceneDocument>(scenePath)
  return {
    file,
    report: reviewCollisionContracts({
      scene,
      runtimeScene: readRuntimeScene(scene.levelId),
    }),
  }
})

console.log('Collision review audit')
console.log('======================')

for (const { file, report } of reports) {
  console.log(
    [
      file,
      `errors=${report.summary.error}`,
      `warnings=${report.summary.warning}`,
      `info=${report.summary.info}`,
      `findings=${report.findings.length}`,
      `collidable=${report.classification.collidable.length}`,
      `visual-only=${report.classification['visual-only'].length}`,
      `disabled=${report.classification.disabled.length}`,
      `missing-collision=${report.classification['missing-collision'].length}`,
      `collision-only-proxy=${report.classification['collision-only-proxy'].length}`,
    ].join('  '),
  )

  for (const finding of report.findings) {
    const actor = finding.actorId ? ` actor=${finding.actorId}` : ''
    console.log(
      `  ${finding.severity.toUpperCase()} ${finding.code}${actor}: ${finding.message}`,
    )
  }
}

const errorFindings = reports.flatMap(({ file, report }) =>
  report.findings
    .filter(finding => finding.severity === 'error')
    .map(finding => `${file}: ${finding.message}`),
)

if (errorFindings.length > 0) {
  console.log('')
  console.error('Collision review audit failed')
  console.error('=============================')
  for (const finding of errorFindings) {
    console.error(`- ${finding}`)
  }
  process.exitCode = 1
}
