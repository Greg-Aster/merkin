
<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';
  import { playSiteSfx } from '../../utils/site-sfx';

  // Props for the new graph-based quiz structure
  export let initialQuestion: string;
  export let nodes: Record<string, { text: string; options: { text: string; trait?: string; next: string }[] }>;
  export let outcomes: Record<string, { title: string; description: string; emoji?: string }>;

  // State Management
  let quizState: 'asking' | 'thinking' | 'completed' = 'asking';
  let currentNodeId: string = initialQuestion;
  let selectedAnswerIndex: number | null = null;
  let userTraits: string[] = [];
  let finalOutcome: { title: string; description: string; emoji?: string } | null = null;
  let traitCounts: Record<string, number> = {};
  let questionNumber: number = 1;
  let showThinking: boolean = false;
  const traitPalette = [
    'linear-gradient(135deg, rgba(255, 99, 132, 0.9), rgba(255, 159, 64, 0.82))',
    'linear-gradient(135deg, rgba(54, 162, 235, 0.9), rgba(75, 192, 192, 0.82))',
    'linear-gradient(135deg, rgba(255, 206, 86, 0.9), rgba(255, 159, 64, 0.82))',
    'linear-gradient(135deg, rgba(153, 102, 255, 0.9), rgba(201, 90, 255, 0.82))',
    'linear-gradient(135deg, rgba(75, 192, 192, 0.9), rgba(88, 226, 166, 0.82))',
    'linear-gradient(135deg, rgba(255, 159, 64, 0.9), rgba(255, 99, 132, 0.82))'
  ];

  // Computed values for progress bar and question node
  $: currentNode = nodes[currentNodeId] || null;
  $: progressPercentage = Math.min((questionNumber / 12) * 100, 100);
  $: traitEntries = Object.entries(traitCounts).sort(([, left], [, right]) => right - left);
  $: maxTraitCount = traitEntries[0]?.[1] ?? 1;
  
  // Safety check function (non-reactive)
  function validateCurrentNode() {
    if (!nodes[currentNodeId]) {
      console.error(`Node '${currentNodeId}' not found in nodes object`);
      currentNodeId = initialQuestion; // fallback to initial question
    }
  }

  function handleAnswerSelect(index: number) {
    selectedAnswerIndex = index;
    playSiteSfx('select');
  }

  function handleNext() {
    if (selectedAnswerIndex === null || !currentNode) {
      playSiteSfx('error');
      return;
    }
    
    const chosenOption = currentNode.options[selectedAnswerIndex];
    if (!chosenOption) {
      console.error('Invalid option selected');
      playSiteSfx('error');
      return;
    }

    playSiteSfx('panel-open');
    
    // Show thinking animation
    quizState = 'thinking';
    showThinking = true;
    
    setTimeout(() => {
      if (chosenOption.trait) {
        userTraits.push(chosenOption.trait);
      }
      
      if (chosenOption.next.startsWith('OUTCOME_')) {
        calculateResult(chosenOption.next);
        quizState = 'completed';
      } else if (nodes[chosenOption.next]) {
        currentNodeId = chosenOption.next;
        selectedAnswerIndex = null;
        questionNumber++;
        validateCurrentNode();
        quizState = 'asking';
      } else {
        console.error(`Next node '${chosenOption.next}' not found`);
        calculateResult('OUTCOME_DEFAULT');
        quizState = 'completed';
      }
      showThinking = false;
    }, 1200); // Thinking delay
  }

  function calculateResult(finalOutcomeKey: string) {
    traitCounts = userTraits.reduce((acc, trait) => {
      acc[trait] = (acc[trait] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    finalOutcome = outcomes[finalOutcomeKey] || outcomes['OUTCOME_DEFAULT'];
  }

  function getTraitBarStyle(index: number, value: number) {
    const width = Math.max((value / maxTraitCount) * 100, 14);
    return `width: ${width}%; background: ${traitPalette[index % traitPalette.length]};`;
  }

  function handleRestart() {
    playSiteSfx('panel-back');
    quizState = 'asking';
    currentNodeId = initialQuestion;
    selectedAnswerIndex = null;
    userTraits = [];
    finalOutcome = null;
    traitCounts = {};
    questionNumber = 1;
    showThinking = false;
    validateCurrentNode();
  }
  
  // Initialize on mount
  onMount(() => {
    validateCurrentNode();
  });
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
        Error: Question not found. <button type="button" class="btn-primary" on:click={handleRestart}>Restart Quiz</button>
      </div>
    {/if}

    <button 
      type="button"
      class="btn-primary w-full mt-6 cosmic-submit" 
      class:pulsing={selectedAnswerIndex !== null}
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
      <button type="button" class="btn-primary" on:click={handleRestart}>
        Retake Diagnostic
      </button>
    </div>
  {/if}
</div>

<style lang="postcss">
  .cosmic-quiz-container {
    @apply relative overflow-hidden;
    background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--accent-rgb), 0.05) 100%);
  }

  .progress-section {
    @apply relative;
  }

  .cosmic-counter {
    @apply font-mono tracking-wider;
    text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);
  }

  .progress-bar-container {
    @apply w-full bg-black/30 rounded-full h-3 relative overflow-hidden;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
  }

  .progress-bar {
    background: linear-gradient(90deg, var(--primary), var(--accent));
    @apply h-3 rounded-full transition-all duration-700 ease-out relative;
    box-shadow: 0 0 15px rgba(var(--primary-rgb), 0.6);
  }

  .progress-glow {
    @apply absolute top-0 left-0 h-3 rounded-full transition-all duration-700 ease-out;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    filter: blur(8px);
    opacity: 0.7;
  }

  .cosmic-question-header {
    @apply relative mb-6;
  }

  .cosmic-text {
    @apply relative;
    text-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3);
  }

  .cosmic-option {
    @apply text-left w-full p-5 transition-all duration-300 border-2 border-transparent relative overflow-hidden;
    @apply flex items-center gap-4;
    backdrop-filter: blur(10px);
    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
  }

  .cosmic-option:hover {
    border-color: var(--primary);
    @apply border-opacity-70;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.2);
  }

  .cosmic-option.selected {
    border-color: var(--primary);
    background: linear-gradient(135deg, rgba(var(--primary-rgb), 0.15) 0%, rgba(var(--accent-rgb), 0.1) 100%);
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.4), 0 8px 25px rgba(var(--primary-rgb), 0.3);
  }

  .option-number {
    @apply flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .option-text {
    @apply flex-1 text-left;
  }

  .cosmic-submit {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    @apply text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 relative overflow-hidden;
    box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .cosmic-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(var(--primary-rgb), 0.4);
  }

  .cosmic-submit:disabled {
    @apply bg-gray-500/50 cursor-not-allowed;
    background: linear-gradient(135deg, #666, #444);
    transform: none;
    box-shadow: none;
  }

  .cosmic-submit.pulsing {
    animation: cosmic-pulse 2s infinite;
  }

  @keyframes cosmic-pulse {
    0%, 100% { box-shadow: 0 4px 15px rgba(var(--primary-rgb), 0.3); }
    50% { box-shadow: 0 4px 25px rgba(var(--primary-rgb), 0.6), 0 0 30px rgba(var(--primary-rgb), 0.4); }
  }

  .thinking-container {
    @apply flex flex-col items-center justify-center py-16;
  }

  .cosmic-brain {
    @apply relative w-20 h-20 mb-8;
  }

  .brain-pulse {
    @apply absolute inset-0 rounded-full border-4;
    border-color: var(--primary);
    animation: brain-pulse 2s infinite;
  }

  .brain-pulse.delay-1 {
    animation-delay: 0.7s;
  }

  .brain-pulse.delay-2 {
    animation-delay: 1.4s;
  }

  @keyframes brain-pulse {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }

  .thinking-dots {
    @apply mt-4 flex gap-2;
  }

  .thinking-dots span {
    @apply text-4xl;
    color: var(--primary);
    animation: thinking-dot 1.4s infinite both;
  }

  .trait-summary {
    @apply rounded-2xl border border-white/10 p-5 text-left;
    background: linear-gradient(180deg, rgba(12, 14, 20, 0.72), rgba(20, 24, 34, 0.52));
    box-shadow:
      0 18px 42px rgba(0, 0, 0, 0.28),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
  }

  .trait-summary-title {
    @apply mb-4 text-sm font-bold uppercase tracking-[0.22em];
    color: rgba(255, 255, 255, 0.7);
  }

  .trait-summary-list {
    @apply flex flex-col gap-3;
  }

  .trait-row {
    @apply flex flex-col gap-2;
  }

  .trait-row-label {
    @apply flex items-center justify-between gap-3 text-sm;
    color: rgba(255, 255, 255, 0.84);
  }

  .trait-name {
    @apply uppercase tracking-[0.12em];
  }

  .trait-value {
    @apply rounded-full px-2 py-0.5 text-xs font-bold;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.78);
  }

  .trait-track {
    @apply h-3 overflow-hidden rounded-full;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  }

  .trait-bar {
    @apply h-full rounded-full transition-all duration-500 ease-out;
    min-width: 2.5rem;
    box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.2);
  }

  .thinking-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .thinking-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes thinking-dot {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .btn-primary {
    background-color: var(--primary);
    @apply text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200;
  }
  .btn-primary:hover:not(:disabled) {
    background-color: var(--primary-hover);
  }
  .btn-primary:disabled {
    @apply bg-gray-500/50 cursor-not-allowed;
  }
</style>
