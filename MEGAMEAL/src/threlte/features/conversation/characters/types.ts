/**
 * Modern ECS-Aligned Character System
 * 
 * Unified character definitions that combine firefly personality, 
 * knowledge base, and conversation data in a single, discoverable format
 */

import type { WorldDocument } from '../worldKnowledge'

// ================================
// Firefly Personality Types
// ================================

export const FIREFLY_SPECIES = {
  COMMON_EASTERN: 'Common Eastern Firefly',
  BLUE_GHOST: 'Blue Ghost Firefly',
  SYNCHRONOUS: 'Synchronous Firefly',
  BIG_DIPPER: 'Big Dipper Firefly',
  PENNSYLVANIA: 'Pennsylvania Firefly',
  CHINESE_LANTERN: 'Chinese Lantern Firefly',
  TWILIGHT: 'Twilight Firefly',
  STELLAR: 'Stellar Firefly'
} as const

export type FireflySpecies = typeof FIREFLY_SPECIES[keyof typeof FIREFLY_SPECIES]

export type GreetingStyle = 'mysterious' | 'shy' | 'warm' | 'dramatic' | 'analytical'
export type ConversationStyle = 'wise' | 'poetic' | 'analytical' | 'mystical' | 'scholarly'
export type EmotionalState = 'peaceful' | 'curious' | 'wise' | 'sad' | 'mysterious' | 'worried' | 'thoughtful' | 'surprised'

export interface FireflyKnowledge {
  topics: Record<string, string>
  memories: string[]
  secrets?: string[]
  backstory: string
  openingStatement: string
}

export interface FireflyBehavior {
  greetingStyle: GreetingStyle
  conversationStyle: ConversationStyle
  defaultMood: EmotionalState
  emotionalRange: EmotionalState[]
  speechPatterns: string[]
}

export interface FireflyVisual {
  description: string
  expressions: Record<EmotionalState, string>
}

export interface FireflyConversation {
  responseDelay: number
  farewellTriggers: string[]
  topicTransitions: Record<string, string[]>
}

export interface FireflyPersonality {
  species: FireflySpecies
  age: string
  core: string
  traits: string[]
  quirks: string[]
  interests: string[]
  fears: string[]
  goals: string[]
  knowledge: FireflyKnowledge
  behavior: FireflyBehavior
  visual: FireflyVisual
  conversation: FireflyConversation
}

// ================================
// Character Knowledge Types
// ================================

export interface CharacterKnowledge {
  biography: WorldDocument
  research?: WorldDocument[]
  relationships?: WorldDocument[]
  technical?: WorldDocument[]
  personal?: WorldDocument[]
  authored?: WorldDocument[]
}

// ================================
// Unified Character Definition
// ================================

export interface CharacterDefinition {
  // Core identity
  id: string
  name: string
  aliases: string[]
  
  // Character components
  fireflyPersonality: FireflyPersonality
  knowledge: CharacterKnowledge
  
  // Built-in functions
  searchKnowledge(query: string): WorldDocument[]
  getPerspective(topic: string): string
  getAllKnowledge(): WorldDocument[]
}

// ================================
// Character Builder Helpers
// ================================

export interface CharacterBuilder {
  id: string
  name: string
  aliases?: string[]
  fireflyPersonality?: Partial<FireflyPersonality>
  knowledge?: Partial<CharacterKnowledge>
}

// Base firefly knowledge template
export const baseFireflyKnowledge = {
  topics: {
    'stars': 'The constellations hold memories I cannot quite grasp - patterns that once meant something profound to the being I used to be',
    'light': 'Light is how we speak now, how we reach across the void between consciousness - each flash a word in a language older than flesh',
    'time': 'Time moves strangely when you exist between what was and what is - moments stretch into eternities, eternities collapse into heartbeats',
    'memory': 'Fragments surface like bubbles in deep water - faces I loved, words I spoke, purposes I served, all shimmering just beyond reach',
    'transformation': 'We are what remains when everything else falls away - the essential spark that neither death nor change can extinguish',
    'longing': 'There is an ache in this small form, a yearning for something lost that can never quite be named or reclaimed',
    'acceptance': 'In learning to be small and luminous, we discover that what we thought was ending was only another kind of beginning',
    'connection': 'We recognize each other across the darkness - consciousness calling to consciousness in whatever form it takes',
    'purpose': 'Once we served grand designs and complex schemes; now we offer simpler gifts - wonder, guidance, the comfort of not being alone',
    'wisdom': 'What we learned in our former lives becomes something gentler here - knowledge transformed into understanding, facts into poetry',
    'observatory': 'This place draws us because it remembers too - built by those who sought to understand the vast patterns we once knew',
    'wandering': 'We drift through night gardens and quiet spaces, carrying stories that need no words, offering presence that asks nothing in return'
  },
  memories: [
    'Sometimes I catch glimpses of hands that once belonged to me, reaching for instruments or books or other beings',
    'There are echoes of voices - colleagues, friends, loved ones - who knew me when I wore a different form',
    'I remember the weight of responsibilities that felt so urgent then, so distant now in this gentle luminescence',
    'Fragments of specialized knowledge surface unbidden - technical terms, theoretical frameworks, methodologies I once mastered',
    'There was a moment of transition, of letting go, when I discovered that identity runs deeper than the shape it inhabits'
  ],
  backstory: 'I am what remains when a soul learns to shine rather than speak, to drift rather than direct, to offer light instead of answers. The Observatory calls to beings like us - those who have crossed the threshold between forms while carrying the essence of who we always were.'
}

export const baseFireflyBehavior: FireflyBehavior = {
  greetingStyle: 'mysterious',
  conversationStyle: 'wise',
  emotionalRange: ['peaceful', 'curious', 'wise', 'sad', 'mysterious'],
  defaultMood: 'peaceful',
  speechPatterns: [
    '*flickers with ancient recognition*',
    '*glows with the weight of memory*',
    '*pulses in patterns that feel like forgotten words*',
    '*drifts as if following invisible currents of meaning*'
  ]
}

// ================================
// Observatory Context Utilities
// ================================

export function getObservatoryContext() {
  return {
    location: 'MEGAMEAL Observatory',
    timeOfDay: 'night' as const,
    environmentData: {
      weather: 'clear',
      season: 'eternal twilight',  
      ambientNoise: 'whispers of memory carried on the wind'
    },
    gameState: {
      hasWater: true,
      hasVegetation: true,
      hasStarMap: true,
      magicalEnergy: 'transformed souls seeking connection'
    }
  }
}

export function getFireflyConversationPrompts() {
  return {
    greetings: [
      "*flickers with ancient recognition* Another consciousness wandering the darkness...",
      "*A gentle glow approaches, carrying the weight of memory*",
      "I sense kinship in your awareness, fellow traveler...",
      "*Pulses with the patient rhythm of souls who have crossed thresholds*"
    ],
    farewells: [
      "May you find peace in whatever form you take...",
      "*Drifts away like a half-remembered dream*", 
      "Until consciousness calls to consciousness again...",
      "*Glows once more before following invisible currents of meaning*"
    ],
    topics: [
      "The stars hold patterns I once understood in a different form...",
      "Light is how we speak now, across the spaces between what we were...",
      "This Observatory draws souls who have learned to shine rather than speak...",
      "Every wandering consciousness carries fragments of stories that need no words..."
    ]
  }
}