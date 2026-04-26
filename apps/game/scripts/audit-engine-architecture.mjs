import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const sceneDir = join(process.cwd(), 'src/threlte/editor/scenes')

function getSceneFiles() {
  return readdirSync(sceneDir)
    .filter(file => file.endsWith('.scene.json'))
    .sort()
}

function getLegacyDefaultShape(node) {
  if (node.kind === 'asset') return 'cuboid'
  if (node.kind === 'primitive' && node.primitive?.geometry === 'cylinder') {
    return 'cylinder'
  }
  if (
    node.kind === 'primitive' &&
    node.primitive?.geometry &&
    node.primitive.geometry !== 'box'
  ) {
    return 'trimesh'
  }
  return 'cuboid'
}

function isGeometryNode(node) {
  return ['asset', 'primitive', 'prefab'].includes(node.kind)
}

function auditScene(file) {
  const fullPath = join(sceneDir, file)
  const scene = JSON.parse(readFileSync(fullPath, 'utf8'))
  const nodes = Array.isArray(scene.nodes) ? scene.nodes : []
  const geometryNodes = nodes.filter(isGeometryNode)
  const explicitCollision = geometryNodes.filter(node => node.collision)
  const implicitSolid = geometryNodes.filter(
    node => !node.collision && node.visible !== false && !node.gameplay,
  )
  const implicitTrimesh = implicitSolid.filter(
    node => getLegacyDefaultShape(node) === 'trimesh',
  )
  const explicitTrimesh = explicitCollision.filter(
    node => node.collision?.shape === 'trimesh',
  )

  return {
    file,
    sizeKb: Math.round(statSync(fullPath).size / 1024),
    nodes: nodes.length,
    geometryNodes: geometryNodes.length,
    explicitCollision: explicitCollision.length,
    implicitSolid: implicitSolid.length,
    explicitTrimesh: explicitTrimesh.length,
    implicitTrimesh: implicitTrimesh.length,
    implicitTrimeshIds: implicitTrimesh.map(node => node.id),
    explicitTrimeshIds: explicitTrimesh.map(node => node.id),
  }
}

const reports = getSceneFiles().map(auditScene)

console.log('Engine architecture scene audit')
console.log('================================')

for (const report of reports) {
  console.log(
    [
      report.file,
      `${report.sizeKb}KB`,
      `nodes=${report.nodes}`,
      `geometry=${report.geometryNodes}`,
      `explicitCollision=${report.explicitCollision}`,
      `implicitSolid=${report.implicitSolid}`,
      `explicitTrimesh=${report.explicitTrimesh}`,
      `implicitTrimesh=${report.implicitTrimesh}`,
    ].join('  '),
  )

  if (report.implicitTrimeshIds.length > 0) {
    console.log(`  implicit trimesh: ${report.implicitTrimeshIds.join(', ')}`)
  }
  if (report.explicitTrimeshIds.length > 0) {
    console.log(`  explicit trimesh: ${report.explicitTrimeshIds.join(', ')}`)
  }
}

const totals = reports.reduce(
  (sum, report) => ({
    nodes: sum.nodes + report.nodes,
    geometryNodes: sum.geometryNodes + report.geometryNodes,
    explicitCollision: sum.explicitCollision + report.explicitCollision,
    implicitSolid: sum.implicitSolid + report.implicitSolid,
    explicitTrimesh: sum.explicitTrimesh + report.explicitTrimesh,
    implicitTrimesh: sum.implicitTrimesh + report.implicitTrimesh,
  }),
  {
    nodes: 0,
    geometryNodes: 0,
    explicitCollision: 0,
    implicitSolid: 0,
    explicitTrimesh: 0,
    implicitTrimesh: 0,
  },
)

console.log('--------------------------------')
console.log(
  [
    'TOTAL',
    `nodes=${totals.nodes}`,
    `geometry=${totals.geometryNodes}`,
    `explicitCollision=${totals.explicitCollision}`,
    `implicitSolid=${totals.implicitSolid}`,
    `explicitTrimesh=${totals.explicitTrimesh}`,
    `implicitTrimesh=${totals.implicitTrimesh}`,
  ].join('  '),
)
