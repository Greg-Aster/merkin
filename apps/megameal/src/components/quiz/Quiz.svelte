
<script lang="ts">
import SharedQuiz from '@merkin/blog-core/components/quiz/Quiz.svelte'
import type { QuizLabels, QuizNode, QuizOutcome } from '@merkin/blog-core/types'
import { playSiteSfx } from '../../utils/site-sfx'

export let initialQuestion: string
export let nodes: Record<string, QuizNode>
export let outcomes: Record<string, QuizOutcome>

const megamealQuizLabels = {
  thinking: 'Analyzing your cosmic psyche...',
  restart: 'Retake Diagnostic',
} satisfies Partial<QuizLabels>
</script>

<SharedQuiz
  {initialQuestion}
  {nodes}
  {outcomes}
  labels={megamealQuizLabels}
  playSfx={playSiteSfx}
/>
