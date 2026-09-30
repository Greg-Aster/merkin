import { existsSync } from 'node:fs'
import type { MarkdownHeading } from 'astro'
import {
  fetchGoogleDocBlocks,
  googleDocBlocksToPlainText,
  type GoogleDocBlock,
} from '@merkin/docs-editor-bridge'
import getReadingTime from 'reading-time'

// Preview builds fetch each document once, with bounded retries for transient
// failures. Production retains its existing timeout and fetch behavior.
const IS_DEV_PREVIEW = process.env.MERKIN_DEV_PREVIEW === 'true'
const GOOGLE_DOC_FETCH_TIMEOUT_MS = IS_DEV_PREVIEW ? 30_000 : 10_000
const previewSnapshots = new Map<string, Promise<GoogleDocSnapshot>>()
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
  if (!IS_DEV_PREVIEW) return fetchGoogleDocSnapshot(documentId)

  let snapshot = previewSnapshots.get(documentId)
  if (!snapshot) {
    snapshot = fetchPreviewSnapshot(documentId).catch((error) => {
      previewSnapshots.delete(documentId)
      throw error
    })
    previewSnapshots.set(documentId, snapshot)
  }
  return snapshot
}

async function fetchPreviewSnapshot(documentId: string): Promise<GoogleDocSnapshot> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchGoogleDocSnapshot(documentId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const transient =
        /did not respond within|fetch failed|export failed with (429|5\d\d)/.test(message)
      if (!transient || attempt === 3) throw error
      console.warn(
        `Retrying Google Doc ${documentId} after transient failure (${attempt}/3).`,
      )
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000))
    }
  }
  throw new Error(`Google Doc ${documentId} could not be loaded.`)
}

async function fetchGoogleDocSnapshot(
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
