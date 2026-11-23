import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildGoogleDocMarkdownExportUrl,
  buildGoogleDocTextExportUrl,
  convertGoogleDocTextToBlocks,
  extractGoogleDocId,
  fetchGoogleDocBlocks,
  getGoogleDocBlockPresentation,
  googleDocBlocksToMarkdown,
  googleDocBlocksToPlainText,
  insertGoogleDocEditorialMedia,
  renderGoogleDocListHtml,
  renderInlineMarkdown,
} from '../dist/google-docs.js'

const docId = '1AVtNyFN7AG5ymLqshQI-77jO4nfG0yev8FUABZ8YE9E'

describe('Google Docs URL handling', () => {
  it('extracts a document ID from a normal share URL', () => {
    assert.equal(
      extractGoogleDocId(
        `https://docs.google.com/document/d/${docId}/edit?usp=sharing`,
      ),
      docId,
    )
  })

  it('extracts a document ID from an export URL', () => {
    assert.equal(
      extractGoogleDocId(
        `https://docs.google.com/document/d/${docId}/export?format=txt`,
      ),
      docId,
    )
  })

  it('rejects published /d/e/ URLs because they do not expose the source doc ID', () => {
    assert.throws(
      () =>
        extractGoogleDocId(
          'https://docs.google.com/document/d/e/2PACX-1vExample/pub?embedded=true',
        ),
      /original share URL/,
    )
  })

  it('builds the text export URL', () => {
    assert.equal(
      buildGoogleDocTextExportUrl(docId),
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
    )
  })

  it('can add a cache-busting export URL parameter', () => {
    assert.equal(
      buildGoogleDocTextExportUrl(docId, 12345),
      `https://docs.google.com/document/d/${docId}/export?format=txt&_=12345`,
    )
  })

  it('builds the markdown export URL', () => {
    assert.equal(
      buildGoogleDocMarkdownExportUrl(docId, 12345),
      `https://docs.google.com/document/d/${docId}/export?format=md&_=12345`,
    )
  })
})

