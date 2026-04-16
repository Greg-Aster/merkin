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
            if (!id.includes('node_modules')) return

            if (
              id.includes('three/examples/jsm/postprocessing')
              || id.includes('postprocessing')
              || id.includes('threlte-postprocessing')
            ) {
              return 'effects-vendor'
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
