import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = fileURLToPath(new URL('..', import.meta.url))
const dist = path.join(app, 'dist')
const base =
  `/${(process.env.SITE_BASE || '/').split('/').filter(Boolean).join('/')}/`.replace(
    /\/+/g,
    '/',
  )
const sitePath = pathname => `${base}${pathname.replace(/^\/+/, '')}`
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
  attributeValues(home, 'href').includes(sitePath('/project-guide/')),
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
      sitePath('/project-guide/'),
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
    assert.ok(
      pathname.startsWith(base),
      `Local link escapes SITE_BASE: ${href}`,
    )
    const target = path.join(dist, pathname.slice(base.length))
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
      sitePath('/project-guide/#original-ainekio-and-ainekio-v2'),
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

// Check all rendered local links/assets on the entry points, including shared
// navigation, image wrappers, hydration modules and stylesheet URLs.
for (const [route, html] of [
  ['/', home],
  ['/project-guide/', guide],
  ['/about/', readFileSync(path.join(dist, 'about/index.html'), 'utf8')],
]) {
  for (const attribute of ['href', 'src', 'component-url', 'renderer-url']) {
    for (const value of attributeValues(html, attribute)) {
      if (!value.startsWith('/') || value.startsWith('//')) continue
      assert.ok(
        value.startsWith(base),
        `${route}: ${attribute} escapes SITE_BASE: ${value}`,
      )
      const pathname = decodeURIComponent(value.split(/[?#]/)[0])
      // These targets are missing on production too. Still check their base prefix.
      if (
        ['/privacy/', '/thumb/favicon-dark-180.png'].some(
          missing => pathname === sitePath(missing),
        )
      )
        continue
      const target = path.join(dist, pathname.slice(base.length))
      assert.ok(
        existsSync(target) || existsSync(path.join(target, 'index.html')),
        `${route}: missing ${attribute} target: ${value}`,
      )
    }
  }
}
const rssLink = [...home.matchAll(/<link\b[^>]*>/g)].find(match =>
  attributeValues(match[0], 'type').includes('application/rss+xml'),
)
assert.ok(rssLink, 'RSS discovery link must render')
assert.equal(
  new URL(attributeValues(rssLink[0], 'href')[0]).pathname,
  sitePath('/rss.xml'),
  'RSS discovery must honor SITE_BASE',
)
assert.ok(
  attributeValues(home, 'href').includes(sitePath('/2/')),
  'Numbered pagination must honor SITE_BASE',
)
assert.ok(
  home.includes(sitePath('/pagefind/pagefind.js')),
  'Pagefind loader must honor SITE_BASE',
)
assert.ok(
  existsSync(path.join(dist, 'pagefind/pagefind.js')),
  'Pagefind index must be built',
)
assert.ok(
  attributeValues(home, 'src').includes(sitePath('/assets/ainekio/hero.webp')),
  'Homepage hero must honor SITE_BASE',
)

// A successful CSS request is not enough: the shared layout must also include
// this app's global theme and component styles, not just Tailwind utilities.
for (const [route, html] of [
  ['/', home],
  ['/project-guide/', guide],
  ...['about', 'updates', '2', 'posts/project-overview'].map(route => [
    `/${route}/`,
    readFileSync(path.join(dist, route, 'index.html'), 'utf8'),
  ]),
]) {
  const stylesheetLinks = [...html.matchAll(/<link\b[^>]*>/g)]
    .filter(match => attributeValues(match[0], 'rel').includes('stylesheet'))
    .flatMap(match => attributeValues(match[0], 'href'))
  assert.ok(stylesheetLinks.length, `${route}: page must link its stylesheets`)
  const css = stylesheetLinks
    .filter(href => href.startsWith(base))
    .map(href => {
      const pathname = decodeURIComponent(href.split(/[?#]/)[0])
      return readFileSync(path.join(dist, pathname.slice(base.length)), 'utf8')
    })
    .join('\n')
  for (const themeSelector of [':root', ':root.dark']) {
    const theme = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(match =>
        match[1]
          .split(',')
          .map(value => value.trim())
          .includes(themeSelector),
      )
      .map(match => match[2])
      .join('\n')
    for (const variable of [
      'page-bg',
      'primary',
      'card-bg',
      'btn-regular-bg',
    ]) {
      assert.match(
        theme,
        new RegExp(`--${variable}\\s*:\\s*[^;{}]+`),
        `${route}: ${themeSelector} missing theme variable definition --${variable}`,
      )
    }
  }
  for (const selector of ['card-base', 'float-panel', 'float-panel-closed']) {
    assert.match(
      css,
      new RegExp(`\\.${selector}\\s*\\{`),
      `${route}: missing global component selector .${selector}`,
    )
  }
  const closedPanel = css.match(/\.float-panel-closed\s*\{([^}]+)\}/)?.[1]
  assert.match(closedPanel, /opacity:\s*0(?:;|$)/, `${route}: panels must hide`)
  assert.match(
    closedPanel,
    /pointer-events:\s*none(?:;|$)/,
    `${route}: closed panels must not intercept clicks`,
  )
}

// The current entry points must surface the new note without redating history.
const latestRoute = '/posts/q6a-chassis-and-active-loop/'
const latest = readFileSync(path.join(dist, latestRoute, 'index.html'), 'utf8')
const updates = readFileSync(path.join(dist, 'updates/index.html'), 'utf8')
for (const [route, html] of [
  ['/', home],
  ['/project-guide/', guide],
  ['/updates/', updates],
  [
    '/posts/current-status/',
    readFileSync(path.join(dist, 'posts/current-status/index.html'), 'utf8'),
  ],
]) {
  assert.ok(
    attributeValues(html, 'href').includes(sitePath(latestRoute)),
    `${route}: must link to the latest field note`,
  )
}
assert.match(
  home,
  /Updated 30 Sep 2026/,
  'Homepage date must reflect the update',
)
assert.match(
  latest,
  /YOLO/,
  'Latest note must cover the current perception work',
)
assert.match(
  latest,
  /not been flashed/,
  'Keep offline checks distinct from body tests',
)
assert.match(latest, /remains supported/, 'Keep the original robot supported')
assert.match(
  updates,
  /Ainekio Updates/,
  'Updates page must identify this project',
)
assert.doesNotMatch(
  updates,
  /Temporal Flow Updates/,
  'Do not use template update metadata',
)
assert.match(
  readFileSync(path.join(app, 'src/content/posts/Current-Status.mdx'), 'utf8'),
  /updated: 2026-08-27/,
  'Preserve the historical status date',
)

console.log(
  `Project Index smoke checks passed at ${base} (${ids.size} anchors, ${hrefs.length} links).`,
)
