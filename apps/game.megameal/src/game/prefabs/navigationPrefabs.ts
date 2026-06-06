import type { PrefabDefinition } from "./index.js";

export const portalGatePrefab = {
	id: "portal_gate",
	assetIds: ["mesh_portal_gate"],
	tags: ["portal", "navigation", "interaction"],
	components: {
		Transform: {
			position: [0, 0, 0],
			rotation: [0, 0, 0, 1],
			scale: [1, 1, 1],
		},
		Renderable: {
			meshId: "mesh_portal_gate",
			visible: true,
		},
		RigidBody: {
			type: "fixed",
			mass: 0,
		},
		Collider: {
			intent: "trigger",
			channel: "interaction",
			sensor: true,
			shape: {
				type: "box",
				halfExtents: [1.1, 1.45, 0.45],
			},
		},
		Portal: {
			id: "portal",
			label: "Unassigned Portal",
			activationRadius: 2.35,
		},
	},
} satisfies PrefabDefinition;
