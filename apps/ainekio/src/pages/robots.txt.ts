import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://ainek.io')
  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /configs/',
    'Disallow: /new-post/',
    'Disallow: /friends/',
    '',
    `Sitemap: ${new URL('sitemap-index.xml', origin).href}`,
    '',
  ].join('\n')

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
