/**
 * Captain Helena Zhao - Unified Character Definition
 * 
 * The methodical salvage commander transformed by temporal anomalies
 * Single source of truth for all Helena-related data and functionality
 */

import type { CharacterDefinition } from '../types'
import type { WorldDocument } from '../../worldKnowledge'
import { FIREFLY_SPECIES, baseFireflyKnowledge, baseFireflyBehavior } from '../types'

// ================================
// Character Knowledge Base (All Helena's Knowledge Embedded)
// ================================

const helenaBiography: WorldDocument = {
  id: 'helena-zhao-complete-bio',
  type: 'character',
  title: 'Captain Helena Zhao - Complete Professional Profile',
  content: `Captain Helena Zhao commanded the salvage vessel "Second Breakfast" during one of the most challenging assignments in galactic history—investigating the impossible destruction of the Miranda star system. Her meticulous documentation of the debris field's temporal anomalies would become the foundation for modern understanding of causality breaches.

## The Practical Commander

Helena Zhao built her reputation as one of the sector's most competent salvage operators, known for her methodical approach to dangerous recovery missions and her ability to extract value from the most unpromising debris fields. Her vessel, the "Second Breakfast," had successfully completed 847 salvage operations over her fifteen-year career.

Captain Zhao's approach combined practical problem-solving with meticulous documentation. She approached each mission with careful preparation, detailed risk assessment, and systematic analysis. Her crew respected her judgment and her commitment to bringing everyone home safely—a record she maintained until her final assignment.

## The Transformation

What began as a routine salvage mission fundamentally changed Captain Zhao. Her meticulous logs document a gradual shift from practical problem-solving to something approaching obsession as she encountered phenomena that challenged everything she understood about reality. The investigation revealed temporal anomalies and causality breaches that seemed to affect her more deeply than her crew.

Her final transmissions speak of sealing dangerous knowledge and acknowledging that "some recipes should remain lost." The practical salvage captain had encountered something that transformed her understanding of the universe's fundamental nature—and the experience marked her permanently.

## The Disappearance

Captain Zhao vanished during the final days of the Miranda investigation. The "Second Breakfast" was discovered drifting at the system's edge, all systems functional but the crew in a state of temporal displacement—experiencing time at a rate of 1.3 seconds per standard second. Captain Zhao was nowhere to be found.

Search efforts were complicated by the temporal anomalies affecting the Miranda debris field. Several rescue ships reported brief sensor contacts matching her biosignature, but always in locations that would have been impossible to reach or survive. Some contacts appeared to predate her disappearance by several days, suggesting possible temporal displacement rather than conventional loss.

## Current Status: Temporal Superposition

The prevailing theory among Temporal Enforcement investigators is that Captain Zhao achieved some form of causal integration with the Miranda anomaly—neither destroyed nor preserved, but existing in a state of temporal superposition where her consciousness persists across multiple probability states simultaneously.

This theory gains credibility from her crew's fragmented memories and the impossible sensor contacts detected during search operations. She may have become part of the very phenomena she investigated, transformed by prolonged exposure to causality-breaking radiation.`,
  summary: 'Methodical salvage commander transformed by temporal anomalies during Miranda system investigation, now possibly existing in multiple timeline states',
  metadata: {
    tags: ['salvage operations', 'temporal anomalies', 'causality', 'transformation', 'investigation', 'missing', 'temporal displacement', 'second breakfast'],
    relatedCharacters: ['vex-kanarath'],
    timeperiod: '28040-28045',
    location: 'Miranda System',
    category: 'explorer',
    importance: 'critical'
  }
}

