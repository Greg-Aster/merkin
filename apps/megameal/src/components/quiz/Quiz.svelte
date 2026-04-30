
<script lang="ts">
import { onMount } from 'svelte'
import { cubicOut, elasticOut } from 'svelte/easing'
import { fly, scale } from 'svelte/transition'
import { playSiteSfx } from '../../utils/site-sfx'

import '../../styles/features/extracted/quiz.css'
// Props for the new graph-based quiz structure
export let initialQuestion: string
export let nodes: Record<
  string,
  { text: string; options: { text: string; trait?: string; next: string }[] }
>
export let outcomes: Record<
  string,
  { title: string; description: string; emoji?: string }
>

// State Management
let quizState: 'asking' | 'thinking' | 'completed' = 'asking'
let currentNodeId: string = initialQuestion
let selectedAnswerIndex: number | null = null
let userTraits: string[] = []
let finalOutcome: {
  title: string
  description: string
  emoji?: string
} | null = null
let traitCounts: Record<string, number> = {}
let questionNumber: number = 1
let showThinking: boolean = false
const traitPalette = [
  'linear-gradient(135deg, rgba(255, 99, 132, 0.9), rgba(255, 159, 64, 0.82))',
  'linear-gradient(135deg, rgba(54, 162, 235, 0.9), rgba(75, 192, 192, 0.82))',
  'linear-gradient(135deg, rgba(255, 206, 86, 0.9), rgba(255, 159, 64, 0.82))',
  'linear-gradient(135deg, rgba(153, 102, 255, 0.9), rgba(201, 90, 255, 0.82))',
  'linear-gradient(135deg, rgba(75, 192, 192, 0.9), rgba(88, 226, 166, 0.82))',
  'linear-gradient(135deg, rgba(255, 159, 64, 0.9), rgba(255, 99, 132, 0.82))',
]

// Computed values for progress bar and question node
$: currentNode = nodes[currentNodeId] || null
$: progressPercentage = Math.min((questionNumber / 12) * 100, 100)
$: traitEntries = Object.entries(traitCounts).sort(
  ([, left], [, right]) => right - left,
)
$: maxTraitCount = traitEntries[0]?.[1] ?? 1

// Safety check function (non-reactive)
function validateCurrentNode() {
  if (!nodes[currentNodeId]) {
    console.error(`Node '${currentNodeId}' not found in nodes object`)
    currentNodeId = initialQuestion // fallback to initial question
  }
}

function handleAnswerSelect(index: number) {
  selectedAnswerIndex = index
}

function handleNext() {
  if (selectedAnswerIndex === null || !currentNode) {
    playSiteSfx('error')
    return
  }

  const chosenOption = currentNode.options[selectedAnswerIndex]
  if (!chosenOption) {
    console.error('Invalid option selected')
    playSiteSfx('error')
    return
  }

  // Show thinking animation
  quizState = 'thinking'
  showThinking = true

  setTimeout(() => {
    if (chosenOption.trait) {
      userTraits.push(chosenOption.trait)
    }

    if (chosenOption.next.startsWith('OUTCOME_')) {
      calculateResult(chosenOption.next)
      playSiteSfx('success')
      quizState = 'completed'
    } else if (nodes[chosenOption.next]) {
      currentNodeId = chosenOption.next
      selectedAnswerIndex = null
      questionNumber++
      validateCurrentNode()
      playSiteSfx('sweep')
      quizState = 'asking'
    } else {
      console.error(`Next node '${chosenOption.next}' not found`)
      calculateResult('OUTCOME_DEFAULT')
      playSiteSfx('warning')
      quizState = 'completed'
    }
    showThinking = false
  }, 1200) // Thinking delay
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
  showThinking = false
  validateCurrentNode()
}

// Initialize on mount
onMount(() => {
  validateCurrentNode()
})
</script>

<div class="card-base p-6 md:p-8 cosmic-quiz-container">
  {#if quizState === 'asking'}
    <!-- Enhanced Progress Section -->
    <div class="progress-section mb-8">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-75 cosmic-counter">Question {questionNumber}</span>
        <span class="text-sm text-75">Progress: {Math.round(progressPercentage)}%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: {progressPercentage}%"></div>
        <div class="progress-glow" style="width: {progressPercentage}%"></div>
      </div>
    </div>

    <!-- Question Area with Enhanced Transitions -->
    {#if currentNode}
      {#key currentNodeId}
        <div 
          in:fly={{ y: 50, duration: 600, easing: cubicOut, delay: 300 }} 
          out:fly={{ y: -50, duration: 300, easing: cubicOut }}
          class="question-container">
          <div class="cosmic-question-header">
            <h2 class="text-2xl md:text-3xl font-bold mt-2 text-90 cosmic-text">{currentNode.text}</h2>
          </div>
          
          <div class="flex flex-col gap-3 my-8">
            {#each currentNode.options as option, i}
              <button
                type="button"
                class="card-base2 text-75 btn-quiz-option cosmic-option"
                class:selected={selectedAnswerIndex === i}
                data-sfx-hover="hover-emphasis"
                data-sfx-click="select"
                on:click={() => handleAnswerSelect(i)}
                in:fly={{ x: -100, duration: 400, delay: 400 + (i * 100), easing: cubicOut }}>
                <span class="option-number">{String.fromCharCode(65 + i)}</span>
                <span class="option-text">{option.text}</span>
              </button>
            {/each}
          </div>
        </div>
      {/key}
    {:else}
      <div class="text-center text-red-400">
        Error: Question not found. <button type="button" class="btn-primary" data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={handleRestart}>Restart Quiz</button>
      </div>
    {/if}

    <button 
      type="button"
      class="btn-primary w-full mt-6 cosmic-submit" 
      class:pulsing={selectedAnswerIndex !== null}
      data-sfx-hover="hover-emphasis"
      data-sfx-click="panel-open"
      on:click={handleNext} 
      disabled={selectedAnswerIndex === null}>
      {selectedAnswerIndex !== null ? 'Continue...' : 'Select an Answer'}
    </button>

  {:else if quizState === 'thinking'}
    <!-- Thinking Animation -->
    <div class="thinking-container" in:scale={{ duration: 400, easing: elasticOut }}>
      <div class="cosmic-brain">
        <div class="brain-pulse"></div>
        <div class="brain-pulse delay-1"></div>
        <div class="brain-pulse delay-2"></div>
      </div>
      <h3 class="text-2xl font-bold text-center mt-6 text-90">Analyzing your cosmic psyche...</h3>
      <div class="thinking-dots">
        <span>.</span><span>.</span><span>.</span>
      </div>
    </div>

  {:else if finalOutcome}
    <!-- Results Screen -->
    <div class="text-center">
      <h2 class="text-3xl font-bold mb-4" style="color: var(--primary)">
        <!-- Diagnosis Icon (Emoji) -->
        {#if finalOutcome.emoji}
          <span class="text-4xl mr-2">{finalOutcome.emoji}</span>
        {/if}
        {finalOutcome.title}
      </h2>
      
      {#if traitEntries.length > 0}
        <div class="trait-summary my-6 max-w-md mx-auto">
          <div class="trait-summary-title">Trait Analysis</div>
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
      <button type="button" class="btn-primary" data-sfx-hover="hover-soft" data-sfx-click="panel-back" on:click={handleRestart}>
        Retake Diagnostic
      </button>
    </div>
  {/if}
</div>

