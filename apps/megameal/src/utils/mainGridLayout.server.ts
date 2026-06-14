import fs from 'node:fs'
import path from 'node:path'

type PostLike = {
  id?: unknown
  data?: {
    bannerType?: string
  }
}

export function normalizeRoutePathname(pathname: string) {
  return pathname.replace(/\/$/, '')
}

export function isTimelinePath(pathname: string) {
  return normalizeRoutePathname(pathname) === '/timeline'
}

export function isTimeline2DPath(pathname: string) {
  return normalizeRoutePathname(pathname) === '/timeline/2d'
}

export function isContentPostPage(isPostPage: boolean, post: unknown) {
  return isPostPage === true && Boolean(post)
}

export function postUsesArchiveBanner(post: PostLike | undefined) {
  return post?.data?.bannerType === 'archive'
}

function readPostFrontmatter(post: PostLike | undefined) {
  if (typeof post?.id !== 'string') return ''

  const postSourcePath = path.join(
    process.cwd(),
    'src',
    'content',
    'posts',
    post.id,
  )

  if (!fs.existsSync(postSourcePath)) return ''

  return fs.readFileSync(postSourcePath, 'utf8').split('---')[1] ?? ''
}

export function resolvePostOneColumn(post: PostLike | undefined) {
  const rawPostFrontmatter = readPostFrontmatter(post)
  const postRequestsVisibleSidebar =
    /^\s*oneColumn:\s*false\s*(?:#.*)?$/m.test(rawPostFrontmatter)

  return !postRequestsVisibleSidebar
}