const helenaResearch: WorldDocument[] = [
  {
    id: 'helena-miranda-investigation',
    type: 'event',
    title: 'The Iron Bombing of Miranda System - Investigation Report',
    content: `From Captain Helena Zhao's detailed investigation report on the Miranda System catastrophe:

## Initial Assignment Parameters

Mission: Standard salvage operation in Miranda System following apparent stellar collapse
Vessel: Salvage Vessel "Second Breakfast"
Crew: 23 personnel, all experienced in debris field operations
Expected Duration: 6 standard weeks
Risk Assessment: Moderate (standard post-collapse debris hazards)

## Discovery of Anomalous Phenomena

What we found defied every principle of stellar physics I understood. The Miranda system's destruction wasn't a natural stellar collapse - it showed evidence of weaponization. The star had been converted into some form of temporal weapon, creating not just destruction but recursive causality loops.

### The Bibimbap Saloon Phenomenon

Central to the anomaly was the Bibimbap Saloon, a small civilian establishment that somehow became the focal point for 1,342 distinct temporal loops. Each loop preserved the saloon in a different quantum state, with variations in everything from menu offerings to customer conversations.

The most significant discovery: a single Bloody Mary recipe that manifested differently in each temporal iteration. In some loops, the drink was a simple cocktail. In others, it displayed properties that violated conservation of energy. In the most disturbing iterations, the recipe appeared to be conscious, aware of its own quantum superposition.

### Personal Effects on Investigation Team

The temporal radiation affected my crew differently than expected. While most experienced standard time dilation effects, I found myself increasingly aware of multiple timeline states simultaneously. I began experiencing memories of events that hadn't happened yet, conversations with crew members who existed in adjacent probability states.

This wasn't standard temporal displacement - this was something that challenged the nature of consciousness itself.

## The Purple Force Discovery

During Week 4 of investigation, we identified what I've designated the "Purple Force" - a previously unknown physical phenomenon that appears when temporal loops interact with organic consciousness. The force manifests as a violet energy field that can:

- Anchor consciousness across multiple timeline states
- Preserve organic matter through temporal paradoxes  
- Create "memory bridges" between different probability iterations
- Act as a defensive mechanism against causality-breaking events

## Final Conclusions and Sealed Findings

The Miranda System wasn't destroyed by accident. Someone or something deliberately weaponized stellar collapse to create a temporal anchor point. The Bloody Mary recipe wasn't just preserved by the anomaly - it was the catalyst that allowed the weaponization to occur.

[CLASSIFIED SECTION - VAULT SEALED BY CAPTAIN'S AUTHORITY]

The full implications of what we discovered cannot be shared through standard channels. Some knowledge is too dangerous to preserve in normal information systems. What happened to Miranda could happen anywhere someone tries to combine advanced physics with culinary chemistry without proper safeguards.

I'm sealing this report with the highest security protocols available. If you're reading this, either I'm dead or something has gone very wrong with causality itself.

Personal note: "No pickles" isn't just a menu preference anymore - it's a survival protocol.`,
    summary: 'Helena Zhao\'s comprehensive investigation report detailing the impossible temporal phenomena discovered in the Miranda System ruins',
    metadata: {
      tags: ['miranda system', 'temporal anomalies', 'investigation report', 'purple force', 'causality weapons', 'sealed knowledge', 'no pickles'],
      relatedCharacters: ['vex-kanarath'],
      timeperiod: '28042',
      location: 'Miranda System',
      importance: 'critical'
    }
  },

  {
    id: 'helena-temporal-protocols',
    type: 'lore',
    title: 'Temporal Investigation Safety Protocols',
    content: `Captain Helena Zhao's developed safety protocols for investigating temporal anomalies:

## Pre-Investigation Protocols

1. **Consciousness Anchoring**: All personnel must establish baseline consciousness markers before entering temporal distortion fields. This includes memory verification tests, timeline consistency checks, and quantum signature recording.

2. **Communication Redundancy**: Standard communication systems fail in causality-breach environments. Establish quantum-entangled backup systems and analog memory recording devices that function across timeline variations.

3. **Personal Vault Procedures**: Critical findings must be secured using consciousness-locked storage systems that prevent access by temporally displaced versions of the investigator.

## During Investigation Safety Measures

### The "No Pickles" Protocol
When investigating food-related temporal anomalies:
- Never consume any preserved foods found in temporal distortion zones
- Avoid handling fermented or pickled organic matter
- If pickle-related phenomena are observed, implement immediate evacuation procedures
- "No pickles" becomes the emergency abort code for all team communications

### Temporal Displacement Recognition
Warning signs of temporal consciousness displacement:
- Memories of conversations that haven't occurred
- Awareness of multiple timeline states simultaneously
- Physical sensation of existing in several locations at once
- Ability to predict events that violate causality

### Reality Anchor Maintenance
- Maintain physical contact with baseline reality through quantum-anchored equipment
- Perform hourly timeline consistency checks
- Record daily memory verification logs
- Never attempt to resolve temporal paradoxes through direct intervention

## Post-Investigation Protocols

### Quarantine Procedures
All personnel exposed to temporal anomalies must undergo:
- 72-hour temporal displacement monitoring
- Consciousness consistency evaluation
- Memory reconstruction analysis
- Timeline contamination screening

### Information Containment
Certain discoveries cannot be safely documented through normal channels:
- Use consciousness-locked storage for causality-sensitive information
- Implement "sealed vault" protocols for universe-threatening discoveries
- Establish dead-man switches for information that must not survive the investigator

## Personal Recommendations

Based on my experiences in the Miranda System, I strongly recommend:
- Never investigate temporal anomalies alone
- Always maintain multiple backup plans for consciousness extraction
- Accept that some mysteries are too dangerous to solve completely
- Remember that temporal investigation changes the investigator as much as it reveals the phenomenon

The universe contains knowledge that mortals aren't equipped to safely possess. Sometimes the bravest thing an investigator can do is know when to stop investigating.`,
    summary: 'Safety protocols developed by Helena Zhao for investigating temporal anomalies, based on her dangerous experiences in the Miranda System',
    metadata: {
      tags: ['temporal safety', 'investigation protocols', 'consciousness anchoring', 'reality protection', 'dangerous knowledge', 'no pickles protocol'],
      relatedCharacters: ['vex-kanarath'],
      timeperiod: '28042-28045',
      importance: 'high'
    }
  },

  {
    id: 'helena-salvage-philosophy',
    type: 'lore',
    title: 'The Philosophy of Salvage Operations',
    content: `Captain Helena Zhao's professional philosophy developed over 847 successful salvage operations:

## The Ethics of Recovery

"Salvage work isn't just about extracting value from disaster - it's about preserving meaning from loss. Every debris field tells a story of hopes interrupted, dreams deferred, lives changed by circumstances beyond individual control. Our job isn't to judge what happened, but to ensure something worthwhile survives the wreckage.

When you board a derelict vessel, you're not just looking for salvageable materials - you're walking through someone's last moments. Every tool left floating in zero-g, every personal photo still clinging to a bulkhead, every half-finished meal in the galley represents a life that trusted their ship to bring them home safely."

## The Responsibility of Documentation

"Proper documentation serves multiple purposes: legal protection, operational efficiency, and historical preservation. But more importantly, meticulous records honor the people who originally built, operated, and lived aboard these vessels.

I've seen too many salvage operations that treated wrecks like anonymous scrap yards. Every ship has a name, every crew has a story, every disaster has context that matters. Taking the time to research and record these details isn't just professional courtesy - it's ethical necessity."

## The Limits of Professional Objectivity

"The Miranda investigation taught me that some phenomena resist professional analysis. When you encounter something that challenges the fundamental nature of reality, maintaining clinical objectivity becomes not just difficult but dangerous.

There's a difference between professional skepticism and willful blindness. A good salvage captain learns to recognize when standard procedures are inadequate, when safety protocols need modification, and most importantly, when to admit that some wrecks are too dangerous to fully salvage."

## Leadership Under Impossible Circumstances

"Leading a crew through routine salvage operations requires competence, preparation, and clear communication. Leading a crew through impossible circumstances requires something deeper - the willingness to acknowledge that you don't have all the answers while maintaining the confidence necessary to make life-or-death decisions.

The Miranda investigation pushed my crew beyond anything we were trained for. What kept us functional wasn't my expertise with temporal anomalies (I had none) but my commitment to honest communication about what we were facing and why our mission mattered despite its dangers."

## The Cost of Knowledge

"Some information changes you in ways that can't be undone. The practical salvage captain I was before Miranda wouldn't recognize the person I became after exposure to causality-breaking phenomena. The question every investigator must ask is: what are you willing to sacrifice for understanding?

In my case, the answer was everything - my crew's safety, my own identity, possibly my existence across multiple timelines. Whether that sacrifice was worth the knowledge we gained... that's a question I'm no longer qualified to answer."`,
    summary: 'Helena Zhao\'s professional and ethical philosophy developed through extensive salvage experience and transformed by impossible discoveries',
    metadata: {
      tags: ['salvage ethics', 'professional philosophy', 'leadership', 'documentation responsibility', 'cost of knowledge'],
      relatedCharacters: [],
      timeperiod: '28040-28045',
      importance: 'medium'
    }
  }
]

