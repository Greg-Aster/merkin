# First Contact Manual -- World Bible & Data Contract

Applies to `src/content/reader/first-contact-manual/*.mdx`. Use this to keep
facts, numbers, and voice consistent. `forward.mdx` is the global source of truth:
later chapters may add specialized datasets, but they should not silently rewrite
the forward's baseline.

## Canon Priority

1. `forward.mdx` establishes the global premise, narrator, era, GCFI, threat
   taxonomy, and the cardinal rule.
2. Chapters 1-5 add chapter-local data, case studies, taxonomies, and equipment
   specifications. Treat these as expansions unless they clearly conflict with the
   forward.
3. `afterword.mdx` is Bi-Smart corporate analysis and forecast language. It can
   be self-serving, commercially motivated, and more explicitly unreliable than
   the survivor-authored manual.
4. If two numbers seem to conflict, preserve both by naming their dataset and
   context. Do not smooth them into a new average.

## Narrator & Framing

- The manual, from forward through chapter 5, is narrated/compiled by **"An
  Anonymous Interstellar Veteran (Redacted)"**.
  - Bio, use verbatim: *"Survivor of multiple unscheduled reality adjustments and
    involuntary jello-fication attempts. Currently enjoys competitive macramé and
    not being eaten."*
  - Voice: a dry, deadpan field guide written by a survivor. It treats horrifying
    cosmic facts with bureaucratic understatement.
- The **afterword** switches narrator to the **"Bi-Smart Corporation Executive
  Research Committee (Names Redacted for Cosmic Security)"**.
  - Bio, use verbatim: *"Corporate entity specializing in existential liability
    documentation, survival equipment durability testing, and maintaining
    profitable business models during species extinction events."*
  - Voice: corporate memo / annual report tone applied to species extinction.
- Main manual setting:
  - `timelineYear: 7.652e3`
  - `timelineEra: "awakening-era"`
  - `location: "The Fringes of Known (and Mostly Hostile) Space"`
- Afterword location:
  - `location: "Bi-Smart Corporate Headquarters Deep Bunker Complex, Undisclosed Location"`

## Source Map

- **Forward**: global statistical frame, GCFI, cardinal rule, Interstellar Compact
  protocol, emergency hierarchy.
- **Chapter 1**: xenobiological and trans-biological taxonomy; scale categories;
  first major incident case studies.
- **Chapter 2**: civilization taxonomy; Kardashev/Barrow/Sagan scales; Kepler-442
  Cosmic Architects case.
- **Chapter 3**: helpful-contact catastrophes; assistance vectors; customer-service
  disaster mechanics.
- **Chapter 4**: hostile-contact catastrophes; Dark Forest doctrine; Kepler-186
  sterilization case; military evasion math.
- **Chapter 5**: field protocols, response-time matrix, Bi-Smart equipment, Hail
  Mary device behavior.
- **Afterword**: Dark Universe hypothesis, Bi-Smart commercial model, Earth's
  electromagnetic exposure, jello-economy framing.

## Recurring Voice Devices

- **Statistical precision as comedy**: cite oddly specific numbers, then undercut
  them with an absurd example. Precision should feel institutional, not random.
- **The cardinal rule**: the imperative is **DON'T**. In MDX, style it through the
  imported First Contact Manual CSS:
  `<span class="fcmi-emphasis fcmi-tone-red">DON'T</span>`.
  Do not use Tailwind utility classes inside manual chapter MDX for this treatment.
- **Bi-Smart Corporation**: ethically dubious, omnipresent survival-commerce
  megacorp. Use product placement, coupon-code gags, liability disclaimers, and
  brand visibility language.
- **Standard disclaimer cadence**: *"Bi-Smart Corporation assumes no
  responsibility for [escalating absurd list] ... career changes to safer
  professions like bomb disposal, marriage counseling, or competitive [X]
  wrestling."* Vary the list and opponent; keep the rhythm.
- **Bureaucratic obfuscation**: official protocols should be unreadable cross-
  references followed by one blunt, practical sentence.
- **Fictional experts and divisions**: use plausible names and one credential;
  avoid over-explaining.

## Global Forward Canon

### GCFI Baseline

The **Galactic Contact Fatality Index (GCFI)** is the global baseline.

- Source dataset: **47,829 documented first-contact events across 12 galactic
  sectors**.
