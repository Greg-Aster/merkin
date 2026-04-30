import svelte from '@astrojs/svelte'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'
import wasm from 'vite-plugin-wasm'
import { createDevRuntimePlugin, readRuntimeSync } from '../../scripts/dev-runtime.mjs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const siteUrl = process.env.SITE_URL || 'https://game.megameal.org'
const configuredBasePath = process.env.GAME_BASE_PATH || process.env.PUBLIC_BASE_PATH || '/'
const gameDevHost = process.env.GAME_DEV_HOST || '127.0.0.1'
const gameDevPort = Number.parseInt(process.env.GAME_DEV_PORT || '4322', 10)
const defaultEditorApiBridge = process.env.EDITOR_API_BASE || process.env.PUBLIC_EDITOR_API_BASE || 'http://127.0.0.1:3001'
const normalizedBasePath =
  configuredBasePath === '/'
    ? '/'
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}/`

function resolveToolsBridgeTarget() {
  return readRuntimeSync('tools')?.origin || defaultEditorApiBridge
}

let toolsAutostartProcess = null

function createToolsBridgeAutostartPlugin() {
  return {
    name: 'merkin-tools-bridge-autostart',
    apply: 'serve',
    configureServer(server) {
      if (process.env.GAME_EDITOR_AUTOSTART_TOOLS === '0') {
        return
      }

      if (process.env.PUBLIC_EDITOR_API_BASE || process.env.EDITOR_API_BASE) {
        return
      }

      if (toolsAutostartProcess) {
        return
      }

      const gameScriptsRoot = fileURLToPath(new URL('./scripts', import.meta.url))
      const startToolsBridge = () => {
        if (toolsAutostartProcess) return

        toolsAutostartProcess = spawn('node', ['dev-tools.mjs'], {
          cwd: gameScriptsRoot,
          stdio: 'inherit',
          env: {
            ...process.env,
            GAME_EDITOR_AUTOSTART_TOOLS: '0',
          },
        })

        const cleanup = () => {
          if (!toolsAutostartProcess) return
          const child = toolsAutostartProcess
          toolsAutostartProcess = null
          if (!child.killed) {
            child.kill('SIGTERM')
          }
        }

        toolsAutostartProcess.on('exit', () => {
          toolsAutostartProcess = null
        })

        toolsAutostartProcess.on('error', (error) => {
          console.error('❌ Failed to autostart tools bridge:', error)
          toolsAutostartProcess = null
        })

        server.httpServer?.once('close', cleanup)
        process.once('SIGINT', cleanup)
        process.once('SIGTERM', cleanup)
      }

      if (server.httpServer?.listening) {
        startToolsBridge()
      } else {
        server.httpServer?.once('listening', startToolsBridge)
      }
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
  integrations: [svelte(), tailwind()],
  vite: {
    server: {
      host: gameDevHost,
      port: gameDevPort,
      proxy: {
        '/api/tools': {
          target: defaultEditorApiBridge,
          changeOrigin: true,
          rewrite: (pathname) => pathname.replace(/^\/api\/tools/, ''),
          router: () => resolveToolsBridgeTarget(),
        },
      },
    },
    plugins: [wasm(), createDevRuntimePlugin('game', gameDevHost), createToolsBridgeAutostartPlugin(), createBuildCruftGatePlugin()],
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
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              if (
                id.includes('/src/threlte/styles/GameplayStyleProfiles.ts')
                || id.includes('/src/threlte/styles/runtimeVisualStyleStore.ts')
                || id.includes('/src/threlte/styles/StylePalettes.ts')
              ) {
                return 'style-runtime'
              }

              if (
                id.includes('/src/threlte/editor/EditorPanel.svelte')
                || id.includes('/src/threlte/editor/EditorPanelHeader.svelte')
                || id.includes('/src/threlte/editor/EditorPanelTabRail.svelte')
                || id.includes('/src/threlte/editor/EditorPanelToolsDock.svelte')
                || id.includes('/src/threlte/editor/EditorWorkflowTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorWorkflowPanel.svelte')
                || id.includes('/src/threlte/editor/EditorSceneTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorSceneToolsPanel.svelte')
                || id.includes('/src/threlte/editor/EditorPlayerTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorPlayerPanel.svelte')
                || id.includes('/src/threlte/editor/EditorCreateTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorCreatePanel.svelte')
                || id.includes('/src/threlte/editor/EditorHierarchyTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorHierarchyPanel.svelte')
                || id.includes('/src/threlte/editor/EditorInspectTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorInspectorForm.svelte')
                || id.includes('/src/threlte/editor/EditorStyleTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorSaveTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorSavePanel.svelte')
                || id.includes('/src/threlte/editor/EditorSideStackHost.svelte')
                || id.includes('/src/threlte/editor/EditorOutliner.svelte')
                || id.includes('/src/threlte/editor/EditorOutlinerDock.svelte')
                || id.includes('/src/threlte/editor/EditorPropertiesDock.svelte')
                || id.includes('/src/threlte/editor/EditorPropertiesShelf.svelte')
                || id.includes('/src/threlte/editor/EditorEnvironmentPanel.svelte')
                || id.includes('/src/threlte/editor/EditorEnvironmentTabHost.svelte')
                || id.includes('/src/threlte/editor/EditorAtmospherePresetPicker.svelte')
                || id.includes('/src/threlte/editor/EditorAmbientAudioPresetControls.svelte')
                || id.includes('/src/threlte/editor/EditorControlsOverlay.svelte')
                || id.includes('/src/threlte/editor/editorAiController.ts')
                || id.includes('/src/threlte/editor/editorAssetController.ts')
                || id.includes('/src/threlte/editor/editorCreateController.ts')
                || id.includes('/src/threlte/editor/editorInspectorController.ts')
                || id.includes('/src/threlte/editor/editorLevelController.ts')
                || id.includes('/src/threlte/editor/editorOutliner.ts')
                || id.includes('/src/threlte/editor/editorOutlinerController.ts')
                || id.includes('/src/threlte/editor/editorOutlinerTypes.ts')
                || id.includes('/src/threlte/editor/editorPanelPropBuilders.ts')
                || id.includes('/src/threlte/editor/editorPanelTabs.ts')
                || id.includes('/src/threlte/editor/editorStyleController.ts')
              ) {
                return 'editor-panel'
              }

              if (id.includes('/src/threlte/editor/EditorAIMeshStudio.svelte')) {
                return 'editor-ai'
              }

              if (
                id.includes('/src/threlte/editor/EditorCollisionOverlay.svelte')
                || id.includes('/src/threlte/editor/EditorCircleSelectOverlay.svelte')
                || id.includes('/src/threlte/editor/EditorMarqueeOverlay.svelte')
                || id.includes('/src/threlte/editor/EditorSceneLayer.svelte')
                || id.includes('/src/threlte/editor/EditorTerrainSculptLayer.svelte')
                || id.includes('/src/threlte/editor/EditorViewportControls.svelte')
                || id.includes('/src/threlte/editor/EditorWorkbenchLighting.svelte')
              ) {
                return 'editor-runtime'
              }

              if (
                id.includes('/src/threlte/editor/editorStore.ts')
                || id.includes('/src/threlte/editor/editorSessionStore.ts')
                || id.includes('/src/threlte/editor/editorSelectors.ts')
                || id.includes('/src/threlte/editor/editorTypes.ts')
                || id.includes('/src/threlte/editor/editorBakeSource.ts')
                || id.includes('/src/threlte/editor/editorCollisionDefaults.ts')
                || id.includes('/src/threlte/editor/defaultScenes.ts')
                || id.includes('/src/threlte/editor/editorDocumentStore.ts')
                || id.includes('/src/threlte/editor/editorGeneration.ts')
                || id.includes('/src/threlte/editor/editorPersistence.ts')
                || id.includes('/src/threlte/editor/editorCommands.ts')
                || id.includes('/src/threlte/editor/editorNodeCommands.ts')
                || id.includes('/src/threlte/editor/editorSceneCommands.ts')
                || id.includes('/src/threlte/editor/editorSceneDocumentLoader.ts')
                || id.includes('/src/threlte/editor/editorSceneDocumentValidation.ts')
                || id.includes('/src/threlte/editor/editorHierarchyUtils.ts')
                || id.includes('/src/threlte/editor/editorHistory.ts')
                || id.includes('/src/threlte/editor/editorPrefabFactory.ts')
                || id.includes('/src/threlte/editor/editorLevelSetup.ts')
                || id.includes('/src/threlte/editor/editorLevelPresets.ts')
                || id.includes('/src/threlte/editor/scenes/')
              ) {
                return 'editor-document'
              }

              if (
                id.includes('/src/threlte/editor/')
                || id.includes('/src/threlte/utils/materialUtils.ts')
              ) {
                return 'editor-core'
              }

              return
            }

            if (
              id.includes('three/examples/jsm/postprocessing')
              || id.includes('postprocessing')
              || id.includes('threlte-postprocessing')
            ) {
              return 'effects-vendor'
            }

            if (
              id.includes('node_modules/three/src/renderers')
              || id.includes('node_modules/three/src/materials')
            ) {
              return 'three-renderer-vendor'
            }

            if (
              id.includes('node_modules/three/src/core')
              || id.includes('node_modules/three/src/math')
              || id.includes('node_modules/three/src/geometries')
            ) {
              return 'three-core-vendor'
            }

            if (
              id.includes('three/examples/jsm/loaders/GLTFLoader')
              || id.includes('@threlte/extras')
            ) {
              return 'asset-vendor'
            }

            if (id.includes('three/examples/jsm/objects/Reflector')) {
              return 'reflection-vendor'
            }

            if (id.includes('three/examples/jsm')) {
              return 'three-examples-vendor'
            }

            if (
              id.includes('@dimforge/rapier3d')
              || id.includes('@threlte/rapier')
            ) {
              return 'physics-vendor'
            }

            if (id.includes('three')) {
              return 'three-vendor'
            }

            if (id.includes('peerjs')) {
              return 'multiplayer-vendor'
            }

            if (id.includes('howler')) {
              return 'audio-vendor'
            }

            if (
              id.includes('@threlte/core')
              || id.includes('@threlte/extras')
              || id.includes('@threlte/theatre')
            ) {
              return 'threlte-vendor'
            }
          }
        }
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
      __GAME_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __DEV_MODE__: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    },
  },
})