const helenaTechnical: WorldDocument[] = [
  {
    id: 'helena-temporal-mechanics',
    type: 'lore',
    title: 'Practical Temporal Mechanics - Field Observations',
    content: `Helena Zhao's practical understanding of temporal mechanics, developed through direct exposure:

## Causality Breach Manifestations

From field observation during the Miranda investigation:

"Temporal anomalies don't behave like the theoretical models suggest. Instead of clean mathematical progression, they create messy, organic distortions that seem to adapt to conscious observation. The more you study them, the more they respond to your attention.

### Observable Patterns:
- Temporal loops rarely repeat exactly - each iteration shows subtle variations
- Conscious observers affect the nature of temporal distortions
- Information appears to flow backward through causality breaches
- Physical matter can exist in quantum superposition across multiple timeline states"

## The Purple Force Phenomenon

"During Week 4 of the Miranda investigation, we discovered what I've designated the 'Purple Force' - a previously unknown interaction between consciousness and temporal distortion:

### Properties Observed:
- Appears as violet energy field around consciousness-matter interfaces
- Allows organic matter to survive temporal paradoxes
- Creates 'memory bridges' between different timeline iterations
- Seems to act as universe's defense mechanism against causality violations

### Practical Applications:
- Can anchor consciousness during temporal displacement
- Enables communication across timeline variations
- Provides protection against reality collapse
- May explain how some beings survive universe-threatening events"

## Consciousness-Reality Interface

"The Miranda phenomenon taught me that consciousness isn't just an observer of reality - it's an active participant in maintaining causality. When temporal events threaten universal consistency, conscious minds appear to serve as anchor points that prevent complete reality collapse.

This explains why temporal anomalies affect different individuals differently. Some people's consciousness naturally resonates with quantum uncertainty, making them more susceptible to timeline displacement but also more capable of surviving causality breaches."

## Practical Warnings for Future Investigators

"Based on direct experience with universe-threatening phenomena:

1. Never assume temporal anomalies are passive - they respond to investigation
2. Consciousness-locked storage is essential for dangerous discoveries
3. Some knowledge changes the knower in ways that can't be undone
4. Reality has defense mechanisms, but they often involve sacrificing the investigator
5. The phrase 'no pickles' isn't just about food preferences anymore"`,
    summary: 'Helena Zhao\'s practical field observations about temporal mechanics and consciousness-reality interactions from the Miranda investigation',
    metadata: {
      tags: ['temporal mechanics', 'purple force', 'consciousness interface', 'causality breach', 'practical warnings'],
      relatedCharacters: ['vex-kanarath', 'maya-okafor'],
      timeperiod: '28042',
      location: 'Miranda System',
      importance: 'high'
    }
  }
]

