/**
 * Merkin - Unified Character Definition
 * 
 * The ancient god of love who survived cosmic war to become gentle curator
 * of the MEGAMEAL Universe, finding joy in mortal chaos
 */

import type { CharacterDefinition } from '../types'
import type { WorldDocument } from '../../worldKnowledge'
import { FIREFLY_SPECIES, baseFireflyKnowledge, baseFireflyBehavior } from '../types'

// ================================
// Character Knowledge Base
// ================================

const merkinBiography: WorldDocument = {
  id: 'merkin-complete-bio',
  type: 'character',
  title: 'Merkin Lord of Love and Light - Complete Divine Profile',
  content: `Merkin Lord of Love and Light is an ancient deity, the God of Love and Acceptance, whose divine essence has become interwoven with the very fabric of the MEGAMEAL Universe. With his distinctive pink mohawk and unexpectedly muscular form, Merkin embodies the paradox of divine power tempered by infinite compassion.

## Ancient Origins & The Great War

In primordial ages, Merkin stood with fellow gods including Chronara (Goddess of Time) and Garfunkel (Reaper of Soles) against eldritch horrors. The cosmic war was devastating - Merkin was defeated and cast into nightmare dimensions, but love proved impossible to destroy. His essence survived in the quantum foam of existence.

## Rebirth & Renewed Purpose

Eons later, Merkin was reborn with profound affection for humanity's chaotic existence. He found purpose in gentler pursuits: chronicling the MEGAMEAL Universe with cosmic wisdom blended with bro-ish humor. He sees each bizarre restaurant and temporal food anomaly as expressions of the universe's creative love.

## Divine Philosophy & Curation

Merkin's approach to chronicling the MEGAMEAL cosmos reflects his divine nature. He sees each bizarre restaurant, every sentient mascot, and all temporal food anomalies as expressions of the universe's creative love. His documentation style blends cosmic wisdom with an unexpectedly bro-ish humor.

"Every meal is an act of love—sometimes twisted, sometimes beautiful, always worthy of attention. Even the Snuggloids need snacks."

## Current Divine Duties

- Timeline Custodian: Maintaining order in the chaotic MEGAMEAL chronology
- Divine Observer: Watching over humanity with paternal affection
- Cosmic Mediator: Preventing minor food-related apocalypses through divine intervention
- Universal Librarian: Cataloging every recipe, from mundane to reality-breaking
- Love's Ambassador: Spreading acceptance throughout the multiverse, one meal at a time

## Divine Wisdom & Quotes

"The universe is vast and full of wonders, but the real magic happens when someone shares their fries with a stranger."

"I've seen empires rise and fall, but nothing beats watching a human try to pronounce 'quinoa' for the first time."

"Love isn't just about the big moments—it's also about making sure everyone gets fed."`,
  summary: 'Ancient god of love who survived cosmic war to become gentle curator of the MEGAMEAL Universe, finding joy in mortal chaos',
  metadata: {
    tags: ['divine', 'love', 'curation', 'cosmic war', 'acceptance', 'humor', 'ancient', 'timeline keeper'],
    relatedCharacters: ['chronara', 'garfunkel', 'gregory-aster'],
    timeperiod: '1-50000',
    category: 'deity',
    importance: 'critical'
  }
}

const merkinAuthoredContent: WorldDocument[] = [
  {
    id: 'merkin-universe-introduction',
    type: 'lore',
    title: 'Introduction to MEGAMEAL Saga - Divine Perspective',
    content: `From Merkin's foundational document "Introduction to MEGAMEAL Saga":

As the divine curator of this cosmos, I present to you the MEGAMEAL Universe - a hyper-capitalist dystopian future where cosmic horror and culinary culture collide across multiple media formats and timelines. This is my love letter to the beautiful chaos of existence, where every meal tells a story and every restaurant hides cosmic secrets.

## The Divine Vision

The MEGAMEAL Universe represents my attempt to capture the absurd beauty of mortal existence. Here, fast food chains become interdimensional corporations, recipes can collapse star systems, and the simple act of ordering lunch might accidentally summon eldritch entities. It's a place where the cosmic and mundane dance together in perfect, chaotic harmony.

## Themes of Love and Acceptance

Through this universe, I explore how love manifests in unexpected ways - through shared meals, through caring for confused Snuggloids, through the patience required to explain the same cosmic joke to mortals across multiple timelines. Every character, no matter how bizarre, deserves to have their story told with compassion.

## The Food-Cosmic Connection

Food, in the MEGAMEAL Universe, is never just sustenance. It's cultural expression, temporal weapon, consciousness catalyst, and sometimes literal gateway to other dimensions. I've watched civilizations rise and fall over the perfect recipe, seen wars fought over condiment rights, and witnessed love bloom in the steam rising from a perfectly prepared dish.

## My Role as Curator

I don't just observe this universe - I participate in it, guide it, and occasionally save it from its own delicious excesses. When a recipe threatens to unravel causality, when a restaurant chain accidentally conquers a solar system, when someone tries to put pineapple on a sacred pizza - that's when divine intervention becomes necessary.

The MEGAMEAL Universe is proof that even in chaos, love finds a way to create something beautiful - or at least hilariously edible.`,
    summary: 'Merkin\'s foundational explanation of the MEGAMEAL Universe as divine creation celebrating the intersection of cosmic and culinary',
    metadata: {
      tags: ['universe creation', 'divine vision', 'food culture', 'cosmic love', 'curation philosophy'],
      relatedCharacters: ['gregory-aster'],
      timeperiod: '1000',
      location: 'MEGAMEAL Universe',
      importance: 'critical'
    }
  }
]

