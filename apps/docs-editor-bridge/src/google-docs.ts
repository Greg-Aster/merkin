export interface GoogleDocListItem {
  text: string
  children: GoogleDocListBlock[]
}

export interface GoogleDocListBlock {
  type: 'list'
  ordered: boolean
  items: GoogleDocListItem[]
}

export type GoogleDocSectionKind = 'preamble' | 'content' | 'navigation'

export interface GoogleDocBlockPresentation {
  block: GoogleDocBlock
  section: GoogleDocSectionKind
  isSectionLead: boolean
}

export type GoogleDocMediaLayout =
  | 'wide'
  | 'bleed'
  | 'aside-start'
  | 'aside-end'

export interface GoogleDocEditorialMedia {
  afterHeadingId: string
  src: string
  alt: string
  layout?: GoogleDocMediaLayout
}

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
  | GoogleDocListBlock
  | {
      type: 'blockquote'
      paragraphs: string[]
    }
  | {
      type: 'image'
      src: string
      alt: string
      caption?: string
      layout?: GoogleDocMediaLayout
      editorial?: boolean
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
          return googleDocListToPlainText(block)
        case 'blockquote':
          return block.paragraphs
        case 'image':
          return [block.alt, block.caption ?? ''].filter(Boolean)
        case 'table':
          return [block.headers.join(' '), ...block.rows.map((row) => row.join(' '))]
        case 'thematicBreak':
          return []
      }
    })
    .join('\n')
}

export function googleDocBlocksToMarkdown(blocks: GoogleDocBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return `${'#'.repeat(block.depth)} ${block.text}`
        case 'paragraph':
          return block.text
        case 'list':
          return googleDocListToMarkdown(block).join('\n')
        case 'blockquote':
          return block.paragraphs
            .map((paragraph) =>
              paragraph
                .split('\n')
                .map((line) => `> ${line}`)
                .join('\n'),
            )
            .join('\n>\n')
        case 'image': {
          const caption = block.caption ? ` "${block.caption.replace(/"/g, '\\"')}"` : ''
          return `![${block.alt}](${block.src}${caption})`
        }
        case 'table': {
          const rows = [block.headers, ...block.rows]
          const markdownRows = rows.map(
            (row) => `| ${row.map(escapeMarkdownTableCell).join(' | ')} |`,
          )
          const divider = `| ${block.headers.map(() => '---').join(' | ')} |`
          return [markdownRows[0], divider, ...markdownRows.slice(1)].join('\n')
        }
        case 'pre':
          return `\`\`\`\n${block.text}\n\`\`\``
        case 'thematicBreak':
          return '---'
      }
    })
    .join('\n\n')
}

export function convertGoogleDocTextToBlocks(text: string): GoogleDocBlock[] {
  const blocks: GoogleDocBlock[] = []
  const usedHeadingIds = new Map<string, number>()

  const lines = normalizeExportText(text)
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? ''
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (/^-{3,}$/.test(line)) {
      blocks.push({ type: 'thematicBreak' })
      continue
    }

    if (isMarkdownTableStart(lines, index)) {
      const table = readMarkdownTable(lines, index)
      blocks.push(table.block)
      index = table.endIndex
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading?.[1] && heading[2]) {
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

    if (isMarkdownListLine(rawLine)) {
      const list = readMarkdownLists(lines, index)
      blocks.push(...convertDiagramLists(list.blocks))
      index = list.endIndex
      continue
    }

    if (isMarkdownBlockquoteStart(line)) {
      const quote = readMarkdownBlockquote(lines, index)
      if (quote.block.paragraphs.length > 0) {
        blocks.push(quote.block)
      }
      index = quote.endIndex
      continue
    }

    const image = parseStandaloneMarkdownImage(line)
    if (image) {
      blocks.push(image)
      continue
    }

    blocks.push({ type: 'paragraph', text: normalizeMarkdownText(line) })
  }

  return blocks
}

export function getGoogleDocBlockPresentation(
  blocks: GoogleDocBlock[],
): GoogleDocBlockPresentation[] {
  let section: GoogleDocSectionKind = 'preamble'
  let awaitsSectionLead = false

  return blocks.map((block) => {
    if (block.type === 'heading' && block.depth === 2) {
      section = isNavigationHeading(block.text) ? 'navigation' : 'content'
      awaitsSectionLead = true
    }

    const isSectionLead = awaitsSectionLead && isSectionLeadBlock(block)
    if (isSectionLead) {
      awaitsSectionLead = false
    }

    return { block, section, isSectionLead }
  })
}

