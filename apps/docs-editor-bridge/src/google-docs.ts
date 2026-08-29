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
      ordered: boolean
      items: string[]
    }
  | {
      type: 'table'
      headers: string[]
      rows: string[][]
    }
  | {
      type: 'pre'
      text: string
    }
  | {
      type: 'thematicBreak'
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

export type GoogleDocExportFormat = 'txt' | 'md'

export interface FetchGoogleDocOptions {
  cacheBust?: string | number
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
}

export function buildGoogleDocExportUrl(
  input: string,
  format: GoogleDocExportFormat = 'txt',
  cacheBust?: string | number,
): string {
  const docId = extractGoogleDocId(input)
  const exportUrl = new URL(`https://docs.google.com/document/d/${docId}/export`)
  exportUrl.searchParams.set('format', format)
  if (cacheBust !== undefined) {
    exportUrl.searchParams.set('_', String(cacheBust))
  }
  return exportUrl.toString()
}

export function buildGoogleDocTextExportUrl(input: string, cacheBust?: string | number): string {
  return buildGoogleDocExportUrl(input, 'txt', cacheBust)
}

export function buildGoogleDocMarkdownExportUrl(input: string, cacheBust?: string | number): string {
  return buildGoogleDocExportUrl(input, 'md', cacheBust)
}

export async function fetchGoogleDocBlocks(
  input: string,
  format: GoogleDocExportFormat = 'md',
  options: FetchGoogleDocOptions = {},
): Promise<GoogleDocBlock[]> {
  const fetchDocument = options.fetch ?? globalThis.fetch
  if (!fetchDocument) {
    throw new Error('Docs Editor Bridge could not find a fetch implementation.')
  }

  const response = await fetchDocument(
    buildGoogleDocExportUrl(input, format, options.cacheBust),
    {
      signal: options.signal,
      cache: options.cacheBust === undefined ? 'default' : 'no-store',
      headers: {
        Accept:
          format === 'md'
            ? 'text/markdown,text/x-markdown,text/plain'
            : 'text/plain',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Google Docs export failed with ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    throw new Error(
      'Google Docs returned a sign-in page. Share the document as “Anyone with the link” (Viewer).',
    )
  }

  const text = await response.text()
  if (text.length > 1_000_000) {
    throw new Error('Google Docs export exceeded the 1 MB content limit.')
  }

  const blocks = convertGoogleDocTextToBlocks(text)
  if (blocks.length === 0) {
    throw new Error('Google Docs export did not contain readable content.')
  }

  return blocks
}

export function googleDocBlocksToPlainText(blocks: GoogleDocBlock[]): string {
  return blocks
    .flatMap((block) => {
      switch (block.type) {
        case 'heading':
        case 'paragraph':
        case 'pre':
          return block.text
        case 'list':
          return block.items
        case 'table':
          return [block.headers.join(' '), ...block.rows.map((row) => row.join(' '))]
        case 'thematicBreak':
          return []
      }
    })
    .join('\n')
}

export function convertGoogleDocTextToBlocks(text: string): GoogleDocBlock[] {
  const blocks: GoogleDocBlock[] = []
  let activeList: { ordered: boolean; items: string[] } | null = null
  const usedHeadingIds = new Map<string, number>()

  const flushList = () => {
    if (!activeList || activeList.items.length === 0) return
    if (activeList.ordered && looksLikeDiagramList(activeList.items)) {
      blocks.push({
        type: 'pre',
        text: activeList.items.map((item) => normalizeMarkdownText(item)).join('\n'),
      })
    } else {
      blocks.push({
        type: 'list',
        ordered: activeList.ordered,
        items: activeList.items.map((item) => normalizeMarkdownText(item)),
      })
    }
    activeList = null
  }

  const lines = normalizeExportText(text)
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? ''
    const line = rawLine.trim()
    if (!line) {
      flushList()
      continue
    }

    if (/^-{3,}$/.test(line)) {
      flushList()
      blocks.push({ type: 'thematicBreak' })
      continue
    }

    if (isMarkdownTableStart(lines, index)) {
      flushList()
      const table = readMarkdownTable(lines, index)
      blocks.push(table.block)
      index = table.endIndex
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading?.[1] && heading[2]) {
      flushList()
      const depth = heading[1].length as 1 | 2 | 3
      const headingText = normalizeHeadingText(heading[2])
      if (!headingText) continue
      blocks.push({
        type: 'heading',
        depth,
        text: headingText,
        id: createHeadingId(headingText, usedHeadingIds),
      })
      continue
    }

    const unorderedListItem = line.match(/^[-*]\s+(.+)$/)
    if (unorderedListItem?.[1]) {
      if (activeList?.ordered) flushList()
      activeList ??= { ordered: false, items: [] }
      activeList.items.push(unorderedListItem[1].trim())
      continue
    }

    const orderedListItem = line.match(/^\d+\.\s+(.+)$/)
    if (orderedListItem?.[1]) {
      if (activeList && !activeList.ordered) flushList()
      activeList ??= { ordered: true, items: [] }
      activeList.items.push(orderedListItem[1].trim())
      continue
    }

    flushList()
    blocks.push({ type: 'paragraph', text: normalizeMarkdownText(line) })
  }

  flushList()
  return blocks
}

export function renderInlineMarkdown(source: string): string {
  const text = normalizeMarkdownText(source)
  const tokenPattern =
    /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)/g
  let cursor = 0
  let html = ''
  let match: RegExpExecArray | null

  while ((match = tokenPattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(cursor, match.index))

    if (match[1]) {
      html += `<code>${escapeHtml(match[1])}</code>`
    } else if (match[2]) {
      html += `<strong>${escapeHtml(match[2])}</strong>`
    } else if (match[3] && match[4]) {
      const href = escapeHtmlAttribute(match[4])
      const label = escapeHtml(match[3])
      const externalAttributes = match[4].startsWith('/')
        ? ''
        : ' target="_blank" rel="noopener noreferrer"'
      html += `<a href="${href}"${externalAttributes}>${label}</a>`
    }

    cursor = tokenPattern.lastIndex
  }

  html += escapeHtml(text.slice(cursor))
  return html
}

function normalizeExportText(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' '))
}

