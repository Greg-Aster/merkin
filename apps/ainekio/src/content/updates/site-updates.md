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
  status: "Lighter rebuild printing after the standing test"
  location: "Printed V2 chassis, Blender motion studies and P4/Q6A software"
  updated: 2026-10-06
  mileage: "October 6 · weight reduction, compact linkage and 23 remapped motions"
  section: "Lighter Wireless build, revised power and sensing integration"
  nextStop: "Assemble the lighter parts and repeat the standing test, recording actual weight and the installed power arrangement."
  note: "The printed chassis could not stand on its MG90 servos. The next iteration keeps those servos, removes weight, replaces the battery bank with batteries and onboard charging boards, and revises the legs. New parts are still printing; the revised assembly has not been tested."
  areas:
    - label: "Original Ainekio"
      status: "Supported eight-servo S3 design"
      detail: "Working prototype with a 1,000 mAh LiPo, external charger and buck converter. Runtime not measured."
    - label: "Physical build"
      status: "Chassis printed; revised parts printing"
      detail: "The previous chassis could not stand on MG90 servos. LCD and shell pieces remain unprinted. The lighter revision has not been tested."
    - label: "Body and power"
      status: "Material removal and a new battery direction"
      detail: "Keep MG90 servos; replace the heavy 10,000 mAh bank with separate batteries and onboard charging boards. Approximately 20% lighter and 20% more lifting force are current owner estimates, not measured results."
    - label: "Linkage and expressions"
      status: "35 mm carrier candidate; 23 offline motions"
      detail: "Complete remapped library in Blender. Upright retains reduced reach; its historical reach test still fails. Servo travel, collisions and loaded performance remain unresolved."
    - label: "Motion controls"
      status: "Continuous steering and shared joint-speed control"
      detail: "Source and recorded software checks cover steering updates and motion retiming. Physical turning and loaded cadence remain unmeasured."
    - label: "Sensing and ROS 2"
      status: "IMU estimator implemented; live feedback pending"
      detail: "The estimator is not yet fed by a hardware task or used for balance correction. Desktop Jazzy checks passed; a robot telemetry adapter remains work to do."
    - label: "Build options and connection"
      status: "Wireless priority; sustained link under investigation"
      detail: "Offboard Q6A over Wi-Fi is the selected direction; onboard Q6A/native USB remains an alternative. P4 hotspot association succeeded, but the recorded sustained-session test did not pass."
    - label: "MetaHuman OS and perception"
      status: "Saved workflows and fresh-frame foundations"
      detail: "Saved executions span waits, new-input steering and correlated results. Recognition and the local task producer still need joining up; YOLO remains research. Portable IMU estimation is source-tested, with live acquisition and balance feedback still unconnected."
