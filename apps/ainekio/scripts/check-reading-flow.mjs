import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const base = `/${(process.env.SITE_BASE || '/').split('/').filter(Boolean).join('/')}/`.replace(/\/+/g, '/')
const route = slug => `${base}posts/${slug}/`
const page = slug => readFileSync(path.join(dist, slug, 'index.html'), 'utf8')
const attribute = (tag, name) => {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`))
  return match?.[1] ?? match?.[2] ?? match?.[3]
}
const links = html => [...html.matchAll(/<a\b[^>]*>/g)].map(([tag]) => attribute(tag, 'href'))
const files = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)])
const articles = files(path.join(dist, 'posts')).filter(file => file.endsWith('/index.html')).map(file => ({ file, html: readFileSync(file, 'utf8') })).filter(({ html }) => /data-reading-path/.test(html))

assert.ok(articles.length >= 38, `Expected at least 38 consolidated articles, found ${articles.length}`)

const retiredPaths = [
  `${base}project-guide/`,
  `${base}posts/current-status/`,
  `${base}posts/2026-09-21-chassis-packaging/`,
  `${base}posts/2026-09-21-shell-design/`,
  `${base}posts/2026-09-28-wired-wireless-ros2/`,
  `${base}posts/2026-10-06-lighter-rebuild/`,
  `${base}posts/2026-10-06-steering-sensing-connections/`,
  `${base}posts/2026-10-08-responsive-commands/`,
  `${base}posts/2026-10-08-face-and-media/`,
  `${base}posts/2026-10-12-yoloe-tracking/`,
  `${base}posts/2026-10-12-trained-specialists/`,
  `${base}posts/2026-10-14-body-events/`,
  `${base}posts/2026-10-14-recording-and-updates/`,
  `${base}posts/2026-10-14-speech-and-task-training/`,
  `${base}posts/2026-10-15-motion-and-leveling/`,
  `${base}posts/2026-10-15-locomotion-goals/`,
  `${base}posts/2026-10-15-learning-diagnostics/`,
  `${base}posts/2026-10-18-metahuman-models-and-execution/`,
  `${base}posts/2026-10-21-learning-from-walking/`,
  `${base}posts/2026-10-21-reactions-and-recovery/`,
  `${base}posts/2026-10-26-body-power-and-training-stand/`,
  `${base}posts/2026-10-26-metahuman-continuity/`,
  `${base}posts/2026-10-27-finite-motion-and-recovery/`,
  `${base}posts/2026-11-01-body-prototype/`,
  `${base}posts/2026-11-01-metahuman-connections/`,
]

for (const { file, html } of articles) {
  assert.match(html, /aria-label="?Breadcrumb/, `${file}: reader needs topic context`)
  assert.match(html, /data-post-date=/, `${file}: preserve the observation date`)
  assert.match(html, /V1|V2/, `${file}: identify the robot version`)
  const next = html.match(/<a\b[^>]*data-reading-next[^>]*>/)?.[0]
  if (next) {
    const destination = attribute(next, 'href')
    assert.ok(articles.some(article => route(path.relative(path.join(dist, 'posts'), path.dirname(article.file))) === destination), `${file}: next step must reach a published article (${destination})`)
  }
  const pageLinks = links(html)
  assert.ok(pageLinks.some(href => href?.startsWith(`${base}archive/?topic=`)), `${file}: needs a way back to its topic`)
  for (const href of pageLinks) {
    if (!href) continue
    const cleanHref = href.split('#')[0]
    assert.ok(!retiredPaths.includes(cleanHref), `${file}: links to retired route ${href}`)
  }
}

const journalChain = [
  '2026-09-09-leg-mechanism-study',
  '2026-09-10-v2-body-design',
  '2026-09-15-leg-prototypes',
  '2026-09-21-compact-leg-design',
  '2026-09-24-body-and-battery',
  '2026-09-28-compact-body',
  '2026-10-06-compact-linkage',
  '2026-10-08-standing-walking',
  '2026-10-12-shell-power-and-motion',
  '2026-10-14-startup-and-leveling',
  '2026-10-15-companion-systems',
  '2026-10-18-servo-feedback-and-chassis',
  '2026-10-21-body-face-and-standing',
  '2026-10-26-freestyle-targets-and-training',
  '2026-11-01-neural-walking',
  '2026-11-06-carpet-trials-rl-and-big-brother',
  '2026-11-11-on-chip-neural-gait-and-ainekio-os',
  'project-overview',
]

for (let i = 0; i < journalChain.length - 1; i++) {
  const next = page(`posts/${journalChain[i]}`).match(/<a\b[^>]*data-reading-next[^>]*>/)?.[0]
  assert.equal(attribute(next || '', 'href'), route(journalChain[i + 1]), `Journal milestone ${journalChain[i]} must advance to ${journalChain[i + 1]}`)
}

for (const slug of ['firmware', 'software', 'discussion', 'robot-familiar-parts-overview', 'archive/project-overview', 'archive/broad-strokes', 'archive/motion-systems', 'archive/first-steps-work-in-progress']) {
  assert.match(page(`posts/${slug}`), /docs\.google\.com\/document\/d\//, `${slug}: retain original source access`)
}

const home = page('')
assert.doesNotMatch(home, /home-library-entry/, 'Homepage must not repeat the entire archive')
assert.ok(links(home).includes(`${base}archive/`), 'Homepage must expose the article library')
assert.ok(links(home).includes(route('v1-original-posts')), 'Original V1 must remain prominent')
assert.ok(links(home).includes(route('project-overview')), 'System overview must be reachable from homepage')

const library = page('archive')
assert.equal((library.match(/<article\b[^>]*data-library-entry/g) || []).length, articles.length, 'Library must include every published article')
for (const name of ['topic', 'generation', 'kind', 'q']) assert.match(library, new RegExp(`name=(?:"${name}"|${name}(?=[\\s>]))`), `Missing library filter: ${name}`)

const updatesHtml = page('updates')
assert.ok(links(updatesHtml).includes(route('project-overview')), 'System overview must be reachable from the journal')

console.log(`Reading flow checks passed: ${articles.length} articles, unbroken 17-milestone journal sequence, original V1 sources, and library coverage.`)
