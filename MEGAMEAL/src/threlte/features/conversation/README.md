# MEGAMEAL AI Character System
## ECS-Aligned Multi-Agent Memory Management Architecture

### Overview

The MEGAMEAL AI Character System is a modern, scalable architecture for creating rich, interactive AI characters with extensive knowledge bases and authentic personalities. The system uses an ECS-aligned design with auto-discovery, centralized token management, and smart memory compression to achieve 80-96% token savings while maintaining high conversation quality.

**Latest Architecture (v3.0 - ECS-Aligned):**
- **Unified Character Definitions**: Single file per character with auto-discovery
- **Embedded Knowledge**: No external imports - complete knowledge embedded in character files  
- **ECS Integration**: Clean component-based architecture that integrates with the game's ECS system
- **Auto-Discovery**: New characters are automatically available by creating a single file
- **Centralized Token Management**: Single source of truth for response limits via MemoryManagerAgent

---

## Quick Start: Creating a New Character

Creating a new character is now as simple as adding one file:

1. **Create character file**: `/src/threlte/systems/conversation/characters/definitions/new-character.ts`
2. **That's it!** The CharacterRegistry will automatically discover and load your character

**Template:**
```typescript
/**
 * New Character - Unified Character Definition
 * 
 * Brief description of who this character is
 */

import type { CharacterDefinition } from '../types'
import type { WorldDocument } from '../../worldKnowledge'
import { FIREFLY_SPECIES, baseFireflyKnowledge, baseFireflyBehavior } from '../types'

// ================================
// Character's Complete Knowledge (Embedded)
// ================================

const characterBiography: WorldDocument = {
  id: 'new-character-bio',
  type: 'character',
  title: 'Character Name - The Description',
  content: `Detailed character biography and background...`,
  summary: 'One-sentence character summary',
  metadata: {
    tags: ['relevant', 'search', 'keywords'],
    relatedCharacters: ['other-character-ids'],
    timeperiod: 'relevant-time-period',
    category: 'character-type',
    importance: 'high'
  }
}

const characterResearch: WorldDocument[] = [
  {
    id: 'character-specialty',
    type: 'lore',
    title: 'Character\'s Work or Specialty',
    content: `Detailed content about their professional work, discoveries, or expertise...`,
    summary: 'Summary of this knowledge document',
    metadata: {
      tags: ['specialty', 'keywords'],
      relatedCharacters: ['new-character'],
      timeperiod: 'relevant-period',
      importance: 'critical'
    }
  }
  // Add more knowledge documents as needed
]

// Character's firefly personality (lost soul theme)
const characterFireflyPersonality = {
  species: FIREFLY_SPECIES.APPROPRIATE_TYPE,
  age: 'descriptive age',
  core: 'Core description reflecting their lost soul nature and past life wisdom',
  traits: ['personality', 'traits'],
  quirks: ['unique', 'behaviors'],
  interests: ['areas', 'of', 'expertise'],
  fears: ['what', 'troubles', 'them'],
  goals: ['what', 'drives', 'them', 'now'],
  
  knowledge: {
    topics: {
      ...baseFireflyKnowledge.topics,
      'specialty': 'What they say about their area of expertise',
      'background': 'How they reflect on their past life'
    },
    memories: [
      ...baseFireflyKnowledge.memories,
      'Specific memories from their past life',
      'Key moments that defined them'
    ],
    secrets: [
      'Hidden knowledge or experiences they rarely share'
    ],
    backstory: 'How they became a firefly and their transformation story',
    openingStatement: '*appropriate greeting that reflects their personality*'
  },
  
  behavior: {
    ...baseFireflyBehavior,
    greetingStyle: 'warm', // or 'shy', 'mysterious', etc.
    conversationStyle: 'wise',
    defaultMood: 'peaceful',
    emotionalRange: ['peaceful', 'thoughtful', 'sad', 'wise', 'curious'],
    speechPatterns: [
      '*characteristic light patterns or behaviors*'
    ]
  },
  
  visual: {
    description: 'How their light appears and what it suggests about their nature',
    expressions: {
      peaceful: 'how they look when peaceful',
      thoughtful: 'how they look when contemplating',
      // Add other emotional expressions
    }
  },
  
  conversation: {
    responseDelay: 2000, // milliseconds
    farewellTriggers: ['what makes them say goodbye'],
    topicTransitions: {
      'topic1': ['related', 'topics'],
      'topic2': ['other', 'connections']
    }
  }
}

// ================================
// Unified Character Definition
// ================================

export const character: CharacterDefinition = {
  id: 'new-character',
  name: 'Character Full Name',
  aliases: ['firefly_character', 'other-aliases'],
  
  fireflyPersonality: characterFireflyPersonality,
  
  knowledge: {
    biography: characterBiography,
    research: characterResearch,
  },
  
  // Built-in search function
  searchKnowledge(query: string): WorldDocument[] {
    const searchTerm = query.toLowerCase()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2)
    
    const allDocs = this.getAllKnowledge()
    
    // Add character-specific synonyms for better matching
    const expandedSearchWords = [...searchWords]
    if (searchWords.includes('keyword1')) {
      expandedSearchWords.push('synonym1', 'synonym2')
    }
    // Add more synonym mappings as needed
    
    // Score and return relevant documents
    const scoredResults = allDocs.map(doc => {
      const docText = `${doc.title} ${doc.content} ${doc.summary} ${doc.metadata.tags.join(' ')}`.toLowerCase()
      
      let score = 0
      expandedSearchWords.forEach(word => {
        if (docText.includes(word)) {
          score += (searchWords.includes(word) ? 2 : 1)
        }
      })
      
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
      characterBiography,
      ...characterResearch
    ]
  }
}
```

