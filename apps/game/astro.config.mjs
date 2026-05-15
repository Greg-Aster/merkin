import { createRequire } from 'node:module'
import svelte from '@astrojs/svelte'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'
import wasm from 'vite-plugin-wasm'
import { createDevRuntimePlugin } from '../../scripts/dev-runtime.mjs'
import { resolveGameManualChunk } from './scripts/lib/chunkOwnership.mjs'

const require = createRequire(import.meta.url)
const {
  handleEditorToolsRequest,
  isEditorToolsApiPath,
} = require('./scripts/editor-tools/server.cjs')

const siteUrl = process.env.SITE_URL || 'https://game.megameal.org'
const configuredBasePath =
  process.env.GAME_BASE_PATH || process.env.PUBLIC_BASE_PATH || '/'
const gameDevHost = process.env.GAME_DEV_HOST || '127.0.0.1'
const gameDevPort = Number.parseInt(process.env.GAME_DEV_PORT || '4322', 10)
const gameDevManualRefresh =
  process.env.GAME_DEV_MANUAL_REFRESH === '1' ||
  process.env.GAME_DEV_HMR === '0' ||
  process.env.GAME_DEV_NO_HMR === '1'
const normalizedBasePath =
  configuredBasePath === '/'
    ? '/'
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}/`

function createEditorToolsApiPlugin() {
  return {
    name: 'merkin-editor-tools-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url || '/', 'http://localhost').pathname
        if (!isEditorToolsApiPath(pathname)) {
          next()
          return
        }

        Promise.resolve(handleEditorToolsRequest(req, res)).catch(next)
      })
    },
  }
}

const buildCruftWarningPatterns = [
  {
    label: 'manual chunk cycle',
    pattern: /Circular chunk:/,
  },
  {
    label: 'unused Svelte export',
    pattern: /Component has unused export property/,
  },
  {
    label: 'unused Svelte CSS selector',
    pattern: /Unused CSS selector/,
  },
]

function createBuildCruftGatePlugin() {
  return {
    name: 'merkin-build-cruft-gate',
    apply: 'build',
    configResolved(config) {
      const originalWarn = config.logger.warn.bind(config.logger)
      config.logger.warn = (message, options) => {
        const text = String(message)
        const match = buildCruftWarningPatterns.find(({ pattern }) =>
          pattern.test(text),
        )

        if (match) {
          throw new Error(`[build-cruft-gate] ${match.label}: ${text}`)
        }

        originalWarn(message, options)
      }
    },
  }
}

function createClientManualChunksPlugin() {
  return {
    name: 'merkin-client-manual-chunks',
    apply: 'build',
    config(_config, env) {
      if (env.isSsrBuild) {
        return
      }

      return {
        build: {
          rollupOptions: {
            output: {
              manualChunks: resolveGameManualChunk,
            },
          },
        },
      }
    },
  }
}

const physicsRuntimeHotUpdatePatterns = [
  /\/src\/threlte\/collision\/.*\.(svelte|ts)$/,
  /\/src\/threlte\/core\/GameWorld\.svelte$/,
  /\/src\/threlte\/features\/ocean\/.*\.(svelte|ts)$/,
  /\/src\/threlte\/features\/player\/.*\.(svelte|ts)$/,
  /\/src\/threlte\/features\/terrain\/.*\.(svelte|ts)$/,
  /\/src\/threlte\/levels\/(RuntimeActorBranch|RuntimeActorNode|SceneDocumentLevel)\.svelte$/,
  /\/src\/threlte\/systems\/Physics\.svelte$/,
]

function createPhysicsRuntimeFullReloadPlugin() {
  return {
    name: 'merkin-physics-runtime-full-reload',
    apply: 'serve',
    enforce: 'pre',
    handleHotUpdate(ctx) {
      if (gameDevManualRefresh) return

      const file = ctx.file.replaceAll('\\', '/')
      if (!physicsRuntimeHotUpdatePatterns.some(pattern => pattern.test(file))) {
        return
      }

      ctx.server.ws.send({
        type: 'full-reload',
        path: '*',
      })
      return []
    },
  }
}

export default defineConfig({
  site: siteUrl,
  base: normalizedBasePath,
  trailingSlash: 'always',
  server: {
    host: gameDevHost,
    port: gameDevPort,
  },
  // IMPORTANT: The game shares its static assets with the megameal blog.
  // All public files (terrain manifests, audio, models, images) must be placed in
  // apps/megameal/public/ — NOT in apps/game/public/.
  // apps/game/public/ is intentionally empty (only contains CNAME).
  // This means: if game.megameal.org returns 404 for an asset, add it to apps/megameal/public/.
  publicDir: '../megameal/public',
  integrations: [svelte({ emitCss: false }), tailwind()],
  vite: {
    server: {
      host: gameDevHost,
      port: gameDevPort,
      hmr: gameDevManualRefresh ? false : undefined,
      watch: {
        ignored: ['**/src/threlte/editor/scenes/**/*.scene.json'],
      },
    },
    plugins: [
      wasm(),
      createDevRuntimePlugin('game', gameDevHost, {
        manualRefresh: gameDevManualRefresh,
        hmr: !gameDevManualRefresh,
      }),
      createEditorToolsApiPlugin(),
      createPhysicsRuntimeFullReloadPlugin(),
      createBuildCruftGatePlugin(),
      createClientManualChunksPlugin(),
    ],
    optimizeDeps: {
      exclude: ['three', '@dimforge/rapier3d', '@dimforge/rapier3d-compat'],
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.message.includes('is dynamically imported by') &&
            warning.message.includes('but also statically imported by')
          ) {
            return
          }
          warn(warning)
        },
      },
    },
    resolve: {
      alias: {
        '@components': '/src/components',
        '@utils': '/src/utils',
        '@layouts': '/src/layouts',
        '@config': '/src/config',
        '@services': '/src/services',
        '@': '/src',
        '@dimforge/rapier3d-compat': '/src/shims/rapier3d-compat.ts',
      },
    },
    define: {
      __GAME_VERSION__: JSON.stringify(
        process.env.npm_package_version || '1.0.0',
      ),
      __DEV_MODE__:
        !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    },
  },
})
