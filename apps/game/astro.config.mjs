import svelte from '@astrojs/svelte'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'
import wasm from 'vite-plugin-wasm'

const siteUrl = process.env.SITE_URL || 'https://game.megameal.org'
const configuredBasePath = process.env.GAME_BASE_PATH || process.env.PUBLIC_BASE_PATH || '/'
const normalizedBasePath =
  configuredBasePath === '/'
    ? '/'
    : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}/`

export default defineConfig({
  site: siteUrl,
  base: normalizedBasePath,
  trailingSlash: 'always',
  // IMPORTANT: The game shares its static assets with the megameal blog.
  // All public files (terrain manifests, audio, models, images) must be placed in
  // apps/megameal/public/ — NOT in apps/game/public/.
  // apps/game/public/ is intentionally empty (only contains CNAME).
  // This means: if game.megameal.org returns 404 for an asset, add it to apps/megameal/public/.
  publicDir: '../megameal/public',
  integrations: [svelte(), tailwind()],
  vite: {
    server: {
      host: '127.0.0.1',
      port: 4322,
      strictPort: true,
    },
    plugins: [wasm()],
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
                id.includes('/src/threlte/editor/EditorPanel.svelte')
                || id.includes('/src/threlte/editor/EditorEnvironmentPanel.svelte')
                || id.includes('/src/threlte/editor/EditorAtmospherePresetPicker.svelte')
                || id.includes('/src/threlte/editor/EditorAmbientAudioPresetControls.svelte')
                || id.includes('/src/threlte/editor/EditorControlsOverlay.svelte')
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
                || id.includes('/src/threlte/editor/defaultScenes.ts')
                || id.includes('/src/threlte/editor/editorDocumentStore.ts')
                || id.includes('/src/threlte/editor/editorPersistence.ts')
                || id.includes('/src/threlte/editor/editorCommands.ts')
                || id.includes('/src/threlte/editor/editorNodeCommands.ts')
                || id.includes('/src/threlte/editor/editorSceneCommands.ts')
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

              if (
                id.includes('/src/threlte/systems/NeuralStylizationOverlay.svelte')
              ) {
                return 'experimental-visuals'
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