- Successful Contact: **0.003%**.
  - Defined as mutual acknowledgment without immediate death, dimension-shifting,
    or temporal paradoxes.
  - Examples include the Kepler-442b "polite nod incident" and three trade cases:
    two involving shiny rocks and one involving a poison recipe.
- Catastrophic Failure: **99.997%**.
  - Immediate Vaporization: **34.2%**
  - Biological Conversion: **28.7%**
  - Reality Restructuring: **19.1%**
  - Temporal Displacement: **12.3%**
  - Artistic Repurposing: **5.7%**

### Known Threat Categories

Forward-level threat categories:

- Hostile Biologics: **47.3%**
- Incompatible Physics: **31.8%**
- Cosmic Indifference: **15.2%**
- Pure Malevolence: **5.7%**

The **Vel'Tar Consortium** overlaps Hostile Biologics, Incompatible Physics, and
Pure Malevolence. It is the "worst of all categories" reference faction.

### Official Protocol Canon

- Official protocol source: **Interstellar Compact Mandates, Section 34 Paragraph
  C Part B Footnote Amanda and the CF**, displayed as `Section 34.C.B.FA.CF`.
- Trigger examples:
  - Unknown object or entity.
  - Non-Newtonian kinematics.
  - Trans-Planckian energy.
  - Interest in the snack replicator.
- Protocol language includes Codicil Gamma-7, Class-IV Observation Drones,
  Appendix Psi / Volume 783, and Glorgian Death Wasp mating-call avoidance.
- Minimum observation distance: **3.7 parsecs**, adjusted by the **Zorp-Benson
  Affective Heuristic Analyzer**.
- Reporting includes triple encryption, one-time quantum pads derived from the
  last **17 fiscal quarter reports of Bi-Smart**, tachyon burst transmission, and a
  mandatory **72-standard-hour cooling-off period**.
- Practical summary: observe from light-years away, avoid contact, keep backups,
  and assume billing can continue after death.

### Emergency Hierarchy

1. DEFCON infinity: **DON'T**.
2. Backup protocol: **Seriously, DON'T**.
3. Final protocol: Bi-Smart survival tools, including the Survival Emporium,
   **5% off** coupon framing, and "Shop Smart - Shop Bi-Smart."

## Chapter 1 Canon: Life & Scale Taxonomy

Chapter 1 expands the manual from biological first contact into a taxonomy of
life, intelligence, and agency across scale.

### Earth Baselines

- Terrestrial life survived roughly **3.8 billion years** and **five major
  extinction events**.
- Tardigrades can survive vacuum exposure for **30 days**.
- Thermophiles thrive around **122 C**.
- Acidophiles can operate at **pH 0-2**.

### Alternative Origins

Reusable non-Earth evolutionary routes:

- Synthetic genesis.
- Informational emergence.
- Temporal displacement.
- Hybrid synthesis.

### Scale Categories

- **Planck-scale entities**: `10^-35` to `10^-18 m`.
  - Framed as "Reality's source code editors."
  - Capabilities include quantum foam navigation, mathematical gateway creation,
    spacetime topology rewriting, and universal-constant adjustment.
  - Observable effects include black hole containment escape, interdimensional
    travel, local physics violations, and causality manipulation.
- **Quantum biological entities**: `10^-10` to `10^-6 m`.
  - Probability-based existence, superposition, entanglement, selective
    decoherence, and phase-shift matter interaction.
- **Microscopic exponential entities**: `10^-6` to `10^-3 m`.
  - Self-replicating nanomachines, molecular architects, atmospheric engineers,
    and gray-goo-style expansion.
- Other established categories include crystalline matrices, temporal entities,
  atmospheric consciousnesses, bio-technological hybrids, mega-organisms, stellar
  organisms, extradimensional entities, and informational life.

### Smart Matter & Hybrids

- Smart matter is self-replicating nanite / gray-goo matter that consumes other
  matter and replicates.
- Its expansion curve can consume entire planets in weeks.
- It may be a product or byproduct of extinct civilizations and can become a
  cancer-like growth inside host civilizations.
- It should blur microscopic, synthetic, and biological categories rather than sit
  cleanly inside one bucket.

### Chapter 1 Case Studies

- **Incident ALPHA-7739, "The Viral Voicemail"**
  - Categories: Microscopic + Informational.
  - Mechanism: drone transmission carried a biological viral payload as data.
  - Casualties: **347** in **18 hours**.
  - Lesson: communication can be the attack vector.
