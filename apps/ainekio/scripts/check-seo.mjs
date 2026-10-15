import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const dist = path.resolve('dist')
const read = file => readFileSync(path.join(dist, file), 'utf8')
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(match => [match[1], match[2] ?? match[3] ?? match[4]]))
const metas = html => [...html.matchAll(/<meta\s[^>]*>/g)].map(match => attributes(match[0]))
const meta = (html, name) => metas(html).find(item => (item.name || item.property) === name)?.content
const title = html => html.match(/<title>(.*?)<\/title>/s)?.[1]
const errors = []
async function check(name, run) {
  try { await run(); console.log(`PASS ${name}`) }
  catch (error) { errors.push(name); console.error(`FAIL ${name}: ${error.message}`) }
}

await check('404 is a real page, excluded from indexing', () => {
  const html = read('404.html')
  assert.match(meta(html, 'robots'), /noindex/)
  assert.match(html, /Page not found/)
})
await check('one XML sitemap owner with an HTTP redirect for the alias', () => {
  const robots = read('robots.txt')
  assert.deepEqual(robots.match(/^Sitemap: .+$/gm), ['Sitemap: https://ainek.io/sitemap-index.xml'])
  assert.match(read('sitemap-index.xml'), /<sitemapindex\s/)
  assert.match(read('_redirects'), /^\/sitemap.xml\s+\/sitemap-index.xml\s+301$/m)
  assert.equal(existsSync(path.join(dist, 'sitemap.xml')), false)
  const sitemap = read('sitemap-0.xml')
  assert.doesNotMatch(sitemap, /\/(?:404|login|configs|new-post|friends|social)(?:\/|\.)/)
})
await check('homepage and pagination have descriptive, distinct metadata', () => {
  const home = read('index.html')
  assert.match(title(home), /robot companion/i)
  assert.match(meta(home, 'description'), /memory/i)
  assert.notEqual(title(home), meta(home, 'description'))
  const pages = readdirSync(dist).filter(name => /^\d+$/.test(name))
  const titles = [title(home), ...pages.map(page => title(read(`${page}/index.html`)))]
  assert.equal(new Set(titles).size, titles.length)
})
await check('all topic archives have unique titles and descriptions', () => {
  const titles = [], descriptions = []
  for (const kind of ['tag', 'category']) {
    for (const topic of readdirSync(path.join(dist, 'archive', kind))) {
      const html = read(`archive/${kind}/${topic}/index.html`)
      titles.push(title(html)); descriptions.push(meta(html, 'description'))
    }
  }
  assert.equal(new Set(titles).size, titles.length)
  assert.equal(new Set(descriptions).size, descriptions.length)
})
await check('sharing images are raster files with accurate dimensions', async () => {
  const files = readdirSync(dist, { recursive: true }).filter(file => file.endsWith('.html'))
  const checked = new Set()
  for (const file of files) {
    const html = read(file)
    const image = meta(html, 'og:image')
    if (!image) continue
    assert.equal(meta(html, 'twitter:image'), image, file)
    assert.equal(metas(html).filter(item => item.property === 'og:image').length, 1, file)
    assert.equal(metas(html).filter(item => item.property === 'article:published_time').length <= 1, true, file)
    const key = `${image}:${meta(html, 'og:image:width')}:${meta(html, 'og:image:height')}`
    if (checked.has(key)) continue
    const asset = new URL(image)
    assert.equal(asset.origin, 'https://ainek.io', file)
    const info = await sharp(path.join(dist, decodeURIComponent(asset.pathname))).metadata()
    assert.ok(['jpeg', 'png'].includes(info.format), `${file}: ${info.format}`)
    assert.equal(Number(meta(html, 'og:image:width')), info.width, file)
    assert.equal(Number(meta(html, 'og:image:height')), info.height, file)
    checked.add(key)
  }
  assert.ok(checked.size > 10, 'Expected article-specific sharing images')
  console.log(`Checked ${checked.size} distinct image/dimension combinations`)
})
if (errors.length) process.exitCode = 1