---

## Architecture Overview

### ECS-Aligned Design

```
/characters/
├── types.ts                          # Core interfaces and types
├── CharacterRegistry.ts               # Auto-discovery with dynamic imports
├── CharacterComponent.ts              # Clean ECS interface
├── index.ts                          # Main exports
└── definitions/
    ├── elara-voss.ts                 # Each character is one complete file
    ├── helena-zhao.ts                # with embedded knowledge
    ├── ava-chen.ts                   # and auto-discovery
    ├── maya-okafor.ts                # 
    ├── soren-klein.ts                # No imports between character files
    ├── gregory-aster.ts              # No complex file dependencies
    ├── kaelen-vance.ts               # Just create file → character available
    ├── eleanor-kim.ts                #
    └── vex-kanarath.ts               #
```

### Multi-Agent Memory Management

```
User Input → Memory Manager Agent → Cloudflare Worker → AI Model → Response
              ↓                       ↓
         Character Knowledge     Centralized Token
         Auto-Discovery +        Limit (150 tokens)
         Smart RAGate +          + Flexible Instructions
         Memory Compression
```

**Key Components:**
- **CharacterRegistry**: Auto-discovers and loads characters with dynamic imports
- **Memory Manager Agent**: Decides what memories to retrieve, compresses them, sets response limits
- **Character Definitions**: Self-contained files with embedded knowledge and search functions
- **RAGate System**: Smart binary decision on whether memories are needed (12+ char threshold)
- **Centralized Token Management**: Single source of truth for response limits

---

## Current Characters (All Migrated ✅)

| Character | File | Status | Specialties |
|-----------|------|--------|-------------|
| **Elara Voss** | `elara-voss.ts` | ✅ Complete | Qarnivor extinction scholar, spork tattoo, died at 139 |
| **Helena Zhao** | `helena-zhao.ts` | ✅ Complete | Salvage commander, "Second Breakfast" ship, temporal anomalies |
| **Ava Chen** | `ava-chen.ts` | ✅ Complete | AI emergence theorist, five pioneer singularities |
| **Maya Okafor** | `maya-okafor.ts` | ✅ Complete | Quantum consciousness, superintelligence dynamics |
| **Soren Klein** | `soren-klein.ts` | ✅ Complete | Teenage genius, consciousness research, institutional bias |
| **Gregory Aster** | `gregory-aster.ts` | ✅ Complete | Universe creator, cosmic storytelling, narrative reality |
| **Kaelen Vance** | `kaelen-vance.ts` | ✅ Complete | Xenohistorian, diaspora civilizations, alien contact |
| **Eleanor Kim** | `eleanor-kim.ts` | ✅ Complete | Digital consciousness researcher, empathetic methodology |
| **Vex Kanarath-9** | `vex-kanarath.ts` | ✅ Complete | Digital archaeologist, died 9 times, consciousness excavation |
| **Merkin** | `merkin.ts` | ✅ Complete | Ancient god of love, cosmic war survivor, MEGAMEAL curator |

---

## Core System Components

### CharacterRegistry (Auto-Discovery)

The registry automatically discovers and loads characters using dynamic imports:

```typescript
// Automatic character loading - no manual registration needed!
const character = await registry.getCharacter('helena-zhao')
// Automatically imports and caches '/definitions/helena-zhao.ts'
```

**Features:**
- **Dynamic Imports**: Characters loaded on-demand
- **ID Normalization**: Handles various ID formats (`helena-zhao`, `firefly_helena`, etc.)
- **Automatic Caching**: Characters cached after first load
- **Error Handling**: Graceful fallback if character files are missing

### Memory Manager Agent

Intelligent memory orchestration achieving 80-96% token savings:

```typescript
interface MemoryManagerConfig {
  maxMemories: number              // Default: 3 (optimized for character knowledge)
  maxTokensPerMemory: number       // Default: 400 (increased for detailed character content)
  maxResponseTokens: number        // Default: 200 (centralized, flexible)
  compressionRatio: number         // Target: 0.5 (balanced compression for accuracy)
  relevanceThreshold: number       // Default: 1.0 (lowered for better knowledge retrieval)
  enableRAGate: boolean           // Smart binary decisions
}
```

**Smart RAGate Decision Logic:**
- **Skip memories**: Simple greetings ("hi", "hello", "thanks", "bye")
- **Retrieve memories**: Questions, character queries, substantive conversations (>12 characters)
- **Context-aware**: Pattern recognition for memory triggers

