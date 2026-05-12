import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const appRoot = join(scriptDir, '..')
const repoRoot = join(appRoot, '..', '..')
const manifestPath = join(
  repoRoot,
  'apps/megameal/public/generated/runtime-game-assets/manifest.json',
)
const backlogPath = join(appRoot, 'AAA_GRAPHICS_CONTENT_BACKLOG.md')

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, 'utf8'))
}

function collectLodMisses(manifest) {
  const misses = []

  for (const [sourceUrl, asset] of Object.entries(manifest.assets ?? {})) {
    for (const [tier, variant] of Object.entries(asset.qualityVariants ?? {})) {
      const validation = variant.lodValidation
      if (!variant.exists) continue
      if (!validation || validation.meetsTarget !== false) continue

      misses.push({
        sourceUrl,
        tier,
        sourceTriangleCount: validation.sourceTriangleCount,
        variantTriangleCount: validation.variantTriangleCount,
        targetTriangleCount: validation.targetTriangleCount,
        actualRatio: validation.actualRatio,
        targetRatio: validation.targetRatio,
      })
    }
  }

  return misses.sort((left, right) =>
    `${left.sourceUrl}:${left.tier}`.localeCompare(
      `${right.sourceUrl}:${right.tier}`,
    ),
  )
}

function collectMaterialBacklog(manifest) {
  return Object.entries(manifest.assets ?? {})
    .map(([sourceUrl, asset]) => {
      const approvedMissingSlots =
        asset.materialCompliance?.approvedMissingRecommendedSlots?.length ?? 0
      return {
        sourceUrl,
        approvedMissingSlots,
        family: getAssetFamily(sourceUrl),
        levels: getAssetLevels(asset),
      }
    })
    .filter(entry => entry.approvedMissingSlots > 0)
    .sort((left, right) => {
      if (left.approvedMissingSlots !== right.approvedMissingSlots) {
        return right.approvedMissingSlots - left.approvedMissingSlots
      }

      return left.sourceUrl.localeCompare(right.sourceUrl)
    })
}

function collectAuthoredMaterialSlices(manifest) {
  return Object.entries(manifest.assets ?? {})
    .map(([sourceUrl, asset]) => ({
      sourceUrl,
      family: getAssetFamily(sourceUrl),
      levels: getAssetLevels(asset),
      status: asset.materialCompliance?.status ?? 'unknown',
      workflow: asset.materialCompliance?.materialAuthoring?.workflow ?? '',
      textureSize: asset.materialCompliance?.materialAuthoring?.textureSize ?? '',
      sourceTextureCount: asset.metadata?.textureCount ?? 0,
      approvedMissingSlots:
        asset.materialCompliance?.approvedMissingRecommendedSlots?.length ?? 0,
    }))
    .filter(entry => entry.status === 'authored-source')
    .sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl))
}

function getAssetLevels(asset) {
  const levels = [
    ...new Set((asset.scenes ?? []).map(scene => scene.sceneId).filter(Boolean)),
  ].sort()
  return levels.length > 0 ? levels : ['unassigned']
}

