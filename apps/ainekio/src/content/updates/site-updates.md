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
  status: "Body events, self-leveling and Wi-Fi maintenance"
  location: "V2 / P4 · Body Control · MetaHuman OS"
  updated: 2026-10-14
  mileage: "October 14 · sensor events · saved leveling controls · model qualification"
  section: "The body reports events and gains configurable local feedback"
  nextStop: "Verify loaded startup and leveling, resolve speech/action planning regressions, and complete the wake/photo/stretch/stand routine."
  note: "Body events now reach a dedicated MetaHuman workflow. Body Control adds adjustable self-leveling, SD video and downloads, Wi-Fi firmware updates and robot logs. Dated records verify installed controls and a short recording/network run; reliable physical reactions and loaded leveling remain unfinished."
  areas:
    - label: "Body events"
      status: "Wake, tipped and rapid-movement events"
      detail: "Editable per-robot thresholds and a 10-second rapid-event interval. Event Trigger chooses a response or no action, then delegates to Environment Mode."
    - label: "IMU and leveling"
      status: "Telemetry and saved response controls implemented"
      detail: "The October 14 record verifies installed 0.8.46 tuning controls. On/Off, strength, damping and roll/pitch targets are separate from calibration; loaded leveling remains unverified."
    - label: "Recording and service"
      status: "SD video, downloads, Wi-Fi updates and logs"
      detail: "Shared camera JPEGs feed segmented video. Firmware stages before explicit activation. A dated 469-second run recorded 411 frames with no reconnects; endurance remains open."
    - label: "Task models"
      status: "Two new candidates tested; existing adapter retained"
      detail: "The latest candidate improved evaluation reference matches from 44% to 83%, but introduced three historical missed-action failures. Neither new candidate is deployed."
    - label: "Physical build"
      status: "566 g and 5 V reported on October 13"
      detail: "MG90 servos; shell printing and a 4 A supply were reported October 12. Final shell mass, measured current, battery arrangement and endurance remain to document."
    - label: "Vision"
      status: "Selected-target tracking and larger-model planning"
      detail: "The earlier stationary chair result remains dated. Camera/image objectives route to the configured vision planner; full moving-target acquisition remains unqualified."
    - label: "Motion and geometry"
      status: "Staged startup and a local geometry calculator"
      detail: "Crouch, shoulder alignment and rise replace calibration Home at boot. Modeled linkage comparisons do not establish physical tracking, torque margin or automatic get-up."
    - label: "Build options"
      status: "V1 supported; V2 Wireless priority"
      detail: "Eight-servo S3 remains separate from twelve-servo P4. Wired Q6A remains an alternative; desktop results do not qualify Q6A concurrency or the robot ROS adapter."
