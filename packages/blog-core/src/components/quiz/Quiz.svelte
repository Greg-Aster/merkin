<script lang="ts">
import { onMount } from 'svelte'
import { cubicOut, elasticOut } from 'svelte/easing'
import { fly, scale } from 'svelte/transition'
import type {
  QuizLabels,
  QuizNode,
  QuizOutcome,
  QuizSfxId,
} from '../../types/quiz'

import '../../styles/quiz/quiz.css'

export let initialQuestion: string
export let nodes: Record<string, QuizNode>
export let outcomes: Record<string, QuizOutcome>
export let estimatedQuestionCount = 12
export let thinkingDelayMs = 1200
export let labels: Partial<QuizLabels> = {}
export let playSfx: ((id: QuizSfxId) => void) | undefined = undefined

const defaultLabels: QuizLabels = {
  questionPrefix: 'Question',
  progressPrefix: 'Progress',
  selectAnswer: 'Select an Answer',
  continueLabel: 'Continue...',
  thinking: 'Analyzing your answers...',
  traitSummary: 'Trait Analysis',
  restart: 'Retake',
  missingQuestion: 'Question not found.',
}

let quizState: 'asking' | 'thinking' | 'completed' = 'asking'
let currentNodeId: string = initialQuestion
let selectedAnswerIndex: number | null = null
let userTraits: string[] = []
let finalOutcome: QuizOutcome | null = null
let traitCounts: Record<string, number> = {}
let questionNumber = 1
const traitPalette = [
  'linear-gradient(135deg, rgba(255, 99, 132, 0.9), rgba(255, 159, 64, 0.82))',
  'linear-gradient(135deg, rgba(54, 162, 235, 0.9), rgba(75, 192, 192, 0.82))',
  'linear-gradient(135deg, rgba(255, 206, 86, 0.9), rgba(255, 159, 64, 0.82))',
  'linear-gradient(135deg, rgba(153, 102, 255, 0.9), rgba(201, 90, 255, 0.82))',
  'linear-gradient(135deg, rgba(75, 192, 192, 0.9), rgba(88, 226, 166, 0.82))',
  'linear-gradient(135deg, rgba(255, 159, 64, 0.9), rgba(255, 99, 132, 0.82))',
]

$: resolvedLabels = { ...defaultLabels, ...labels }
$: currentNode = nodes[currentNodeId] || null
$: progressPercentage = Math.min(
  (questionNumber / Math.max(estimatedQuestionCount, 1)) * 100,
  100,
)
$: traitEntries = Object.entries(traitCounts).sort(
  ([, left], [, right]) => right - left,
)
$: maxTraitCount = traitEntries[0]?.[1] ?? 1

function emitSfx(id: QuizSfxId) {
  playSfx?.(id)
}

function validateCurrentNode() {
  if (!nodes[currentNodeId]) {
    console.error(`Node '${currentNodeId}' not found in quiz nodes`)
    currentNodeId = initialQuestion
  }
}

function handleAnswerSelect(index: number) {
  selectedAnswerIndex = index
}

function handleNext() {
  if (selectedAnswerIndex === null || !currentNode) {
    emitSfx('error')
    return
  }

  const chosenOption = currentNode.options[selectedAnswerIndex]
  if (!chosenOption) {
    console.error('Invalid quiz option selected')
    emitSfx('error')
    return
  }

  quizState = 'thinking'
  setTimeout(() => {
    if (chosenOption.trait) {
      userTraits.push(chosenOption.trait)
    }

    if (chosenOption.next.startsWith('OUTCOME_')) {
      calculateResult(chosenOption.next)
      emitSfx('success')
      quizState = 'completed'
    } else if (nodes[chosenOption.next]) {
      currentNodeId = chosenOption.next
      selectedAnswerIndex = null
      questionNumber++
      validateCurrentNode()
      emitSfx('sweep')
      quizState = 'asking'
    } else {
      console.error(`Next quiz node '${chosenOption.next}' not found`)
      calculateResult('OUTCOME_DEFAULT')
      emitSfx('warning')
      quizState = 'completed'
    }
  }, thinkingDelayMs)
}

