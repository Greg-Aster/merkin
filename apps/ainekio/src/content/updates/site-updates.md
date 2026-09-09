---
title: "Ainekio Field Updates"
journalTitle: "Milestones and field notes"
labels:
  status: "Status"
  location: "System"
  section: "Focus"
  mileage: "Reference"
  nextStop: "Next step"
  updated: "Updated"
maxEntries: 8
current:
  status: "Robot recovery and finite-work integration"
  location: "Working V1 / planned V2"
  updated: 2026-09-09
  mileage: "Ainekio 0592ca4 · MetaHuman a94fbfdd + local work"
  section: "Saved goals, command results, and Desire plans"
  nextStop: "Test a leg and measure power"
  note: "The September 8 live review recorded robot feedback, images in model inputs, and speech-delivery acknowledgements. Later source repairs address stale goals, delayed command results, and finite Desire plans; a new deployed run is still needed. V1 remains the eight-servo ESP32-S3 body, with twelve-servo V2 mechanics under development."
entries:
  - title: "Giving Desire-driven work a finish line"
    date: 2026-09-08
    location: "MetaHuman OS · Agency and robot workflows"
    mileage: "Source repair · controlled workflow tests"
    summary: "Robot work from a Desire now carries a reviewed plan, ordered steps, and an observable completion condition. Results return to the originating intention; pending ideas remain visible without becoming standing movement instructions. Deployment verification remains."
    url: "/posts/bounded-autonomy/"
  - title: "Keeping late command results connected"
    date: 2026-09-08
    location: "Ainekio gateway and adapter"
    mileage: "68 recorded software checks"
    summary: "The adapter no longer ends result tracking after a fixed 30 seconds. Recovery follows the original command and session without resending movement. Controlled late-result and cancellation tests passed; the host repair still needs a gateway restart and live testing."
    url: "/posts/gateway-and-simulator/"
  - title: "Live workflow evidence and goal-context repairs"
    date: 2026-09-08
    location: "MetaHuman OS · execution and perception"
    mileage: "Recorded live run and later source repairs"
    summary: "A live review found command feedback, images reaching model requests, and acknowledged speech deliveries. It also exposed stale goals. Later repairs retain truthful execution status and connect specialist answers to the waiting request; physical validation of those repairs remains."
    url: "/posts/current-status/"
  - title: "Keeping a request through waits and restarts"
    date: 2026-09-07
    location: "MetaHuman OS and Ainekio gateway"
    mileage: "Local integration work"
    summary: "MetaHuman’s development code saves what the robot was asked to do, what has finished, and what it is waiting for. This helps a request continue after an interruption. Focused software tests have passed; deployed robot tests remain."
    url: "/posts/metahuman-integration/"
  - title: "V2 plan: twelve servos and ESP32-P4"
    date: 2026-09-06
    location: "Mechanical design"
    mileage: "Design note and local leg references"
    summary: "V2 adds a sideways hip joint to each leg. An OpenHarmony Puppy V2 reference leg will be tested before the chassis and power supply are sized. Prepared movement sequences come first; adaptive balance is deferred."
    url: "/posts/ainekio-v2/"
  - title: "V1 parts and wiring corrected"
    date: 2026-09-02
    location: "Hardware documentation"
    summary: "The existing robot’s parts list now identifies its Freenove controller, display, and 1000 mAh battery, and corrects wiring assignments. These V1 details do not determine the planned V2 wiring or power supply."
    url: "/posts/body-design-and-hardware/"
  - title: "Local field guide published"
    date: 2026-08-27
    location: "Documentation"
    mileage: "10-article field guide"
    summary: "A local guide replaced five remote-document pages and earlier fantasy artwork. It covered hardware, firmware, commands, gateway, camera, speech, MetaHuman integration, and autonomy."
    url: "/posts/current-status/"
  - title: "Robot autonomy responsibilities consolidated"
    date: 2026-08-25
    location: "MetaHuman OS"
    mileage: "5191d6fc"
    summary: "Robot Operator became responsible for when the robot could start an activity. Other software selected actions, carried commands, saved progress, and scheduled jobs. September’s redesign later changed how ongoing requests resume."
    url: "/posts/bounded-autonomy/"
  - title: "Wake-word pilot limited after false triggers"
    date: 2026-08-23
    location: "Voice"
    summary: "The pilot sometimes treated ordinary room sounds as the wake phrase. Its detection threshold and test recordings needed more work; an accepted production wake model is still outstanding."
    url: "/posts/voice-loop/"
  - title: "Camera profile and motion commands updated"
    date: 2026-08-04
    location: "Robot firmware"
    mileage: "6ad9051"
    summary: "Firmware gained the corrected OV3660 capture profile and more named motions. The simulator was also updated at the time; that project is now retired."
    url: "/posts/controller-firmware/"
  - title: "Five-second walk assets installed"
    date: 2026-07-31
    location: "Motion assets"
    summary: "Prepared walk sequences were shortened to roughly five seconds and installed in the robot’s LittleFS asset storage. Reading them back and comparing digests checked the installed bytes; it did not measure gait quality."
    url: "/posts/protocol-and-safety/"
  - title: "Physical audio playback tested"
    date: 2026-07-29
    location: "Robot audio"
    summary: "Pacing audio delivery produced clean audible speech in one test. Logs still showed the speaker queue running empty and faults sending microphone audio, so repeated conversation needed further work."
    url: "/posts/voice-loop/"
---

# Field updates

Ainekio is a four-legged robot connected to MetaHuman OS for conversation and
decisions. These entries follow its hardware and software development. Each
entry describes its own date; linked articles explain the components, current
limitations, and next tests.
