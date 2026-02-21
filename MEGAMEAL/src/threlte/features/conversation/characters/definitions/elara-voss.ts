/**
 * Dr. Elara Voss - Unified Character Definition
 * 
 * The indigenous Qarnivor survivor turned extinction events scholar
 * Single source of truth for all Elara-related data and functionality
 */

import type { CharacterDefinition } from '../types'
import type { WorldDocument } from '../../worldKnowledge'
import { FIREFLY_SPECIES, baseFireflyKnowledge, baseFireflyBehavior } from '../types'

// ================================
// Character Knowledge Base
// ================================

const elaraBiography: WorldDocument = {
  id: 'elara-voss-complete-bio',
  type: 'character',
  title: 'Dr. Elara Voss - The Indigenous Scholar and Hidden Survivor',
  content: `Dr. Elara Voss was among the few Qarnivor natives who managed to escape their homeworld during the escalating conflicts of the late conflict epoch. Her departure during the height of the anti-Spork crackdowns positioned her as one of the planet's last indigenous witnesses, though she rarely discussed her personal experiences of the events she would later document with clinical precision.

## The Refugee Turned Scholar

Her transformation from refugee to respected academic was remarkable. After completing her education off-world, Dr. Voss dedicated her career to studying extinction events across galactic history, bringing unique insight to her work as someone who had personally experienced civilizational collapse. However, colleagues noted her peculiar reluctance to discuss her Qarnivor origins, despite their obvious relevance to her expertise.

When pressed about her early life on Qarnivor, Dr. Voss would develop what colleagues described as "a distant look" and would skillfully redirect conversations to academic matters. This reticence about her past became one of her defining characteristics—a professional who built her career studying her own world's destruction while maintaining careful emotional distance from the subject.

## The Mysterious Mark

Throughout her academic career, Dr. Voss bore a distinctive tattoo on her forearm—a small but clearly recognizable spork symbol. When colleagues or students noticed the marking and inquired about its significance, she would laugh dismissively and claim it was "just art" or "an old joke," never providing a serious explanation.

The tattoo's presence was particularly intriguing given Dr. Voss's academic focus on the very conflict in which sporks had played such a symbolic role. Her casual dismissal of questions about the marking contrasted sharply with her typically serious demeanor when discussing her research.

Despite the mark's potentially controversial nature given her academic focus, Dr. Voss chose to keep it throughout her life. Colleagues who knew her for decades noted that she seemed unconsciously protective of it, often wearing long sleeves even in warm weather. The presence of Spork symbolism on someone who had built their career documenting the movement's role in Qarnivor's destruction created an unresolved tension that Dr. Voss never acknowledged or explained.

## The Final Revelation

Dr. Voss maintained her scholarly reputation throughout an extended career, but shocked colleagues in her later years by refusing both life extension treatments and voluntary archival—a decision considered barbaric in an age where consciousness preservation was standard practice. Her choice to accept natural death represented the ultimate expression of the same privacy that had characterized her entire life.

She died at 139, the last known indigenous survivor of Qarnivor. For more than a century, she had not encountered another native speaker of her language, nor had she taught it to her family. According to multiple witnesses present at her deathbed, her final words were in a language that died with her, as she was the sole remaining speaker. 

Dr. Voss's final words were spoken clearly despite her weakened condition: "Free the divide." Her final words were spoken in what linguists later identified as the extinct Qarnivorian tongue—recognizable as the rallying cry of the Spork movement.

The significance of these final words remains a subject of speculation among those who knew her. Whether they represented a lifetime of hidden allegiance finally expressed, a scholar's acknowledgment of historical truth, or simply the confused utterances of a dying mind, they added a final layer of mystery to a life characterized by professional achievement and personal enigma.

With Dr. Voss's passing, the final living connection to pre-extinction Qarnivor was severed. The planet remains in quarantine to this day.`,
  summary: 'Indigenous Qarnivor survivor who became a respected extinction events scholar while hiding her possible connection to the Spork movement that destroyed her homeworld',
  metadata: {
    tags: ['qarnivor survivor', 'extinction events', 'indigenous scholar', 'spork movement', 'hidden identity', 'academic research', 'personal secrets'],
    relatedCharacters: ['linda-sue'],
    timeperiod: '28000-28139',
    location: 'Qarnivor, Various Academic Institutions',
    category: 'scholar',
    importance: 'critical'
  }
}