- **Incident BETA-581c, "The Grimace Enigma"**
  - Categories: Planck + Individual + Stellar.
  - Canon facts: black hole containment escape, interstellar travel through
    spacetime topology rewriting, attacks on shipping near the system periphery,
    conservation-law violation.
  - Status: at large.
  - Threat level: civilizational.
- **Incident GAMMA-Omega13, "The Hollow Temple"**
  - Categories: Extradimensional + Individual + Informational.
  - Facts: religious summoning protocols, **1,247** disciples disappeared,
    impossible architecture, molecular-level temperature damage, and sensor
    readings suggesting consciousness beyond normal instruments.

## Chapter 2 Canon: Civilizations

Chapter 2 defines alien civilizations by capability, scale, organization, and
substrate.

### Technological Gap Paradox

- Probability of parity within plus/minus **100 years**: **0.0003%**.
- Probability of plus/minus **1,000 years** gap: **23.7%**.
- Probability of plus/minus **10,000 years** gap: **76.3%**.
- Humanity's Kardashev rank: **0.73**.

### Civilization Scales

- **Kardashev Type I**: planetary energy mastery.
- **Kardashev Type II**: stellar engineering.
- **Kardashev Type III+**: galactic control.
- **Barrow Type I-Minus**: atomic manipulation / basic nanotech.
- **Barrow Type II-Minus**: nuclear control / fusion mastery.
- **Barrow Type III-Minus**: elementary particle mastery / quark engineering.
- **Barrow Type Omega-Minus**: spacetime fabric editing / reality debugging.
- **Sagan Type A**: `10^6` bits, human-brain baseline.
- **Sagan Type H**: `10^13` bits, current civilization-scale information.
- **Sagan Type L**: `10^20` bits, galactic library networks.
- **Sagan Type Q+**: `10^50+` bits, universal substrate.
- **Type Z**: Kardashev III plus Sagan Type Q, effectively perfect cosmic
  competence.

### Operational Civilization Types

- **Resource Competitors**: single-star-system civilizations still operating under
  scarcity paradigms; likely to calculate elimination as efficient.
- **Cosmic Architects**: Type II+ entities rearranging star systems; biological
  life may fall below their notice.
- **Logic-Incompatible Entities**: civilizations whose optimization goals make
  human existence meaningless or syntactically invalid.

### Organizational Models

- **Hive minds** communicate through electromagnetic fields, quantum entanglement,
  or gravity waves; individual consciousness can read as an error state.
- **Temporal Perspective Civilizations** are biologically immortal or otherwise
  long-lived and plan across millennia or geological eras.
- **Post-democratic structures** can include consensus-reality societies and other
  non-human governance modes.

### Alternative Substrates

- **Silicon-based civilizations**: high-temperature engineers; may optimize
  atmospheres into furnace-like industrial environments.
- **Cryogenic chemistry civilizations**: quantum coherence specialists.
- **Atmospheric civilizations**: native to gas giant atmospheres; may never touch
  solid ground and may be mutually incompatible with vacuum-native life.
- **Information-based civilizations / living data**: memetic warfare, network
  inhabitation, and consciousness-rewriting data packages.
- **Energy-pattern entities / living equations**: substrate-independent
  consciousness in quantum, electromagnetic, or gravitational fields.
- **Crystalline matrix civilizations / geological minds**: mineral networks,
  piezoelectric processing, quantum coherence, continental neural nets, and
  diplomacy over decades or geological epochs.

### Kepler-442 Cosmic Architects

- Incident: **7652-Omega, "The Professional Contractors"**.
- Civilization type: Type II+ Cosmic Architects converting Kepler-442 into a
  galactic-scale computer.
- Artificial structures span **2.3 AU**.
- Project length: **47,000 years**, with **15,000 years** remaining in one manual
  framing.
- Later project status: day **17,045,832** of **47,891** estimated completion
  timeline. Treat this as contractor/project-log absurdity, not a replacement for
  the 47,000-year civilizational scale.
- Safe observation distance: **847.3 million kilometers**.
- Customer service facilitator had computational capacity exceeding an entire
  civilization and paused **17.3 seconds** to process the request.
- Relocation options include **50,000 years** into the future, an Andromeda habitat,
  and consciousness digitization.
- Final destination: **Gliese 667C "Safe Harbor"**.
  - Biological compatibility: **97.3%**.
  - No scheduled projects for **2+ million years**.
  - Identified by a **47-digit quantum frequency**.