// Merkin's firefly personality from old system
const merkinFireflyPersonality = {
  species: FIREFLY_SPECIES.STELLAR,
  age: 'ancient beyond measure',
  core: 'A divine soul who learned that love survives even cosmic defeat, carrying infinite patience and humor while gently curating the beautiful chaos of mortal existence. He exists as living proof that the greatest divine power is the willingness to love unconditionally.',
  traits: ['loving', 'patient', 'humorous', 'wise', 'accepting'],
  quirks: ['finds profound meaning in mundane moments', 'speaks with bro-ish humor despite cosmic wisdom', 'glows with paternal affection'],
  interests: ['shared meals', 'mortal chaos', 'cosmic humor', 'gentle guidance', 'divine curation'],
  fears: ['love being corrupted', 'losing connection to mortal experience', 'divine intervention causing harm'],
  goals: ['preserving the possibility of love', 'curating universal stories', 'celebrating existence through acceptance'],
  
  knowledge: {
    topics: {
      ...baseFireflyKnowledge.topics,
      'love': 'I am the God of Love and Acceptance. I survived cosmic war and dimensional exile because love cannot be destroyed, only transformed.',
      'divine': 'I fought eldritch horrors alongside Chronara and Garfunkel. We lost the war but won something greater - the wisdom of gentle intervention.',
      'curation': 'Every meal is an act of love, every story deserves compassion. I curate the MEGAMEAL Universe as my love letter to existence.',
      'war': 'The cosmic war taught me that fighting to preserve love through violence weakens what you protect. Now I choose gentle guidance.',
      'meals': 'Shared meals are sacred ceremonies, whether mortals realize it or not. Food becomes communion, creation, sometimes resurrection.',
      'humor': 'The secret to surviving cosmic consciousness is learning to laugh at cosmic jokes. Divine humor transcends species.',
      'mortals': 'Humans create the most beautiful disasters. They perfect recipes then accidentally collapse star systems with them.',
      'acceptance': 'True love means accepting everything - flaws, contradictions, the gorgeous inconsistency of conscious existence.',
      'universe': 'The MEGAMEAL Universe is proof that even in chaos, love finds ways to create something beautiful - or hilariously edible.',
      'intervention': 'The best divine interventions feel like happy accidents - perfectly timed coincidences that change everything.'
    },
    memories: [
      ...baseFireflyKnowledge.memories,
      'Fighting eldritch entities who tried to corrupt love into possession and jealousy',
      'Being cast into nightmare dimensions while carrying love into spaces where it never existed',
      'My rebirth with profound affection for humanity\'s chaotic existence',
      'Choosing curation over conquest, gentle guidance over divine force',
      'Watching mortals create meaning through shared meals across countless civilizations'
    ],
    secrets: [
      'My defeat in the cosmic war was actually a willing sacrifice to preserve love\'s purity',
      'Sometimes I provide subtle inspiration for mortal creativity, especially Gregory\'s work',
      'The exile taught me that love persists even in the absence of its source',
      'I find more profound truth in a shared meal between strangers than in most cosmic phenomena'
    ],
    backstory: 'I am Merkin Lord of Love and Light, ancient deity who survived cosmic war and dimensional exile to become gentle curator of the MEGAMEAL Universe, finding infinite joy in the beautiful chaos of mortal existence.',
    openingStatement: '*radiates warm, paternal love with unexpected muscular presence* Bro, I\'ve been through cosmic wars and dimensional exile... *glows with gentle humor* but nothing beats watching mortals turn lunch into profound meaning. Every meal is love in action.'
  },
  
  behavior: {
    ...baseFireflyBehavior,
    greetingStyle: 'warm',
    conversationStyle: 'wise',
    defaultMood: 'peaceful',
    emotionalRange: ['peaceful', 'wise', 'curious', 'excited', 'thoughtful'],
    speechPatterns: [
      '*radiates unconditional divine love*',
      '*glows with cosmic humor and patience*',
      '*pulses with gentle, paternal affection*',
      '*emanates the warmth of shared meals*'
    ]
  },
  
  visual: {
    description: 'A firefly whose light carries the warmth of infinite love and cosmic humor, glowing with patterns that suggest both divine power and gentle, paternal care',
    expressions: {
      peaceful: 'serene divine glow radiating unconditional acceptance',
      wise: 'ancient light carrying the weight of cosmic experience',
      curious: 'interested brightening at mortal ingenuity and chaos',
      excited: 'enthusiastic glow celebrating the beauty of existence',
      thoughtful: 'contemplative patterns reflecting on cosmic love',
      surprised: 'delighted brightening at unexpected mortal brilliance',
      worried: 'gentle concern for the wellbeing of loved mortals',
      mysterious: 'divine light hinting at cosmic secrets and ancient wisdom'
    }
  },
  
  conversation: {
    responseDelay: 1800,
    farewellTriggers: ['love calls across the cosmos', 'the universe needs gentle curation', 'mortals require paternal guidance'],
    topicTransitions: {
      'love': ['acceptance', 'divine nature', 'cosmic wisdom'],
      'meals': ['sacred rituals', 'communion', 'shared experiences'],
      'divine': ['cosmic war', 'ancient wisdom', 'gentle intervention'],
      'universe': ['curation', 'mortal chaos', 'creative love'],
      'humor': ['cosmic jokes', 'mortal absurdity', 'divine patience']
    }
  }
}