function normalizeMarkdownText(text: string): string {
  return text
    .replace(/\\([\\`*_{}\[\]()#+\-.!|~=])/g, '$1')
    .replace(/[ \t]+$/g, '')
    .trim()
}

function normalizeHeadingText(text: string): string {
  const normalized = normalizeMarkdownText(text)
  return normalized.replace(/^\*\*(.+)\*\*$/, '$1').trim()
}

function isMarkdownTableStart(lines: string[], index: number): boolean {
  const current = lines[index]?.trim() ?? ''
  const next = lines[index + 1]?.trim() ?? ''
  return current.startsWith('|') && current.endsWith('|') && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next)
}

function readMarkdownTable(lines: string[], startIndex: number): { block: GoogleDocBlock; endIndex: number } {
  const headers = splitMarkdownTableRow(lines[startIndex] ?? '')
  const rows: string[][] = []
  let endIndex = startIndex + 1

  for (let index = startIndex + 2; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ''
    if (!line.startsWith('|') || !line.endsWith('|')) {
      break
    }
    rows.push(splitMarkdownTableRow(line))
    endIndex = index
  }

  return {
    block: {
      type: 'table',
      headers,
      rows,
    },
    endIndex,
  }
}

function splitMarkdownTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => normalizeMarkdownText(cell))
}

function looksLikeDiagramList(items: string[]): boolean {
  if (items.length < 4) return false
  return items.some((item) => /[\u2500-\u257f\u2190-\u21ff]/.test(item))
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlAttribute(text: string): string {
  return escapeHtml(text).replace(/"/g, '&quot;')
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
