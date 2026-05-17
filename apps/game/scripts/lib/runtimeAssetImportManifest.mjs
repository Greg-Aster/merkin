import { existsSync, readFileSync } from 'node:fs'
import { basename, extname, join, relative } from 'node:path'

const importManifestSchemaVersion = 1
const importManifestRelativePath = 'authoring/assets/import-manifest.json'

function normalizePublicUrl(url) {
  return typeof url === 'string' && url.startsWith('/') ? url : `/${url ?? ''}`
}

function stripExtension(path) {
  const extension = extname(path)
  return extension ? path.slice(0, -extension.length) : path
}

function sanitizeAssetIdPart(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.(glb|gltf)$/i, '')
    .replace(/[^a-zA-Z0-9:_./-]+/g, '-')
}

function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function getRuntimeAssetImportManifestPath(context) {
  return (
    context.importManifestPath ?? join(context.appRoot, importManifestRelativePath)
  )
}

export function readRuntimeAssetImportManifest(context) {
  const path = getRuntimeAssetImportManifestPath(context)
  if (!existsSync(path)) {
    return {
      path,
      relativePath: relative(context.repoRoot, path),
      missing: true,
      schemaVersion: importManifestSchemaVersion,
      namingConventions: null,
      families: [],
      assets: {},
    }
  }

  const manifest = readJsonFile(path)
  return {
    ...manifest,
    path,
    relativePath: relative(context.repoRoot, path),
    missing: false,
    families: Array.isArray(manifest.families) ? manifest.families : [],
    assets:
      manifest.assets && typeof manifest.assets === 'object'
        ? manifest.assets
        : {},
  }
}

function getMatchingFamily(manifest, sourceUrl) {
  return manifest.families
    .filter(family => {
      const prefix = normalizePublicUrl(family.sourceUrlPrefix)
      return sourceUrl.startsWith(prefix)
    })
    .sort(
      (left, right) =>
        normalizePublicUrl(right.sourceUrlPrefix).length -
        normalizePublicUrl(left.sourceUrlPrefix).length,
    )[0]
}