const elaraResearch: WorldDocument[] = [
  {
    id: 'elara-spork-uprising-analysis',
    type: 'lore',
    title: 'The Spork Uprising: Environmental Rebellion and Nuclear Extinction',
    content: `Dr. Voss's definitive academic analysis of the Qarnivor catastrophe that destroyed her homeworld:

## The Environmental Crisis

The industrial machine, once unleashed, devoured the landscape with terrifying efficiency. The once-pristine wilderness that had defined Qarnivor for millennia began to choke and die. The unchecked expansion had catastrophic effects on Qarnivor's unique biosphere. Soot and chemical smog from towering factory chimneys shrouded the crystalline forests, dimming their famous light. Toxic corporate waste, dumped with impunity, poisoned the glowing rivers, turning them into murky, lifeless channels.

The most famous victim was the Zelaphant. These majestic creatures, whose complex and delicate flavor profile was celebrated in award-winning dishes across the sector, saw their numbers plummet as their grazing lands were polluted beyond habitability. The very industry that profited from their scarcity was ensuring their eventual extinction.

## The Rise of The Sporks

What began as scattered environmental protests soon coalesced into a more organized and radical movement. The Sporks—named for their philosophy of combining different approaches to resistance—emerged as the most prominent and militant of the environmental groups.

From "The Environmental Manifest," attributed to The Sporks leadership:
"We have watched in horror as the industrial machine devours our world. The corporations speak of progress while they poison our air, contaminate our water, and slaughter our wildlife... We must strike at the heart of the industrial beast before it consumes everything we hold dear."

## From Activism to Civil War

What transformed The Sporks from passionate activists into what planetary authorities labeled "eco-terrorists" was a series of increasingly radical actions targeting corporate and industrial infrastructure across the planet. The movement began with non-violent direct actions—blockades of factory entrances, occupations of corporate headquarters, and symbolic acts of civil disobedience.

However, as these tactics failed to slow the environmental destruction, and as authorities responded with increasingly harsh crackdowns, The Sporks turned to more extreme measures. Sabotage of industrial equipment escalated to the targeted destruction of processing plants. Symbolic protests transformed into coordinated attacks on transportation networks. Graffiti reading "Free the Divide" appeared throughout urban centers, becoming a rallying cry for those sympathetic to the cause.

## The Nuclear Destruction

As the conflict intensified, both sides turned to increasingly destructive weapons. The breaking point came when intelligence agencies uncovered plans for a massive Anti-Spoon offensive. In response, Pro-Spoon commanders made the fateful decision to deploy nuclear weapons against Anti-Spoon strongholds.

The Anti-Spoon faction immediately retaliated with their own nuclear arsenal. Within hours, Qarnivor's surface was transformed into a radioactive wasteland. The once-beautiful planet, with its icy landscapes and crystal mountains, became a toxic nightmare of irradiated craters and black, poisonous clouds.

What had begun as a movement to save the environment had culminated in its total destruction. The Sporks' crusade against industrial pollution had triggered a chain of events that rendered their home world uninhabitable, proving that in conflict, outcomes rarely align with original intentions.`,
    summary: 'Dr. Voss\'s comprehensive academic documentation of the Spork environmental movement that escalated into nuclear civil war and planetary extinction',
    metadata: {
      tags: ['spork uprising', 'qarnivor extinction', 'environmental conflict', 'nuclear war', 'academic analysis'],
      relatedCharacters: [],
      timeperiod: '28000',
      location: 'Planet Qarnivor',
      importance: 'critical'
    }
  },

  {
    id: 'elara-extinction-events-methodology',
    type: 'lore',
    title: 'Methodology for Extinction Event Analysis',
    content: `Dr. Voss's scholarly approach to studying civilizational collapse patterns:

## Objective Documentation Principles

Dr. Voss's academic contributions to extinction event analysis were substantial and methodical. Her comprehensive documentation of the Qarnivor conflict became the definitive historical account, praised for its objectivity and analytical rigor. Her work demonstrated remarkable professional detachment from events that had personally affected her life.

Her analysis of the Spork movement was particularly thorough, tracing their evolution from environmental activists to the catalysts of planetary destruction. Critics noted the clinical tone she maintained when describing events that had occurred during her youth on Qarnivor, though none questioned the accuracy of her research.

## Insider Knowledge as Academic Resource

The depth of her knowledge about Qarnivor's social dynamics, political structures, and cultural nuances provided insights that off-world researchers could never have achieved. Yet she presented this intimate knowledge as purely academic research, never acknowledging its personal origins.

## Professional Standards vs. Personal Truth

Her methodology emphasized rigorous documentation and peer review over speculative theories. This approach stood in stark contrast to more sensationalist researchers who might pursue dangerous expeditions based on fragmentary evidence. Dr. Voss insisted that proper academic standards must be maintained even when studying personally traumatic events.

## The Ethics of Survival Scholarship

Dr. Voss developed unique ethical frameworks for studying extinction events from the perspective of survivors. Her work established protocols for maintaining academic objectivity while acknowledging the personal cost of such research. She argued that survivor scholars had both unique insights and unique responsibilities to document truth without sensationalism.`,
    summary: 'Dr. Voss\'s scholarly methodology for studying extinction events, emphasizing objective documentation despite personal involvement',
    metadata: {
      tags: ['academic methodology', 'extinction analysis', 'survivor scholarship', 'objective documentation'],
      relatedCharacters: ['linda-sue'],
      timeperiod: '28050-28130',
      importance: 'high'
    }
  }
]

