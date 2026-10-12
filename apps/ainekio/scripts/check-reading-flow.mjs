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
const articles = files(path.join(dist, 'posts')).filter(file => file.endsWith('/index.html')).map(file => ({file,html:readFileSync(file,'utf8')})).filter(({html})=>/data-reading-path/.test(html))
assert.ok(articles.length >= 41, 'Published and restored articles must remain available')
for (const {file,html} of articles) {
  assert.match(html, /aria-label="?Breadcrumb/, `${file}: reader needs topic context`)
  assert.match(html, /data-post-date=/, `${file}: preserve the observation date`)
  assert.match(html, /V1|V2/, `${file}: identify the robot version`)
  const next = html.match(/<a\b[^>]*data-reading-next[^>]*>/)?.[0]
  if (next) {
    const destination = attribute(next, 'href')
    assert.ok(articles.some(article=>route(path.relative(path.join(dist,'posts'),path.dirname(article.file)))===destination), `${file}: next step must reach a published article`)
  }
  assert.ok(links(html).some(href=>href?.startsWith(`${base}archive/?topic=`)), `${file}: needs a way back to its topic`)
}
const legStory = ['2026-09-09-leg-mechanism-study','2026-09-15-leg-prototypes','2026-09-21-compact-leg-design','2026-10-06-compact-linkage','2026-10-08-standing-walking']
for (let i=0;i<legStory.length-1;i++) {
  const next=page(`posts/${legStory[i]}`).match(/<a\b[^>]*data-reading-next[^>]*>/)?.[0]
  assert.equal(attribute(next || '', 'href'),route(legStory[i+1]),'Leg development must continue within its build story')
}
for (const slug of ['firmware','software','discussion','robot-familiar-parts-overview','archive/project-overview','archive/broad-strokes','archive/motion-systems','archive/first-steps-work-in-progress']) {
  assert.match(page(`posts/${slug}`),/docs\.google\.com\/document\/d\//,`${slug}: retain original source access`)
}
const home=page('')
assert.doesNotMatch(home,/home-library-entry/,'Homepage must not repeat the entire archive')
assert.ok(links(home).includes(`${base}archive/`),'Homepage must still expose every article')
assert.ok(links(home).includes(route('v1-original-posts')),'Original V1 must remain prominent')
const library=page('archive')
assert.equal((library.match(/<article\b[^>]*data-library-entry/g)||[]).length,articles.length,'Library must include every published article')
for (const name of ['topic','generation','kind','q']) assert.match(library,new RegExp(`name=(?:"${name}"|${name}(?=[\\s>]))`),`Missing library filter: ${name}`)
assert.ok(links(page('updates')).includes(`${base}project-guide/`),'Development tracker must remain reachable from the journal')
console.log(`Reading flow checks passed: ${articles.length} articles, original sources, leg sequence, and library coverage.`)
