import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const srcRoot = path.join(appRoot, 'src')

const retiredRoutes = new Map([
  ['/configs/', '/'],
  ['/friends/', '/community/'],
  ['/login/', '/'],
  ['/store-placeholder/', '/store/'],
  ['/test-portal/', '/'],
])

const retiredRouteFiles = new Map([
  ['/configs/', 'src/pages/configs.astro'],
  ['/friends/', 'src/pages/friends.astro'],
  ['/login/', 'src/pages/login.astro'],
  ['/store-placeholder/', 'src/pages/store-placeholder.astro'],
  ['/test-portal/', 'src/pages/test-portal.astro'],
])

const allowedRouteReferenceFiles = new Set([
  'src/contracts/routes.ts',
  'src/pages/robots.txt.ts',
  ...retiredRouteFiles.values(),
])

const scanExtensions = new Set([
  '.astro',
  '.svelte',
  '.ts',
  '.js',
  '.mjs',
  '.md',
  '.mdx',
])

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

function relativeToApp(filePath) {
  return toPosix(path.relative(appRoot, filePath))
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (['.astro', 'dist', 'node_modules'].includes(entry)) continue
    const fullPath = path.join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      walk(fullPath, files)
      continue
    }
    if (scanExtensions.has(path.extname(fullPath))) files.push(fullPath)
  }
  return files
}

const failures = []

function assert(condition, message) {
  if (!condition) failures.push(message)
}

for (const [route] of retiredRoutes) {
  const routeFile = retiredRouteFiles.get(route)
  const absoluteRouteFile = path.join(appRoot, routeFile)
  assert(existsSync(absoluteRouteFile), `${routeFile} is missing for ${route}`)
  if (!existsSync(absoluteRouteFile)) continue

  const text = readFileSync(absoluteRouteFile, 'utf8')
  assert(
    text.includes('Astro.redirect') &&
      text.includes('getRetiredPublicRouteTarget'),
    `${routeFile} must be a redirect-only retired route shell`,
  )
  assert(
    text.includes(`'${route}'`) || text.includes(`"${route}"`),
    `${routeFile} must call the retired route contract for ${route}`,
  )
}

const sourceFiles = walk(srcRoot)
const retiredRoutePattern =
  /['"`](\/(?:configs|friends|login|store-placeholder|test-portal)\/?)['"`]/g
const forbiddenFriendContentPattern =
  /friendStore|friend-content|FriendContentIntegrator|FriendManager|getFriendContent|isFriendContentEnabled/

for (const file of sourceFiles) {
  const relativePath = relativeToApp(file)
  if (allowedRouteReferenceFiles.has(relativePath)) continue

  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(retiredRoutePattern)) {
    failures.push(
      `${relativePath} still references retired public route ${match[1]}`,
    )
  }
}

for (const file of [...sourceFiles, path.join(appRoot, 'astro.config.mjs')]) {
  const relativePath = relativeToApp(file)
  const text = readFileSync(file, 'utf8')
  const match = text.match(forbiddenFriendContentPattern)
  if (match) {
    failures.push(
      `${relativePath} still references friend-content tooling (${match[0]})`,
    )
  }
}

const postsRoutePath = path.join(srcRoot, 'pages/posts/[...slug].astro')
const postsRoute = readFileSync(postsRoutePath, 'utf8')
assert(
  postsRoute.includes("getCollection('posts', publicCollectionFilter)"),
  'posts/[...slug].astro must generate public post routes with publicCollectionFilter',
)

const pdfPostsRoutePath = path.join(srcRoot, 'pages/pdf/posts/[...slug].astro')
const pdfPostsRoute = readFileSync(pdfPostsRoutePath, 'utf8')
assert(
  pdfPostsRoute.includes("getCollection('posts', publicCollectionFilter)"),
  'pdf/posts/[...slug].astro must generate public PDF routes with publicCollectionFilter',
)

const routeFilterExpectations = [
  [
    'src/pages/store.astro',
    "getCollection('products', publicProductCollectionFilter)",
  ],
  [
    'src/pages/store/[slug].astro',
    "getCollection('products', publicProductCollectionFilter)",
  ],
  [
    'src/pages/store/page/[page].astro',
    "getCollection('products', publicProductCollectionFilter)",
  ],
  [
    'src/pages/videos/index.astro',
    "getCollection('videos', publicCollectionFilter)",
  ],
  [
    'src/pages/videos/[...slug].astro',
    "getCollection('videos', publicCollectionFilter)",
  ],
  [
    'src/pages/cookbook/index.astro',
    "getCollection('cookbook', publicCollectionFilter)",
  ],
  [
    'src/pages/cookbook/[...slug].astro',
    "getCollection('cookbook', publicCollectionFilter)",
  ],
  [
    'src/pages/snuggaloids/index.astro',
    "getCollection('snuggaloids', publicCollectionFilter)",
  ],
  [
    'src/pages/pdf/cookbook/[...slug].astro',
    "getCollection(\n    'cookbook',\n    publicDownloadableCollectionFilter,\n  )",
  ],
]

for (const [routeFile, expectedFilter] of routeFilterExpectations) {
  const routeText = readFileSync(path.join(appRoot, routeFile), 'utf8')
  assert(
    routeText.includes(expectedFilter),
    `${routeFile} must generate public routes with the centralized content/product filter`,
  )
}

if (failures.length > 0) {
  console.error('[site-contracts] Contract audit failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(
  `[site-contracts] Verified ${retiredRoutes.size} retired route(s), public post filtering, and no stale retired-route links.`,
)
