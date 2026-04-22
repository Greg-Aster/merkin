<script lang="ts">
import type { SceneProps } from '../types'

const { props }: { props: SceneProps } = $props()

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

<style>
  .mock-scene {
    position: relative;
    min-height: inherit;
    overflow: hidden;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--mock-accent) 30%, transparent), transparent 35%),
      radial-gradient(circle at bottom right, rgba(96, 165, 250, 0.2), transparent 30%),
      linear-gradient(135deg, rgba(4, 9, 16, 0.98), rgba(8, 19, 31, 0.92));
    color: #f8fafc;
  }

  .mock-scene__scanline {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0, transparent 14%, transparent 86%, rgba(255, 255, 255, 0.05) 100%),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.03) 0,
        rgba(255, 255, 255, 0.03) 1px,
        transparent 1px,
        transparent 4px
      );
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .mock-scene__content {
    position: relative;
    z-index: 1;
    width: min(42rem, calc(100% - 3rem));
    padding: clamp(1.5rem, 4vw, 2.5rem);
    border-radius: 1.25rem;
    background: rgba(5, 10, 18, 0.62);
    border: 1px solid color-mix(in srgb, var(--mock-accent) 28%, rgba(148, 163, 184, 0.2));
    box-shadow:
      0 28px 90px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(14px);
  }

  .mock-scene__eyebrow {
    margin: 0 0 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.75rem;
    color: color-mix(in srgb, var(--mock-accent) 72%, white);
  }

  h2 {
    margin: 0;
    font-size: clamp(2rem, 5vw, 3.8rem);
    line-height: 0.95;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .mock-scene__copy {
    max-width: 38rem;
    margin: 1rem 0 0;
    font-size: 1rem;
    line-height: 1.7;
    color: rgba(226, 232, 240, 0.84);
  }

  .mock-scene__meta {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 1.2rem;
    font-size: 0.8rem;
    color: rgba(148, 163, 184, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .mock-scene__meta span {
    padding: 0.4rem 0.65rem;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.14);
  }

  .mock-scene__actions {
    display: flex;
    gap: 0.9rem;
    flex-wrap: wrap;
    margin-top: 1.6rem;
  }

  button {
    border: 0;
    border-radius: 999px;
    padding: 0.85rem 1.1rem;
    font: inherit;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: #04111b;
    background: color-mix(in srgb, var(--mock-accent) 84%, white);
    cursor: pointer;
    transition:
      transform 140ms ease,
      filter 140ms ease;
  }

  button:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }

  .mock-scene__secondary {
    color: rgba(226, 232, 240, 0.92);
    background: rgba(15, 23, 42, 0.86);
    border: 1px solid rgba(148, 163, 184, 0.18);
  }
</style>

