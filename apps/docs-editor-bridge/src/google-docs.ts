export type GoogleDocBlock =
  | {
      type: 'heading'
      depth: 1 | 2 | 3
      text: string
      id: string
    }
  | {
      type: 'paragraph'
      text: string
    }
  | {
      type: 'list'
      items: string[]
    }

const docIdPattern = /^[A-Za-z0-9_-]{20,}$/

export function extractGoogleDocId(input: string): string {
  const value = input.trim()

  if (docIdPattern.test(value)) {
    return value
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error('Docs Editor Bridge expected a Google Doc URL or document ID.')
  }

  if (parsedUrl.hostname !== 'docs.google.com') {
    throw new Error('Docs Editor Bridge only supports docs.google.com URLs.')
  }

  const match = parsedUrl.pathname.match(/\/document\/d\/([^/]+)/)
  if (!match?.[1]) {
    throw new Error('Docs Editor Bridge could not find a document ID in the URL.')
  }

  if (match[1] === 'e') {
    throw new Error(
      'Docs Editor Bridge needs the original share URL, not a published /d/e/ URL.',
    )
  }

  if (!docIdPattern.test(match[1])) {
    throw new Error('Docs Editor Bridge found an invalid Google Doc ID.')
  }

  return match[1]
}

export function buildGoogleDocTextExportUrl(input: string): string {
  const docId = extractGoogleDocId(input)
  return `https://docs.google.com/document/d/${docId}/export?format=txt`
}

export function convertGoogleDocTextToBlocks(text: string): GoogleDocBlock[] {
  const blocks: GoogleDocBlock[] = []
  let activeList: string[] = []
  const usedHeadingIds = new Map<string, number>()

  const flushList = () => {
    if (activeList.length === 0) return
    blocks.push({ type: 'list', items: activeList })
    activeList = []
  }

  for (const rawLine of normalizeExportText(text)) {
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading?.[1] && heading[2]) {
      flushList()
      const depth = heading[1].length as 1 | 2 | 3
      blocks.push({
        type: 'heading',
        depth,
        text: heading[2].trim(),
        id: createHeadingId(heading[2], usedHeadingIds),
      })
      continue
    }

    const listItem = line.match(/^[-*]\s+(.+)$/)
    if (listItem?.[1]) {
      activeList.push(listItem[1].trim())
      continue
    }

    flushList()
    blocks.push({ type: 'paragraph', text: line })
  }

  flushList()
  return blocks
}

function normalizeExportText(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' '))
}

function createHeadingId(text: string, usedIds: Map<string, number>): string {
  const baseId =
    text
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'

  const currentCount = usedIds.get(baseId) ?? 0
  usedIds.set(baseId, currentCount + 1)

  return currentCount === 0 ? baseId : `${baseId}-${currentCount + 1}`
}
