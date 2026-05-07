import matter from 'gray-matter'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { normalizePost } from '@merkin/shared-content'
import type { SharedPost, SharedRawPostFrontmatter } from '@merkin/shared-content'
import type { SharedArchiveManifest, SharedPostsManifest } from '../types.ts'

const POST_EXTENSIONS = new Set(['.md', '.mdx'])

async function walkDirectory(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return walkDirectory(absolutePath)
      }

      return POST_EXTENSIONS.has(path.extname(entry.name)) ? [absolutePath] : []
    }),
  )

  return files.flat()
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/')
}

function toSlug(sourceFile: string, contentRoot: string): string {
  const relativePath = toPosixPath(path.relative(contentRoot, sourceFile))
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/i, '')
  return withoutExtension.replace(/\/index$/i, '').toLowerCase()
}

function sortPosts(posts: SharedPost[]): SharedPost[] {
  return [...posts].sort((left, right) => {
    const leftPublished = left.published ? Date.parse(left.published) : Number.NEGATIVE_INFINITY
    const rightPublished = right.published ? Date.parse(right.published) : Number.NEGATIVE_INFINITY

    if (leftPublished !== rightPublished) {
      return rightPublished - leftPublished
    }

    return left.slug.localeCompare(right.slug)
  })
}

export async function loadSharedPosts(
  contentRoot: string,
  options: { collection?: string; sourcePathPrefix?: string } = {},
): Promise<SharedPost[]> {
  const sourceFiles = await walkDirectory(contentRoot)
  const collection = options.collection ?? 'posts'
  const sourcePathPrefix = options.sourcePathPrefix
    ? `${options.sourcePathPrefix.replace(/\/$/, '')}/`
    : ''

  const posts = await Promise.all(
    sourceFiles.map(async sourceFile => {
      const fileContents = await readFile(sourceFile, 'utf8')
      const parsed = matter(fileContents)
      const relativeSourcePath = toPosixPath(path.relative(contentRoot, sourceFile))
      return normalizePost({
        slug: toSlug(sourceFile, contentRoot),
        sourcePath: `${sourcePathPrefix}${relativeSourcePath}`,
        collection,
        frontmatter: parsed.data as SharedRawPostFrontmatter,
      })
    }),
  )

  return sortPosts(posts)
}

export async function buildPostsManifest(
  contentRoot: string,
): Promise<SharedPostsManifest> {
  const items = await loadSharedPosts(contentRoot)

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: toPosixPath(contentRoot),
    count: items.length,
    items,
  }
}

export async function buildArchiveManifestFromContentRoots(
  contentRoots: Array<{ collection: string; root: string }>,
): Promise<SharedArchiveManifest> {
  const contentGroups = await Promise.all(
    contentRoots.map(entry =>
      loadSharedPosts(entry.root, {
        collection: entry.collection,
        sourcePathPrefix: entry.collection,
      }),
    ),
  )
  const items = sortPosts(contentGroups.flat())

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: contentRoots.map(entry => toPosixPath(entry.root)).join(';'),
    count: items.length,
    items,
  }
}
