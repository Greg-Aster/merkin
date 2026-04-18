<script lang="ts">
  import { onDestroy } from 'svelte'
  import { editorCircleSelectStore } from './editorStore'

  let circleSelect = {
    active: false,
    x: 0,
    y: 0,
    radius: 48,
    selecting: false,
    subtracting: false,
  }

  const unsubscribe = editorCircleSelectStore.subscribe((value) => {
    circleSelect = value
  })

  onDestroy(() => {
    unsubscribe()
  })
</script>

{#if circleSelect.active}
  <div
    class="editor-circle-select"
    class:selecting={circleSelect.selecting}
    class:subtracting={circleSelect.subtracting}
    style={`left:${circleSelect.x}px; top:${circleSelect.y}px; width:${circleSelect.radius * 2}px; height:${circleSelect.radius * 2}px;`}
  >
    <div class="editor-circle-select-label">
      {circleSelect.subtracting ? 'Circle Deselect' : 'Circle Select'} · {Math.round(circleSelect.radius)}
    </div>
  </div>
{/if}

<style>
  .editor-circle-select {
    position: fixed;
    transform: translate(-50%, -50%);
    pointer-events: none;
    border-radius: 999px;
    border: 1px solid rgba(126, 203, 255, 0.95);
    background: rgba(126, 203, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    z-index: 91;
  }

  .editor-circle-select.selecting {
    background: rgba(126, 203, 255, 0.16);
  }

  .editor-circle-select.subtracting {
    border-color: rgba(255, 170, 170, 0.95);
    background: rgba(255, 120, 120, 0.08);
  }

  .editor-circle-select-label {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 0.45rem);
    transform: translateX(-50%);
    padding: 0.2rem 0.45rem;
    border-radius: 999px;
    background: rgba(8, 14, 22, 0.9);
    color: #d9f2ff;
    border: 1px solid rgba(126, 203, 255, 0.2);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .editor-circle-select.subtracting .editor-circle-select-label {
    border-color: rgba(255, 170, 170, 0.25);
    color: #ffd8d8;
  }
</style>
