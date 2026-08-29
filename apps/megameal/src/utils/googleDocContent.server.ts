import { existsSync } from 'node:fs'
import type { MarkdownHeading } from 'astro'
import {
  fetchGoogleDocBlocks,
  googleDocBlocksToPlainText,
  type GoogleDocBlock,
} from '@merkin/docs-editor-bridge'
import getReadingTime from 'reading-time'

const GOOGLE_DOC_FETCH_TIMEOUT_MS = 10_000
const GOOGLE_DOC_STYLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const GOOGLE_DOC_STYLES_DIRECTORY = new URL('../../public/styles/', import.meta.url)

export interface GoogleDocSnapshot {
  blocks: GoogleDocBlock[]
  headings: MarkdownHeading[]
  minutes: number
  words: number
}

export function resolveGoogleDocStylesheet(style: string): string {
  if (!GOOGLE_DOC_STYLE_ID_PATTERN.test(style)) {
    throw new Error(
      `Google Doc style "${style}" must use lowercase letters, numbers, and hyphens only.`,
    )
  }

  const stylesheet = new URL(`${style}.css`, GOOGLE_DOC_STYLES_DIRECTORY)
  if (!existsSync(stylesheet)) {
    throw new Error(
      `Google Doc style "${style}" does not exist at apps/megameal/public/styles/${style}.css.`,
    )
  }

  return `/styles/${style}.css`
}

export async function loadGoogleDocSnapshot(
  documentId: string,
): Promise<GoogleDocSnapshot> {
  const abortController = new AbortController()
  const timeout = setTimeout(
    () => abortController.abort(),
    GOOGLE_DOC_FETCH_TIMEOUT_MS,
  )

  try {
    const blocks = await fetchGoogleDocBlocks(documentId, 'md', {
      signal: abortController.signal,
    })
    const pageHeading = blocks.find(
      (block) => block.type === 'heading' && block.depth === 1,
    )

    if (pageHeading) {
      throw new Error(
        `Google Doc ${documentId} contains an H1. Megameal frontmatter owns the page heading; start document sections at Heading 2.`,
      )
    }

    const readingTime = getReadingTime(googleDocBlocksToPlainText(blocks))

    return {
      blocks,
      headings: blocks.flatMap((block) =>
        block.type === 'heading'
          ? [{ depth: block.depth, slug: block.id, text: block.text }]
          : [],
      ),
      minutes: Math.max(1, Math.round(readingTime.minutes)),
      words: readingTime.words,
    }
  } catch (error) {
    if (abortController.signal.aborted) {
      throw new Error(
        `Google Doc ${documentId} did not respond within ${GOOGLE_DOC_FETCH_TIMEOUT_MS / 1_000} seconds.`,
      )
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
