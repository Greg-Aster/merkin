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
  // Reuse the 1.4GB of 3D assets from MEGAMEAL/ without duplicating them
  publicDir: '../../MEGAMEAL/public',
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
