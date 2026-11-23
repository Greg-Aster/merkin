import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { siteConfig } from '../../config/config'
import { getSocialImage } from '../../lib/social-images'

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft)
  const sources = new Set([siteConfig.banner.src, ...posts.map(post => post.data.image).filter(Boolean)])
  const rendered = await Promise.all([...sources].map(source => getSocialImage(source)))
  // Multiple articles can use the same artwork.
  return [...new Map(rendered.map(image => [image.id, image])).values()].map(image => ({
    params: { id: image.id }, props: { data: image.data },
  }))
}

export const GET: APIRoute = ({ props }) => new Response(new Uint8Array(props.data), {
  headers: { 'Content-Type': 'image/jpeg' },
})
