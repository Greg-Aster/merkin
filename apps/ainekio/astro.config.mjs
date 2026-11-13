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

const galleryItems = JSON.parse(
  fs.readFileSync(join(__dirname, 'src/data/gallery.json'), 'utf8'),
)
const postVideoSupplement = JSON.parse(
  fs.readFileSync(join(__dirname, 'src/data/post-videos.json'), 'utf8'),
)

const videoMetaBySrc = new Map()
for (const item of galleryItems) {
  if (item.src && item.poster) {
    videoMetaBySrc.set(item.src, {
      src: item.src,
      poster: item.poster,
      title: item.title,
      caption: item.caption,
      date: item.date || '2026-11-06',
      duration: Math.max(1, Math.round(item.duration || 1)),
    })
  }
}
for (const item of postVideoSupplement) {
  if (!videoMetaBySrc.has(item.src)) {
    videoMetaBySrc.set(item.src, {
      ...item,
      duration: Math.max(1, Math.round(item.duration || 1)),
    })
  }
}

function toSitemapVideo(meta, origin) {
  return {
    thumbnail_loc: new URL(meta.poster, origin).href,
    title: meta.title,
    description: meta.caption,
    content_loc: new URL(meta.src, origin).href,
    duration: meta.duration,
    publication_date: `${meta.date}T00:00:00Z`,
  }
}

function loadPostSeoMap(postsDir, origin) {
  const map = new Map()
  let maxTimestamp = new Date('2026-11-06T00:00:00.000Z').getTime()

  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), `${prefix}${entry.name}/`)
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        const raw = fs.readFileSync(join(dir, entry.name), 'utf8')
        const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
        const fm = fmMatch?.[1] || ''
        if (/^draft:\s*true\b/m.test(fm)) continue
        const body = fmMatch ? raw.slice(fmMatch[0].length) : raw
        const title = (fm.match(/^title:\s*([^\r\n]+)/m)?.[1] || '').trim().replace(/^['"]|['"]$/g, '')
        const cover = (fm.match(/^image:\s*([^\r\n]+)/m)?.[1] || '').trim().replace(/^['"]|['"]$/g, '')
        const updated = fm.match(/^updated:\s*([^\r\n]+)/m)?.[1]?.trim()
        const published = fm.match(/^published:\s*([^\r\n]+)/m)?.[1]?.trim()
        const slug = `${prefix}${entry.name.replace(/\.(md|mdx)$/, '')}`.toLowerCase()
        const dateStr = (updated || published || '2026-11-06').replace(/^['"]|['"]$/g, '')
        const parsed = new Date(dateStr)

        const videos = []
        const seenVideos = new Set()
        const sourceRe = /<source\b[^>]*\bsrc=["']([^"']+\.mp4)["'][^>]*>/gi
        let m
        while ((m = sourceRe.exec(body)) !== null) {
          if (!seenVideos.has(m[1]) && videoMetaBySrc.has(m[1])) {
            seenVideos.add(m[1])
            videos.push(toSitemapVideo(videoMetaBySrc.get(m[1]), origin))
          }
        }

        const images = []
        if (cover && cover.startsWith('/')) {
          images.push({
            url: new URL(cover, origin).href,
            ...(title ? { title } : {}),
          })
        }

        const lastmod = !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : undefined
        if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > maxTimestamp) {
          maxTimestamp = parsed.getTime()
        }

        map.set(`/posts/${slug}/`, { lastmod, videos, images })
      }
    }
  }
  walk(postsDir)
  return { map, latestLastmod: new Date(maxTimestamp).toISOString() }
}

const { map: postSeoMap, latestLastmod } = loadPostSeoMap(
  join(__dirname, 'src/content/posts'),
  siteUrl,
)
const galleryVideos = galleryItems
  .filter(item => item.src && videoMetaBySrc.has(item.src))
  .map(item => toSitemapVideo(videoMetaBySrc.get(item.src), siteUrl))
const galleryImages = galleryItems
  .filter(item => Array.isArray(item.variants) && item.variants.length > 0)
  .map(item => ({
    url: new URL(item.variants[item.variants.length - 1].src, siteUrl).href,
    title: item.title,
    caption: item.caption,
  }))
const homeFeaturedVideo = videoMetaBySrc.has('/gallery/ainekio-v2-neural-walk-first-run.mp4')
  ? [toSitemapVideo(videoMetaBySrc.get('/gallery/ainekio-v2-neural-walk-first-run.mp4'), siteUrl)]
  : []

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
          pathname === '/rss.xml' ||
          pathname === '/llms.txt' ||
          pathname === '/llms-full.txt'
        )
      },
      serialize: item => {
        const { pathname } = new URL(item.url)
        const normalized = pathname.toLowerCase()
        const postSeo = postSeoMap.get(normalized)

        let videos = postSeo?.videos
        let images = postSeo?.images
        if (normalized === '/') {
          videos = homeFeaturedVideo
        } else if (normalized === '/gallery/') {
          videos = galleryVideos
          images = galleryImages
        }

        return {
          ...item,
          lastmod: postSeo?.lastmod || latestLastmod,
          ...(videos && videos.length > 0 ? { video: videos } : {}),
          ...(images && images.length > 0 ? { img: images } : {}),
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
