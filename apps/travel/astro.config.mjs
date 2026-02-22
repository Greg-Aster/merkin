import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

const site = process.env.SITE_URL || 'https://travel.dndiy.org'
const base = process.env.SITE_BASE || '/'

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
})
