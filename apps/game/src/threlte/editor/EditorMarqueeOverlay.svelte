<script lang="ts">
  import { editorMarqueeStore } from './editorStore'

  let marquee = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  }

  const unsubscribe = editorMarqueeStore.subscribe((value) => {
    marquee = value
  })

  $: left = Math.min(marquee.startX, marquee.currentX)
  $: top = Math.min(marquee.startY, marquee.currentY)
  $: width = Math.abs(marquee.currentX - marquee.startX)
  $: height = Math.abs(marquee.currentY - marquee.startY)
</script>

{#if marquee.active}
  <div
    class="editor-marquee"
    style={`left:${left}px; top:${top}px; width:${width}px; height:${height}px;`}
  ></div>
{/if}

<style>
  .editor-marquee {
    position: fixed;
    pointer-events: none;
    border: 1px solid rgba(126, 203, 255, 0.95);
    background: rgba(126, 203, 255, 0.14);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    z-index: 90;
  }
</style>
