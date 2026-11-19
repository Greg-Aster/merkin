import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import gallery from '../data/gallery.json'
import { generations, getReading, topics } from '../lib/reading'

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://ainek.io')).href.replace(/\/$/, '')
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  )

  const systemReferences = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'reference' && (r.generation !== 'v1' || p.slug === 'ainekio-v1')
  })
  const journalEntries = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'journal' && r.generation !== 'v1'
  })
  const v1ArchiveDocs = posts.filter(p => getReading(p).generation === 'v1' && p.slug !== 'ainekio-v1')
  const videos = gallery.filter(item => item.src)

  const lines: string[] = [
    '# Ainekio — 12-Servo ESP32-P4 Quadruped Companion & Ainekio OS',
    '',
    '> Ainekio is a custom 650 g 3D-printed 12-servo quadruped robot (~$85 electronics/hardware BOM) running a 107.8 KB int8 DAgger-distilled RL locomotion policy at 50 Hz inside the Waveshare ESP32-P4-WIFI6 128 KB L2 cache, paired with Ainekio OS—a local-first cognitive runtime for persistent memory, room-audio voice conversation, generative Freestyle inverse-kinematics motion, and bounded physical autonomy across three hardware generations (V1, V2, and armored V3).',
    '',
    '## Key Technical Facts',
    '',
    '- **Three Robot Generations (V1 · V2 · V3)**:',
    '  - **Ainekio V1 (8-Servo Spider Lineage)**: Summer 2026 physical carpet baseline (`ESP32-S3-WROOM CAM`, 8× open-loop `MG90S`, `OV3660`, 38 `.amot` motions) plus the modernized `Scene \'v1\'` CAD revisit (`196.7 × 186.5 × 78.1 mm`): seated `Frame8` enclosure cap, cyan-blue serrated 2-DOF legs, `8× 683ZZ` counter-bearings, coaxial Hip-Z torsion wire routing, `Waveshare ESP32-P4-WIFI6` + `PCA9685` + 8× 4th-wire analog sense (`J0–J7`) + `GY-LSM6DS3` IMU + `Arducam B0066`, and all **59** procedural V2 expressions (`303` `.bin` frames) derived to the `0.96"` `SSD1306` OLED.',
    '  - **Ainekio V2 (Active 650 g Closed-Loop Floor Robot)**: 3-DOF-per-leg four-bar quadruped (`244.9 × 141.5 × 103.4 mm` neutral CAD; `35/20/28/38/55 mm` linkage; 34 `Red/` STLs) with 12× `MG90S` servos modified for 4th-wire potentiometer feedback (`CD74HC4067` `S0–S3 = GPIO27–30` → `GPIO49` `ADC2_CH0`, `[1..4094]` full-span jam sensing + `8–10 s` per-joint `I²t` winding thermal fuse), `PCA9685` 50 Hz PWM, `LSM6DS3` 6-axis IMU (`208 Hz`), `OV5647` CSI camera, `ES8311` + `NS4150B` audio (`microWakeWord` + WebRTC VAD), and `1.9"` `ST7789` LCD (`320 × 170`, 59 procedural expressions).',
    '  - **Ainekio V3 (608-Mesh Armored DS3235 CAD, In Dev)**: Heavy-equipment ROPS quadruped (`436.3 × 236.5 × 381.4 mm` neutral CAD w/ whip in `v3-2.blend`) with 12× waterproof `DS3235` servos, `87.7/40/93.6/158.4 mm` shrouded crawler legs, `2.0 mm` rear clamshell piano hinge, `38` `M3` subframe fasteners, recessed `2.8"` `MSP2807` vault TFT, `4× 21700` (`2S2P`) belly pack, and onboard `Radxa Dragon Q6A` Linux SBC + `ESP32-P4`.',
    '- **3-System Neural Motion & Cockpit HUD**: System 1 runs a 110,432-byte (`107.84 KiB`) `int8` MicroDuck walking policy (`v18` Sys-ID & `v19-snag-p4` swing-foot snag reflex + `1.8 s` `-0.45 m/s` reverse unsnag + RISC-V PIE vector fixes) natively at 50 Hz inside the ESP32-P4 128 KB L2 cache; System 2 runs 50 Hz `NeuralPose v5-adaptive` (`6.7 mm` ground-friction snag micro-stepping, `280 ms` single-joint recoil, and multi-joint stance jam `replan_recovery`) over a `2,322`-example (`94`-family) `Qwen3.5-0.8B` Freestyle curriculum; System 3 runs a retrained 20 Hz `56.4 KB` `int8` Living Presence policy (`99.65%` expression accuracy, `14 mm` vertical yield, speech-RMS body motion, and silent-lock `~0.42 s` wake-word perk during VAD speech capture). Controlled via Ainekio Cockpit (`Tap to Talk` + translucent 7-graph Ainekio OS live stream).',
    '- **Ainekio OS (The Mind)**: Local-first TypeScript/LangGraph cognitive architecture (`47` cognitive graphs, `203` node definitions, `ExecutionStore` v2 synchronous `JsonPlus` SQLite durability) with deduplicated `v26` Intent & Task Action Selector LoRAs (`661` source cases / `2,941` dev records on `Qwen3.5-0.8B`), 8-sector single-hop Embodied Curiosity, `llama.cpp`/Ollama/LAN/Big-Brother routing (`Codex`, `Claude Code`, warm `GeminiAcpServer`), offline-first Whisper STT, VRAM-aware Kokoro/Piper TTS, episodic/vector memory, and an 8-stage `02:00` Sleep/Dreaming consolidation cycle.',
    '- **Interactive 1:1 3D CAD Assets (glTF `.glb`)**:',
    `  - Ainekio V1: ${origin}/models/ainekio-v1.glb`,
    `  - Ainekio V2: ${origin}/models/ainekio-v2.glb`,
    `  - Ainekio V3: ${origin}/models/ainekio-v3.glb`,
    '- **Source Repositories**:',
    '  - Hardware CAD, ESP-IDF firmware, Python Body Control gateway, MuJoCo MJCF & RL: https://github.com/Greg-Aster/Ainekio-bot',
    '  - Ainekio OS cognitive runtime, memory, voice & Environment Bridge: https://github.com/Greg-Aster/ainekio-os',
    `- **Complete Markdown Corpus**: ${origin}/llms-full.txt`,
    `- **RSS Feed**: ${origin}/rss.xml`,
    '',
    '## Primary Entry Points',
    '',
    `- [Project Overview & Architecture](${origin}/posts/project-overview/): End-to-end overview of V1, V2, and V3 hardware, the Body Control gateway, and Ainekio OS.`,
    `- [What Ainekio Can Do — Complete Capability & Spec Inventory](${origin}/posts/what-ainekio-can-do/): Verified hardware, firmware, protocol-v1, gateway, RL locomotion, Freestyle IK, and Ainekio OS capability tables.`,
    `- [Ainekio: A Weapon of Mass Destruction Disguised as a Toy](${origin}/posts/ainekio-weapon-of-mass-destruction/): User-owned embodied AI architecture, V1/V2/V3 lineage, encrypted imprinting, Big Brother leverage, and the Lifeline Protocol.`,
    `- [How Does Ainekio Stack Up?](${origin}/posts/how-does-ainekio-stack-up/): Engineering & BOM comparison against consumer toys, Stanford Pupper V3, OpenDuck Microduck, industrial humanoids, and a 75-ton mech.`,
    `- [Three-System Neural Motion](${origin}/posts/three-system-neural-architecture/): System 1 (50 Hz MicroDuck v19), System 2 (50 Hz NeuralPose v5-adaptive + 2,322-row Freestyle), and System 3 (20 Hz Living Presence).`,
    `- [Ainekio V1 Systems Guide](${origin}/posts/ainekio-v1/) · [Ainekio V2 Hardware & Wiring](${origin}/posts/ainekio-v2/) · [Ainekio V3 Armored CAD](${origin}/posts/ainekio-v3-preview/): Dedicated hardware guides with interactive 1:1 Three.js 3D CAD viewers.`,
    `- [Ainekio OS Guide](${origin}/posts/ainekio-os/): Cognitive modes, durable node graphs, local memory, voice loop, and Environment Bridge.`,
    `- [Build Journal](${origin}/updates/): Chronological workbench milestones and floor-test notes.`,
    `- [Robot Media Gallery](${origin}/gallery/): ${gallery.length} workbench photos, physical floor capability videos, cross-body motion studies, MuJoCo/MJX RL rollouts, and wiring diagrams.`,
    '',
    '## System Reference Guides (V1, V2 & V3)',
    '',
    ...systemReferences.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${topics[getReading(p).topic].title} · ${generations[getReading(p).generation]}): ${p.data.description}`,
    ),
    '',
    '## Chronological Build Journal',
    '',
    ...journalEntries.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${p.data.published.toISOString().slice(0, 10)}): ${p.data.description}`,
    ),
    '',
    '## Robot Videos (MP4)',
    '',
    ...videos.map(
      v => `- [${v.title}](${origin}${v.src}) (${v.date}): ${v.caption}`,
    ),
    '',
    '## Optional: Retained Summer 2026 V1 Design Archive',
    '',
    ...v1ArchiveDocs.map(
      p => `- [${p.data.title}](${origin}/posts/${p.slug}/): ${p.data.description}`,
    ),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
