<script lang="ts">
import {
  EDITOR_NPC_ARCHETYPE_OPTIONS,
  EDITOR_NPC_BEHAVIOR_TYPE_OPTIONS,
  EDITOR_NPC_CONVERSATION_MODE_OPTIONS,
  EDITOR_NPC_INTERACTION_MODE_OPTIONS,
  EDITOR_NPC_PERSONALITY_OPTIONS,
  type EditorNpcPatch,
} from './editorNpcControls'
import type { EditorNpcData } from './editorTypes'

export let npc: EditorNpcData
export let onNpcChange: (patch: EditorNpcPatch) => void = () => {}

$: conversation = npc.conversation ?? { mode: 'none' as const }
$: behavior = npc.behavior ?? { type: 'static' as const }
$: fireflyPresentation =
  npc.presentation.type === 'firefly' ? npc.presentation : null
$: profilePersonalityId =
  conversation.mode === 'profile' ? conversation.personalityId : ''
$: profileValidationMessage =
  conversation.mode === 'profile' && !profilePersonalityId.trim()
    ? 'Profile personality id is required.'
    : conversation.mode === 'profile' &&
        !EDITOR_NPC_PERSONALITY_OPTIONS.includes(profilePersonalityId)
      ? 'Unknown personality id.'
      : ''
</script>

