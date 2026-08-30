// src/pages/rss.xml.ts
import { siteConfig } from '@/config/config'
import rss from '@astrojs/rss'
import { getSortedPosts } from '@utils/content-utils'
import type { APIContext } from 'astro'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { createCORSResponse, handleCORS } from '../middleware/cors'
import { loadGoogleDocSnapshot } from '../utils/googleDocContent.server'
import { googleDocBlocksToMarkdown } from '@merkin/docs-editor-bridge'

const parser = new MarkdownIt()

export async function GET(context: APIContext) {
  // Handle preflight requests
  const corsResponse = handleCORS(context)
  if (corsResponse) return corsResponse

  // Get posts
  const blog = await getSortedPosts()

  const items = await Promise.all(
    blog.map(async post => {
      const contentMarkdown = post.data.googleDoc
        ? googleDocBlocksToMarkdown(
            (await loadGoogleDocSnapshot(post.data.googleDoc.documentId)).blocks,
          )
        : post.body

      if (typeof contentMarkdown !== 'string' || !contentMarkdown.trim()) {
        throw new Error(`Post ${post.slug} does not have readable feed content.`)
      }

      return {
        title: post.data.title,
        pubDate: post.data.published,
        description: post.data.description || '',
        link: `/posts/${post.slug}/`,
        content: sanitizeHtml(parser.render(contentMarkdown), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        }),
        // Add explicit frontmatter data
        customData: `
        <frontmatter>
          <published>${post.data.published.toISOString()}</published>
          ${post.data.updated ? `<updated>${post.data.updated.toISOString()}</updated>` : ''}
          ${post.data.tags && post.data.tags.length > 0 ? `<tags>${post.data.tags.join(',')}</tags>` : ''}
          ${post.data.category ? `<category>${post.data.category}</category>` : ''}
          ${post.data.timelineYear ? `<timelineYear>${post.data.timelineYear}</timelineYear>` : ''}
          ${post.data.timelineEra ? `<timelineEra>${post.data.timelineEra}</timelineEra>` : ''}
          ${post.data.isKeyEvent !== undefined ? `<isKeyEvent>${post.data.isKeyEvent}</isKeyEvent>` : ''}
          ${post.data.image ? `<image>${post.data.image}</image>` : ''}
        </frontmatter>
      `,
      }
    }),
  )

  // Generate RSS feed
  const response = await rss({
    title: siteConfig.title,
    description: siteConfig.subtitle || 'No description',
    site:
      context.site ??
      (context.url ? context.url.origin : 'https://temporalflow.org'),
    items,
    customData: `<language>${siteConfig.lang}</language>`,
  })

  // Add CORS headers to the response
  return createCORSResponse(response)
}
