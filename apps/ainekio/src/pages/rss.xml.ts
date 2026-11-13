import { siteConfig } from '@/config/config'
import rss from '@astrojs/rss'
import { getSortedPosts } from '@utils/content-utils'
import type { APIContext } from 'astro'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { getVideoMetaBySrc } from '../lib/seo-media'
import { createCORSResponse, handleCORS } from '../middleware/cors'

const parser = new MarkdownIt({ html: true, linkify: true })

function toAbsoluteUrl(rawUrl: string, siteOrigin: string): string {
  if (!rawUrl) return rawUrl
  if (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('mailto:') ||
    rawUrl.startsWith('#') ||
    rawUrl.startsWith('data:')
  ) {
    return rawUrl
  }
  try {
    return new URL(rawUrl, siteOrigin).href
  } catch {
    return rawUrl
  }
}

function prepareMdxForRss(body: string, siteOrigin: string): string {
  const withoutImports = body
    .replace(/^import\s+.*?['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/<[A-Z][A-Za-z0-9]*[^>]*\/>/g, '')
    .replace(/<[A-Z][A-Za-z0-9]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\bclassName=/g, 'class=')
    .replace(/\bplaysInline\b/g, 'playsinline')
    .replace(/\bautoPlay\b/g, 'autoplay')

  const withFallbackVideos = withoutImports.replace(
    /<video\b([^>]*)>([\s\S]*?)<\/video>/gi,
    (_full, attrs: string, inner: string) => {
      const srcMatch = inner.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i)
      const posterMatch = attrs.match(/\bposter=["']([^"']+)["']/i)
      const rawSrc = srcMatch?.[1] || ''
      const meta = rawSrc ? getVideoMetaBySrc(rawSrc) : undefined
      const absVideo = rawSrc ? toAbsoluteUrl(rawSrc, siteOrigin) : ''
      const rawPoster = posterMatch?.[1] || meta?.poster || ''
      const absPoster = rawPoster ? toAbsoluteUrl(rawPoster, siteOrigin) : ''
      const label = meta?.title || 'Watch robot video (MP4)'

      if (absVideo && absPoster) {
        return `<p><a href="${absVideo}"><img src="${absPoster}" alt="${label.replace(/"/g, '&quot;')}" /></a><br /><a href="${absVideo}">▶ ${label} (MP4)</a></p>`
      }
      if (absVideo) {
        return `<p><a href="${absVideo}">▶ ${label} (MP4)</a></p>`
      }
      return ''
    },
  )

  return withFallbackVideos.replace(/\n{3,}/g, '\n\n').trim()
}

export async function GET(context: APIContext): Promise<Response> {
  const corsResponse = handleCORS(context)
  if (corsResponse) return corsResponse

  const siteOrigin = (
    context.site ?? (context.url ? new URL(context.url.origin) : new URL('https://ainek.io'))
  ).href

  const blog = await getSortedPosts()

  const response = await rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || '12-servo ESP32-P4 quadruped robot companion & Ainekio OS',
    site: siteOrigin,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    items: blog.map(post => {
      const rendered = parser.render(prepareMdxForRss(post.body || '', siteOrigin))
      const cleanHtml = sanitizeHtml(rendered, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img',
          'figure',
          'figcaption',
          'picture',
          'source',
          'details',
          'summary',
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
          source: ['src', 'srcset', 'type', 'media'],
          a: ['href', 'name', 'target', 'rel'],
        },
        transformTags: {
          a: (tagName, attribs) => ({
            tagName,
            attribs: {
              ...attribs,
              ...(attribs.href ? { href: toAbsoluteUrl(attribs.href, siteOrigin) } : {}),
            },
          }),
          img: (tagName, attribs) => ({
            tagName,
            attribs: {
              ...attribs,
              ...(attribs.src ? { src: toAbsoluteUrl(attribs.src, siteOrigin) } : {}),
            },
          }),
        },
      })

      const absCover = post.data.image ? toAbsoluteUrl(post.data.image, siteOrigin) : ''

      return {
        title: post.data.title,
        pubDate: post.data.published,
        description: post.data.description || '',
        link: `/posts/${post.slug}/`,
        categories: post.data.tags || [],
        content: cleanHtml,
        customData: [
          `<frontmatter>`,
          `<published>${post.data.published.toISOString()}</published>`,
          post.data.updated ? `<updated>${post.data.updated.toISOString()}</updated>` : '',
          post.data.tags && post.data.tags.length > 0 ? `<tags>${post.data.tags.join(',')}</tags>` : '',
          post.data.category ? `<category>${post.data.category}</category>` : '',
          absCover ? `<image>${absCover}</image>` : '',
          `</frontmatter>`,
        ]
          .filter(Boolean)
          .join(''),
      }
    }),
    customData: `<language>${siteConfig.lang}</language><atom:link href="${new URL('rss.xml', siteOrigin).href}" rel="self" type="application/rss+xml" />`,
  })

  return createCORSResponse(response)
}
