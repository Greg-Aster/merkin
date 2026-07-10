import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildGoogleDocMarkdownExportUrl,
  buildGoogleDocTextExportUrl,
  convertGoogleDocTextToBlocks,
  extractGoogleDocId,
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
          items: ['Servo', 'Camera'],
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
          items: ['Item one', 'Item two'],
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
      renderInlineMarkdown('**Part:** `ESP32` [Link](https://example.com) <bad>'),
      '<strong>Part:</strong> <code>ESP32</code> <a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a> &lt;bad&gt;',
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
})
