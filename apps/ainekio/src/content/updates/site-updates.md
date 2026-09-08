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
  status: "V2 body and MetaHuman software development"
  location: "Working V1 / planned V2"
  updated: 2026-09-07
  mileage: "Ainekio 0592ca4 · MetaHuman c57a56ff + local work"
  section: "Twelve-servo mechanics and saved workflows"
  nextStop: "One leg and measured power"
  note: "V1 is the working eight-servo S3 robot. V2 leg work and power tests come next. MetaHuman workflows and adapter recovery are under integration; P4 firmware and deployed robot tests remain ahead. The simulator has been retired."
entries:
  - title: "Saved workflows integrated in development"
    date: 2026-09-07
    location: "MetaHuman OS and Ainekio gateway"
    mileage: "Local integration work"
    summary: "Development code now saves workflow waits, specialist results, and robot action records across interruptions. Focused tests have passed; deployment and physical tests remain."
    url: "/posts/metahuman-integration/"
  - title: "V2 plan: twelve servos and ESP32-P4"
    date: 2026-09-06
    location: "Mechanical design"
    mileage: "Design note and local leg references"
    summary: "The plan keeps MG90S servos, tests an OpenHarmony Puppy V2 leg, and sizes a new chassis and supply from measurements. Scripted movement comes first; balance and terrain response are deferred."
    url: "/posts/ainekio-v2/"
  - title: "V1 parts and wiring corrected"
    date: 2026-09-02
    location: "Hardware documentation"
    summary: "The build reference documents the Freenove N16R8, corrected S3 pins, SSD1306 display, and 1000 mAh 2S battery. V2 wiring and power selection remain separate design work."
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
    summary: "Robot Operator took responsibility for starting autonomous work. Environment Mode, Bridge, Task State, and the Work Coordinator retained distinct roles in that version; the September redesign changed task continuation."
    url: "/posts/bounded-autonomy/"
  - title: "Wake-word pilot limited after false triggers"
    date: 2026-08-23
    location: "Voice"
    summary: "Room tests exposed problems with the pilot threshold and negative examples. Wake detection still needs model tuning and room testing."
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
    summary: "Walk sequences were shortened to roughly five seconds, flashed to LittleFS, and checked by digest readback."
    url: "/posts/protocol-and-safety/"
  - title: "Physical audio playback tested"
    date: 2026-07-29
    location: "Robot audio"
    summary: "Paced delivery produced clean audible playback in one test. Speaker underruns and microphone transport faults remained unresolved."
    url: "/posts/voice-loop/"
---

# Field updates

Dated changes and test results. Linked articles contain the details and current
status; older entries describe the system at the time.
