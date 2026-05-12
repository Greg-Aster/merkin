/**
 * Character authoring and registry entrypoint.
 *
 * This module intentionally includes the character registry and compatibility
 * layer. Runtime gameplay imports should prefer ./runtime.
 */

export {
  CharacterComponent,
  CharacterKnowledgeCompatibilityLayer,
  CharacterRegistry,
  FIREFLY_SPECIES,
  baseFireflyBehavior,
  baseFireflyKnowledge,
  characterKnowledge,
  characterRegistry,
  getFireflyConversationPrompts,
  getObservatoryContext,
} from './characters'

export type {
  CharacterBuilder,
  CharacterDefinition,
  CharacterKnowledge,
  FireflyBehavior,
  FireflyConversation,
  FireflyKnowledge,
  FireflyPersonality,
  FireflyVisual,
} from './characters'
