import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import gallery from '../data/gallery.json'
import { getReading, topics } from '../lib/reading'

export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://ainek.io')).href.replace(/\/$/, '')
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.published.getTime() - a.data.published.getTime(),
  )

  const v2Reference = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'reference' && r.generation !== 'v1'
  })
  const v2Journal = posts.filter(p => {
    const r = getReading(p)
    return r.kind === 'journal' && r.generation !== 'v1'
  })
  const v1Docs = posts.filter(p => getReading(p).generation === 'v1')
  const videos = gallery.filter(item => item.src)

  const lines: string[] = [
    '# Ainekio — 12-Servo ESP32-P4 Quadruped Companion & Ainekio OS',
    '',
    '> Ainekio is a custom 650 g 3D-printed 12-servo quadruped robot (~$85 electronics/hardware BOM) running a 107.8 KB int8 DAgger-distilled RL locomotion policy at 50 Hz inside the Waveshare ESP32-P4-WIFI6 128 KB L2 cache, paired with Ainekio OS—a local-first cognitive runtime for persistent memory, room-audio voice conversation, generative Freestyle inverse-kinematics motion, and bounded physical autonomy.',
    '',
    '## Key Technical Facts',
    '',
    '- **Active Hardware (V2) & Upcoming V3 CAD**: V2 is a 650 g PLA/PETG 3-DOF-per-leg closed-loop four-bar quadruped (`35/20/28/38/55 mm` linkage) with 12 × MG90S servos modified for 4th-wire potentiometer feedback (`CD74HC4067` → `GPIO49` `ADC2_CH0`, `[1..4094]` full-span jam sensing + 8–10 s per-joint `I²t` winding thermal fuse), `PCA9685` 50 Hz PWM, `LSM6DS3` 6-axis IMU (`208 Hz`), `OV5647` CSI camera, `ES8311` + `NS4150B` audio, and 1.9" `ST7789` LCD (`320 × 170`, 59 procedural expressions). V3 (`v3-2.blend`) is a 440.8 × 234.4 × 307.8 mm armored quadruped with 12 waterproof `DS3235` servos, `87.7/40/93.6/158.4 mm` shrouded crawler legs, a recessed 2.8" `MSP2807` vault TFT, `4× 21700` cells, and an onboard `Radxa Dragon Q6A` Linux SBC + `ESP32-P4`.',
    '- **3-System Neural Motion & Cockpit HUD**: System 1 runs a 110,432-byte (`107.84 KiB`) `int8` MicroDuck walking policy (`v18` Sys-ID & `v19-snag-p4` swing-foot snag reflex + 1.8 s `-0.45 m/s` reverse unsnag + RISC-V PIE vector fixes) natively at 50 Hz inside the ESP32-P4 128 KB L2 cache; System 2 runs 50 Hz `NeuralPose` (`0.52°–1.33°` MAE @ 180 ms Wi-Fi delay + 280 ms manifold jam recoil) over a 1,812-example `Qwen3.5-0.8B` Freestyle curriculum; System 3 runs a 20 Hz `56 KB` `int8` Living Presence policy (`99.69%` expression accuracy, speech-RMS body motion, silent during VAD listening). Controlled via Ainekio Cockpit (`Tap to Talk` + translucent 7-graph Ainekio OS live stream).',
    '- **Ainekio OS (The Mind)**: Local-first TypeScript/LangGraph cognitive architecture (`47` cognitive graphs, `203` node definitions, `ExecutionStore` v2 synchronous `JsonPlus` SQLite durability) with 8-sector single-hop Embodied Curiosity, `llama.cpp`/Ollama/LAN/Big-Brother routing (Codex, Claude Code, warm Gemini ACP), Whisper STT, VRAM-aware Kokoro/Piper TTS, episodic/vector memory, and an 8-stage `02:00` Sleep/Dreaming consolidation cycle.',
    '- **Source Repositories**:',
    '  - Hardware CAD, ESP-IDF firmware, Python Body Control gateway, MuJoCo MJCF & RL: https://github.com/Greg-Aster/Ainekio-bot',
    '  - Ainekio OS cognitive runtime, memory, voice & Environment Bridge: https://github.com/Greg-Aster/ainekio-os',
    `- **Complete Markdown Corpus**: ${origin}/llms-full.txt`,
    `- **RSS Feed**: ${origin}/rss.xml`,
    '',
    '## Primary Entry Points',
    '',
    `- [What Ainekio Can Do — Complete Capability & Spec Inventory](${origin}/posts/what-ainekio-can-do/): Verified hardware, firmware, protocol-v1, gateway, RL locomotion, Freestyle IK, and Ainekio OS capability tables.`,
    `- [Project Overview & Architecture](${origin}/posts/project-overview/): End-to-end overview of the physical V2 robot, Body Control gateway, and Ainekio OS.`,
    `- [How Does Ainekio Stack Up?](${origin}/posts/how-does-ainekio-stack-up/): Engineering & BOM comparison against Stanford Pupper V3 and OpenDuck Microduck.`,
    `- [Ainekio OS Guide](${origin}/posts/ainekio-os/): Cognitive modes, durable node graphs, local memory, voice loop, and Environment Bridge.`,
    `- [Build Journal](${origin}/updates/): Chronological workbench milestones and floor-test notes.`,
    `- [Robot Media Gallery](${origin}/gallery/): ${gallery.length} workbench photos, physical walking videos, MuJoCo/MJX RL rollouts, and wiring diagrams.`,
    '',
    '## V2 System Reference Guides',
    '',
    ...v2Reference.map(
      p =>
        `- [${p.data.title}](${origin}/posts/${p.slug}/) (${topics[getReading(p).topic].title}): ${p.data.description}`,
    ),
    '',
    '## Chronological Build Journal (V2 Workbench Entries)',
    '',
    ...v2Journal.map(
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
    '## Optional: Retained V1 (8-Servo) Archive',
    '',
    ...v1Docs.map(
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
