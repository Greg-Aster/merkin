<script lang="ts">
import { onMount } from 'svelte'
import { type CartItemOption, cart } from '../../stores/cartStore'
import type {
  ProductCustomizerConfig,
  ProductCustomizerOption,
  ProductCustomizerStep,
} from '../../types/product-customizer'
import '../../styles/features/store/product-customizer.css'

export let config: ProductCustomizerConfig

let selectedOptionIds: Record<string, string> = {}
let activeStepIndex = 0
let feedback: string | null = null

$: activeStep = config.steps[activeStepIndex] ?? config.steps[0]
$: selectedOptions = config.steps.flatMap(step => {
  const selectedId = selectedOptionIds[step.id]
  const option = step.options.find(item => item.id === selectedId)
  return option ? [{ step, option }] : []
})
$: isComplete = selectedOptions.length === config.steps.length
$: configuredPrice =
  config.baseItem.price +
  selectedOptions.reduce((sum, item) => sum + (item.option.priceDelta ?? 0), 0)
$: configuredFingerprint = config.steps
  .map(step => selectedOptionIds[step.id] ?? 'unset')
  .join('-')

onMount(() => {
  cart.init()
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function selectOption(step: ProductCustomizerStep, option: ProductCustomizerOption) {
  const nextSelections = {
    ...selectedOptionIds,
    [step.id]: option.id,
  }
  selectedOptionIds = nextSelections
  feedback = null

  const nextIncompleteStep = config.steps.findIndex(item => !nextSelections[item.id])
  if (nextIncompleteStep >= 0) {
    activeStepIndex = nextIncompleteStep
  }
}

function cartOptions(): CartItemOption[] {
  return selectedOptions.map(({ step, option }) => ({
    label: option.cartLabel ?? step.title,
    value: option.cartValue ?? option.label,
  }))
}

function addConfiguredItem() {
  if (!isComplete) {
    feedback = 'All mutation gates must be selected before containment.'
    return
  }

  cart.add({
    id: `${config.baseItem.id}:${configuredFingerprint}`,
    name: config.baseItem.name,
    price: configuredPrice,
    sku: config.baseItem.sku,
    href: config.baseItem.href,
    image: config.baseItem.image,
    kind: config.cartKind,
    description: config.baseItem.description,
    options: cartOptions(),
    quantityLocked: true,
  })
  feedback = `${config.baseItem.name} added to the adoption cart.`
  document.dispatchEvent(new CustomEvent('megameal:cart:open'))
}

function resetSelections() {
  selectedOptionIds = {}
  activeStepIndex = 0
  feedback = null
}
</script>

<section
  class={`product-customizer product-customizer--${config.variant ?? 'standard'}`}
  aria-labelledby="product-customizer-title"
>
  <div class="product-customizer__header">
    {#if config.eyebrow}
      <p class="product-customizer__eyebrow">{config.eyebrow}</p>
    {/if}
    <h2 id="product-customizer-title">{config.title}</h2>
    {#if config.description}
      <p>{config.description}</p>
    {/if}
  </div>

  <div class="product-customizer__body">
    <nav class="product-customizer__steps" aria-label="Customizer steps">
      {#each config.steps as step, index}
        <button
          type="button"
          class:active={activeStep?.id === step.id}
          class:complete={Boolean(selectedOptionIds[step.id])}
          aria-current={activeStep?.id === step.id ? 'step' : undefined}
          onclick={() => (activeStepIndex = index)}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{step.title}</strong>
        </button>
      {/each}
    </nav>

    <div class="product-customizer__question">
      {#if activeStep}
        {#if activeStep.kicker}
          <p class="product-customizer__kicker">{activeStep.kicker}</p>
        {/if}
        <h3>{activeStep.prompt}</h3>
        <div class="product-customizer__options">
          {#each activeStep.options as option}
            <button
              type="button"
              class:selected={selectedOptionIds[activeStep.id] === option.id}
              onclick={() => selectOption(activeStep, option)}
            >
              <span>
                <strong>{option.label}</strong>
                {#if option.description}
                  <small>{option.description}</small>
                {/if}
              </span>
              {#if option.priceDelta}
                <em>{option.priceDelta > 0 ? '+' : ''}{formatCurrency(option.priceDelta)}</em>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <aside class="product-customizer__summary" aria-label="Selected configuration">
      <p>{config.summaryTitle ?? 'Mutation Summary'}</p>
      {#if selectedOptions.length > 0}
        <dl>
          {#each selectedOptions as item}
            <div>
              <dt>{item.step.title}</dt>
              <dd>{item.option.label}</dd>
            </div>
          {/each}
        </dl>
      {:else}
        <span>No traits selected.</span>
      {/if}

      <div class="product-customizer__price">
        <span>{config.priceLabel ?? 'Estimated Price'}</span>
        <strong>{formatCurrency(configuredPrice)}</strong>
      </div>

      <button type="button" class="product-customizer__submit" disabled={!isComplete} onclick={addConfiguredItem}>
        {config.submitLabel ?? 'Add configured item'}
      </button>
      <button type="button" class="product-customizer__reset" onclick={resetSelections}>
        {config.resetLabel ?? 'Reset'}
      </button>

      {#if feedback}
        <p class="product-customizer__feedback">{feedback}</p>
      {/if}
    </aside>
  </div>
</section>
