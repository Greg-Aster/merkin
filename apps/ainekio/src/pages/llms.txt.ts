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
    return r.kind === 'reference' && !p.data.archive
  })
  const journalEntries = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'journal'
  })
  const earlyPlanningDocs = posts.filter(p => p.data.archive === true || getReading(p).kind === 'original')
  const videos = gallery.filter(item => item.src)

  const lines: string[] = [
    '# Ainekio — 8-Servo V1, 12-Servo V2, Armored V3 & Ainekio OS',
    '',
    '> Ainekio pairs custom 3D-printed quadruped robots—the active 8-servo clock-spring V1 and 650 g 12-servo V2 (~$85 electronics/hardware BOM running a 107.8 KB int8 MicroDuck RL locomotion policy at 50 Hz inside the Waveshare ESP32-P4-WIFI6 128 KB L2 cache), plus the 537-mesh Option A-1 armored DS3235 V3 in CAD and an alpha 3D web robot simulator in game.megameal—with Ainekio OS, a local-first cognitive runtime for persistent memory, room-audio voice conversation, generative Freestyle motion, and bounded physical autonomy.',
    '',
    '## Key Technical Facts',
    '',
    '- **Three Robot Generations (V1 · V2 · V3) & 3D Web Simulator**:',
    '  - **Ainekio V1 (Active 8-Servo Quadruped)**: Functioning floor robot (`ESP32-S3-WROOM CAM`, 8× `MG90S`, `OV3660`, 38 `.amot` motions, `0.96"` `SSD1306` OLED running all **59** procedural V2 expressions) under active mechanical and electronics development (`Scene \'v1\'` `174.8 × 155.5 × 84.1 mm`, `174` active meshes: squared `36.2 mm` vertical-knee `R2V10` arms, concentric 3-part under-arm 4-wire clock-springs, `Frame8` clock-spring bays, `21,216`-vert sculpted spiked lower legs, `683ZZ` hip counter-bearings, and `Waveshare ESP32-P4-WIFI6` + `PCA9685` + 8× 4th-wire analog sense + `GY-LSM6DS3` IMU + `Arducam B0066`).',
    '  - **Ainekio V2 (Active 650 g Closed-Loop Floor Robot)**: 3-DOF-per-leg four-bar quadruped (`244.9 × 141.5 × 103.4 mm` neutral CAD; `35/20/28/38/55 mm` linkage; 34 `Red/` STLs) with 12× `MG90S` servos modified for 4th-wire potentiometer feedback (`CD74HC4067` `S0–S3 = GPIO27–30` → `GPIO49` `ADC2_CH0`, 7-layer phantom-jam elimination + `8–10 s` per-channel `I²t` winding thermal fuse), `PCA9685` 50 Hz PWM, `LSM6DS3` 6-axis IMU (`208 Hz`), `OV5647` CSI camera, `ES8311` + `NS4150B` audio (`microWakeWord` + WebRTC VAD), and `1.9"` `ST7789` LCD (`320 × 170`, 59 procedural expressions).',
    '  - **Ainekio V3 (537-Mesh Armored DS3235 CAD, In Dev)**: Heavy-equipment ROPS quadruped (`402.0 × 236.5 × 343.1 mm` neutral CAD w/ whip in `v3-2.blend`) rescaled onto the `Option A-1` compact 5-link pantograph (`54/22/46/56/135 mm`, `+120%` vertical lift, `+116%` thrust, `0.93:1` dual-servo balance), with 12× waterproof `DS3235` servos, a `3,860`-vert lap-jointed belly chassis tub, `Clip 26` leaf-spring clamshell latches, `2.0 mm` rear piano hinge, recessed `2.8"` `MSP2807` Cyclops vault TFT, `4× 21700` (`2S2P`) belly pack, and onboard `Radxa Dragon Q6A` Linux SBC + `ESP32-P4`.',
    '  - **`simulator.ainek.io` 3D Web Robot Simulator (Live Browser Alpha, evolved from `game.megameal`)**: Live standalone zero-install browser alpha at https://simulator.ainek.io/ compiling `500 Hz` MuJoCo WASM (`mujoco_wasm.js`) and real `ESP32-P4` C firmware (`ainekio-v2-firmware.wasm`) into a browser Web Worker alongside Three.js (`ainekio-v2.glb`), `microduck-v19-snag-p4` neural gait, `NeuralPose` emotes, 6 playable 3D worlds (V2 Robotics Lab, Yggdrasil, Observatory, Miranda Wreck, Solitude, Sci Fi Room), live `320×170` `ST7789` LCD faces, virtual `OV5647` chin-cam POV driving, wrench perturbations, `J0–J11` pin/jam tests, and optional WebSocket attachment to local Body Control / Ainekio OS.',
    '- **3-System Neural Motion & Cockpit HUD**: System 1 runs a 110,432-byte (`107.84 KiB`) `int8` MicroDuck walking policy (`v18` Sys-ID & `v19-snag-p4` + `1.8 s` `-0.45 m/s` reverse unsnag) natively at 50 Hz inside the ESP32-P4 128 KB L2 cache; System 2 runs 50 Hz `NeuralPose v8-calibrated` (`2.46M` GPU MuJoCo steps, Schmitt-trigger `6.5°→3.0°` single-leg carpet stepping, `-27.87°` calibrated carrier floor, `12/12` scenarios, `0` falls) over a clean `939`-row `Qwen3.5-0.8B` Freestyle choreography LoRA; System 3 runs `50 Hz` `NeuralPosePresence` (motor-silent during `vad_open`/wake-word, pure sagittal speech nods with `0.0°` shoulder scrub). Controlled via Ainekio Cockpit (`Tap to Talk` + translucent 7-graph Ainekio OS live stream) and Apache-2.0 `RT-DETRv2 + OWLv2` local vision.',
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
    '## Optional: Early July 2026 Pre-Hardware Planning Notes',
    '',
    ...earlyPlanningDocs.map(
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