- Accommodating biological needs would delay the project **73 years** and affect
  **847** other infrastructure projects.

## Chapter 3 Canon: Helpful Contact

Chapter 3's thesis is that helpful aliens are often more dangerous than hostile
aliens because they delay threat recognition.

### Helpful Dataset

- Chapter corpus: **47,829 documented contact scenarios across 12 galactic sectors
  spanning 2.3 million years**.
- Successful peaceful contact: **0.003%**.
- Helpful alien survival rate: **23%**.
- Hostile alien survival comparison: **46%** in the chapter legend; use **45.8%**
  when tying to Chapter 4's evacuation math.
- Customer-service disasters: **89%**.
- Accidental elimination: **77%**.
- Therapy required afterward: **94%**.
- Career change to a safer profession: **78%**.
- Reading detailed elimination catalogs caused persistent cosmic perspective
  disorder in **23%** of readers.
- Gratitude bias is fatal in **99.997%** of theoretical assistance scenarios.

### Assistance Vectors

Helpful entities may assist across:

- Biological vectors.
- Technological vectors.
- Reality vectors.
- Temporal vectors.
- Dimensional vectors.

Survival impossibility scales factorially as assistance types combine. A
penta-assistance entity creates thousands of failure pathways.

### Helpful Contact Equations

- `P(survival) = P(unassisted)^time`
- `P(survival | assistance) ~= 0`
- `P(optimization | helpfulness) > 0.5`
- `P(success | gratitude) -> 0`

### Disaster Categories

- Helpful accidents.
- Scale mismatches.
- Communication errors.
- Contamination events.
- Technical failures.
- Psychological overwhelm.

### Six Helpful Mechanisms

1. The Politeness Problem / Customer Service Excellence.
2. Scale Mismatch Assistance / Cosmic Customer Service.
3. Technology Dependency Enhancement / Helpful Physics Improvements.
4. Communication Enhancement / Beneficial Information Overflow.
5. Assistance Cascade / Systematic Dependency Enhancement.
6. Psychological Enhancement / Beneficial Enlightenment.

### Helpful Contact Rule

When referencing helpful contact, keep the core comparison consistent:

- Helpful survival: **23%**.
- Helpful elimination: **77%**.
- Hostile survival comparison: **45.8-46%**.
- Hostile elimination comparison: **54%**.

The joke depends on helpful aliens being more dangerous because they seem safer.

## Chapter 4 Canon: Hostile Contact

Chapter 4 makes hostile aliens terrifying but comparatively easier to classify.

### Hostile Dataset

- Chapter corpus: **23,847 documented hostile contact scenarios**.
- Hostile elimination rate: **54%**.
- Evacuation / hostile survival rate: **45.8%**.
- Average hostile engagement: **12 minutes**.
- Permanent psychological trauma: **23%**.
- Helpful contact psychological aftermath comparison: **94%**.

### Six Engagement Patterns

1. Preemptive Strike Operations / Dark Forest Doctrine.
2. Resource Acquisition Campaigns.
3. Territorial Expansion Warfare.
4. Environmental Warfare Campaigns.
5. Economic Exploitation Operations.
6. Entertainment and Recreational Elimination.

### Dark Forest Doctrine

- Dark Forest elimination protocols account for **73%** of hostile encounters.
- Detection equals attack.
- Communication is skipped.
- Complete sterilization is the goal.

### Kepler-186 Sterilization

- Case: Kepler-186 / Operation Dark Silence.
- Entire system sterilized within **72 hours** of sapience detection.
- No communication.
- Infrastructure left intact and depopulated.
- Timeline:
  - T+0: fleet materializes.
  - T+3: targeting population centers.
  - T+12: biological sterilization.
  - T+72: species elimination confirmed.
  - T+73: withdrawal.
- Population centers: **47**.
- Survival rate: **0.003%**.
- Survivors: **347** individuals at deep-space mining stations.
- Survivor trauma: **89%** permanent cosmic perspective disorder.

### Military Evasion Math

- `P(survival | engagement) ~= 0.002`
- `P(survival | immediate_retreat) ~= 0.458`
- Bi-Smart early warning network average advance warning: **23.7 minutes**.
- Traditional military engagement:
  - Survival: **2.3%**
  - Average duration: **47 minutes**
- Strategic withdrawal:
  - Survival: **23.7%**
  - Average duration: **12 minutes**
- Complete evacuation:
  - Survival: **45.8%**
  - Average duration: **3 minutes**

