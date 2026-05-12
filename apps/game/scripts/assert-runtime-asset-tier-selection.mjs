import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const sourcePath = resolve(
  appRoot,
  'src/threlte/engine/runtimeAssetManifest.ts',
)

function loadRuntimeAssetManifestExports() {
  const source = readFileSync(sourcePath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  })
  const context = vm.createContext({
    console,
    exports: {},
    module: { exports: {} },
  })
  context.module.exports = context.exports
  vm.runInContext(outputText, context, { filename: sourcePath })
  return {
    context,
    exports: context.module.exports,
  }
}

function assertEqual(actual, expected, label) {
  if (actual === expected) return
  throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

const { context, exports } = loadRuntimeAssetManifestExports()
const { getRuntimeProfileAssetTierForProfile, selectRuntimeAssetLodTier } =
  exports

if (
  typeof getRuntimeProfileAssetTierForProfile !== 'function' ||
  typeof selectRuntimeAssetLodTier !== 'function'
) {
  throw new Error('runtime asset tier selection exports are unavailable')
}

assertEqual(
  getRuntimeProfileAssetTierForProfile({ runtimeAssetTier: 'high' }),
  'high',
  'explicit high runtimeAssetTier',
)
assertEqual(
  getRuntimeProfileAssetTierForProfile({ runtimeAssetTier: 'low' }),
  'low',
  'explicit low runtimeAssetTier',
)
assertEqual(
  getRuntimeProfileAssetTierForProfile({ platformProfile: 'mobile' }),
  'low',
  'mobile platform fallback',
)
assertEqual(
  getRuntimeProfileAssetTierForProfile({ expectedRuntimeTier: 'ultra' }),
  'high',
  'explicit expectedRuntimeTier high mapping',
)
assertEqual(
  getRuntimeProfileAssetTierForProfile({ expectedRuntimeTier: 'invalid' }),
  null,
  'invalid expectedRuntimeTier does not default to medium',
)
assertEqual(
  getRuntimeProfileAssetTierForProfile(null),
  null,
  'missing profile has no profile asset tier',
)

context.navigator = {
  connection: { effectiveType: '4g', saveData: false },
  deviceMemory: 8,
  hardwareConcurrency: 8,
}
context.window = { __gameRuntimeProfile: { runtimeAssetTier: 'high' } }
assertEqual(
  selectRuntimeAssetLodTier('low'),
  'high',
  'desktop-high profile selects high',
)

context.window = { __gameRuntimeProfile: { runtimeAssetTier: 'low' } }
assertEqual(
  selectRuntimeAssetLodTier('high'),
  'low',
  'mobile-low profile selects low',
)

context.window = { __gameRuntimeProfile: { platformProfile: 'mobile' } }
assertEqual(
  selectRuntimeAssetLodTier('high'),
  'low',
  'mobile platform profile implies low when no explicit asset tier exists',
)

context.window = {}
assertEqual(
  selectRuntimeAssetLodTier('high'),
  'high',
  'no injected profile uses quality policy instead of medium profile fallback',
)

assertEqual(
  selectRuntimeAssetLodTier('high', { maxTier: 'medium' }),
  'medium',
  'level maxTier caps profile-independent high asset tier',
)

context.navigator = {
  connection: { effectiveType: '4g', saveData: false },
  deviceMemory: 2,
  hardwareConcurrency: 2,
}
assertEqual(
  selectRuntimeAssetLodTier('high'),
  'medium',
  'no injected profile applies device constraints',
)

console.log('[runtime-asset-tier] selection assertions passed')
