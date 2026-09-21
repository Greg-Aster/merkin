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
  status: "V2: compact legs, a narrower chassis and an evolving shell"
  location: "Working V1 / V2 geometry and assembly studies"
  updated: 2026-09-21
  mileage: "September 17–20 design records · CAD views and print files"
  section: "Chassis packaging, compact linkages, horn fit and shell development"
  nextStop: "Confirm the chosen compact assembly, check its printed horn fit and shell/cable clearances, then retarget and evaluate the first full-body gait on that exact revision."
  note: "Recent work has concentrated on the robot's chassis, leg geometry and outer shell. The September 17 chassis revision narrowed the body from 103 to 51.2 mm; later leg studies use a 22 mm crank, 36 mm rod and 55 mm lower leg. CAD motion research is now available, with results tied to specific revisions. The latest assembly still needs fit, clearance and loaded-motion checks."
  areas:
    - label: "V1 robot"
      status: "Working physical prototype"
      detail: "Eight servos and an ESP32-S3 controller."
    - label: "V2 chassis and legs"
      status: "Compact geometry and print-fit iteration"
      detail: "Narrower chassis, upright and angled leg variants, and a horn cavity revised after a failed printed fit."
    - label: "V2 shell"
      status: "CAD refinement in progress"
      detail: "September 20 views document the evolving face, collar and vented roof around the mechanism."
    - label: "Gait development"
      status: "Calculated motion studies"
      detail: "Motion sources and 10/20/30 mm single-leg probes; the current complete assembly still needs validation."
    - label: "MetaHuman OS"
      status: "Last reported September 10"
      detail: "Input continuity, training, and profile-memory refinements."
entries:
  - title: "Developing the shell around the mechanism"
    date: 2026-09-21
    location: "Body and shell design"
    mileage: "September 19 iterations · September 20 CAD views"
    summary: "Actual assembly views follow the face, collar, roof and fin work, including rejected trials and a matched roof before/after comparison."
    url: "/posts/2026-09-21-shell-design/"
  - title: "Compact legs: geometry, print faces and horn fit"
    date: 2026-09-21
    location: "Leg mechanism and 3D printing"
    mileage: "22/36/55 mm compact geometry · recorded STL exports"
    summary: "Compare earlier and compact legs side by side, examine the targeted horn-cavity correction, and download the dated upright print files."
    url: "/posts/2026-09-21-compact-leg-design/"
  - title: "Narrowing the chassis and making room for the face"
    date: 2026-09-21
    location: "Chassis and electronics packaging"
    mileage: "103 to 51.2 mm · board and cable clearance"
    summary: "The narrow-body revision moves the side assemblies inward and revisits electronics packaging. A later front-panel change moves the camera-cable recess below the face."
    url: "/posts/2026-09-21-chassis-packaging/"
  - title: "Gait journal: motion studies and compact-leg probes"
    date: 2026-09-21
    location: "Continuing gait experiments"
    mileage: "September 17 motion integration · September 19 single-leg study"
    summary: "Dated entries add the motion library and 10/20/30 mm compact-leg probes, with comparison tables, contact assumptions and downloadable results."
    url: "/posts/gait-development/"
  - title: "Starting the gait development journal"
    date: 2026-09-15
    location: "Linkage math and gait development"
    mileage: "Eight-servo motion baseline · twelve-servo geometry"
    summary: "A continuing technical journal compares the original robot's stored motion ranges with the new linkage's theoretical travel. The first entry includes the mechanism diagram, nonlinear input/output examples, and downloadable range data. Gait calculations are still ahead."
    url: "/posts/gait-development/"
  - title: "From CAD to printed leg prototypes"
    date: 2026-09-15
    location: "Leg assembly and 3D printing"
    mileage: "Prototype photos · September 12–14 design records"
    summary: "Greg finds the printed legs much more expressive than the models he has seen online. See three prototype photos, fit lessons from the real parts, revised dimensions, and the latest foot options."
    url: "/posts/2026-09-15-leg-prototypes/"
  - title: "Fitting the V2 body together"
    date: 2026-09-10T12:00:00-07:00
    location: "Hardware + MetaHuman OS"
    mileage: "Daily design update · actual CAD renders"
    summary: "The four-leg CAD assembly now includes a wider chassis, electronics, smoother linkages, revised covers, and a camera/display carrier. Follow fourteen saved revisions, component dimensions, remaining fit checks, and a brief MetaHuman OS update."
    url: "/posts/2026-09-10-v2-body-design/"
  - title: "Three ways to drive a knee with short rods"
    date: 2026-09-09T12:00:00-07:00
    location: "Leg mechanism research"
    mileage: "Three CAD variants · modeled motion and collision checks"
    summary: "A direct rod, a supported relay yoke, and an offset cascade were compared. The relay remains the next research candidate; none met the complete range and pose brief."
    url: "/posts/2026-09-09-leg-mechanism-study/"
  - title: "Giving robot tasks a clear finish line"
    date: 2026-09-08
    location: "MetaHuman OS"
    mileage: "Source repair · controlled workflow tests"
    summary: "Robot tasks now follow a finite plan with a clear completion condition. Pending ideas remain visible without becoming standing movement instructions. Deployment verification remains."
    url: "/posts/bounded-autonomy/"
  - title: "Keeping delayed robot feedback connected"
    date: 2026-09-08
    location: "Ainekio gateway and adapter"
    mileage: "68 recorded software checks"
    summary: "Delayed feedback stays attached to the original command. Recovery tracks the result without repeating movement. Controlled tests passed; a gateway restart and live testing remain."
    url: "/posts/gateway-and-simulator/"
  - title: "Live workflow evidence and goal-context repairs"
    date: 2026-09-08
    location: "MetaHuman OS"
    mileage: "Recorded live run and later source repairs"
    summary: "A live review found command feedback, images reaching model requests, and acknowledged speech deliveries. It also exposed stale goals. Later repairs retain truthful execution status and connect specialist answers to the waiting request; physical validation of those repairs remains."
    url: "/posts/archive/2026-09-09-project-status/"
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
    url: "/posts/archive/2026-09-09-project-status/"
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

See [current project status](/posts/current-status/) for the latest summary,
or [browse the full article archive](/archive/) for guides and earlier reports.

Latest build entries: [shell development](/posts/2026-09-21-shell-design/),
[compact legs and horn fit](/posts/2026-09-21-compact-leg-design/), and
[chassis packaging](/posts/2026-09-21-chassis-packaging/). The
[gait journal](/posts/gait-development/) now includes later motion studies
and compact-leg probes. The [printed-leg update](/posts/2026-09-15-leg-prototypes/)
retains the original prototype photos and earlier fit revisions.