<div class="editor-subsection">
  <div class="tuple-group">
    <div class="tuple-label">NPC Id</div>
    <input
      class="text-input"
      value={npc.id}
      on:input={(event) =>
        onNpcChange({
          scope: 'identity',
          field: 'id',
          value: (event.currentTarget as HTMLInputElement).value,
        })}
    />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Display Name</div>
    <input
      class="text-input"
      value={npc.displayName ?? ''}
      on:input={(event) =>
        onNpcChange({
          scope: 'identity',
          field: 'displayName',
          value: (event.currentTarget as HTMLInputElement).value,
        })}
    />
  </div>
  <div class="tuple-group">
    <div class="tuple-label">Archetype</div>
    <select
      class="text-input"
      value={npc.archetype}
      on:change={(event) =>
        onNpcChange({
          scope: 'identity',
          field: 'archetype',
          value: (event.currentTarget as HTMLSelectElement).value,
        })}
    >
      {#each EDITOR_NPC_ARCHETYPE_OPTIONS as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</div>

<div class="editor-subsection">
  <div class="tuple-group">
    <div class="tuple-label">Interaction Mode</div>
    <select
      class="text-input"
      value={npc.interaction.mode}
      on:change={(event) =>
        onNpcChange({
          scope: 'interaction',
          field: 'mode',
          value: (event.currentTarget as HTMLSelectElement).value,
        })}
    >
      {#each EDITOR_NPC_INTERACTION_MODE_OPTIONS as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
  {#if npc.interaction.mode === 'click'}
    <div class="tuple-group">
      <div class="tuple-label">Prompt</div>
      <input
        class="text-input"
        value={npc.interaction.prompt ?? ''}
        on:input={(event) =>
          onNpcChange({
            scope: 'interaction',
            field: 'prompt',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </div>
  {/if}
</div>

<div class="editor-subsection">
  <div class="tuple-group">
    <div class="tuple-label">Conversation Mode</div>
    <select
      class="text-input"
      value={conversation.mode}
      on:change={(event) =>
        onNpcChange({
          scope: 'conversationMode',
          value: (event.currentTarget as HTMLSelectElement)
            .value as 'none' | 'read-only' | 'profile',
        })}
    >
      {#each EDITOR_NPC_CONVERSATION_MODE_OPTIONS as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>

  {#if conversation.mode === 'read-only'}
    <div class="tuple-group">
      <div class="tuple-label">Title</div>
      <input
        class="text-input"
        value={conversation.title ?? ''}
        on:input={(event) =>
          onNpcChange({
            scope: 'conversationText',
            field: 'title',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Excerpt</div>
      <textarea
        rows="3"
        value={conversation.excerpt ?? ''}
        on:input={(event) =>
          onNpcChange({
            scope: 'conversationText',
            field: 'excerpt',
            value: (event.currentTarget as HTMLTextAreaElement).value,
          })}
      ></textarea>
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Body</div>
      <textarea
        rows="5"
        value={conversation.body}
        on:input={(event) =>
          onNpcChange({
            scope: 'conversationText',
            field: 'body',
            value: (event.currentTarget as HTMLTextAreaElement).value,
          })}
      ></textarea>
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Duration Ms</div>
      <input
        class="tuple-input"
        type="number"
        min="0"
        step="250"
        value={conversation.durationMs ?? 7000}
        on:change={(event) =>
          onNpcChange({
            scope: 'conversationNumber',
            field: 'durationMs',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </div>
  {:else if conversation.mode === 'profile'}
    <div class="tuple-group">
      <div class="tuple-label">Personality Id</div>
      <input
        class="text-input"
        list="editor-npc-personality-options"
        value={conversation.personalityId}
        on:input={(event) =>
          onNpcChange({
            scope: 'conversationText',
            field: 'personalityId',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
      <datalist id="editor-npc-personality-options">
        {#each EDITOR_NPC_PERSONALITY_OPTIONS as option}
          <option value={option}>{option}</option>
        {/each}
      </datalist>
      {#if profileValidationMessage}
        <div class="save-message error-message">{profileValidationMessage}</div>
      {/if}
    </div>
  {/if}
</div>

<div class="editor-subsection">
  <div class="tuple-group">
    <div class="tuple-label">Behavior</div>
    <select
      class="text-input"
      value={behavior.type}
      on:change={(event) =>
        onNpcChange({
          scope: 'behaviorMode',
          value: (event.currentTarget as HTMLSelectElement)
            .value as 'static' | 'hover-wander',
        })}
    >
      {#each EDITOR_NPC_BEHAVIOR_TYPE_OPTIONS as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
  {#if behavior.type === 'hover-wander'}
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Wander Radius</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={behavior.radius}
          on:change={(event) =>
            onNpcChange({
              scope: 'behaviorNumber',
              field: 'radius',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Wander Speed</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={behavior.speed}
          on:change={(event) =>
            onNpcChange({
              scope: 'behaviorNumber',
              field: 'speed',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Hover Height</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={behavior.hoverHeight ?? 0.28}
          on:change={(event) =>
            onNpcChange({
              scope: 'behaviorNumber',
              field: 'hoverHeight',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Bob Amplitude</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={behavior.bobAmplitude ?? 0.08}
          on:change={(event) =>
            onNpcChange({
              scope: 'behaviorNumber',
              field: 'bobAmplitude',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Bob Speed</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={behavior.bobSpeed ?? 0.55}
          on:change={(event) =>
            onNpcChange({
              scope: 'behaviorNumber',
              field: 'bobSpeed',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
    </div>
  {/if}
</div>

{#if fireflyPresentation}
  <div class="editor-subsection">
    <div class="tuple-group">
      <div class="tuple-label">Primary Color</div>
      <input
        class="text-input"
        type="color"
        value={fireflyPresentation.color}
        on:input={(event) =>
          onNpcChange({
            scope: 'presentationText',
            field: 'color',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </div>
    <div class="tuple-group">
      <div class="tuple-label">Secondary Color</div>
      <input
        class="text-input"
        type="color"
        value={fireflyPresentation.secondaryColor ?? '#f5f1a8'}
        on:input={(event) =>
          onNpcChange({
            scope: 'presentationText',
            field: 'secondaryColor',
            value: (event.currentTarget as HTMLInputElement).value,
          })}
      />
    </div>
    <div class="editor-field-grid editor-mt-sm">
      <label class="editor-field">
        <span class="editor-field-label">Size</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={fireflyPresentation.size}
          on:change={(event) =>
            onNpcChange({
              scope: 'presentationNumber',
              field: 'size',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Twinkle Speed</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={fireflyPresentation.twinkleSpeed ?? 0.9}
          on:change={(event) =>
            onNpcChange({
              scope: 'presentationNumber',
              field: 'twinkleSpeed',
              value: (event.currentTarget as HTMLInputElement).value,
          })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Light Burst Boost</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={fireflyPresentation.lightBurstBoost ?? 1}
          on:change={(event) =>
            onNpcChange({
              scope: 'presentationNumber',
              field: 'lightBurstBoost',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Selection Light Boost</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={fireflyPresentation.selectionLightBoost ?? 3}
          on:change={(event) =>
            onNpcChange({
              scope: 'presentationNumber',
              field: 'selectionLightBoost',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
      <label class="editor-field">
        <span class="editor-field-label">Burst Sprite Boost</span>
        <input
          class="tuple-input"
          type="number"
          min="0"
          step="0.05"
          value={fireflyPresentation.lightBurstSpriteBoost ?? 0.55}
          on:change={(event) =>
            onNpcChange({
              scope: 'presentationNumber',
              field: 'lightBurstSpriteBoost',
              value: (event.currentTarget as HTMLInputElement).value,
            })}
        />
      </label>
    </div>
    <label class="checkbox editor-mt-sm">
      <input
        type="checkbox"
        checked={fireflyPresentation.shockwaveEnabled ?? false}
        on:change={(event) =>
          onNpcChange({
            scope: 'presentationBoolean',
            field: 'shockwaveEnabled',
            value: (event.currentTarget as HTMLInputElement).checked,
          })}
      />
      Shockwave Burst
    </label>
  </div>
{/if}