describe('Google Docs text conversion', () => {
  it('converts markdown-like document text to render blocks', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks(
        '\uFEFF# Ainekio\n\nIntro text.\n\n## Parts\n- Servo\n- Camera\n\n### Notes\nDone.',
      ),
      [
        {
          type: 'heading',
          depth: 1,
          text: 'Ainekio',
          id: 'ainekio',
        },
        {
          type: 'paragraph',
          text: 'Intro text.',
        },
        {
          type: 'heading',
          depth: 2,
          text: 'Parts',
          id: 'parts',
        },
        {
          type: 'list',
          ordered: false,
          items: [
            { text: 'Servo', children: [] },
            { text: 'Camera', children: [] },
          ],
        },
        {
          type: 'heading',
          depth: 3,
          text: 'Notes',
          id: 'notes',
        },
        {
          type: 'paragraph',
          text: 'Done.',
        },
      ],
    )
  })

  it('converts markdown tables, rules, ordered lists, and diagram lists', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks(
        [
          '## **Parts**',
          '',
          '| Part | Qty |',
          '| ----- | ----- |',
          '| Buck \\#1 | 2 |',
          '',
          '---',
          '',
          '1. Item one',
          '2. Item two',
          '',
          '1. USB-C power source',
          '2. │',
          '3. Buck \\#1 ── Buck \\#2',
          '4. Servo rail',
        ].join('\n'),
      ),
      [
        {
          type: 'heading',
          depth: 2,
          text: 'Parts',
          id: 'parts',
        },
        {
          type: 'table',
          headers: ['Part', 'Qty'],
          rows: [['Buck #1', '2']],
        },
        {
          type: 'thematicBreak',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            { text: 'Item one', children: [] },
            { text: 'Item two', children: [] },
          ],
        },
        {
          type: 'pre',
          text: 'USB-C power source\n│\nBuck #1 ── Buck #2\nServo rail',
        },
      ],
    )
  })

  it('renders safe inline markdown html', () => {
    assert.equal(
      renderInlineMarkdown(
        '**Part:** `ESP32` *alive* _again_ [Link](https://example.com) <bad>',
      ),
      '<strong>Part:</strong> <code>ESP32</code> <em>alive</em> <em>again</em> <a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a> &lt;bad&gt;',
    )
    assert.equal(
      renderInlineMarkdown('snake_case_value remains literal'),
      'snake_case_value remains literal',
    )
  })

  it('converts nested mixed lists without flattening their hierarchy', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks(
        [
          '- First era',
          '  - First event',
          '    1. First consequence',
          '    2. Second consequence',
          '  1. Alternate sequence',
          '- Second era',
        ].join('\n'),
      ),
      [
        {
          type: 'list',
          ordered: false,
          items: [
            {
              text: 'First era',
              children: [
                {
                  type: 'list',
                  ordered: false,
                  items: [
                    {
                      text: 'First event',
                      children: [
                        {
                          type: 'list',
                          ordered: true,
                          items: [
                            { text: 'First consequence', children: [] },
                            { text: 'Second consequence', children: [] },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: 'list',
                  ordered: true,
                  items: [{ text: 'Alternate sequence', children: [] }],
                },
              ],
            },
            { text: 'Second era', children: [] },
          ],
        },
      ],
    )
  })

  it('converts quotes and safe standalone images to semantic blocks', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks(
        [
          '> Every ending begins somewhere.',
          '>',
          '> **Archive note:** dates are approximate.',
          '',
          '![A bright point in space](https://example.com/time.jpg "The first light")',
        ].join('\n'),
      ),
      [
        {
          type: 'blockquote',
          paragraphs: [
            'Every ending begins somewhere.',
            '**Archive note:** dates are approximate.',
          ],
        },
        {
          type: 'image',
          src: 'https://example.com/time.jpg',
          alt: 'A bright point in space',
          caption: 'The first light',
        },
      ],
    )
  })

  it('normalizes Google Docs exported quotes and relative site links', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks(
        [
          '*\\> “First archive line.”*  ',
          '*Second archive line.*',
          '',
          '* [Continue](http:///posts/next-era/) — Next entry',
        ].join('\n'),
      ),
      [
        {
          type: 'blockquote',
          paragraphs: ['“First archive line.” Second archive line.'],
        },
        {
          type: 'list',
          ordered: false,
          items: [
            {
              text: '[Continue](/posts/next-era/) — Next entry',
              children: [],
            },
          ],
        },
      ],
    )

    assert.equal(
      renderInlineMarkdown('[Continue](http:///posts/next-era/)'),
      '<a href="/posts/next-era/">Continue</a>',
    )
  })

  it('renders nested lists with safe inline content and presentation hooks', () => {
    const [block] = convertGoogleDocTextToBlocks(
      '- [First era](/timeline/)\n  - *Event* <unsafe>',
    )
    assert.ok(block?.type === 'list')
    assert.equal(
      renderGoogleDocListHtml(block, {
        section: 'navigation',
        isSectionLead: true,
      }),
      '<ul class="docs-editor-list docs-editor-navigation-list docs-editor-section-lead" data-doc-section="navigation"><li class="docs-editor-list-item"><a href="/timeline/">First era</a><ul class="docs-editor-list"><li class="docs-editor-list-item"><em>Event</em> &lt;unsafe&gt;</li></ul></li></ul>',
    )
  })

  it('annotates section leads and journey navigation without changing blocks', () => {
    const blocks = convertGoogleDocTextToBlocks(
      '## The First Moment\n\nOpening account.\n\n## Continue the Journey\n\n- [Next era](/timeline/)',
    )
    const presentation = getGoogleDocBlockPresentation(blocks)

    assert.deepEqual(
      presentation.map(({ block, section, isSectionLead }) => ({
        type: block.type,
        section,
        isSectionLead,
      })),
      [
        { type: 'heading', section: 'content', isSectionLead: false },
        { type: 'paragraph', section: 'content', isSectionLead: true },
        { type: 'heading', section: 'navigation', isSectionLead: false },
        { type: 'list', section: 'navigation', isSectionLead: true },
      ],
    )
  })

  it('inserts local editorial media after stable heading IDs without changing document blocks', () => {
    const blocks = convertGoogleDocTextToBlocks(
      '## First Light\n\nOriginal paragraph.\n\n## Aftermath\n\nSecond paragraph.',
    )
    const presented = insertGoogleDocEditorialMedia(blocks, [
      {
        afterHeadingId: 'first-light',
        src: '/posts/timeline/first-light.webp',
        alt: 'A point of light emerging in deep space',
        layout: 'wide',
      },
    ])

    assert.equal(blocks.length, 4)
    assert.deepEqual(presented, [
      blocks[0],
      {
        type: 'image',
        src: '/posts/timeline/first-light.webp',
        alt: 'A point of light emerging in deep space',
        layout: 'wide',
        editorial: true,
      },
      ...blocks.slice(1),
    ])
  })

  it('does not relocate editorial media when its heading is no longer present', () => {
    const blocks = convertGoogleDocTextToBlocks(
      '## Current Heading\n\nOriginal paragraph.',
    )

    assert.deepEqual(
      insertGoogleDocEditorialMedia(blocks, [
        {
          afterHeadingId: 'renamed-heading',
          src: '/posts/timeline/archive.webp',
          alt: 'An archival record',
        },
      ]),
      blocks,
    )
  })

  it('deduplicates repeated heading IDs', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks('# Notes\n\n# Notes').map((block) =>
        block.type === 'heading' ? block.id : '',
      ),
      ['notes', 'notes-2'],
    )
  })

  it('creates plain text for reading-time and search metadata', () => {
    const blocks = convertGoogleDocTextToBlocks(
      '## Pilot\n\nIntro text.\n\n- First item\n  - Nested item\n\n> Archive quote.\n\n![Origin](https://example.com/origin.jpg "First light")',
    )

    assert.equal(
      googleDocBlocksToPlainText(blocks),
      'Pilot\nIntro text.\nFirst item\nNested item\nArchive quote.\nOrigin\nFirst light',
    )
  })

  it('creates semantic markdown for remote-backed feeds', () => {
    const blocks = convertGoogleDocTextToBlocks(
      '## Pilot\n\nIntro text.\n\n- [Next](http:///posts/next/)\n  - Detail\n\n*\\> Archive quote.*',
    )

    assert.equal(
      googleDocBlocksToMarkdown(blocks),
      '## Pilot\n\nIntro text.\n\n- [Next](/posts/next/)\n  - Detail\n\n> Archive quote.',
    )
  })
})

describe('Google Docs export fetching', () => {
  it('fetches and converts a document export', async () => {
    let requestedUrl = ''
    const blocks = await fetchGoogleDocBlocks(docId, 'md', {
      cacheBust: 123,
      fetch: async (url) => {
        requestedUrl = String(url)
        return new Response('## Pilot\n\nReadable body.')
      },
    })

    assert.equal(
      requestedUrl,
      `https://docs.google.com/document/d/${docId}/export?format=md&_=123`,
    )
    assert.equal(blocks.length, 2)
  })

  it('rejects failed and empty exports', async () => {
    await assert.rejects(
      fetchGoogleDocBlocks(docId, 'md', {
        fetch: async () => new Response('private', { status: 401 }),
      }),
      /failed with 401/,
    )

    await assert.rejects(
      fetchGoogleDocBlocks(docId, 'md', {
        fetch: async () => new Response('\n\n'),
      }),
      /did not contain readable content/,
    )

    await assert.rejects(
      fetchGoogleDocBlocks(docId, 'md', {
        fetch: async () =>
          new Response('<html>Sign in</html>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }),
      }),
      /returned a sign-in page/,
    )
  })
})
