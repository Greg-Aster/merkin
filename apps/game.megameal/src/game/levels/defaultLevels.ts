import { terrainLevelInstancesForRuntimeScene } from "../generated/terrainRuntime.js";
import type { LevelDefinition } from "./index.js";
import { observatoryLevel } from "./observatoryLevel.js";
import { portalArenaLevel } from "./portalArenaLevel.js";
import { sciFiRoomLevel } from "./sciFiRoomLevel.js";
import { solitudeLevel } from "./solitudeLevel.js";
import { yggdrasilLevel } from "./yggdrasilLevel.js";

export const prototypeLevel = {
	id: "prototype_arena",
	sceneId: "prototype_game",
	preloadGroups: ["prototype_arena"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 4,
		"game:characterBounds": {
			minX: -6,
			maxX: 6,
			minZ: -4,
			maxZ: 4,
		},
	},
	preload: [
		"mesh_player",
		"mesh_arena_floor",
		"mesh_ingredient",
		"cubemap_classic_sky",
		"material_player",
		"material_arena_floor",
		"material_ingredient",
		"audio_ui_collect",
		"audio_player_jump",
		"audio_player_charge_release",
	],
	instances: [
		...terrainLevelInstancesForRuntimeScene("prototype_arena_runtime"),
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
		},
		{
			id: "ingredient-north",
			prefabId: "ingredient_pickup",
			stableId: "ingredient:north",
			components: {
				Collectible: {
					id: "ingredient_north",
					label: "North Ingredient",
					radius: 0.85,
					value: 1,
				},
			},
			transform: {
				position: [0, 0.35, -2.8],
			},
		},
		{
			id: "ingredient-west",
			prefabId: "ingredient_pickup",
			stableId: "ingredient:west",
			components: {
				Collectible: {
					id: "ingredient_west",
					label: "West Ingredient",
					radius: 0.85,
					value: 1,
				},
			},
			transform: {
				position: [-4, 0.35, 0],
			},
		},
		{
			id: "ingredient-east",
			prefabId: "ingredient_pickup",
			stableId: "ingredient:east",
			components: {
				Collectible: {
					id: "ingredient_east",
					label: "East Ingredient",
					radius: 0.85,
					value: 1,
				},
			},
			transform: {
				position: [4, 0.35, 0],
			},
		},
		{
			id: "ingredient-south",
			prefabId: "ingredient_pickup",
			stableId: "ingredient:south",
			components: {
				Collectible: {
					id: "ingredient_south",
					label: "South Ingredient",
					radius: 0.85,
					value: 1,
				},
			},
			transform: {
				position: [0, 0.35, 3.2],
			},
		},
	],
} satisfies LevelDefinition;

