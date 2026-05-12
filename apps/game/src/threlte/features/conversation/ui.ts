/**
 * Conversation UI entrypoint.
 *
 * Lazy loaders can import this module when they need the dialog component
 * without exposing character authoring helpers on the runtime contract.
 */

export {
  default,
  default as ConversationDialog,
} from './ConversationDialog.svelte'
export type { ConversationUIState } from './types'