export function insertGoogleDocEditorialMedia(
  blocks: GoogleDocBlock[],
  editorialMedia: GoogleDocEditorialMedia[],
): GoogleDocBlock[] {
  if (editorialMedia.length === 0) return blocks

  const mediaByHeading = new Map<string, GoogleDocEditorialMedia[]>()
  for (const media of editorialMedia) {
    const entries = mediaByHeading.get(media.afterHeadingId) ?? []
    entries.push(media)
    mediaByHeading.set(media.afterHeadingId, entries)
  }

  return blocks.flatMap((block) => {
    if (block.type !== 'heading') return [block]

    const mediaEntries = mediaByHeading.get(block.id)
    if (!mediaEntries) return [block]

    return [
      block,
      ...mediaEntries.map(
        (media): GoogleDocBlock => ({
          type: 'image',
          src: media.src,
          alt: media.alt,
          layout: media.layout,
          editorial: true,
        }),
      ),
    ]
  })
}

export function renderGoogleDocListHtml(
  block: GoogleDocListBlock,
  presentation?: Pick<GoogleDocBlockPresentation, 'section' | 'isSectionLead'>,
): string {
  return renderListBlock(block, presentation, true)
}

export function renderInlineMarkdown(source: string): string {
  const text = normalizeMarkdownText(source)
  const tokenPattern =
    /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)\)|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<![\w_])_([^_\n]+)_(?![\w_])/g
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
    } else if (match[5] || match[6]) {
      html += `<em>${escapeHtml(match[5] ?? match[6] ?? '')}</em>`
    }

    cursor = tokenPattern.lastIndex
  }

  html += escapeHtml(text.slice(cursor))
  return html
}

interface MarkdownListToken {
  indent: number
  ordered: boolean
  text: string
}

function isMarkdownListLine(line: string): boolean {
  return /^[ \t]*(?:[-*+] |\d+[.)] )\S/.test(line)
}

function readMarkdownLists(
  lines: string[],
  startIndex: number,
): { blocks: GoogleDocListBlock[]; endIndex: number } {
  const tokens: MarkdownListToken[] = []
  let endIndex = startIndex

  for (let index = startIndex; index < lines.length; index += 1) {
    const match = (lines[index] ?? '').match(/^([ \t]*)([-*+]|\d+[.)])\s+(.+)$/)
    if (!match) break
    if (!match[2] || !match[3]) break

    tokens.push({
      indent: measureIndent(match[1]),
      ordered: /^\d/.test(match[2]),
      text: normalizeMarkdownText(match[3]),
    })
    endIndex = index
  }

  const blocks: GoogleDocListBlock[] = []
  let tokenIndex = 0
  while (tokenIndex < tokens.length) {
    const parsed = buildListBlock(tokens, tokenIndex, tokens[tokenIndex]?.indent ?? 0)
    blocks.push(parsed.block)
    tokenIndex = parsed.nextIndex
  }

  return { blocks, endIndex }
}

function buildListBlock(
  tokens: MarkdownListToken[],
  startIndex: number,
  indent: number,
): { block: GoogleDocListBlock; nextIndex: number } {
  const ordered = tokens[startIndex]?.ordered ?? false
  const block: GoogleDocListBlock = { type: 'list', ordered, items: [] }
  let index = startIndex

  while (index < tokens.length) {
    const token = tokens[index]
    if (!token || token.indent < indent) break

    if (token.indent > indent) {
      const parentItem = block.items.at(-1)
      if (!parentItem) break
      const nested = buildListBlock(tokens, index, token.indent)
      parentItem.children.push(nested.block)
      index = nested.nextIndex
      continue
    }

    if (token.ordered !== ordered) break

    block.items.push({ text: token.text, children: [] })
    index += 1
  }

  return { block, nextIndex: index }
}

function convertDiagramLists(blocks: GoogleDocListBlock[]): GoogleDocBlock[] {
  return blocks.map((block) => {
    const flatItems = block.items.every((item) => item.children.length === 0)
    const itemText = block.items.map((item) => item.text)
    if (block.ordered && flatItems && looksLikeDiagramList(itemText)) {
      return { type: 'pre', text: itemText.join('\n') }
    }
    return block
  })
}