export const mirandaDeckLevel = {
	id: "miranda_deck",
	sceneId: "miranda_deck_game",
	preloadGroups: ["miranda_deck"],
	resources: {
		"game:collectedCount": 0,
		"game:totalCollectibles": 0,
		"game:characterBounds": {
			minX: -20,
			maxX: 20,
			minZ: -50,
			maxZ: 48,
		},
	},
	preload: [
		"mesh_player",
		"mesh_box",
		"mesh_cylinder",
		"mesh_miranda_engine_core",
		"mesh_portal_gate",
		"cubemap_observatory_sky",
		"material_player",
		"material_miranda_floor_main",
		"material_miranda_floor_upper",
		"material_miranda_cockpit_panel",
		"material_miranda_cockpit_panel_center",
		"material_miranda_crew_bunk",
		"material_miranda_locker_bank",
		"material_miranda_captains_desk",
		"material_miranda_captains_chair",
		"material_miranda_recipe_safe",
		"material_miranda_engine_column",
		"material_miranda_engine_core",
		"material_miranda_med_pod",
		"material_miranda_mess_table",
		"material_miranda_mess_counter",
		"material_miranda_chapel_altar",
		"material_miranda_brig_cell",
		"material_miranda_brig_desk",
		"material_miranda_cargo_stack_a",
		"material_miranda_cargo_stack",
		"material_miranda_server_bank",
		"material_miranda_server_bank_wide",
		"material_miranda_story_marker_cyan",
		"material_miranda_story_marker_amber",
		"material_miranda_story_marker_red",
		"material_miranda_story_marker_magenta",
		"audio_player_jump",
		"audio_player_charge_release",
		"audio_portal_activate",
		"audio_portal_cycle",
		"audio_ambient_wicked_shadows_whisper",
		"audio_ambient_dark_shadows_of_delight",
		"audio_ambient_shadow_waltz",
	],
	instances: [
		...terrainLevelInstancesForRuntimeScene("miranda_deck_runtime"),
		{
			id: "miranda-command-gallery-beacon-light",
			prefabId: "miranda_command_gallery_beacon_light",
			stableId: "miranda:command-gallery:beacon-light",
			transform: {
				position: [0, 7.7, -24.1],
			},
		},
		{
			id: "miranda-cockpit-panel-left",
			prefabId: "miranda_cockpit_panel_side",
			stableId: "miranda:cockpit:panel:left",
			transform: {
				position: [-2.6, 2.25, -20.2],
				rotation: [
					0.08842644374541003, 0.1783049929434211, 0.01609091832305187,
					0.9798618146889424,
				],
			},
		},
		{
			id: "miranda-cockpit-panel-center",
			prefabId: "miranda_cockpit_panel_center",
			stableId: "miranda:cockpit:panel:center",
			transform: {
				position: [0, 2.25, -20.2],
				rotation: [0.08987854919801104, 0, 0, 0.9959527330119943],
			},
		},
		{
			id: "miranda-cockpit-panel-right",
			prefabId: "miranda_cockpit_panel_side",
			stableId: "miranda:cockpit:panel:right",
			transform: {
				position: [2.6, 2.25, -20.2],
				rotation: [
					0.08842644374541003, -0.1783049929434211, -0.01609091832305187,
					0.9798618146889424,
				],
			},
		},
		{
			id: "miranda-cockpit-console",
			prefabId: "miranda_cockpit_console",
			stableId: "miranda:cockpit:console",
			transform: {
				position: [0, 2.57, -17.5],
				rotation: [0, 1, 0, 0],
			},
		},
		{
			id: "miranda-captain-log",
			prefabId: "miranda_story_marker_cyan",
			stableId: "miranda:cockpit:story-note:captain-log",
			transform: {
				position: [-1.35, 2.1, -18.4],
			},
			components: storyNote({
				id: "miranda.note.captain_log",
				title: "Captain's Log 45.7.21",
				author: "Captain Helena Zhao",
				location: "Cockpit Nav Station",
				excerpt:
					"There is nothing to salvage. Only debris, salt, and the taste of a vanished system.",
				body: "This is Captain Helena Zhao of the salvage vessel Second Breakfast.\n\nMiranda's primary sun went supernova without warning. Inner planets vaporized. Outer planetoids were thrown into cold darkness. We entered the debris field expecting a graveyard and found something worse: a silence that feels arranged.\n\nSome say you can still taste celery salt in the dust. I laughed when I first heard it. I am not laughing now.",
				markerColor: "#9fdcff",
				markerSize: 0.62,
			}),
		},
		{
			id: "miranda-bunk-port-a",
			prefabId: "miranda_crew_bunk",
			stableId: "miranda:crew:bunk:port:a",
			transform: {
				position: [-7.55, 0.76, -4.2],
			},
		},
		{
			id: "miranda-bunk-port-b",
			prefabId: "miranda_crew_bunk",
			stableId: "miranda:crew:bunk:port:b",
			transform: {
				position: [-7.55, 2.1, -4.2],
			},
		},
		{
			id: "miranda-bunk-starboard-a",
			prefabId: "miranda_crew_bunk",
			stableId: "miranda:crew:bunk:starboard:a",
			transform: {
				position: [-7.55, 0.76, 0.9],
			},
		},
		{
			id: "miranda-bunk-starboard-b",
			prefabId: "miranda_crew_bunk",
			stableId: "miranda:crew:bunk:starboard:b",
			transform: {
				position: [-7.55, 2.1, 0.9],
			},
		},
		{
			id: "miranda-locker-bank",
			prefabId: "miranda_locker_bank",
			stableId: "miranda:crew:locker-bank",
			transform: {
				position: [-4.7, 1.32, -1.65],
			},
		},
		{
			id: "miranda-crew-note",
			prefabId: "miranda_story_marker_red",
			stableId: "miranda:crew:story-note:medical-watch",
			transform: {
				position: [-7.2, 1.08, -0.1],
			},
			components: storyNote({
				id: "miranda.note.crew_medical_watch",
				title: "Crew Medical Watch",
				author: "Dr. Imani Vale",
				location: "Crew Quarters Locker",
				excerpt:
					"Headaches, nausea, deja vu. Nobody wants to say the symptoms out loud twice.",
				body: "Three crew reported headaches after handling drone returns from the debris field. Two described dreams of a bar they have never visited. One woke up repeating a drink order in a voice he claims was not his own.\n\nNo abnormalities on scans. No fever. No infection. The fear is the only thing progressing.\n\nRecommendation: limit direct exposure to recovered signal caches, especially any reference to a Bloody Mary and any insistence on pickle prohibition.",
				markerColor: "#ff9d9d",
				markerSize: 0.6,
			}),
		},
		{
			id: "miranda-captains-desk",
			prefabId: "miranda_captains_desk",
			stableId: "miranda:captain:desk",
			transform: {
				position: [6.55, 0.9, -4.6],
				rotation: [0, 0.03998933418663416, 0, 0.9992001066609779],
			},
		},
		{
			id: "miranda-captains-chair",
			prefabId: "miranda_captains_chair",
			stableId: "miranda:captain:chair",
			transform: {
				position: [5.12, 1.22, -4.85],
				rotation: [0, -0.12467473338522769, 0, 0.992197667229329],
			},
		},
		{
			id: "miranda-safe",
			prefabId: "miranda_recipe_safe",
			stableId: "miranda:captain:recipe-safe",
			transform: {
				position: [7.35, 1.42, -6.55],
			},
		},
		{
			id: "miranda-first-officer-note",
			prefabId: "miranda_story_marker_amber",
			stableId: "miranda:captain:story-note:first-officer",
			transform: {
				position: [6.8, 1.06, -4.1],
			},
			components: storyNote({
				id: "miranda.note.private_memorandum",
				title: "Private Memorandum",
				author: "First Officer Soren Pike",
				location: "Captain's Office Desk",
				excerpt:
					"The captain looks composed until someone mentions drinks, dreams, or card players.",
				body: "The captain has not slept properly in eleven cycles. She denies it, but the evidence is in the way she freezes whenever recovered transcripts mention the saloon.\n\nTwice now she has asked whether anyone else has seen three old men through the bridge glass. There was nobody there. On the second occasion she also asked whether the ship kept a safe for paper records.\n\nIt does now.",
				markerColor: "#e7c89d",
				markerSize: 0.58,
			}),
		},
		{
			id: "miranda-vault-fragment",
			prefabId: "miranda_story_marker_red",
			stableId: "miranda:captain:story-note:vault-fragment",
			transform: {
				position: [8, 1.18, -6.55],
			},
			components: storyNote({
				id: "miranda.note.vault_fragment",
				title: "Vault Fragment: Recipe Lockbox",
				author: "Recovered hardcopy, access restricted",
				location: "Captain's Safe",
				excerpt:
					"The page keeps moving. The phrase keeps returning. The paper smells faintly of tomato, iron, and smoke.",
				body: "Cross-reference from the mechanical observer and the old man's account suggests a causality nexus formed around a drink completed at the instant of Miranda's destruction.\n\nHardcopy fragment secured in captain's vault after digital copies exhibited instability. Crew instructed not to vocalize the activation phrase aloud.\n\nFragment note: \"Bloody Mary, no pickles, make it a double.\"\n\nIf this page is found outside the safe again, burn it and do not discuss the ash.",
				markerColor: "#ff6d8e",
				markerSize: 0.58,
			}),
		},
		{
			id: "miranda-engine-core",
			prefabId: "miranda_engine_core",
			stableId: "miranda:engine:core",
			transform: {
				position: [0, 1.75, 16.5],
			},
		},
		{
			id: "miranda-engine-column-a",
			prefabId: "miranda_engine_column",
			stableId: "miranda:engine:column:a",
			transform: {
				position: [-3.6, 1.5, 15.6],
			},
		},
		{
			id: "miranda-engine-column-b",
			prefabId: "miranda_engine_column",
			stableId: "miranda:engine:column:b",
			transform: {
				position: [-1.2, 1.5, 15.6],
			},
		},
		{
			id: "miranda-engine-column-c",
			prefabId: "miranda_engine_column",
			stableId: "miranda:engine:column:c",
			transform: {
				position: [1.2, 1.5, 15.6],
			},
		},
		{
			id: "miranda-engine-column-d",
			prefabId: "miranda_engine_column",
			stableId: "miranda:engine:column:d",
			transform: {
				position: [3.6, 1.5, 15.6],
			},
		},
		{
			id: "miranda-engine-note",
			prefabId: "miranda_story_marker_amber",
			stableId: "miranda:engine:story-note:engineering-memo",
			transform: {
				position: [2.55, 1.2, 15.7],
			},
			components: storyNote({
				id: "miranda.note.engineering_memo",
				title: "Engineering Memo 8.15",
				author: "Chief Engineer Mara Quill",
				location: "Engine Room Control Deck",
				excerpt:
					"The ship is humming in sympathy with transmissions that should no longer exist.",
				body: "Reactor output remains nominal, but the harmonic drift is wrong. Every time we pass through a dense pocket of Miranda ash, the engine room resonates with carrier bands matching the dead system's final RF burst.\n\nIt sounds like traffic stacked above an atmosphere that is no longer there. Queue chatter. Clearance loops. Repeated holds.\n\nI have shut down three relays and the sound still comes through the deck.",
				markerColor: "#ffb36d",
				markerSize: 0.62,
			}),
		},
		{
			id: "miranda-return-portal",
			prefabId: "portal_gate",
			stableId: "miranda:airlock:return-portal",
			transform: {
				position: [0, 1, 6.6],
				scale: [0.95, 0.95, 0.95],
			},
			components: {
				Portal: {
					id: "miranda.return.observatory",
					label: "Return to Observatory",
					prompt: "Click to return to Observatory",
					targetRuntimeSceneId: "observatory_runtime",
					activationRadius: 2.35,
				},
			},
		},
		{
			id: "miranda-med-pod-a",
			prefabId: "miranda_med_pod",
			stableId: "miranda:medbay:pod:a",
			transform: {
				position: [-12.8, 2.02, 9.6],
			},
		},
		{
			id: "miranda-med-pod-b",
			prefabId: "miranda_med_pod",
			stableId: "miranda:medbay:pod:b",
			transform: {
				position: [-9.8, 2.02, 9.6],
			},
		},
		{
			id: "miranda-med-pod-c",
			prefabId: "miranda_med_pod",
			stableId: "miranda:medbay:pod:c",
			transform: {
				position: [-12.8, 2.02, 16.6],
			},
		},
		{
			id: "miranda-med-pod-d",
			prefabId: "miranda_med_pod",
			stableId: "miranda:medbay:pod:d",
			transform: {
				position: [-9.8, 2.02, 16.6],
			},
		},
		{
			id: "miranda-medbay-note",
			prefabId: "miranda_story_marker_cyan",
			stableId: "miranda:medbay:story-note:quarantine",
			transform: {
				position: [-12.9, 1.08, 12.2],
			},
			components: storyNote({
				id: "miranda.note.quarantine_bay",
				title: "Quarantine Bay Slip",
				author: "Dr. Imani Vale",
				location: "Medbay Cryo Pod",
				excerpt:
					"The sleepers are not dead. The ship still refuses to classify them as living.",
				body: "We sealed three crew inside the aft medbay after the Miranda ash dreams escalated into waking fugues. They answer to their names, but only after a delay, as if translating from somewhere farther away.\n\nTheir body temperatures fall whenever the Bloody Mary phrase is spoken near the pods. The glass frosts from the inside first.\n\nI have ordered the quarantine lamps to stay red until somebody can explain why the EEG spikes match the ship's own telemetry.",
				markerColor: "#8de0ff",
				markerSize: 0.6,
			}),
		},
		{
			id: "miranda-mess-table-a",
			prefabId: "miranda_mess_table_large",
			stableId: "miranda:mess:table:a",
			transform: {
				position: [-11.4, 0.72, 27.6],
				rotation: [0, 0.04997916927067833, 0, 0.9987502603949663],
			},
		},
		{
			id: "miranda-mess-table-b",
			prefabId: "miranda_mess_table_small",
			stableId: "miranda:mess:table:b",
			transform: {
				position: [-9.2, 0.72, 33.2],
				rotation: [0, -0.09983341664682815, 0, 0.9950041652780257],
			},
		},
		{
			id: "miranda-mess-counter",
			prefabId: "miranda_mess_counter",
			stableId: "miranda:mess:counter",
			transform: {
				position: [-13.6, 1.02, 29.8],
			},
		},
		{
			id: "miranda-mess-note",
			prefabId: "miranda_story_marker_amber",
			stableId: "miranda:mess:story-note:ledger",
			transform: {
				position: [-11.4, 1.02, 29.2],
			},
			components: storyNote({
				id: "miranda.note.mess_ledger",
				title: "Mess Ledger Addendum",
				author: "Steward Callum Reef",
				location: "Galley Service Counter",
				excerpt:
					"We ran out of clean water before we ran out of stories about the bar.",
				body: "Nobody eats in the mess unless the speakers are playing static. If the channels are quiet, people start hearing the card table again.\n\nThe bowls rattle whenever we cross a dense ash current. Plates slide toward the aft corridor as if the ship itself leans toward Miranda.\n\nI locked the pantry and still found celery salt on the floor this morning.",
				markerColor: "#ffc584",
				markerSize: 0.6,
			}),
		},
		{
			id: "miranda-chapel-altar",
			prefabId: "miranda_chapel_altar",
			stableId: "miranda:chapel:altar",
			transform: {
				position: [10.8, 0.92, 18.4],
			},
		},
		{
			id: "miranda-chapel-monolith-a",
			prefabId: "miranda_chapel_monolith",
			stableId: "miranda:chapel:monolith:a",
			transform: {
				position: [9.2, 2.28, 12.8],
				rotation: [0, 0.059964006479444595, 0, 0.9982005399352042],
			},
		},
		{
			id: "miranda-chapel-monolith-b",
			prefabId: "miranda_chapel_monolith",
			stableId: "miranda:chapel:monolith:b",
			transform: {
				position: [12.4, 2.51, 12.4],
				rotation: [0, -0.06994284733753277, 0, 0.9975510002532796],
			},
		},
		{
			id: "miranda-brig-cell-a",
			prefabId: "miranda_brig_cell",
			stableId: "miranda:brig:cell:a",
			transform: {
				position: [9.4, 1.4, 30],
			},
		},
		{
			id: "miranda-brig-cell-b",
			prefabId: "miranda_brig_cell",
			stableId: "miranda:brig:cell:b",
			transform: {
				position: [13, 1.4, 30],
			},
		},
		{
			id: "miranda-brig-cell-c",
			prefabId: "miranda_brig_cell",
			stableId: "miranda:brig:cell:c",
			transform: {
				position: [9.4, 1.4, 37.6],
			},
		},
		{
			id: "miranda-brig-cell-d",
			prefabId: "miranda_brig_cell",
			stableId: "miranda:brig:cell:d",
			transform: {
				position: [13, 1.4, 37.6],
			},
		},
		{
			id: "miranda-brig-desk",
			prefabId: "miranda_brig_desk",
			stableId: "miranda:brig:desk",
			transform: {
				position: [11.1, 0.72, 42],
				rotation: [0, 0.03998933418663416, 0, 0.9992001066609779],
			},
		},
		{
			id: "miranda-brig-note",
			prefabId: "miranda_story_marker_red",
			stableId: "miranda:brig:story-note:confession",
			transform: {
				position: [12.8, 1.08, 31.6],
			},
			components: storyNote({
				id: "miranda.note.brig_confession",
				title: "Brig Confession",
				author: "Unnamed detainee",
				location: "Detention Cell 02",
				excerpt:
					"I was not trying to open the safe. I was trying to put the page back.",
				body: "They locked me in the brig because I kept leaving the corridor at night and waking up near the captain's office with soot under my nails.\n\nThe truth is smaller and worse: every time I close my eyes, I can hear a voice asking me to return a recipe card to its proper era.\n\nThe bars hum when the engines drift. The hum knows my name.",
				markerColor: "#ff8ea6",
				markerSize: 0.6,
			}),
		},
		{
			id: "miranda-cargo-stack-a",
			prefabId: "miranda_cargo_stack_a",
			stableId: "miranda:cargo:stack:a",
			transform: {
				position: [-2.8, 0.95, 33.6],
				rotation: [0, 0.04997916927067833, 0, 0.9987502603949663],
			},
		},
		{
			id: "miranda-cargo-stack-b",
			prefabId: "miranda_cargo_stack_b",
			stableId: "miranda:cargo:stack:b",
			transform: {
				position: [3.8, 1.35, 38.1],
				rotation: [0, -0.07492970727274234, 0, 0.9971888181122075],
			},
		},
		{
			id: "miranda-cargo-stack-c",
			prefabId: "miranda_cargo_stack_c",
			stableId: "miranda:cargo:stack:c",
			transform: {
				position: [0.2, 0.7, 44.2],
			},
		},
		{
			id: "miranda-cargo-stack-d",
			prefabId: "miranda_cargo_stack_d",
			stableId: "miranda:cargo:stack:d",
			transform: {
				position: [-4.6, 0.78, 28.4],
				rotation: [0, 0.09983341664682815, 0, 0.9950041652780257],
			},
		},
		{
			id: "miranda-observation-light",
			prefabId: "miranda_observation_light",
			stableId: "miranda:observation-gallery:light",
			transform: {
				position: [-10.8, 7.2, 8.4],
			},
		},
		{
			id: "miranda-server-bank-a",
			prefabId: "miranda_server_bank_tall",
			stableId: "miranda:archive:server-bank:a",
			transform: {
				position: [9.4, 5.1, 1.6],
			},
		},
		{
			id: "miranda-server-bank-b",
			prefabId: "miranda_server_bank_tall",
			stableId: "miranda:archive:server-bank:b",
			transform: {
				position: [13.2, 5.1, 1.6],
			},
		},
		{
			id: "miranda-server-bank-c",
			prefabId: "miranda_server_bank_tall",
			stableId: "miranda:archive:server-bank:c",
			transform: {
				position: [9.4, 5.1, 13.8],
			},
		},
		{
			id: "miranda-server-bank-d",
			prefabId: "miranda_server_bank_tall",
			stableId: "miranda:archive:server-bank:d",
			transform: {
				position: [13.2, 5.1, 13.8],
			},
		},
		{
			id: "miranda-server-bank-e",
			prefabId: "miranda_server_bank_wide",
			stableId: "miranda:archive:server-bank:e",
			transform: {
				position: [11.3, 5.1, 24],
			},
		},
		{
			id: "miranda-archive-light",
			prefabId: "miranda_archive_light",
			stableId: "miranda:archive-gallery:light",
			transform: {
				position: [10.8, 7, 10.8],
			},
		},
		{
			id: "miranda-archive-note",
			prefabId: "miranda_story_marker_magenta",
			stableId: "miranda:archive:story-note:index",
			transform: {
				position: [12.6, 5.02, 9.4],
			},
			components: storyNote({
				id: "miranda.note.archive_index",
				title: "Archive Index: Recovered Echoes",
				author: "Signal Archivist Nila Serrin",
				location: "Upper Data Gallery",
				excerpt:
					"Each copied transcript diverges the second time it is opened.",
				body: "The upper archive is no longer storing files. It is growing variants.\n\nOpen one Miranda transcript and you receive an account. Open it again and the witness order changes. Open it a third time and there is a fourth witness seated at the table.\n\nI moved the worst logs to the upper stacks and disconnected them from the main grid. The lights in this gallery still blink in answers.",
				markerColor: "#cba7ff",
				markerSize: 0.6,
			}),
		},
		{
			id: "player",
			prefabId: "player",
			stableId: "player",
			transform: {
				position: [0, 4.25, -13.8],
			},
			components: {
				CharacterController: {
					groundY: 4.25,
				},
			},
		},
	],
} satisfies LevelDefinition;

export const defaultLevels = [
	portalArenaLevel,
	prototypeLevel,
	mirandaDeckLevel,
	observatoryLevel,
	sciFiRoomLevel,
	solitudeLevel,
	yggdrasilLevel,
] as const;

function storyNote(options: {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly location: string;
	readonly excerpt: string;
	readonly body: string;
	readonly markerColor: string;
	readonly markerSize: number;
}) {
	return {
		StoryNote: {
			...options,
			activationRadius: 2.35,
		},
	};
}