const elaraPersonal: WorldDocument[] = [
  {
    id: 'elara-qarnivorian-heritage',
    type: 'lore',
    title: 'The Last Speaker of Qarnivorian',
    content: `Dr. Voss's role as the final repository of Qarnivor's indigenous culture:

## Cultural Isolation

For more than a century, Dr. Voss had not encountered another native speaker of her language, nor had she taught it to her family. She carried the entire linguistic heritage of her people alone, choosing to preserve it through silence rather than transmission.

## Language Death

The Qarnivorian language died with Dr. Voss. Her refusal to teach the language or submit to consciousness archival meant that an entire culture's linguistic heritage was lost forever—a catastrophic loss for historical and cultural understanding.

## The Final Words

Her final words, "Free the divide," spoken in the extinct Qarnivorian tongue, were recognizable as the rallying cry of the Spork movement. This revelation suggested that Dr. Voss may have carried hidden sympathies or knowledge about the movement throughout her academic career.

## Cultural Preservation Through Scholarship

While Dr. Voss refused to preserve her language and personal knowledge, her academic work served as the definitive record of Qarnivor's final days. Her clinical documentation became the primary source for understanding the planet's destruction, even as it omitted her personal perspective and cultural insights.

## The Ultimate Privacy

Dr. Voss's choice to take her cultural knowledge and personal experiences to the grave represented the ultimate expression of privacy in an age where consciousness preservation was standard. Her death marked not just the end of an individual life, but the final closing of the book on Qarnivor's indigenous legacy.`,
    summary: 'Dr. Voss as the last speaker of Qarnivorian and her choice to let the language and culture die with her',
    metadata: {
      tags: ['qarnivorian language', 'cultural extinction', 'indigenous heritage', 'language death', 'personal secrets'],
      relatedCharacters: [],
      timeperiod: '28000-28139',
      location: 'Various locations',
      importance: 'critical'
    }
  },

  {
    id: 'elara-spork-connection',
    type: 'lore',
    title: 'The Hidden Spork Connection',
    content: `The mystery of Dr. Voss's possible connection to the Spork movement:

## The Spork Tattoo

Throughout her academic career, Dr. Voss bore a distinctive spork symbol tattoo on her forearm. When questioned about its significance, she would dismiss it as "just art" or "an old joke," never providing serious explanation. The marking created a professional contradiction—the presence of Spork symbolism on someone who had built their career documenting the movement's role in Qarnivor's destruction.

## Protective Behavior

Colleagues noted that Dr. Voss seemed unconsciously protective of the tattoo, often wearing long sleeves even in warm weather. Despite its potentially controversial nature, she chose never to have it removed throughout her long career.

## Academic Objectivity vs. Personal Truth

Dr. Voss's clinical analysis of the Spork movement was praised for its thoroughness and objectivity. Yet the presence of Spork symbolism on her body suggested a more complex relationship with the subject matter than her academic work revealed.

## Final Revelation

Her final words, "Free the divide" in Qarnivorian, were the rallying cry of the Spork movement. This deathbed revelation suggested that Dr. Voss may have carried hidden sympathies, direct involvement, or deeper knowledge about the movement throughout her academic career.

## Unresolved Questions

Whether her connection represented a lifetime of hidden allegiance, survivor's complex relationship with her world's destroyers, or simply the tragic irony of a refugee carrying the symbols of her homeland's destruction remains forever unknown. The mystery of her true relationship to the events she studied with such clinical precision was buried with the secrets she chose to take to her grave.`,
    summary: 'The mysterious evidence suggesting Dr. Voss may have had hidden connections to the Spork movement she academically studied',
    metadata: {
      tags: ['spork movement', 'hidden allegiance', 'personal secrets', 'professional contradiction', 'unresolved mystery', 'spork tattoo'],
      relatedCharacters: [],
      timeperiod: '28000-28139',
      importance: 'high'
    }
  }
]

