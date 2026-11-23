#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const [distDirArg, siteUrlArg, keyArg] = process.argv.slice(2)
if (!distDirArg || !siteUrlArg || !keyArg) {
  console.error('Usage: node scripts/ping-indexnow.mjs <dist-dir> <site-url> <key>')
  process.exit(64)
}

const distDir = path.resolve(distDirArg)
const siteUrl = new URL(siteUrlArg)
const keyFile = path.join(distDir, `${keyArg}.txt`)

if (!fs.existsSync(keyFile)) {
  console.error(`IndexNow key file missing from build output: ${keyFile}`)
  process.exit(1)
}

const sitemapFiles = fs
  .readdirSync(distDir)
  .filter(name => /^sitemap-\d+\.xml$/.test(name))
  .sort()

const urls = new Set()
for (const file of sitemapFiles) {
  const xml = fs.readFileSync(path.join(distDir, file), 'utf8')
  const locRe = /<loc>([^<]+)<\/loc>/g
  let m
  while ((m = locRe.exec(xml)) !== null) {
    if (m[1].startsWith(siteUrl.origin)) {
      urls.add(m[1].trim())
    }
  }
}

// Include machine-readable discovery endpoints alongside HTML sitemap pages
for (const extra of ['/rss.xml', '/llms.txt', '/llms-full.txt']) {
  if (fs.existsSync(path.join(distDir, extra.slice(1)))) {
    urls.add(new URL(extra, siteUrl.origin).href)
  }
}

const urlList = [...urls]
if (urlList.length === 0) {
  console.warn('No URLs discovered in sitemap; skipping IndexNow ping.')
  process.exit(0)
}

const payload = {
  host: siteUrl.host,
  key: keyArg,
  keyLocation: new URL(`/${keyArg}.txt`, siteUrl.origin).href,
  urlList,
}

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  if (res.ok || res.status === 202) {
    console.log(`IndexNow accepted ${urlList.length} URLs for ${siteUrl.host} (HTTP ${res.status}).`)
  } else {
    console.warn(`IndexNow returned HTTP ${res.status} for ${siteUrl.host}: ${text.slice(0, 300)}`)
  }
} catch (err) {
  console.warn(`IndexNow ping warning (non-fatal): ${err instanceof Error ? err.message : String(err)}`)
}
