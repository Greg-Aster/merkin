import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = fileURLToPath(new URL('..', import.meta.url))
const dist = path.join(app, 'dist')
const guide = readFileSync(path.join(dist, 'project-guide/index.html'), 'utf8')
const home = readFileSync(path.join(dist, 'index.html'), 'utf8')
const source = readFileSync(
  path.join(app, 'src/content/spec/project-guide.md'),
  'utf8',
)

assert.match(guide, /Ainekio Project Index/, 'Guide title must render')
assert.match(guide, /data-pagefind-body/, 'Guide must be search-indexable')
const attributeValues = (html, name) =>
  [
    ...html.matchAll(
      new RegExp(`\\b${name}=(?:"([^"<>]*)"|'([^'<>]*)'|([^\\s>]+))`, 'g'),
    ),
  ].map(match => match[1] ?? match[2] ?? match[3])

assert.ok(
  attributeValues(home, 'href').includes('/project-guide/'),
  'Home must link to guide',
)
for (const id of ['standard-nav', 'default-links']) {
  const opening = new RegExp(
    `<div\\b[^>]*\\bid=(?:"${id}"|'${id}'|${id}(?=[\\s>]))[^>]*>`,
    'g',
  ).exec(guide)
  assert.ok(opening, `Missing navigation region: ${id}`)
  const start = opening.index + opening[0].length
  let depth = 1
  let end = start
  for (const tag of guide.slice(start).matchAll(/<\/?div\b[^>]*>/g)) {
    depth += tag[0].startsWith('</') ? -1 : 1
    if (depth === 0) {
      end = start + tag.index
      break
    }
  }
  assert.ok(end > start, `Unclosed navigation region: ${id}`)
  assert.ok(
    attributeValues(guide.slice(start, end), 'href').includes(
      '/project-guide/',
    ),
    `${id} must link to guide`,
  )
}
assert.match(
  source,
  /Updated \d{1,2} \w+ \d{4}/,
  'Content needs an observation date',
)
assert.doesNotMatch(
  guide,
  /exact file location|exact route.*chosen|Proposed canonical home|Draft for review/,
  'Editorial scaffolding must not ship',
)
assert.equal((guide.match(/<h1\b/g) || []).length, 1, 'Use one page heading')

const ids = new Set(attributeValues(guide, 'id'))
const article = guide.match(
  /<article\b[^>]*\bproject-guide\b[^>]*>([\s\S]*?)<\/article>/,
)?.[1]
assert.ok(article, 'Project Index article must render')
const hrefs = [...article.matchAll(/<a\b[^>]*>/g)].flatMap(match =>
  attributeValues(match[0], 'href'),
)
for (const href of hrefs) {
  if (href.startsWith('#') && href.length > 1) {
    assert.ok(
      ids.has(decodeURIComponent(href.slice(1))),
      `Missing anchor: ${href}`,
    )
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    const pathname = href.split(/[?#]/)[0]
    const target = path.join(dist, pathname)
    assert.ok(
      existsSync(target) || existsSync(path.join(target, 'index.html')),
      `Missing built local target: ${href}`,
    )
  }
}
for (const repo of ['metahuman-os', 'Ainekio-bot', 'merkin']) {
  assert.ok(
    hrefs.some(href =>
      href.startsWith(`https://github.com/Greg-Aster/${repo}`),
    ),
    `Missing repository: ${repo}`,
  )
}
assert.ok(ids.has('working-items'), 'Working items need a stable heading')
assert.ok(
  ids.has('plans-audits-and-code'),
  'Document map needs a stable heading',
)

assert.ok(
  ids.has('original-ainekio-and-ainekio-v2'),
  'Evolution context needs a stable anchor',
)
assert.match(source, /available S3 pins/, 'Explain the reason for exploring v2')
assert.match(
  source,
  /It remains a supported design/,
  'Preserve support for the original',
)
for (const slug of [
  'project-overview',
  'current-status',
  'controller-firmware',
  'body-design-and-hardware',
]) {
  const html = readFileSync(
    path.join(dist, 'posts', slug, 'index.html'),
    'utf8',
  )
  assert.ok(
    attributeValues(html, 'href').includes(
      '/project-guide/#original-ainekio-and-ainekio-v2',
    ),
    `Missing history context link: ${slug}`,
  )
}

assert.ok(ids.has('recorded-complete'), 'Separate recorded completed work')
assert.match(source, /Next action/, 'Working items must identify a next action')
assert.match(source, /Recheck/, 'Dated findings must have explicit uncertainty')
assert.match(source, /Sep 29 repair/, 'Include recorded completed work')
assert.doesNotMatch(
  source,
  /## (Three repositories|Explore the project|Contribute or continue work|Proposed order of work)/,
  'Do not restore presentation sections',
)

console.log(
  `Project Index smoke checks passed (${ids.size} anchors, ${hrefs.length} links).`,
)
