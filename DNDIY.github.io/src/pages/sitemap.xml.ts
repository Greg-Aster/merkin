import type { APIRoute } from 'astro'

export const GET: APIRoute = () =>
  Response.redirect(new URL('/sitemap-index.xml', import.meta.env.SITE), 301)
