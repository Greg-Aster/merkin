<script lang="ts">
import {
  EDITOR_COMMAND_CATEGORIES,
  type EditorCommand,
  commandMatchesQuery,
} from './editorCommandRegistry'

export let open = false
export let commands: EditorCommand[] = []
export let onClose: () => void = () => {}
export let onRunCommand: (commandId: string) => void = () => {}

let query = ''

$: filteredCommands = commands.filter(command =>
  commandMatchesQuery(command, query),
)

function focusOnMount(node: HTMLElement) {
  requestAnimationFrame(() => node.focus())
}

function run(command: EditorCommand) {
  if (!command.enabled) return
  onRunCommand(command.id)
}

function handleKeydown(event: KeyboardEvent) {
  if (!open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    onClose()
  }
}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <button
    class="command-palette-backdrop"
    type="button"
    aria-label="Close command palette"
    on:click={onClose}
  ></button>
  <dialog
    class="command-palette"
    aria-label="Command palette"
    open
  >
    <div class="palette-header">
      <input
        class="palette-search"
        type="search"
        bind:value={query}
        placeholder="Search commands"
        aria-label="Search commands"
        use:focusOnMount
      />
      <button class="palette-close" on:click={onClose}>Close</button>
    </div>

    <div class="palette-results">
      {#each EDITOR_COMMAND_CATEGORIES as category}
        {@const categoryCommands = filteredCommands.filter(command => command.category === category)}
        {#if categoryCommands.length}
          <div class="palette-category">
            <div class="palette-category-label">{category}</div>
            {#each categoryCommands as command (command.id)}
              <button
                class="palette-command"
                class:disabled={!command.enabled}
                disabled={!command.enabled}
                on:click={() => run(command)}
              >
                <span class="command-main">
                  <span class="command-title">{command.label}</span>
                  <span class="command-description">{command.description}</span>
                  {#if command.disabledReason}
                    <span class="command-disabled">{command.disabledReason}</span>
                  {/if}
                </span>
                <span class="command-meta">
                  <span>{command.ownerWorkspace}</span>
                  <span>{command.status}</span>
                  {#if command.shortcut}
                    <kbd>{command.shortcut}</kbd>
                  {/if}
                </span>
              </button>
            {/each}
          </div>
        {/if}
      {/each}

      {#if filteredCommands.length === 0}
        <div class="palette-empty">No commands match.</div>
      {/if}
    </div>
  </dialog>
{/if}

<style>
  .command-palette-backdrop {
    position: fixed;
    inset: 0;
    z-index: 130;
    border: 0;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: auto;
  }

  .command-palette {
    position: fixed;
    top: 5rem;
    left: 50%;
    z-index: 131;
    display: grid;
    width: min(42rem, calc(100vw - 2rem));
    max-height: min(42rem, calc(100vh - 7rem));
    transform: translateX(-50%);
    overflow: hidden;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.75rem;
    background: rgba(6, 10, 18, 0.98);
    color: #e8f5ff;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.48);
    pointer-events: auto;
  }

  .palette-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    padding: 0.7rem;
    border-bottom: 1px solid rgba(126, 203, 255, 0.16);
  }

  .palette-search {
    min-width: 0;
    border: 1px solid rgba(126, 203, 255, 0.28);
    border-radius: 0.45rem;
    background: rgba(255, 255, 255, 0.08);
    color: #e8f5ff;
    padding: 0.58rem 0.7rem;
    font: inherit;
  }

  .palette-close {
    padding-inline: 0.75rem;
  }

  .palette-results {
    overflow-y: auto;
    padding: 0.45rem;
  }

  .palette-category {
    display: grid;
    gap: 0.3rem;
    margin-bottom: 0.55rem;
  }

  .palette-category-label {
    padding: 0.35rem 0.42rem 0.1rem;
    color: rgba(155, 199, 228, 0.78);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .palette-command {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
    width: 100%;
    padding: 0.62rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    background: rgba(126, 203, 255, 0.06);
    color: inherit;
    text-align: left;
  }

  .palette-command:not(:disabled):hover {
    border-color: rgba(126, 203, 255, 0.28);
    background: rgba(126, 203, 255, 0.12);
  }

  .palette-command.disabled {
    opacity: 0.58;
  }

  .command-main,
  .command-meta {
    display: grid;
    gap: 0.18rem;
  }

  .command-title {
    font-weight: 700;
  }

  .command-description,
  .command-disabled,
  .command-meta {
    color: #9bc7e4;
    font-size: 0.75rem;
  }

  .command-disabled {
    color: #ffcb9a;
  }

  .command-meta {
    justify-items: end;
    text-transform: capitalize;
  }

  kbd {
    border: 1px solid rgba(126, 203, 255, 0.24);
    border-radius: 0.28rem;
    padding: 0.08rem 0.28rem;
    background: rgba(255, 255, 255, 0.08);
    color: #e8f5ff;
    font-size: 0.68rem;
    text-transform: none;
  }

  .palette-empty {
    padding: 1rem;
    color: #9bc7e4;
  }
</style>