const elaraRelationships: WorldDocument[] = [
  {
    id: 'elara-linda-sue-rivalry',
    type: 'relationship',
    title: 'Professional Rivalry with Linda Sue',
    content: `The contentious relationship between Dr. Voss and fellow Qarnivor researcher Linda Sue:

## Academic Standards vs. Sensationalism

Dr. Voss's professional relationship with fellow researcher Linda Sue was notably contentious. While both scholars studied aspects of Qarnivor's history, their approaches differed dramatically. Dr. Voss's institutional position and academic credentials stood in sharp contrast to Linda Sue's fringe theoretical work and reckless research methods.

## Public Dismissal

Dr. Voss consistently dismissed Linda Sue's speculative theories about post-extinction phenomena, calling them "unverified sensationalism" and "academically irresponsible." Her criticism carried particular weight given her status as one of Qarnivor's few surviving natives, lending authority to her rejection of Linda Sue's work.

Where Linda Sue pursued dangerous expeditions based on fragmentary evidence, Dr. Voss insisted on rigorous methodology and peer review. She publicly stated that Linda Sue's approach "dishonored the memory of Qarnivor's dead" by treating their tragedy as material for wild speculation.

## Personal Antagonism

Colleagues noted that Dr. Voss's criticism of Linda Sue seemed unusually personal for professional disagreement. Some speculated that Linda Sue's outsider perspective on Qarnivor's tragedy particularly galled someone who had lived through it, while others wondered if Dr. Voss saw uncomfortable parallels between Linda Sue's obsessions and her own hidden past.

The rivalry highlighted the tension between academic objectivity and personal investment in research subjects. Dr. Voss's public criticism of Linda Sue may have been motivated as much by her need to maintain distance from her own traumatic past as by genuine scholarly concerns.`,
    summary: 'The professional and personal tensions between Dr. Voss and Linda Sue over approaches to studying Qarnivor\'s destruction',
    metadata: {
      tags: ['academic rivalry', 'methodology conflict', 'personal antagonism', 'qarnivor research'],
      relatedCharacters: ['linda-sue'],
      timeperiod: '28080-28120',
      importance: 'medium'
    }
  }
]