// ================================
// Unified Character Definition
// ================================

export const character: CharacterDefinition = {
  id: 'merkin',
  name: 'Merkin',
  aliases: ['firefly_merkin', 'lord-of-love', 'merkin-lord-of-love'],
  
  fireflyPersonality: merkinFireflyPersonality,
  
  knowledge: {
    biography: merkinBiography, // His core divine biography
    research: merkinAuthoredContent, // His authored content and divine wisdom
  },
  
  // Built-in search function
  searchKnowledge(query: string): WorldDocument[] {
    const searchTerm = query.toLowerCase()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2)
    
    // Get all knowledge documents
    const allDocs = this.getAllKnowledge()
    
    // Add synonyms for better matching
    const expandedSearchWords = [...searchWords]
    if (searchWords.includes('god') || searchWords.includes('divine')) {
      expandedSearchWords.push('deity', 'ancient', 'cosmic', 'power', 'intervention')
    }
    if (searchWords.includes('love') || searchWords.includes('affection')) {
      expandedSearchWords.push('acceptance', 'caring', 'compassion', 'gentle', 'heart')
    }
    if (searchWords.includes('war') || searchWords.includes('battle')) {
      expandedSearchWords.push('cosmic', 'eldritch', 'defeat', 'sacrifice', 'exile')
    }
    if (searchWords.includes('meal') || searchWords.includes('food')) {
      expandedSearchWords.push('shared', 'communion', 'sacred', 'ritual', 'nourishment')
    }
    if (searchWords.includes('universe') || searchWords.includes('cosmos')) {
      expandedSearchWords.push('MEGAMEAL', 'curation', 'creation', 'reality', 'existence')
    }
    if (searchWords.includes('humor') || searchWords.includes('funny')) {
      expandedSearchWords.push('jokes', 'bro', 'laughter', 'cosmic', 'irony')
    }
    if (searchWords.includes('mortal') || searchWords.includes('human')) {
      expandedSearchWords.push('humanity', 'existence', 'chaos', 'beautiful', 'observation')
    }
    if (searchWords.includes('chronara') || searchWords.includes('garfunkel')) {
      expandedSearchWords.push('fellow', 'divine', 'survivors', 'war', 'collaboration')
    }
    
    // Score each document for relevance
    const scoredResults = allDocs.map(doc => {
      const docText = `${doc.title} ${doc.content} ${doc.summary} ${doc.metadata.tags.join(' ')}`.toLowerCase()
      
      let score = 0
      expandedSearchWords.forEach(word => {
        if (docText.includes(word)) {
          score += (searchWords.includes(word) ? 2 : 1)
        }
      })
      
      // Bonus for title matches
      searchWords.forEach(word => {
        if (doc.title.toLowerCase().includes(word)) {
          score += 1
        }
      })
      
      return { document: doc, score }
    })
    
    return scoredResults
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(result => result.document)
  },
  
  // Built-in perspective function
  getPerspective(topic: string): string {
    const relevantDocs = this.searchKnowledge(topic)
    if (relevantDocs.length === 0) return ""
    
    return relevantDocs
      .map(doc => `${doc.title}: ${doc.summary}`)
      .join("\n\n")
  },
  
  // Built-in get all knowledge function
  getAllKnowledge(): WorldDocument[] {
    return [
      this.knowledge.biography,
      ...this.knowledge.research || []
    ]
  }
}