function calculateResult(finalOutcomeKey: string) {
  traitCounts = userTraits.reduce(
    (acc, trait) => {
      acc[trait] = (acc[trait] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  finalOutcome = outcomes[finalOutcomeKey] || outcomes['OUTCOME_DEFAULT']
}

function getTraitBarStyle(index: number, value: number) {
  const width = Math.max((value / maxTraitCount) * 100, 14)
  return `width: ${width}%; background: ${traitPalette[index % traitPalette.length]};`
}

function handleRestart() {
  quizState = 'asking'
  currentNodeId = initialQuestion
  selectedAnswerIndex = null
  userTraits = []
  finalOutcome = null
  traitCounts = {}
  questionNumber = 1
  validateCurrentNode()
}

onMount(() => {
  validateCurrentNode()
})
</script>

<div class="card-base p-6 md:p-8 quiz-container">
  {#if quizState === 'asking'}
    <div class="quiz-progress-section mb-8">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-75 quiz-counter">{resolvedLabels.questionPrefix} {questionNumber}</span>
        <span class="text-sm text-75">{resolvedLabels.progressPrefix}: {Math.round(progressPercentage)}%</span>
      </div>
      <div class="quiz-progress-track">
        <div class="quiz-progress-bar" style="width: {progressPercentage}%"></div>
        <div class="quiz-progress-glow" style="width: {progressPercentage}%"></div>
      </div>
    </div>

    {#if currentNode}
      {#key currentNodeId}
        <div
          in:fly={{ y: 50, duration: 600, easing: cubicOut, delay: 300 }}
          out:fly={{ y: -50, duration: 300, easing: cubicOut }}
          class="quiz-question">
          <div class="quiz-question-header">
            <h2 class="text-2xl md:text-3xl font-bold mt-2 text-90 quiz-question-text">{currentNode.text}</h2>
          </div>

          <div class="flex flex-col gap-3 my-8">
            {#each currentNode.options as option, i}
              <button
                type="button"
                class="card-base2 text-75 btn-quiz-option quiz-option"
                class:selected={selectedAnswerIndex === i}
                data-sfx-hover="hover-emphasis"
                data-sfx-click="select"
                on:click={() => handleAnswerSelect(i)}
                in:fly={{ x: -100, duration: 400, delay: 400 + (i * 100), easing: cubicOut }}>
                <span class="quiz-option-number">{String.fromCharCode(65 + i)}</span>
                <span class="quiz-option-text">{option.text}</span>
              </button>
            {/each}
          </div>
        </div>
      {/key}
    {:else}
      <div class="text-center text-red-400">
        {resolvedLabels.missingQuestion} <button type="button" class="quiz-button" data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={handleRestart}>{resolvedLabels.restart}</button>
      </div>
    {/if}

    <button
      type="button"
      class="quiz-button w-full mt-6 quiz-submit"
      class:pulsing={selectedAnswerIndex !== null}
      data-sfx-hover="hover-emphasis"
      data-sfx-click="panel-open"
      on:click={handleNext}
      disabled={selectedAnswerIndex === null}>
      {selectedAnswerIndex !== null ? resolvedLabels.continueLabel : resolvedLabels.selectAnswer}
    </button>
  {:else if quizState === 'thinking'}
    <div class="quiz-thinking" in:scale={{ duration: 400, easing: elasticOut }}>
      <div class="quiz-thinking-mark">
        <div class="quiz-thinking-pulse"></div>
        <div class="quiz-thinking-pulse delay-1"></div>
        <div class="quiz-thinking-pulse delay-2"></div>
      </div>
      <h3 class="text-2xl font-bold text-center mt-6 text-90">{resolvedLabels.thinking}</h3>
      <div class="quiz-thinking-dots">
        <span>.</span><span>.</span><span>.</span>
      </div>
    </div>
  {:else if finalOutcome}
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-4" style="color: var(--primary)">
        {#if finalOutcome.emoji}
          <span class="text-4xl mr-2">{finalOutcome.emoji}</span>
        {/if}
        {finalOutcome.title}
      </h2>

      {#if traitEntries.length > 0}
        <div class="trait-summary my-6 max-w-md mx-auto">
          <div class="trait-summary-title">{resolvedLabels.traitSummary}</div>
          <div class="trait-summary-list">
            {#each traitEntries as [trait, value], index}
              <div class="trait-row">
                <div class="trait-row-label">
                  <span class="trait-name">{trait}</span>
                  <span class="trait-value">{value}</span>
                </div>
                <div class="trait-track">
                  <div
                    class="trait-bar"
                    style={getTraitBarStyle(index, value)}
                  ></div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <p class="text-lg text-75 mb-6 whitespace-pre-line">{finalOutcome.description}</p>
      <button type="button" class="quiz-button" data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={handleRestart}>
        {resolvedLabels.restart}
      </button>
    </div>
  {/if}
</div>
