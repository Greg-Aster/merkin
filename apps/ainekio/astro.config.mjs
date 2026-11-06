import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import svelte from '@astrojs/svelte'
import tailwind from '@astrojs/tailwind'
import Compress, { Default as CompressDefaults } from 'astro-compress'
import icon from 'astro-icon'
import { defineConfig } from 'astro/config'
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeComponents from 'rehype-components'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkGithubAdmonitionsToDirectives from 'remark-github-admonitions-to-directives'
import remarkMath from 'remark-math'
import remarkSectionize from 'remark-sectionize'
import { rehypeBasePath } from './src/plugins/rehype-base-path.mjs'
import { AdmonitionComponent } from './src/plugins/rehype-component-admonition.mjs'
import { GithubCardComponent } from './src/plugins/rehype-component-github-card.mjs'
import { parseDirectiveNode } from './src/plugins/remark-directive-rehype.js'
import { remarkExcerpt } from './src/plugins/remark-excerpt.js'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'

function manualClientChunks(id) {
  if (!id.includes('node_modules')) return undefined
  if (id.includes('photoswipe')) return 'vendor-photoswipe'
  if (id.includes('marked') || id.includes('markdown-it')) return 'vendor-markdown'
  if (id.includes('katex')) return 'vendor-katex'
  if (id.includes('overlayscrollbars')) return 'vendor-overlayscrollbars'
  return 'vendor'
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cnamePath = join(__dirname, 'CNAME')

let basePath = '/'
let siteUrl = 'https://ainek.io'
const explicitSiteUrl = process.env.SITE_URL
const explicitBasePath = process.env.SITE_BASE

if (explicitSiteUrl) {
  siteUrl = explicitSiteUrl
  basePath = explicitBasePath || '/'
} else {
  let customDomain = null
  if (fs.existsSync(cnamePath)) {
    const cnameContent = fs.readFileSync(cnamePath, 'utf-8').trim()
    if (cnameContent) {
      customDomain = cnameContent
      siteUrl = `https://${customDomain}`
    }
  }
  const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY
  if (GITHUB_REPOSITORY && !customDomain) {
    const [username, repo] = GITHUB_REPOSITORY.split('/')
    siteUrl = `https://${username}.github.io`
    basePath = `/${repo}/`
  }
}

const htmlMinifierDefaults = CompressDefaults.HTML['html-minifier-terser']

function loadPostLastmodMap(postsDir) {
  const map = new Map()
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), `${prefix}${entry.name}/`)
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        const raw = fs.readFileSync(join(dir, entry.name), 'utf8')
        const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || ''
        if (/^draft:\s*true\b/m.test(fm)) continue
        const updated = fm.match(/^updated:\s*([^\r\n]+)/m)?.[1]?.trim()
        const published = fm.match(/^published:\s*([^\r\n]+)/m)?.[1]?.trim()
        const slug = `${prefix}${entry.name.replace(/\.(md|mdx)$/, '')}`.toLowerCase()
        const dateStr = (updated || published || '2026-11-06').replace(/^['"]|['"]$/g, '')
        const parsed = new Date(dateStr)
        if (!Number.isNaN(parsed.getTime())) {
          map.set(`/posts/${slug}/`, parsed.toISOString())
        }
      }
    }
  }
  walk(postsDir)
  return map
}

const postLastmodMap = loadPostLastmodMap(join(__dirname, 'src/content/posts'))
const defaultLastmod = new Date('2026-11-06T00:00:00.000Z').toISOString()

export default defineConfig({
  site: siteUrl,
  base: basePath,
  trailingSlash: 'always',
  integrations: [
    tailwind(),
    icon({
      include: {
        'material-symbols': ['*'],
        'fa6-brands': ['*'],
        'fa6-regular': ['*'],
        'fa6-solid': ['*'],
      },
    }),
    svelte(),
    sitemap({
      filter: page => {
        const { pathname } = new URL(page)
        return !(
          pathname === '/404/' ||
          pathname === '/404.html' ||
          pathname.startsWith('/social/') ||
          pathname.startsWith('/archive/tag/') ||
          pathname.startsWith('/archive/category/') ||
          pathname === '/rss.xml'
        )
      },
      serialize: item => {
        const { pathname } = new URL(item.url)
        const normalized = pathname.toLowerCase()
        return {
          ...item,
          lastmod: postLastmodMap.get(normalized) || defaultLastmod,
        }
      },
    }),
    Compress({
      CSS: false,
      Image: false,
      HTML: {
        'html-minifier-terser': {
          collapseWhitespace: false,
          ignoreCustomComments: [
            /^\s*$/,
            ...htmlMinifierDefaults.ignoreCustomComments,
          ],
          sortClassName: false,
        },
      },
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkReadingTime,
      remarkExcerpt,
      remarkGithubAdmonitionsToDirectives,
      remarkDirective,
      remarkSectionize,
      parseDirectiveNode,
    ],
    rehypePlugins: [
      [rehypeBasePath, { base: basePath }],
      rehypeKatex,
      rehypeSlug,
      [
        rehypeComponents,
        {
          components: {
            github: GithubCardComponent,
            note: (x, y) => AdmonitionComponent(x, y, 'note'),
            tip: (x, y) => AdmonitionComponent(x, y, 'tip'),
            important: (x, y) => AdmonitionComponent(x, y, 'important'),
            caution: (x, y) => AdmonitionComponent(x, y, 'caution'),
            warning: (x, y) => AdmonitionComponent(x, y, 'warning'),
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['anchor'],
          },
          content: {
            type: 'element',
            tagName: 'span',
            properties: {
              className: ['anchor-icon'],
              'data-pagefind-ignore': true,
            },
            children: [
              {
                type: 'text',
                value: '#',
              },
            ],
          },
        },
      ],
    ],
  },
  vite: {
    ssr: {
      noExternal: [/^@fontsource/, 'katex'],
    },
    optimizeDeps: {
      include: ['overlayscrollbars', 'photoswipe', 'photoswipe/lightbox'],
    },
    build: {
      chunkSizeWarningLimit: 550,
      rollupOptions: {
        output: {
          manualChunks: manualClientChunks,
        },
      },
    },
  },
})
