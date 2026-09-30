import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/googleDocContent.server.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source.replace('import.meta.url', JSON.stringify(import.meta.url)), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const realRequire = createRequire(import.meta.url)
const blocks = [{ type: 'paragraph', text: 'Verified document content.' }]
function load(preview, fetchBlocks) {
  const timeouts = []
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, URL, AbortController,
    process: { env: { MERKIN_DEV_PREVIEW: preview ? 'true' : '' } },
    console: { warn() {} },
    setTimeout(fn, ms) { timeouts.push(ms); if (ms < 10_000) queueMicrotask(fn); return 1 },
    clearTimeout() {},
    require(name) {
      if (name === '@merkin/docs-editor-bridge') return {
        fetchGoogleDocBlocks: fetchBlocks,
        googleDocBlocksToPlainText: () => 'Verified document content.',
      }
      if (name === 'reading-time') return () => ({ minutes: 1, words: 3 })
      return realRequire(name)
    },
  })
  return { load: exports.loadGoogleDocSnapshot, timeouts }
}
let calls = 0
const cached = load(true, async () => { calls++; return blocks })
const [a, b] = await Promise.all([cached.load('same'), cached.load('same')])
assert.equal(calls, 1)
assert.equal(a, b)
assert.equal(a.blocks, blocks)
assert.equal(cached.timeouts[0], 30_000)

calls = 0
const retried = load(true, async () => { if (++calls < 3) throw new Error('Google Docs export failed with 503.'); return blocks })
await retried.load('retry')
assert.equal(calls, 3)
assert.deepEqual(retried.timeouts, [30_000, 1_000, 30_000, 2_000, 30_000])

calls = 0
const failed = load(true, async () => { calls++; throw new Error('fetch failed') })
await assert.rejects(failed.load('failed'), /fetch failed/)
assert.equal(calls, 3)
await assert.rejects(failed.load('failed'), /fetch failed/)
assert.equal(calls, 6, 'Failures must not poison the cache')

calls = 0
const validation = load(true, async () => { calls++; return [{ type: 'heading', depth: 1, text: 'Invalid H1' }] })
await assert.rejects(validation.load('invalid'), /contains an H1/)
assert.equal(calls, 1, 'Content errors must not be retried')

calls = 0
const production = load(false, async () => { calls++; return blocks })
await production.load('prod'); await production.load('prod')
assert.equal(calls, 2, 'Production behavior must not gain preview caching')
assert.deepEqual(production.timeouts, [10_000, 10_000])
calls = 0
const prodFailure = load(false, async () => { calls++; throw new Error('fetch failed') })
await assert.rejects(prodFailure.load('prod'), /fetch failed/)
assert.equal(calls, 1, 'Production behavior must not gain preview retries')
console.log('Google Docs preview tests passed: memoization, concurrency, bounded retries, failure eviction, validation, production isolation')