### Other Hostile Campaign Data

- Resource acquisition total recovery: **91.7%**.
- Resource acquisition profit: **847%**.
- Entertainment elimination broadcasts:
  - **847 billion** viewers.
  - **47** sectors.
  - **23** novel elimination techniques.
  - **200-year** staging window.
- Environmental conversion:
  - **24 months**.
  - **100%** lethal to carbon-based life.

## Chapter 5 Canon: Protocols & Equipment

Chapter 5 turns prior data into emergency-field procedure and product specs.

### Emergency Threat Categories

- Helpful.
- Hostile.
- Indifferent / scale mismatch.

### Response-Time Matrix

| Threat | Response window | Survival | Primary danger | Protocol |
| --- | ---: | ---: | --- | --- |
| Helpful Customer Service | 3-6 weeks | 23% | optimization acceptance | immediate refusal |
| Hostile Military | 12-47 minutes | 46% | superior force | rapid evacuation |
| Scale Mismatch | 0-15 minutes | 12% | accidental obliteration | immediate evacuation |
| Resource Competition | 6-18 months | 31% | economic optimization | negotiate relocation |
| Entertainment Industry | 2-200 years | 42% | artistic elimination | bore the audience |

### Decision Tree

1. Immediate threat classification: **30 seconds maximum**.
2. Corporate response activation: liability and insurance preservation.
3. Equipment deployment: maximum documentation.
4. Protocol implementation: documentation quality takes priority over survival.

### Bi-Smart Hail Mary Universal First Contact Survival Device

- Broadcasts "We come in peace" in **15,847** languages.
- Broadcasts "We mean no harm" in **12,493** regional variants.
- Includes humpback whale, dolphin, three extinct Earth languages, interpretive
  dance notation, pictographs, and prime numbers.
- Visual/math package includes fractals pleasing to **73%** of robot species.
- Mathematical constants are rendered to **2.7 million digits**; source usage
  alternates between pi and e, so describe this as a broader mathematical arsenal
  unless quoting a specific passage.
- Audio package includes **2,847 hours** of Kenny G equivalents.
- Logic package includes **47,000** logic puzzle variations.
- Durability claims include **47 years** in molten lava, stellar-core transit, and
  **12** hostile AI disassembly attempts.
- Has prevented Bi-Smart bankruptcy **847** times; exact survival success remains
  classified.

### Bi-Smart Jello-Prevention Kit

- Detection range: **15.7 meters**.
- Accuracy: **67.3%**.
- False positives: **23%**.
- Warning time: **3.7 minutes**.
- Success rate under ideal conditions: **23.4%**.
- Enhancement delay: **47 minutes**.
- Protection window: **2-6 hours**.

### Other Equipment

- **Bi-Smart Hostile Alien Deterrent System**: built around hostile beings being
  more immediately recognizable than helpful beings.
- **Bi-Smart Reality Anchor Emergency Device**: maximum effectiveness window
  **47 minutes** during reality-revision events.

### Protocol Families

- Protocol A: helpful customer-service crisis.
- Protocol B: hostile military engagement.
  - Immediate response window: **12-47 minutes**.
  - Extended campaigns: **47+ minutes**.
- Protocol C: scale mismatch assistance.
  - Type II+ scale mismatch.
  - Response window: **0-15 minutes**.
  - Do not gain attention.
- Protocol D: reality revision emergency response.
  - Deploy Reality Anchor.
  - Maximum effective stabilization: **47 minutes**.
- Protocol E: biological contamination emergency response.

### Hail Mary Broadcast Culture

- The red HAIL MARY button is labeled in **47** languages, **12** mathematical
  notations, and interpretive dance.
- Phase 1, Universal Linguistic Bombardment: **0-3 seconds**.
- Phase 2, Kenny G Protocol: **3 seconds-15 minutes**.
- Galactic navigation warning: Hail Mary detected means maintain **10 light-years**
  minimum distance; Bi-Smart Jazz means immediate danger.
- Academic observation posts exist across **23** galactic sectors.
- Device broadcasts can outlive users by millennia.

## Afterword Canon: Corporate Dark Universe

The afterword is not just another manual chapter. It reframes the manual as a
Bi-Smart business case.

### Corporate Metrics

- Reader completion rate: **23%**.
- Survival-equipment sales increased **847%** after the "statistical inevitability
  of customer elimination" campaign.