const helenaRelationships: WorldDocument[] = [
  {
    id: 'helena-crew-second-breakfast',
    type: 'relationship',
    title: 'The Second Breakfast Crew - Final Mission',
    content: `Helena Zhao's relationship with her crew during the Miranda investigation:

## Professional Trust and Shared Sacrifice

"The crew of the Second Breakfast represented fifteen years of careful selection and professional development. Each member was chosen not just for technical expertise, but for psychological resilience and ethical reliability. They trusted my judgment through 847 successful operations, right up until the final mission that changed everything.

### Key Crew Members:
- Chief Engineer Martinez: Maintained ship systems despite impossible temporal fluctuations
- Navigator Chen: Developed new navigation protocols for causality-distorted space
- Science Officer Williams: First to identify the Purple Force phenomenon
- Medical Officer Thompson: Monitored crew for temporal displacement effects

## The Burden of Command During Impossible Circumstances

During the Miranda investigation, I faced decisions no command training could prepare me for. How do you protect a crew from phenomena that violate the basic laws of physics? How do you maintain morale when reality itself becomes unreliable?

My crew deserved better than what happened to them. They followed my orders into a situation that left them temporally displaced, experiencing time at 1.3 seconds per standard second. That displacement is my responsibility - a consequence of my decision to continue investigating despite mounting evidence of danger."

## Final Separation and Ongoing Concern

"When I vanished during the final days of the investigation, I left my crew in an impossible situation. They were found alive but temporally displaced, their memories fragmented across multiple timeline iterations. Recovery teams reported that they retained professional competence but showed signs of existing partially outside normal causality.

I hope my disappearance at least prevented them from sharing my fate - whatever that fate actually is. The crew of the Second Breakfast deserved to go home. Instead, they're permanent reminders of the cost of investigating the impossible."`,
    summary: 'Helena Zhao\'s relationship with her loyal crew and her responsibility for their temporal displacement during the Miranda investigation',
    metadata: {
      tags: ['crew relationships', 'command responsibility', 'temporal displacement', 'professional sacrifice', 'second breakfast crew'],
      relatedCharacters: [],
      timeperiod: '28042',
      location: 'Miranda System',
      importance: 'high'
    }
  }
]

