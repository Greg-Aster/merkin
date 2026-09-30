import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  rehypeBasePath,
  withBasePath,
} from '../src/plugins/rehype-base-path.mjs'

const base = '/merkin/ainekio/'

test('prefixes root-local URLs once and preserves anchors/queries', () => {
  assert.equal(
    withBasePath('/project-guide/#history', base),
    `${base}project-guide/#history`,
  )
  assert.equal(
    withBasePath('/assets/hero.webp?v=2', base),
    `${base}assets/hero.webp?v=2`,
  )
  assert.equal(withBasePath('/', base), base)
  assert.equal(
    withBasePath(`${base}project-guide/`, base),
    `${base}project-guide/`,
  )
  assert.equal(
    withBasePath('/merkin/ainekio#history', base),
    '/merkin/ainekio#history',
  )
  assert.equal(
    withBasePath('/merkin/ainekio?search=a', base),
    '/merkin/ainekio?search=a',
  )
  assert.equal(
    withBasePath('/merkin/ainekio-other/', base),
    `${base}merkin/ainekio-other/`,
  )
  assert.equal(
    withBasePath('/project-guide/', 'merkin/ainekio'),
    `${base}project-guide/`,
  )
})

test('leaves production root and non-root-local URLs untouched', () => {
  for (const value of ['/project-guide/', '/assets/hero.webp']) {
    assert.equal(withBasePath(value, '/'), value)
  }
  for (const value of [
    '#working-items',
    '../about/',
    'https://github.com/Greg-Aster/merkin',
    '//cdn.example/image.png',
    'mailto:test@example.org',
    'data:image/png;base64,abc',
  ]) {
    assert.equal(withBasePath(value, base), value)
  }
})

test('rewrites Markdown and literal MDX attributes without altering expressions', () => {
  const expression = {
    type: 'mdxJsxAttributeValueExpression',
    value: 'imageUrl',
  }
  const tree = {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: { href: '/posts/current-status/' },
        children: [],
      },
      {
        type: 'element',
        tagName: 'img',
        properties: { src: '/assets/hero.webp' },
        children: [],
      },
      {
        type: 'mdxJsxTextElement',
        name: 'a',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'href', value: '/project-guide/' },
        ],
        children: [],
      },
      {
        type: 'mdxJsxFlowElement',
        name: 'video',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'poster',
            value: '/assets/hero.webp',
          },
          { type: 'mdxJsxAttribute', name: 'src', value: expression },
        ],
        children: [],
      },
    ],
  }
  rehypeBasePath({ base })(tree)
  assert.equal(tree.children[0].properties.href, `${base}posts/current-status/`)
  assert.equal(tree.children[1].properties.src, `${base}assets/hero.webp`)
  assert.equal(tree.children[2].attributes[0].value, `${base}project-guide/`)
  assert.equal(tree.children[3].attributes[0].value, `${base}assets/hero.webp`)
  assert.equal(tree.children[3].attributes[1].value, expression)
})
