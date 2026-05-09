const deprecatedSceneFieldRules = [
  {
    path: ['settings', 'level', 'collision', 'workflow', 'terrainVisualChunks'],
    label: 'settings.level.collision.workflow.terrainVisualChunks',
    reason: 'ground visuals are owned by settings.level.ground',
  },
  {
    path: ['settings', 'level', 'collision', 'workflow', 'terrainSculpting'],
    label: 'settings.level.collision.workflow.terrainSculpting',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'level', 'collision', 'workflow', 'autoBakeTerrain'],
    label: 'settings.level.collision.workflow.autoBakeTerrain',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'level', 'collision', 'terrain', 'autoBakeOnTerrainChange'],
    label: 'settings.level.collision.terrain.autoBakeOnTerrainChange',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: [
      'settings',
      'observatory',
      'collision',
      'workflow',
      'terrainVisualChunks',
    ],
    label: 'settings.observatory.collision.workflow.terrainVisualChunks',
    reason: 'ground visuals are owned by settings.level.ground',
  },
  {
    path: ['settings', 'observatory', 'collision', 'workflow', 'terrainSculpting'],
    label: 'settings.observatory.collision.workflow.terrainSculpting',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'observatory', 'collision', 'workflow', 'autoBakeTerrain'],
    label: 'settings.observatory.collision.workflow.autoBakeTerrain',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: [
      'settings',
      'observatory',
      'collision',
      'terrain',
      'autoBakeOnTerrainChange',
    ],
    label: 'settings.observatory.collision.terrain.autoBakeOnTerrainChange',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'solitude', 'collision', 'workflow', 'terrainVisualChunks'],
    label: 'settings.solitude.collision.workflow.terrainVisualChunks',
    reason: 'ground visuals are owned by settings.level.ground',
  },
  {
    path: ['settings', 'solitude', 'collision', 'workflow', 'terrainSculpting'],
    label: 'settings.solitude.collision.workflow.terrainSculpting',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'solitude', 'collision', 'workflow', 'autoBakeTerrain'],
    label: 'settings.solitude.collision.workflow.autoBakeTerrain',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
  {
    path: ['settings', 'solitude', 'collision', 'terrain', 'autoBakeOnTerrainChange'],
    label: 'settings.solitude.collision.terrain.autoBakeOnTerrainChange',
    reason: 'editor terrain tools are configured by settings.level.terrainSculpt',
  },
]

function hasOwnPath(root, path) {
  let cursor = root
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') return false
    if (!Object.hasOwn(cursor, segment)) return false
    cursor = cursor[segment]
  }
  return true
}

export function findDeprecatedSceneFields(root) {
  return deprecatedSceneFieldRules
    .filter(rule => hasOwnPath(root, rule.path))
    .map(rule => `${rule.label} (${rule.reason})`)
}