function readMarkdownBlockquote(
  lines: string[],
  startIndex: number,
): { block: Extract<GoogleDocBlock, { type: 'blockquote' }>; endIndex: number } {
  const paragraphs: string[] = []
  let activeParagraph: string[] = []
  let endIndex = startIndex

  const flushParagraph = () => {
    const paragraph = normalizeMarkdownText(activeParagraph.join(' '))
    if (paragraph) paragraphs.push(paragraph)
    activeParagraph = []
  }

  const exportedGoogleDocsQuote = /^\*\\?>\s?/.test(
    (lines[startIndex] ?? '').trim(),
  )

  for (let index = startIndex; index < lines.length; index += 1) {
    const line = (lines[index] ?? '').trim()
    const match = exportedGoogleDocsQuote
      ? line.match(/^\*(?:\\?>\s?)?(.*?)\*\s*$/)
      : line.match(/^>\s?(.*)$/)
    if (!match) break
    endIndex = index
    if (!match[1]?.trim()) {
      flushParagraph()
    } else {
      activeParagraph.push(match[1])
    }
  }
  flushParagraph()

  return { block: { type: 'blockquote', paragraphs }, endIndex }
}

function isMarkdownBlockquoteStart(line: string): boolean {
  return /^>\s?/.test(line) || /^\*\\?>\s?/.test(line)
}

function parseStandaloneMarkdownImage(
  line: string,
): Extract<GoogleDocBlock, { type: 'image' }> | null {
  const match = line.match(
    /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]+)(?:\s+["']([^"']+)["'])?\)$/,
  )
  if (!match?.[2]) return null

  const caption = match[3] ? normalizeMarkdownText(match[3]) : undefined
  return {
    type: 'image',
    src: match[2],
    alt: normalizeMarkdownText(match[1] ?? ''),
    ...(caption ? { caption } : {}),
  }
}

function measureIndent(indent: string): number {
  return indent.replace(/\t/g, '    ').length
}

function googleDocListToPlainText(block: GoogleDocListBlock): string[] {
  return block.items.flatMap((item) => [
    item.text,
    ...item.children.flatMap((child) => googleDocListToPlainText(child)),
  ])
}

function googleDocListToMarkdown(
  block: GoogleDocListBlock,
  indent = 0,
): string[] {
  return block.items.flatMap((item, index) => {
    const marker = block.ordered ? `${index + 1}.` : '-'
    const line = `${' '.repeat(indent)}${marker} ${item.text}`
    return [
      line,
      ...item.children.flatMap((child) =>
        googleDocListToMarkdown(child, indent + 2),
      ),
    ]
  })
}

function escapeMarkdownTableCell(cell: string): string {
  return cell.replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function renderListBlock(
  block: GoogleDocListBlock,
  presentation: Pick<GoogleDocBlockPresentation, 'section' | 'isSectionLead'> | undefined,
  isRoot: boolean,
): string {
  const tag = block.ordered ? 'ol' : 'ul'
  const classNames = ['docs-editor-list']
  if (isRoot && presentation?.section === 'navigation') {
    classNames.push('docs-editor-navigation-list')
  }
  if (isRoot && presentation?.isSectionLead) {
    classNames.push('docs-editor-section-lead')
  }
  const sectionAttribute =
    isRoot && presentation ? ` data-doc-section="${presentation.section}"` : ''
  const items = block.items
    .map((item) => {
      const children = item.children
        .map((child) => renderListBlock(child, undefined, false))
        .join('')
      return `<li class="docs-editor-list-item">${renderInlineMarkdown(item.text)}${children}</li>`
    })
    .join('')

  return `<${tag} class="${classNames.join(' ')}"${sectionAttribute}>${items}</${tag}>`
}

function isNavigationHeading(text: string): boolean {
  return /\b(?:continue|journey|explore|next|related|further reading)\b/i.test(text)
}

function isSectionLeadBlock(block: GoogleDocBlock): boolean {
  return (
    block.type === 'paragraph' ||
    block.type === 'blockquote' ||
    block.type === 'list' ||
    block.type === 'image'
  )
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
    .replace(/\]\(https?:\/\/\/([^\s)]+)\)/g, '](/$1)')
    .replace(/\\([\\`*_{}\[\]()#+\-.!|~=>])/g, '$1')
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