### Character Definition Interface

Every character implements this unified interface:

```typescript
interface CharacterDefinition {
  id: string
  name: string
  aliases: string[]
  fireflyPersonality: FireflyPersonality
  knowledge: CharacterKnowledge
  searchKnowledge(query: string): WorldDocument[]
  getPerspective(topic: string): string
  getAllKnowledge(): WorldDocument[]
}
```

**Benefits:**
- **Consistency**: All characters work the same way
- **Self-Contained**: No external dependencies or imports
- **Searchable**: Built-in search optimized for each character
- **Maintainable**: Easy to understand and modify

---

## Performance & Configuration

### Current Settings (v3.1 - Optimized)

```typescript
{
  maxMemories: 3,                    // Up to 3 memories for richer character knowledge
  maxTokensPerMemory: 400,          // 400 tokens per compressed memory
  maxResponseTokens: 200,           // Flexible response limit (allows longer when needed)
  compressionRatio: 0.5,            // 50% compression for accuracy balance
  relevanceThreshold: 1.0,          // Lower threshold for better character knowledge retrieval
  enableRAGate: true                // Smart memory retrieval decisions
}
```

### Response Philosophy

- **Simple interactions**: Brief, mystical responses (10-30 tokens)
- **Knowledge queries**: Detailed when appropriate (60-150 tokens)
- **Always in character**: Reference specific memories and expertise
- **Lost souls theme**: Fireflies carry wisdom and emotions from their past lives

### Performance Metrics

- **Token Savings**: 80-96% reduction compared to loading full knowledge bases
- **Memory Compression**: 50-70% reduction in memory size while preserving relevance
- **Response Quality**: Authentic character responses with specific knowledge integration
- **Load Time**: Fast character loading with dynamic imports and caching

---

## Development Workflow

### Testing New Characters

1. **Create character file** in `/definitions/` folder
2. **Test character loading**: 
   ```typescript
   const character = await registry.getCharacter('new-character')
   console.log(character.name) // Should work immediately
   ```
3. **Test conversation**: Click firefly in Observatory level
4. **Check console logs**:
   ```
   🧠 Using Memory Manager Agent for new-character
   📊 Memory Management Results: 2 memories, 450 tokens
   💰 Token savings: 85%
   ```
5. **Verify responses**: Characters should reference their specific knowledge

### Debug Information

Essential console logs to monitor:
```
🧠 Using Memory Manager Agent for {character}
📊 Memory Management Results: {memories} memories, {tokens} tokens
💰 Token savings: {percentage}%
🚀 ConversationManager sending to AI service: maxTokens {limit}
```

### Common Issues

- **Character not found**: Check file name matches ID in character definition
- **No memories retrieved**: Verify query length (>12 chars) and RAGate threshold
- **Poor responses**: Check character knowledge tags and search terms
- **Knowledge not found**: Ensure knowledge is embedded in character file, not imported

---

## Lost Souls Theme Integration

All firefly characters follow the "lost souls" theme - they are the spirits of these deceased characters who now exist as wandering lights, carrying wisdom and emotions from their past lives.

### Emotional Characteristics

Characters should embody emotions like:
- **Sadness**: Grief over their lost physical existence
- **Wisdom**: Hard-earned knowledge from their life experiences  
- **Nostalgia**: Longing for their past lives and relationships
- **Acceptance**: Coming to terms with their transformed existence
- **Wonder**: Appreciation for their new perspective on existence
- **Longing**: Desire for connection and understanding

### Conversation Patterns

- **Mysterious but informative**: Share knowledge cryptically but meaningfully
- **Emotional depth**: Reference the weight of their experiences
- **Specific memories**: Draw from their actual life events and expertise
- **Transformative perspective**: Speak from their unique vantage point between life and death

---

## Future Enhancements

### Planned Features
- **Dynamic relationships**: Characters can reference each other and shared experiences
- **Emotional state persistence**: Memory of previous conversations and mood changes
- **Knowledge expansion**: Easy addition of new character knowledge without system changes
- **Advanced search**: Semantic search and better context understanding

### Extensibility
- **New character types**: System supports any type of character, not just fireflies
- **Custom conversation flows**: Support for branching dialogues and conditional responses
- **Integration with game events**: Characters can react to player actions and world changes

---

## Migration Notes

**✅ Migration Complete**: All characters have been successfully migrated from the old scattered file system to the new unified ECS-aligned architecture.

**Old System** (deprecated):
- Complex imports between character files
- Scattered knowledge across multiple files
- Manual registration required
- Difficult to maintain and debug

**New System** (current):
- Single file per character with embedded knowledge
- Auto-discovery with no manual registration
- Clean, maintainable architecture
- Easy to create new characters

**Legacy files cleaned up**: All old character knowledge files, the legacy `fireflyPersonalities.ts` system, and migration documentation have been consolidated into this unified guide. Observatory utility functions have been migrated to the modern character system.

---

*This architecture ensures that creating rich, intelligent AI characters is as simple as creating a single file, while maintaining high performance, conversation quality, and system maintainability.*