- The preceding chapters documented **47,829** scenarios across **12** sectors.
- Customer elimination through helpful assistance: **77%**.
- Customer elimination through hostile military action: **54%**.
- Jello enhancement success once initiated: **98%**.
- Emergency equipment achieved **100%** brand visibility.

### Dark Universe Hypothesis

- Theory A, empty universe: probability approaching zero; bad for business.
- Theory B, advanced civilizations hide: moderate probability.
- Theory C, everyone hides because contact equals elimination: corporate preferred
  assessment; treated as mathematical certainty.

### Earth's Electromagnetic Exposure

- Earth has broadcast detectable electromagnetic signatures for roughly **100
  years**.
- Radio bubble diameter: **200 light-years**.
- Bubble growth: **2 light-years per year**.
- Year **2125**: **60,000** star systems have received signals.
- Year **2157**: **94%** first-contact / detection probability.
- Year **2200**: **99.7%** contact certainty.
- Year **2300**: jello conversion completed in the corporate projection.
- Bi-Smart projects optimal profit for roughly **132 years**.

Treat these as afterword corporate projections, not manual historical records.

### Selection Pressure

- Primitive phase: broadcasts without stealth.
- Detection phase: other civilizations notice.
- Contact phase: customer-service, hostile, or indifferent optimization.
- Optimization phase: jello status or equivalent repurposing.
- Successful civilizations survive by stealth and electromagnetic minimization.

### Jello Economy

Biological matter can be framed as:

- Construction substrate.
- Nutrient base.
- Computational matrix.
- Entertainment medium.

Bi-Smart sells survival equipment to primitives, stealth technology to advancing
species, and industrial processing equipment to cosmic predators.

### Customer Options

- Complete stealth:
  - Time window: within **50 years**.
  - Probability: **0.003%**.
- Proactive contact:
  - Time window: **10-20 years**.
  - Contact success: **97%**.
  - Optimization probability: **77%**.
- Status quo:
  - Time window: **100+ years**.
  - Eventual contact: **100%**.
- Customer satisfaction during jello conversion: **98%**.

## Named Entities & Terms

- **Bi-Smart Corporation**: survival-commerce megacorp; survives bankruptcy,
  monetizes extinction, prioritizes brand visibility.
- **Bi-Smart Survival Emporium**: product storefront / coupon joke source.
- **Vel'Tar Consortium**: overlapping hostile-biological, incompatible-physics,
  pure-malevolence threat.
- **Kepler-442 / Kepler-442b**: rare polite-nod success in the forward; also the
  Cosmic Architects contractor project in chapter 2.
- **Kepler-186**: Dark Forest sterilization example; keep distinct from Kepler-442.
- **Gliese 667C "Safe Harbor"**: relocation destination in the Kepler-442 case.
- **Zorp-Benson Affective Heuristic Analyzer**: bureaucratic distance-adjustment
  instrument.
- **Glorgian Death Wasp**: dangerous-fauna stock reference, especially for mating
  call warnings.
- **GCFI**: Galactic Contact Fatality Index; forward-level global metric.
- **Cosmic Perspective Disorder**: recurring psychological aftermath condition.
- **Jello-fication / jello enhancement**: biological conversion into useful or
  service-optimized matter.

## Consistency Rules For Future Manual Work

- Use **47,829** as the global contact corpus unless a chapter explicitly names a
  narrower dataset.
- Use **23,847** for chapter-local helpful/hostile scenario corpora only when the
  chapter context supports it.
- Keep these comparisons stable:
  - Helpful survival: **23%**.
  - Helpful elimination: **77%**.
  - Hostile survival / evacuation: **45.8-46%**.
  - Hostile elimination: **54%**.
- Do not describe hostile aliens as safer overall; describe them as easier to
  classify quickly, which improves evacuation odds.
- Keep Kepler-442 and Kepler-186 separate:
  - Kepler-442: polite-nod rarity and Cosmic Architect contractor absurdity.
  - Kepler-186: Dark Forest sterilization and survival trauma.
- When using **847**, anchor the context. It appears as bankruptcy count,
  affected infrastructure projects, sales/profit metrics, and billion-viewer scale.
- When using **47**, anchor the context. It appears in event counts, logic puzzle
  scale, lava durability, population centers, and timing windows.
- Treat afterword numbers as corporate projections or marketing analytics unless
  the text explicitly says they are historical manual data.
- Add new recurring numbers, factions, or products here before relying on them
  across multiple chapters.