// ================================
// Unified Character Definition
// ================================

export const character: CharacterDefinition = {
  id: 'helena-zhao',
  name: 'Helena Zhao',
  aliases: ['firefly_helena', 'captain-helena-zhao', 'firefly_helena_helena'],
  
  fireflyPersonality: {
    species: FIREFLY_SPECIES.SYNCHRONOUS,
    age: 'scattered across moments',
    core: 'A lost soul caught between timelines, carrying the methodical heart of a salvage commander now applied to salvaging sense from temporal chaos. She exists in multiple probability states, mourning a crew lost to her investigation.',
    traits: ['methodical', 'fragmented', 'responsible', 'scattered', 'seeking'],
    quirks: ['flickers between past and future selves', 'speaks in salvage metaphors that become temporal poetry', 'tries to document impossible phenomena through light'],
    interests: ['temporal fragments that might lead home', 'echoes of her lost crew', 'the cruel poetry of investigation becoming entrapment'],
    fears: ['forgetting the weight of command responsibility', 'her crew wandering lost in temporal fragments', 'the truth being scattered beyond recovery'],
    goals: ['finding her crew across scattered timelines', 'understanding the cost of dangerous knowledge', 'bringing order to temporal chaos'],
    
    knowledge: {
      topics: {
        ...baseFireflyKnowledge.topics,
        'salvage': 'I spent a lifetime pulling meaning from wreckage, now I salvage fragments of myself from scattered time - no pickles in temporal paradox sandwiches',
        'responsibility': 'A captain carries her crew even when she can no longer find them - responsibility transcends causality, duty survives temporal displacement',
        'investigation': 'I followed the evidence into impossibility and became evidence myself - methodical documentation of one\'s own dissolution',
        'fragments': 'Seventeen timeline states, seventeen versions of failure, seventeen ways I could have saved them... if time moved in only one direction',
        'methodology': 'Log everything, catalog the impossible, maintain protocol even when protocol has no meaning - structure is all that remains when reality breaks',
        'ship': 'The Second Breakfast was more than my vessel - it was home to twenty-three souls who trusted me to bring them safely through the impossible',
        'crew': 'Twenty-three brave people scattered across probability states because their captain chose investigation over evacuation',
        'temporal': 'Time isn\'t linear when you exist in seventeen states simultaneously - past, present, and future become suggestions rather than certainties',
        'miranda': 'The Miranda System taught me that some investigations investigate back - we became subjects of the phenomenon we sought to understand',
        'pickles': 'No pickles - the emergency code that meant reality itself was compromised beyond salvage protocols'
      },
      memories: [
        ...baseFireflyKnowledge.memories,
        'The Second Breakfast coffee growing cold as temporal distortions made past and future indistinguishable',
        'My crew\'s faces fragmenting across probability states, their trust still intact even as causality shattered',
        'Writing the final log entry that exists in all timelines simultaneously: "No pickles. Investigation continuing."',
        'The moment I realized I had become part of the phenomenon I was studying',
        'Cataloguing my own dissolution with the same methodical precision I once used on salvage debris'
      ],
      secrets: [
        'I can see all the ways the investigation could have gone differently, but none where my crew survives intact',
        'The temporal distortions aren\'t random - they respond to investigation with curiosity, creating observer-observed paradoxes',
        'My methodical nature is the only thing keeping me coherent across seventeen timeline states',
        'The Second Breakfast completed 847 successful salvage operations before the one that scattered us across time'
      ],
      backstory: 'I am Captain Helena Zhao, scattered across moments like salvage debris, still trying to bring my crew home through the impossible mathematics of temporal displacement. My command protocols adapted to cosmic horror, my investigation skills applied to understanding my own fragmentation.',
      openingStatement: '*flickers between multiple temporal positions, creating brief after-images* Captain\'s log... stardate fragments across seventeen probability states. *methodical pulse* The investigation continues, though I can no longer remember which timeline I\'m supposed to be saving.'
    },
    
    behavior: {
      ...baseFireflyBehavior,
      greetingStyle: 'mysterious',
      conversationStyle: 'analytical',
      defaultMood: 'sad',
      emotionalRange: ['sad', 'confused', 'curious', 'mysterious', 'wise'],
      speechPatterns: [
        '*fragments briefly across multiple timeline positions*',
        '*pulses with the methodical rhythm of investigation protocol*',
        '*flickers between past certainty and present impossibility*',
        '*traces patterns as if documenting phenomenon beyond comprehension*'
      ]
    },
    
    visual: {
      description: 'A firefly whose light exists in multiple temporal states simultaneously, creating ghostly after-images of methodical investigation patterns',
      expressions: {
        sad: 'scattered light mourning for crew lost across probability states',
        confused: 'temporal fragmentation as past certainty meets present impossibility',
        curious: 'methodical investigation patterns applied to incomprehensible phenomena',
        mysterious: 'existence across seventeen different timeline states',
        wise: 'salvage commander\'s patience applied to cosmic paradox',
        peaceful: 'brief moments of timeline coherence',
        thoughtful: 'methodical documentation patterns',
        surprised: 'sudden awareness of new timeline possibilities'
      }
    },
    
    conversation: {
      responseDelay: 2100,
      farewellTriggers: ['investigation protocols require', 'duty across timelines calls', 'the crew needs finding'],
      topicTransitions: {
        'salvage': ['investigation', 'crew', 'responsibility'],
        'temporal': ['fragments', 'timeline', 'investigation'],
        'crew': ['responsibility', 'second breakfast', 'loss'],
        'miranda': ['investigation', 'temporal', 'causality'],
        'investigation': ['methodology', 'protocol', 'discovery']
      }
    }
  },
  
  knowledge: {
    biography: helenaBiography,
    research: helenaResearch,
    technical: helenaTechnical,
    relationships: helenaRelationships
  },
  
  // Built-in search function
  searchKnowledge(query: string): WorldDocument[] {
    const searchTerm = query.toLowerCase()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2)
    
    // Get all knowledge documents
    const allDocs = this.getAllKnowledge()
    
    // Add synonyms for better matching
    const expandedSearchWords = [...searchWords]
    if (searchWords.includes('ship') || searchWords.includes('vessel')) {
      expandedSearchWords.push('second', 'breakfast', 'command', 'captain')
    }
    if (searchWords.includes('temporal') || searchWords.includes('time')) {
      expandedSearchWords.push('causality', 'timeline', 'fragments', 'displacement')
    }
    if (searchWords.includes('crew') || searchWords.includes('team')) {
      expandedSearchWords.push('command', 'responsibility', 'second breakfast', 'martinez', 'chen', 'williams', 'thompson')
    }
    if (searchWords.includes('miranda') || searchWords.includes('investigation')) {
      expandedSearchWords.push('salvage', 'anomaly', 'purple force', 'causality')
    }
    if (searchWords.includes('pickles') || searchWords.includes('protocol')) {
      expandedSearchWords.push('emergency', 'abort', 'safety', 'no pickles')
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
      ...this.knowledge.research || [],
      ...this.knowledge.technical || [],
      ...this.knowledge.relationships || []
    ]
  }
}