function getAssetFamily(sourceUrl) {
  const parts = sourceUrl.replace(/^\//, '').split('/')
  if (parts[0] === 'generated' && parts[1] === 'hunyuan3d') {
    return `hunyuan3d/${parts[2] ?? 'unknown'}`
  }
  if (
    parts[0] === 'generated' &&
    parts[1] === 'runtime-game-assets' &&
    parts[2] === 'prefabs'
  ) {
    return `prefab/${parts[3] ?? 'unknown'}`
  }
  if (parts[0] === 'generated' && parts[1] === 'style-lab') {
    return `style-lab/${parts[3] ?? parts[2] ?? 'unknown'}`
  }
  return parts.slice(0, 3).join('/') || 'unknown'
}

function collectMaterialGroups(materialEntries, key) {
  const groups = new Map()
  for (const entry of materialEntries) {
    const keys = key === 'level' ? entry.levels : [entry.family]
    for (const groupKey of keys) {
      const group = groups.get(groupKey) ?? {
        name: groupKey,
        assetCount: 0,
        approvedMissingSlots: 0,
      }
      group.assetCount += 1
      group.approvedMissingSlots += entry.approvedMissingSlots
      groups.set(groupKey, group)
    }
  }

  return [...groups.values()].sort((left, right) => {
    if (left.approvedMissingSlots !== right.approvedMissingSlots) {
      return right.approvedMissingSlots - left.approvedMissingSlots
    }
    return left.name.localeCompare(right.name)
  })
}

function formatRatio(value) {
  return Number.isFinite(value) ? String(value) : ''
}

function renderLodRows(misses) {
  if (misses.length === 0) {
    return '| None | - | - | - | - | - | - |'
  }

  return misses
    .map(
      miss =>
        `| \`${miss.sourceUrl}\` | ${miss.tier} | ${miss.sourceTriangleCount} | ${miss.variantTriangleCount} | ${miss.targetTriangleCount} | ${formatRatio(miss.actualRatio)} | ${formatRatio(miss.targetRatio)} |`,
    )
    .join('\n')
}

function renderMaterialRows(entries) {
  if (entries.length === 0) {
    return '| None | - | - | 0 |'
  }

  return entries
    .map(
      entry =>
        `| \`${entry.sourceUrl}\` | ${entry.family} | ${entry.levels.join(', ')} | ${entry.approvedMissingSlots} |`,
    )
    .join('\n')
}

function renderMaterialGroupRows(groups, emptyName) {
  if (groups.length === 0) {
    return `| ${emptyName} | 0 | 0 |`
  }

  return groups
    .map(
      group =>
        `| ${group.name} | ${group.assetCount} | ${group.approvedMissingSlots} |`,
    )
    .join('\n')
}

function renderAuthoredMaterialRows(entries) {
  if (entries.length === 0) {
    return '| None | - | - | - | - |'
  }

  return entries
    .map(
      entry =>
        `| \`${entry.sourceUrl}\` | ${entry.family} | ${entry.levels.join(', ')} | ${entry.textureSize} | ${entry.workflow} |`,
    )
    .join('\n')
}

function renderBacklog({
  lodMisses,
  materialEntries,
  authoredMaterialEntries,
  generatedFrom,
}) {
  const approvedMissingSlots = materialEntries.reduce(
    (sum, entry) => sum + entry.approvedMissingSlots,
    0,
  )
  const familyGroups = collectMaterialGroups(materialEntries, 'family')
  const levelGroups = collectMaterialGroups(materialEntries, 'level')

  return `# AAA Graphics Content Backlog

This file tracks source-art work that cannot be honestly completed by engine code alone. The runtime pipeline now validates these issues; this backlog is the art-production queue required to move from engine-grade plumbing toward AAA-quality content.

Generated from \`${generatedFrom}\`.

## LOD / Retopology Required

Current audit count: \`lodTargetMisses=${lodMisses.length}\`. Tiny meshes below the LOD policy threshold and variants within the absolute/ratio tolerance are recorded in the runtime manifest as explicit validation exceptions. The remaining misses are real source-art work and need source retopology, manual LOD authoring, or replacement source meshes.

| Asset | Tier | Source Tris | Variant Tris | Target Tris | Actual Ratio | Target Ratio |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${renderLodRows(lodMisses)}

## Authored PBR Material Pass Required

Current audit count: \`missingRecommendedSlots=${approvedMissingSlots}\`, with \`unapprovedRecommendedSlots=0\`. The missing slots are explicitly approved fallbacks for generated assets, but AAA-quality content should replace them with authored material maps over time.

### Remaining Fallbacks By Family

| Family | Assets | Approved Missing Slots |
| --- | ---: | ---: |
${renderMaterialGroupRows(familyGroups, 'None')}

### Remaining Fallbacks By Level

| Level | Assets | Approved Missing Slots |
| --- | ---: | ---: |
${renderMaterialGroupRows(levelGroups, 'None')}

### Authored Material Slices

| Asset | Family | Levels | Texture Size | Workflow |
| --- | --- | --- | ---: | --- |
${renderAuthoredMaterialRows(authoredMaterialEntries)}

### Remaining Fallback Assets

| Asset | Family | Levels | Approved Missing Slots |
| --- | --- | --- | ---: |
${renderMaterialRows(materialEntries)}
`
}

function main() {
  const manifest = readManifest()
  const materialEntries = collectMaterialBacklog(manifest)
  const output = renderBacklog({
    lodMisses: collectLodMisses(manifest),
    materialEntries,
    authoredMaterialEntries: collectAuthoredMaterialSlices(manifest),
    generatedFrom:
      'apps/megameal/public/generated/runtime-game-assets/manifest.json',
  })

  if (process.argv.includes('--write')) {
    writeFileSync(backlogPath, output)
    console.log(`wrote ${backlogPath}`)
    return
  }

  process.stdout.write(output)
}

main()