entries:
  - title: "A lighter rebuild after the standing test"
    date: 2026-10-06
    location: "Printed chassis, Blender revisions and power"
    mileage: "Keep MG90 · remove weight · replace the battery bank"
    summary: "The printed chassis could not stand on its MG90 servos. Follow the material removal, move to separate batteries and onboard charging boards, and assembly changes while replacement parts are printing. The revised assembly remains untested."
    url: "/posts/2026-10-06-lighter-rebuild/"
  - title: "Shorter carriers and the complete motion library"
    date: 2026-10-06
    location: "Linkage geometry and motion experiments"
    mileage: "35 mm carrier · 20 mm crank · 28 mm pickup · 23 motions"
    summary: "Compare the shared model and compact candidate, see which foot placements changed, and follow all 23 remapped motions in Blender. Reduced Upright reach and the provisional servo-travel mismatch remain explicit."
    url: "/posts/2026-10-06-compact-linkage/"
  - title: "Steering, sensing and keeping the robot connected"
    date: 2026-10-06
    location: "P4 motion, gateway and ROS 2"
    mileage: "Continuous steering · IMU estimator · camera profiles · wireless tests"
    summary: "The software now includes steering updates, an IMU estimator and expanded camera/recognition interfaces. Desktop ROS checks and a real hotspot connection are recorded separately from live balance control and sustained wireless reliability still to establish."
    url: "/posts/2026-10-06-steering-sensing-connections/"
  - title: "Gait journal: physical results and the compact candidate"
    date: 2026-10-06
    location: "Continuing technical journal"
    mileage: "Standing result · side-by-side dimensions · retained earlier experiments"
    summary: "The newest journal entry connects the failed standing attempt to the revised linkage, records the complete offline library and separates modeled motion from the next physical test."
    url: "/posts/gait-development/"
  - title: "Q6A, chassis work, and a more active loop"
    date: 2026-09-30
    location: "Body + MetaHuman OS"
    mileage: "6437b24 · c3f56d4"
    summary: "Revised v2 geometry, Q6A integration, fresh-frame processing, and saved MetaHuman executions. YOLO and the connected active loop are still being worked out."
    url: "/posts/q6a-chassis-and-active-loop/"
  - title: "Two builds: Wired, Wireless and ROS 2 integration"
    date: 2026-09-28
    location: "Build options, software and power"
    mileage: "Onboard / offboard Q6A · ROS telemetry · local IMU feedback"
    summary: "The project now has two build directions: onboard Q6A with a planned USB body link, or offboard Q6A over Wi-Fi. Compare their packaging and power budgets, the installed ROS 2 environment, and the remaining work toward responsive gait."
    url: "/posts/2026-09-28-wired-wireless-ros2/"
  - title: "Compact Wireless body: battery, face and assembly"
    date: 2026-09-28
    location: "Chassis and electronics packaging"
    mileage: "82.5 mm frame · front-leg relocation · rear carrier relief"
    summary: "Actual Blender images follow the new build scenes, slimmer tray, LCD carrier and alignment marks. The latest front/rear clearance study keeps the original front carriers and moves those legs forward; body refitting remains in progress."
    url: "/posts/2026-09-28-compact-body/"
  - title: "Gait leverage, saved motion speed and feedback planning"
    date: 2026-09-28
    location: "Continuing gait journal"
    mileage: "Revised body references · separate gesture speed · deployment record"
    summary: "Before/after tables explain the Walk, Run and Crab changes and distinguish continuous gait controls from saved named-motion speed. Offline geometry and settings checks are recorded separately from the local IMU correction loop still to implement."
    url: "/posts/gait-development/"
  - title: "V1 and V2 comparison: two new build options"
    date: 2026-09-28
    location: "Eight servos versus twelve"
    mileage: "Controllers · Q6A placement · SHARGE battery · dated ranges"
    summary: "The comparison now includes Wired and Wireless V2, the new bank and current control changes, while retaining the explicitly dated September 24 motion-range dataset and unmeasured runtime."
    url: "/posts/v1-v2-comparison/"
  - title: "Refining the body and fitting the Anker battery"
    date: 2026-09-24
    location: "Chassis, shell and removable power"
    mileage: "Revised mounts · 80 mm support placement · 10,000 mAh bank"
    summary: "The red body gains compact mask mounts and reinforced tabs while the underside is fitted around the Anker bank already on hand. Follow the width changes, battery clearance studies and remaining assembly work, with actual Blender images."
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
    mileage: "September 19 iterations · September 20 Blender views"
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
  - title: "From Blender to printed leg prototypes"
    date: 2026-09-15
    location: "Leg assembly and 3D printing"
    mileage: "Prototype photos · September 12–14 design records"
    summary: "Greg finds the printed legs much more expressive than the models he has seen online. See three prototype photos, fit lessons from the real parts, revised dimensions, and the latest foot options."
    url: "/posts/2026-09-15-leg-prototypes/"
  - title: "Fitting the V2 body together"
    date: 2026-09-10T12:00:00-07:00
    location: "Hardware + MetaHuman OS"
    mileage: "Daily design update · actual Blender renders"
    summary: "The four-leg Blender assembly now includes a wider chassis, electronics, smoother linkages, revised covers, and a camera/display carrier. Follow fourteen saved revisions, component dimensions, remaining fit checks, and a brief MetaHuman OS update."
    url: "/posts/2026-09-10-v2-body-design/"
  - title: "Three ways to drive a knee with short rods"
    date: 2026-09-09T12:00:00-07:00
    location: "Leg mechanism research"
    mileage: "Three Blender variants · modeled motion and collision checks"
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

Latest: [the lighter rebuild](/posts/2026-10-06-lighter-rebuild/),
[compact linkage and motions](/posts/2026-10-06-compact-linkage/),
[steering, sensing and connections](/posts/2026-10-06-steering-sensing-connections/),
the [V1/V2 comparison](/posts/v1-v2-comparison/) and
[gait journal](/posts/gait-development/).

Earlier [September 30 Q6A and active-loop work](/posts/q6a-chassis-and-active-loop/),
[September 28 Wired / Wireless and ROS 2](/posts/2026-09-28-wired-wireless-ros2/),
[compact body and face](/posts/2026-09-28-compact-body/),
[Anker fit studies](/posts/2026-09-24-body-and-battery/),
[shell development](/posts/2026-09-21-shell-design/),
[compact legs and print files](/posts/2026-09-21-compact-leg-design/) and
[printed-leg photographs](/posts/2026-09-15-leg-prototypes/) remain available
as dated build records.
