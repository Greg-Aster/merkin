import { z } from 'astro:content'

export const topicIds = ['overview', 'legs', 'body', 'control', 'perception', 'metahuman', 'v1'] as const
export const topics = {
  overview: { title: 'Understanding Ainekio', description: 'The project, its two robot designs, and how the systems fit together.', reference: 'project-overview' },
  legs: { title: 'Legs & gait', description: 'Linkage geometry, printed prototypes, movement ranges, and walking experiments.', reference: 'gait-development' },
  body: { title: 'Chassis, shell & power', description: 'Parts, packaging, weight, battery choices, and the evolving assembly.', reference: 'ainekio-v2' },
  control: { title: 'Firmware & connections', description: 'Body control, commands, safety, wired and wireless links.', reference: 'protocol-and-safety' },
  perception: { title: 'Vision, face & voice', description: 'Camera observations, target tracking, display, listening, and speech.', reference: 'vision-loop' },
  metahuman: { title: 'MetaHuman OS', description: 'Robot integration, workflows, trained models, and supervised actions.', reference: 'metahuman-integration' },
  v1: { title: 'Original eight-servo robot', description: 'The original documents, alternatives considered, and later V1 build reference.', reference: 'body-design-and-hardware' },
} satisfies Record<typeof topicIds[number], { title: string; description: string; reference: string }>
export const generations = { v1: 'V1 · 8 servos', v2: 'V2 · 12 servos', both: 'V1 + V2' }
export const kinds = { journal: 'Dated experiment', reference: 'Build reference', original: 'Original document' }

export const readingSchema = z.object({
  topic: z.enum(topicIds),
  generation: z.enum(['v1', 'v2', 'both']),
  kind: z.enum(['journal', 'reference', 'original']),
  next: z.string().min(1).optional(),
  related: z.array(z.string().min(1)).default([]),
})
export type Reading = z.infer<typeof readingSchema>
type ReadingPost = { slug: string; data: { reading?: Reading; title: string } }

export function getReading(post: ReadingPost): Reading {
  if (!post.data.reading) throw new Error(`Published article needs reading context: ${post.slug}`)
  return post.data.reading
}

export function validateReadingPaths(posts: ReadingPost[]) {
  const slugs = new Set(posts.map(post => post.slug))
  for (const post of posts) {
    const reading = getReading(post)
    for (const target of [reading.next, ...reading.related, topics[reading.topic].reference].filter(Boolean)) {
      if (!slugs.has(target!)) throw new Error(`${post.slug}: missing reading destination ${target}`)
    }
    if (reading.next === post.slug || reading.related.includes(post.slug)) {
      throw new Error(`${post.slug}: reading links must not point to the same article`)
    }
  }
}
