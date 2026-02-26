
<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, elasticOut } from 'svelte/easing';

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
  let chartCanvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let questionNumber: number = 1;
  let showThinking: boolean = false;

  // Computed values for progress bar and question node
  $: currentNode = nodes[currentNodeId] || null;
  $: progressPercentage = Math.min((questionNumber / 12) * 100, 100);
  
  // Safety check function (non-reactive)
  function validateCurrentNode() {
    if (!nodes[currentNodeId]) {
      console.error(`Node '${currentNodeId}' not found in nodes object`);
      currentNodeId = initialQuestion; // fallback to initial question
    }
  }

  function handleAnswerSelect(index: number) {
    selectedAnswerIndex = index;
  }

  function handleNext() {
    if (selectedAnswerIndex === null || !currentNode) return;
    
    const chosenOption = currentNode.options[selectedAnswerIndex];
    if (!chosenOption) {
      console.error('Invalid option selected');
      return;
    }
    
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
    setTimeout(createChart, 0);
  }

  function createChart() {
    if (chart) chart.destroy();
    if (!chartCanvas || Object.keys(traitCounts).length === 0) return;

    // Color palette for the chart bars
    const colorPalette = [
      'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)',
      'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)'
    ];

    Chart.register(...registerables);
    chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(traitCounts),
        datasets: [{
          label: 'Your Traits',
          data: Object.values(traitCounts),
          backgroundColor: colorPalette, // Use the colorful palette
          borderColor: colorPalette.map(c => c.replace('0.7', '1')), // Make borders solid
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Trait Analysis', color: 'white', font: { size: 16 } }
        },
        scales: {
          y: { ticks: { color: 'white' }, grid: { display: false } },
          x: {
            beginAtZero: true,
            ticks: { color: 'white', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.2)' }
          }
        }
      }
    });
  }

  function handleRestart() {
    quizState = 'asking';
    currentNodeId = initialQuestion;
    selectedAnswerIndex = null;
    userTraits = [];
    finalOutcome = null;
    traitCounts = {};
    questionNumber = 1;
    showThinking = false;
    if (chart) chart.destroy();
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
        Error: Question not found. <button class="btn-primary" on:click={handleRestart}>Restart Quiz</button>
      </div>
    {/if}

    <button 
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
      
      <!-- Colorful Chart -->
      {#if Object.keys(traitCounts).length > 0}
        <div class="my-6 max-w-md mx-auto">
          <canvas bind:this={chartCanvas}></canvas>
        </div>
      {/if}

      <p class="text-lg text-75 mb-6 whitespace-pre-line">{finalOutcome.description}</p>
      <button class="btn-primary" on:click={handleRestart}>
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