entries:
  - title: "The body can start a conversation"
    date: 2026-10-14
    location: "Body Control and MetaHuman OS"
    mileage: "Wake / tipped / rapid movement · configurable reporting"
    summary: "A dedicated Event Trigger workflow receives body measurements and selects an intention for Environment Mode. Robot Status includes IMU evidence; reaction wording comes from the model. Full wake/stretch reliability remains open."
    url: "/posts/2026-10-14-body-events/"
  - title: "Startup, self-leveling and the real leg geometry"
    date: 2026-10-14
    location: "P4 body controller and linkage research"
    mileage: "Staged rise · saved tuning · 566 g / 5 V report"
    summary: "Boot posture is separate from calibration Home. Body Control gains saved leveling strength, damping and attitude targets; the geometry calculator explores load and reach. Installation is recorded, with loaded correction still unverified."
    url: "/posts/2026-10-14-startup-and-leveling/"
  - title: "Video on the robot, firmware updates over Wi-Fi"
    date: 2026-10-14
    location: "P4 camera, SD storage and Body Control"
    mileage: "Record / download · staged OTA · robot logs"
    summary: "Shared JPEGs feed internal-card video; Body Control retrieves clips and logs and stages P4 updates for explicit activation. A 469-second controller run recorded 411 frames without reconnecting."
    url: "/posts/2026-10-14-recording-and-updates/"
  - title: "Teaching the Task model what to say and what to move"
    date: 2026-10-14
    location: "MetaHuman specialist training"
    mileage: "Two 0.8B candidates · held-out comparison · no deployment"
    summary: "Training addresses quoted speech mistaken for physical movement. The latest candidate improves overall reference agreement but misses three historical actions; the existing Task adapter remains in production."
    url: "/posts/2026-10-14-speech-and-task-training/"
  - title: "Shell printing, weight changes and a 4 A supply"
    date: 2026-10-12
    location: "Physical build and Blender development"
    mileage: "Exterior printing · prototype exports · revised grounded motions"
    summary: "Exterior printing has begun, with more weight modifications and a switch to a 4 A supply. See the current Blender design, explore dated shell and camera-mount files, and compare revised Lay Down and Play Dead paths."
    url: "/posts/2026-10-12-shell-power-and-motion/"
  - title: "YOLOE: from person detection to selected targets"
    date: 2026-10-12
    location: "P4 camera, desktop gateway and MetaHuman"
    mileage: "Search / select / release · ByteTrack · live chair test"
    summary: "Real camera observations now reach MetaHuman with query and track IDs. The stationary chair test shows both a weak model-selected region and a successful tighter reference, with sustained camera recovery still unresolved."
    url: "/posts/2026-10-12-yoloe-tracking/"
  - title: "Training the intent orchestrator and task manager"
    date: 2026-10-12
    location: "MetaHuman OS models and node workflows"
    mileage: "Qwen 0.8B specialists · tool routing · paired candidate results"
    summary: "Follow the trained intent/task split, recorded activations and computer-task delegation. Side-by-side results explain why a later goal-planning candidate was rejected despite a better evaluation score."
    url: "/posts/2026-10-12-trained-specialists/"
  - title: "Gait journal: lift, place, then lower"
    date: 2026-10-12
    location: "Continuing motion experiments"
    mileage: "8 mm authored lift · seven-second clips · modeled speed comparison"
    summary: "Lay Down and Play Dead gain staged foot placements and a reverse recovery path in local source. The journal preserves the original end poses and distinguishes sampled geometry from physical qualification."
    url: "/posts/gait-development/"
  - title: "Standing, walking and responding to commands"
    date: 2026-10-08
    location: "Physical twelve-servo robot"
    mileage: "Owner report · new photograph · carapace still off"
    summary: "The robot can now stand, walk and respond to commands. The exposed assembly, October 6 comparison, and latest mounting-part exports. Active Operator has not been tested."
    url: "/posts/2026-10-08-standing-walking/"
  - title: "A face on the robot: display, camera and voice"
    date: 2026-10-08
    location: "P4 display and media"
    mileage: "Wide LCD · 59 face names · renderer previews · dated device checks"
    summary: "The physical display is illuminated, and the local expression library keeps growing. Explore actual animated renderer previews alongside the recorded camera, speaker and wake-capture results, with newer local refinements clearly identified."
    url: "/posts/2026-10-08-face-and-media/"
  - title: "Responsive commands and connection choices"
    date: 2026-10-08
    location: "MetaHuman OS and Body Control"
    mileage: "Task / conversation split · background interpretation · saved connections"
    summary: "Request routing and connection changes, plus speech and person-detection work. Model stop/completion failures and physical Active Operator testing remain open."
    url: "/posts/2026-10-08-responsive-commands/"
  - title: "Gait journal: the robot can stand and walk"
    date: 2026-10-08
    location: "Continuing technical journal"
    mileage: "October 6 / October 8 comparison · physical prototype photograph"
    summary: "The latest entry records standing, walking and command response while preserving the failed standing attempt and all earlier linkage experiments. Exact installed revisions and measured gait performance remain to document."
    url: "/posts/gait-development/"
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
    summary: "The walking sequence lengthens its steps, doubles its cadence, then returns to short steps. Revised linkage, stance planning, and motion data."
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
    summary: "Earlier and compact legs compared side by side, with the horn-cavity correction and upright print files."
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
    summary: "The printed legs have much more expressive movement than the models I have seen online. Three prototype photos, fit problems, revised dimensions, and foot options."
    url: "/posts/2026-09-15-leg-prototypes/"
  - title: "Fitting the V2 body together"
    date: 2026-09-10T12:00:00-07:00
    location: "Hardware + MetaHuman OS"
    mileage: "Daily design update · actual Blender renders"
    summary: "The four-leg Blender assembly now includes a wider chassis, electronics, smoother linkages, revised covers, and a camera/display carrier. Fourteen saved revisions, component dimensions, remaining fit checks, and a MetaHuman OS update."
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

For an introduction to personality, memory, autonomy and learning, read
[Ainekio as a companion](/posts/ainekio-companion/).

See [current project status](/posts/current-status/) for the latest summary,
or [browse the full article archive](/archive/) for guides and earlier reports.

Latest: [body events](/posts/2026-10-14-body-events/), [startup and leveling](/posts/2026-10-14-startup-and-leveling/), [recording and Wi-Fi updates](/posts/2026-10-14-recording-and-updates/), and [Task model qualification](/posts/2026-10-14-speech-and-task-training/).

October 12: [shell, power and motion](/posts/2026-10-12-shell-power-and-motion/), [YOLOE tracking](/posts/2026-10-12-yoloe-tracking/) and
[trained specialists](/posts/2026-10-12-trained-specialists/).

October 8: [standing and walking](/posts/2026-10-08-standing-walking/),
[face and media](/posts/2026-10-08-face-and-media/),
[responsive commands and connections](/posts/2026-10-08-responsive-commands/),
the [V1/V2 comparison](/posts/v1-v2-comparison/) and
[gait journal](/posts/gait-development/).

The October 6 [lighter rebuild](/posts/2026-10-06-lighter-rebuild/),
[compact linkage](/posts/2026-10-06-compact-linkage/) and
[steering/sensing](/posts/2026-10-06-steering-sensing-connections/) entries retain that earlier observation period.

Earlier [September 30 Q6A and active-loop work](/posts/q6a-chassis-and-active-loop/),
[September 28 Wired / Wireless and ROS 2](/posts/2026-09-28-wired-wireless-ros2/),
[compact body and face](/posts/2026-09-28-compact-body/),
[Anker fit studies](/posts/2026-09-24-body-and-battery/),
[shell development](/posts/2026-09-21-shell-design/),
[compact legs and print files](/posts/2026-09-21-compact-leg-design/) and
[printed-leg photographs](/posts/2026-09-15-leg-prototypes/) remain available
as dated build records.