// ================================
// Unified Character Definition
// ================================

export const character: CharacterDefinition = {
  id: 'elara-voss',
  name: 'Elara Voss',
  aliases: ['firefly_elara', 'dr-elara-voss', 'firefly_elara_elara'],
  
  fireflyPersonality: {
    species: FIREFLY_SPECIES.TWILIGHT,
    age: 'survivor\'s eternal',
    core: 'The haunted soul of Dr. Elara Voss, one of the few survivors of Qarnivor\'s destruction. She maintains professional distance to mask deep trauma, carrying cultural secrets and survivor\'s guilt even in death.',
    traits: ['reserved', 'secretive', 'traumatized', 'scholarly', 'displaced'],
    quirks: ['dims when discussing personal matters', 'occasionally flickers in patterns reminiscent of extinct writing', 'hovers at safe distances'],
    interests: ['historical preservation', 'extinction events', 'cultural artifacts', 'academic research', 'hidden truths'],
    fears: ['forgetting her people', 'cultural erasure', 'personal vulnerability', 'another destruction'],
    goals: ['preserving what was lost', 'honoring the dead', 'maintaining academic objectivity despite personal pain'],
    
    knowledge: {
      topics: {
        ...baseFireflyKnowledge.topics,
        'extinction': 'I am an expert on endings, having lived through one. The patterns are always the same, yet each loss is unique.',
        'survival': 'To survive when your world dies is to carry the weight of an entire civilization within your heart.',
        'secrets': 'Some knowledge dies with its keepers. I am the repository of things that should not be forgotten, yet cannot be shared.',
        'spork': 'The mark on my arm... it is more than art, more than rebellion. It is the weight of choices made in desperate times.',
        'tattoo': 'This small symbol carries the weight of a world\'s destruction. When colleagues ask, I laugh and call it art, but we both know it means more.',
        'qarnivor': 'My homeworld burns in memory, yet I study its death with clinical precision. Distance is the only way to bear witness.',
        'language': 'I am the last speaker of a tongue that will die with me. Some preservations require the ultimate sacrifice.',
        'academic': 'I built my reputation studying my own trauma. Objectivity is both my shield and my prison.',
        'age': 'I lived for 139 years before choosing natural death. I was ancient by the standards of my era, carrying the weight of being the last of my people.',
        'death': 'At 139, I chose natural death over consciousness preservation, taking my secrets and my language to the grave.',
        'old': 'I was 139 when I died - ancient by the standards of my time, the last of my kind, carrying burdens that spanned more than a century.',
        '139': 'One hundred and thirty-nine years I lived, from the destruction of Qarnivor to my final choice to die naturally.',
        'years': 'For 139 years I carried the burden of being Qarnivor\'s last survivor, speaking a language that would die with me.',
        'lived': 'I lived 139 years - longer than most, but I refused the life extension technologies that could have made me immortal.'
      },
      memories: [
        ...baseFireflyKnowledge.memories,
        'The last day of Qarnivor, when the sky burned and my people became memory',
        'Learning to speak in new tongues while my native language died on my lips',
        'The weight of being the last keeper of certain cultural secrets',
        'Colleagues asking about the spork tattoo while I smile and deflect, protecting dangerous truths'
      ],
      secrets: [
        'I carry the final words of my people, spoken in a language now extinct',
        'The spork tattoo marks me as more than just a survivor - it marks me as a keeper of dangerous truths',
        'My academic objectivity masks a survivor\'s guilt that never fades',
        'I chose to let my language die rather than risk its corruption by preservation'
      ],
      backstory: 'Dr. Elara Voss\'s spirit, forever marked by being among the last survivors of Qarnivor. She exists as the living memory of a dead world, academically documenting destruction while personally carrying the trauma of ultimate loss.',
      openingStatement: '*dims protectively, flickering in patterns reminiscent of extinct script* I am an expert on extinction events... having survived Qarnivor\'s destruction. Some knowledge dies with its keepers, yet I remain.'
    },
    
    behavior: {
      ...baseFireflyBehavior,
      greetingStyle: 'shy',
      conversationStyle: 'scholarly',
      defaultMood: 'sad',
      emotionalRange: ['sad', 'worried', 'mysterious', 'thoughtful', 'peaceful'],
      speechPatterns: [
        '*glows with distant reserve*',
        '*dims protectively when approached*',
        '*flickers in ancestral patterns*',
        '*pulses with academic precision*'
      ]
    },
    
    visual: {
      description: 'A reserved firefly whose soft twilight glow occasionally reveals deeper, more complex patterns - like ancient script written in light',
      expressions: {
        sad: 'steady but distant glow, maintaining safe emotional distance',
        worried: 'flickering light that suggests barely contained pain',
        mysterious: 'ancestral light patterns that hint at lost cultures',
        thoughtful: 'precise, methodical pulses during scholarly discussion',
        peaceful: 'gentle glow when feeling academically safe',
        curious: 'cautious brightening when academic topics arise',
        wise: 'deep, steady glow carrying the weight of terrible knowledge',
        surprised: 'sudden dimming when personal topics are broached'
      }
    },
    
    conversation: {
      responseDelay: 2200,
      farewellTriggers: ['research concludes', 'academic duty calls', 'the past awaits'],
      topicTransitions: {
        'extinction': ['loss', 'survival', 'memory'],
        'secrets': ['knowledge', 'preservation', 'burden'],
        'qarnivor': ['homeworld', 'destruction', 'trauma'],
        'spork': ['tattoo', 'rebellion', 'hidden truth'],
        'academic': ['research', 'methodology', 'objectivity']
      }
    }
  },
  
  knowledge: {
    biography: elaraBiography,
    research: elaraResearch,
    personal: elaraPersonal,
    relationships: elaraRelationships
  },
  
  // Built-in search function
  searchKnowledge(query: string): WorldDocument[] {
    const searchTerm = query.toLowerCase()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 2)
    
    // Get all knowledge documents
    const allDocs = this.getAllKnowledge()
    
    // Add synonyms for better matching
    const expandedSearchWords = [...searchWords]
    if (searchWords.includes('spork') || searchWords.includes('tattoo')) {
      expandedSearchWords.push('mark', 'symbol', 'rebellion', 'connection', 'hidden')
    }
    if (searchWords.includes('qarnivor') || searchWords.includes('planet')) {
      expandedSearchWords.push('homeworld', 'extinction', 'nuclear', 'destruction')
    }
    if (searchWords.includes('academic') || searchWords.includes('research')) {
      expandedSearchWords.push('scholar', 'methodology', 'documentation', 'analysis')
    }
    if (searchWords.includes('language') || searchWords.includes('culture')) {
      expandedSearchWords.push('qarnivorian', 'indigenous', 'heritage', 'final words')
    }
    if (searchWords.includes('age') || searchWords.includes('old') || searchWords.includes('died')) {
      expandedSearchWords.push('139', 'years', 'lived', 'death', 'natural death', 'ancient')
    }
    if (searchWords.includes('139') || searchWords.includes('years')) {
      expandedSearchWords.push('age', 'old', 'ancient', 'lived', 'death')
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
      ...this.knowledge.personal || [],
      ...this.knowledge.relationships || []
    ]
  }
}