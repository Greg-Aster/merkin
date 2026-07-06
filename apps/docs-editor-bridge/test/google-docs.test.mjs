import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildGoogleDocTextExportUrl,
  convertGoogleDocTextToBlocks,
  extractGoogleDocId,
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

  it('deduplicates repeated heading IDs', () => {
    assert.deepEqual(
      convertGoogleDocTextToBlocks('# Notes\n\n# Notes').map((block) =>
        block.type === 'heading' ? block.id : '',
      ),
      ['notes', 'notes-2'],
    )
  })
})
