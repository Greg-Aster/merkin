import svelte from '@astrojs/svelte'
import tailwind from '@astrojs/tailwind'
import { defineConfig } from 'astro/config'

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
    optimizeDeps: {
      exclude: ['three'],
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
      },
    },
    define: {
      __GAME_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __DEV_MODE__: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
    },
  },
})
