import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { generations, getReading, kinds, topics } from '../lib/reading'

function cleanMdxBody(body: string, origin: string): string {
  return body
    .replace(/^import\s+.*?['"][^'"]*['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(\bsrc|\bhref|\bposter)=["'](\/[^"']+)["']/g, `$1="${origin}$2"`)
    .replace(/\]\((\/[^)\s]+)\)/g, `](${origin}$1)`)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://ainek.io')).href.replace(/\/$/, '')
  const posts = await getCollection('posts', ({ data }) => !data.draft)

  // Put V2 reference guides first (starting with what-ainekio-can-do & project-overview), then newest-first V2 journal entries
  const prioritySlugs = [
    'what-ainekio-can-do',
    'project-overview',
    'how-does-ainekio-stack-up',
    'ainekio-v2',
    'ainekio-os',
    'gait-development',
  ]

  const activePosts = posts
    .filter(p => getReading(p).generation !== 'v1')
    .sort((a, b) => {
      const ai = prioritySlugs.indexOf(a.slug)
      const bi = prioritySlugs.indexOf(b.slug)
      if (ai !== -1 || bi !== -1) {
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
      }
      const ra = getReading(a)
      const rb = getReading(b)
      if (ra.kind !== rb.kind) {
        return ra.kind === 'reference' ? -1 : 1
      }
      return b.data.published.getTime() - a.data.published.getTime()
    })

  const sections: string[] = [
    '# Ainekio — Full Technical Documentation & Build Corpus',
    '',
    `Source: ${origin}`,
    `Index: ${origin}/llms.txt`,
    'Firmware & Gateway Repository (CAD/STLs and trained weights omitted): https://github.com/Greg-Aster/Ainekio-bot',
    'Ainekio OS Repository: https://github.com/Greg-Aster/ainekio-os',
    '',
    '---',
    '',
  ]

  for (const post of activePosts) {
    const r = getReading(post)
    const pub = post.data.published.toISOString().slice(0, 10)
    const upd = post.data.updated ? post.data.updated.toISOString().slice(0, 10) : null
    sections.push(`# ${post.data.title}`)
    sections.push('')
    sections.push(`- URL: ${origin}/posts/${post.slug}/`)
    sections.push(`- Category: ${topics[r.topic].title} · ${kinds[r.kind]} · ${generations[r.generation]}`)
    sections.push(`- Published: ${pub}${upd ? ` (Updated: ${upd})` : ''}`)
    if (post.data.description) {
      sections.push(`- Summary: ${post.data.description}`)
    }
    sections.push('')
    sections.push(cleanMdxBody(post.body || '', origin))
    sections.push('')
    sections.push('---')
    sections.push('')
  }

  return new Response(sections.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