function resolveSourcePath({ context, sourceUrl, family, explicit }) {
  const sourcePath = explicit?.sourcePath
  if (sourcePath) return sourcePath

  const sourceRoot = family?.sourceRoot
  if (sourceRoot && !sourceRoot.startsWith('/')) {
    const prefix = normalizePublicUrl(family.sourceUrlPrefix)
    const familyRelativePath = sourceUrl.slice(prefix.length).replace(/^\/+/, '')
    return join(sourceRoot, familyRelativePath)
  }

  return relative(
    context.repoRoot,
    join(context.publicRoot, sourceUrl.replace(/^\//, '')),
  )
}

function mergePolicy(familyPolicy, explicitPolicy) {
  if (!familyPolicy && !explicitPolicy) return null
  return {
    ...(familyPolicy ?? {}),
    ...(explicitPolicy ?? {}),
  }
}

export function resolveRuntimeAssetImportMetadata({
  context,
  manifest,
  sourceUrl,
}) {
  const normalizedSourceUrl = normalizePublicUrl(sourceUrl)
  const explicit = manifest.assets[normalizedSourceUrl]
  const family = getMatchingFamily(manifest, normalizedSourceUrl)
  if (!family && !explicit) return null

  const familyPrefix = family ? normalizePublicUrl(family.sourceUrlPrefix) : ''
  const familyRelativeId =
    family && normalizedSourceUrl.startsWith(familyPrefix)
      ? stripExtension(
          normalizedSourceUrl.slice(familyPrefix.length).replace(/^\/+/, ''),
        )
      : stripExtension(basename(normalizedSourceUrl))
  const assetId =
    explicit?.id ??
    (family?.id
      ? `${family.id}:${sanitizeAssetIdPart(familyRelativeId)}`
      : sanitizeAssetIdPart(familyRelativeId))

  return {
    schemaVersion: importManifestSchemaVersion,
    id: assetId,
    familyId: explicit?.familyId ?? family?.id ?? null,
    sourceUrl: normalizedSourceUrl,
    sourcePath: resolveSourcePath({
      context,
      sourceUrl: normalizedSourceUrl,
      family,
      explicit,
    }),
    sourceRoot: explicit?.sourceRoot ?? family?.sourceRoot ?? null,
    sourceKind: explicit?.sourceKind ?? family?.sourceKind ?? 'render-source',
    authoringTool: explicit?.authoringTool ?? family?.authoringTool ?? null,
    sourceNote: explicit?.sourceNote ?? family?.sourceNote ?? null,
    license: explicit?.license ?? family?.license ?? null,
    owner: explicit?.owner ?? family?.owner ?? null,
    status: explicit?.status ?? family?.status ?? null,
    intendedLevels: explicit?.intendedLevels ?? family?.intendedLevels ?? [],
    materialPolicy: mergePolicy(
      family?.materialPolicy,
      explicit?.materialPolicy,
    ),
    collisionPolicy: mergePolicy(
      family?.collisionPolicy,
      explicit?.collisionPolicy,
    ),
    targetBudgets: mergePolicy(family?.targetBudgets, explicit?.targetBudgets),
    cookOverrides: mergePolicy(family?.cookOverrides, explicit?.cookOverrides),
    lodValidationExceptions: mergePolicy(
      family?.lodValidationExceptions,
      explicit?.lodValidationExceptions,
    ),
    naming: family?.naming ?? null,
  }
}

function isRequiredCollisionPolicy(policy) {
  return [
    'separate-collider-required',
    'trimesh-proxy-required',
    'convex-proxy-required',
  ].includes(policy?.kind)
}

function getOversizedTextures(asset, maxTextureSize) {
  if (!Number.isFinite(maxTextureSize)) return []
  return (asset.metadata?.textures ?? []).filter(texture => {
    const width = texture.width
    const height = texture.height
    return (
      (Number.isFinite(width) && width > maxTextureSize) ||
      (Number.isFinite(height) && height > maxTextureSize)
    )
  })
}

export function validateRuntimeAssetImports({ manifest, entries }) {
  const failures = []
  const warnings = []
  const report = {
    importManifestPath: manifest.relativePath,
    missingImportManifest: manifest.missing ? 1 : 0,
    metadataAssetCount: 0,
    missingImportMetadata: 0,
    duplicateAssetIds: 0,
    missingOwner: 0,
    missingImportStatus: 0,
    missingMaterialProvenance: 0,
    missingCollisionPairing: 0,
    oversizedTextures: 0,
  }

  if (manifest.missing) {
    failures.push(
      `runtime asset import manifest is missing: ${manifest.relativePath}`,
    )
  }
  if (manifest.schemaVersion !== importManifestSchemaVersion) {
    failures.push(
      `${manifest.relativePath}: schemaVersion must be ${importManifestSchemaVersion}`,
    )
  }

  const assetIds = new Map()
  for (const [sourceUrl, asset] of Object.entries(entries)) {
    const importMetadata = asset.importMetadata
    if (!importMetadata) {
      report.missingImportMetadata += 1
      failures.push(`${sourceUrl}: missing runtime asset import metadata`)
      continue
    }

    report.metadataAssetCount += 1
    const assetUrls = assetIds.get(importMetadata.id) ?? []
    assetUrls.push(sourceUrl)
    assetIds.set(importMetadata.id, assetUrls)

    if (!asset.sourceExists) {
      failures.push(`${sourceUrl}: source file is missing before cooking`)
    }
    if (!importMetadata.owner) {
      report.missingOwner += 1
      warnings.push(`${sourceUrl}: import metadata owner is missing`)
    }
    if (!importMetadata.status) {
      report.missingImportStatus += 1
      warnings.push(`${sourceUrl}: import metadata status is missing`)
    }
    if (!importMetadata.materialPolicy?.provenance) {
      report.missingMaterialProvenance += 1
      warnings.push(
        `${sourceUrl}: material provenance is missing from import metadata`,
      )
    }
    if (
      isRequiredCollisionPolicy(importMetadata.collisionPolicy) &&
      !importMetadata.collisionPolicy?.collisionSourceUrl
    ) {
      report.missingCollisionPairing += 1
      warnings.push(
        `${sourceUrl}: collision policy requires a paired collider source`,
      )
    }

    const oversizedTextures = getOversizedTextures(
      asset,
      importMetadata.targetBudgets?.maxTextureSize,
    )
    if (oversizedTextures.length > 0) {
      report.oversizedTextures += oversizedTextures.length
      warnings.push(
        `${sourceUrl}: ${oversizedTextures.length} source texture(s) exceed import maxTextureSize=${importMetadata.targetBudgets.maxTextureSize}`,
      )
    }
  }

  for (const [assetId, sourceUrls] of assetIds) {
    if (sourceUrls.length <= 1) continue
    report.duplicateAssetIds += 1
    failures.push(
      `${assetId}: duplicate runtime asset import id for ${sourceUrls.join(', ')}`,
    )
  }

  return { failures, warnings, report }
}
