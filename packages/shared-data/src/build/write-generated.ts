import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildGameStarsManifest } from './build-game-stars-manifest.ts'
import { buildPostsManifest } from './build-posts-manifest.ts'
import { buildTimelineManifest } from './build-timeline-manifest.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedDataRoot = path.resolve(__dirname, '../..')
const repoRoot = path.resolve(sharedDataRoot, '../..')
const generatedRoot = path.join(sharedDataRoot, 'generated')
const megamealPostsRoot = path.join(repoRoot, 'apps/megameal/src/content/posts')

async function writeJsonFile(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function main() {
  await mkdir(generatedRoot, { recursive: true })

  const postsManifest = await buildPostsManifest(megamealPostsRoot)
  const timelineManifest = buildTimelineManifest(postsManifest, {
    includeBanners: true,
  })
  const gameStarsManifest = buildGameStarsManifest(timelineManifest)

  await Promise.all([
    writeJsonFile(path.join(generatedRoot, 'posts.json'), postsManifest),
    writeJsonFile(path.join(generatedRoot, 'timeline.json'), timelineManifest),
    writeJsonFile(path.join(generatedRoot, 'game-stars.json'), gameStarsManifest),
  ])

  console.log(
    `Generated shared data: ${postsManifest.count} posts, ${timelineManifest.count} timeline events, ${gameStarsManifest.count} game stars`,
  )
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
