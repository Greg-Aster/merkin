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
  status: "Q6A integration, revised chassis and active-loop foundations"
  location: "Working S3 Ainekio / P4 + Q6A development"
  updated: 2026-09-30
  mileage: "Ainekio 6437b24 · MetaHuman c3f56d4"
  section: "Body, perception and saved workflows"
  nextStop: "Fit the revised body and measure loaded movement; bring up Q6A services together, then connect recognition and fresh results to bounded motion updates."
  note: "Q6A integration, revised v2 geometry and a more active perception loop are in progress. Fresh-frame processing and bounded walk updates have source and simulated-body coverage. September 24 P4 flash/boot evidence and September 25 saved-speed readback remain dated milestones; September 29 regenerated geometry has not been flashed or powered-tested. YOLO selection, live IMU acquisition and the connected physical loop remain open."
  areas:
    - label: "Original Ainekio"
      status: "Supported eight-servo S3 design"
      detail: "Working prototype with a 1,000 mAh LiPo, external charger and buck converter. Runtime not measured."
    - label: "Ainekio v2 body"
      status: "Q6A mounting and shoulder geometry revised"
      detail: "The later geometry regenerated all 47 motion sources with offline model and build checks. Fit, balance and loaded movement remain unverified; earlier shell, printed-leg and battery studies remain dated build records."
    - label: "Motion controls"
      status: "Continuous gaits and bounded walk updates"
      detail: "The existing gait catalog and Finish controls are joined by authenticated updates to speed or paired stride/cadence settings, retaining the gait, direction, action and body lease. New paths have simulated-body coverage, not loaded-body acceptance."
    - label: "P4 controller and Q6A"
      status: "Direct Wi-Fi integration in progress"
      detail: "P4 keeps gait execution; the intended Q6A host keeps the gateway and Environment Bridge local. September 24 application flash/boot and September 25 speed readback precede the unflashed September 29 geometry. Concurrent camera, audio and motion load still needs measurement."
    - label: "Battery and underside"
      status: "Removable 10,000 mAh Anker fit remains open"
      detail: "The September 24 design uses integrated bank charging without a separate buck converter; plug-in Qi is planned. Earlier one-pose contact checks do not establish complete motion clearance or battery runtime."
    - label: "MetaHuman OS and perception"
      status: "Saved workflows and fresh-frame foundations"
      detail: "Saved executions span waits, new-input steering and correlated results. Recognition and the local task producer still need joining up; YOLO remains research. Portable IMU estimation is source-tested, with live acquisition and balance feedback still unconnected."
entries:
  - title: "Q6A, chassis work, and a more active loop"
    date: 2026-09-30
    location: "Body + MetaHuman OS"
    mileage: "6437b24 · c3f56d4"
    summary: "Revised v2 geometry, Q6A integration, fresh-frame processing, and saved MetaHuman executions. YOLO and the connected active loop are still being worked out."
    url: "/posts/q6a-chassis-and-active-loop/"
  - title: "Refining the body and fitting the Anker battery"
    date: 2026-09-24
    location: "Chassis, shell and removable power"
    mileage: "Revised mounts · 80 mm support placement · 10,000 mAh bank"
    summary: "The red body gains compact mask mounts and reinforced tabs while the underside is fitted around the Anker bank already on hand. Follow the width changes, battery clearance studies and remaining assembly work, with actual CAD images."
    url: "/posts/2026-09-24-body-and-battery/"
  - title: "Eight servos versus twelve: the current comparison"
    date: 2026-09-24
    location: "V1 and V2 side by side"
    mileage: "Motion ranges · controls · processing · batteries"
    summary: "Compare the physical V1 and evolving V2, with fresh per-joint range data, ESP32-S3/P4 configuration, the two power arrangements and an explicit record that neither runtime has been measured."
    url: "/posts/v1-v2-comparison/"
  - title: "Continuous gaits, reviewed expressions and P4 deployment"
    date: 2026-09-24
    location: "Continuing gait journal"
    mileage: "Walk / Run / Crawl / Crab · 23 finite gestures and postures"
    summary: "A playable Blender showcase accompanies the new Speed, stride, cadence and Finish controls. The latest entry records revised expressions, six-direction Crab and the September 24 application flash, with the physical tests still ahead."
    url: "/posts/gait-development/"
  - title: "Integrating variable gait: stride and motion rate"
    date: 2026-09-21
    location: "Gait development and integration"
    mileage: "14-second Blender demo · independent stride and rate controls"
    summary: "Watch the new walking sequence lengthen its steps, double its cadence, then return to short steps. The continuing journal compares the revised linkage, explains stance planning, and provides the motion data and validation limits."
    url: "/posts/gait-development/"
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

Latest: [Q6A, chassis work, and a more active loop](/posts/q6a-chassis-and-active-loop/).

Earlier [body and Anker battery fit](/posts/2026-09-24-body-and-battery/),
[V1/V2 comparison](/posts/v1-v2-comparison/), and the
[gait and controller journal](/posts/gait-development/). Earlier
[shell development](/posts/2026-09-21-shell-design/),
[compact legs and print files](/posts/2026-09-21-compact-leg-design/) and
[printed-leg photographs](/posts/2026-09-15-leg-prototypes/) remain available
as dated build records.
