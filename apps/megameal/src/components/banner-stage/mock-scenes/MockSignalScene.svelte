<script lang="ts">
import '../../../styles/features/extracted/mock-signal-scene.css'
import type { SceneProps } from '../types'

const props: SceneProps = $props()

const accent = $derived(String(props.payload.accent ?? '#34d399'))
const headline = $derived(String(props.payload.headline ?? 'Mock Banner Scene'))
const copy = $derived(
  String(
    props.payload.copy ??
      'This is a staging scene for the new banner registry. It exists to prove scene mounting, context wiring, and event dispatch without touching the legacy banner stack.',
  ),
)
const ctaLabel = $derived(String(props.payload.ctaLabel ?? 'Emit Cart Event'))

function emitCartEvent() {
  props.emit({
    type: 'add-to-cart',
    item: {
      id: `${props.sceneId}-sample-item`,
      name: headline,
      quantity: 1,
    },
  })
}

function emitExpandEvent() {
  props.emit({ type: 'request-expand' })
}
</script>

<section class="mock-scene" style={`--mock-accent:${accent};`}>
  <div class="mock-scene__scanline"></div>
  <div class="mock-scene__content">
    <p class="mock-scene__eyebrow">Banner Stage Mock Scene</p>
    <h2>{headline}</h2>
    <p class="mock-scene__copy">{copy}</p>

    <div class="mock-scene__meta">
      <span>scene: {props.sceneId}</span>
      <span>page: {props.pagePath}</span>
    </div>

    <div class="mock-scene__actions">
      <button type="button" onclick={emitCartEvent}>
        {ctaLabel}
      </button>
      <button type="button" class="mock-scene__secondary" onclick={emitExpandEvent}>
        Request Expand
      </button>
    </div>
  </div>
</section>
