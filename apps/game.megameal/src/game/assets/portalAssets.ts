const meshPortalGate = {
	id: "mesh_portal_gate",
	kind: "mesh",
	url: "/assets/game/portals/portal_gate.glb",
	tags: ["portal", "navigation"],
} as const;

const audioPortalActivate = {
	id: "audio_portal_activate",
	kind: "audio",
	url: "/audio/sfx/portal-activate.mp3",
	tags: ["portal", "transition", "sfx"],
} as const;

export { audioPortalActivate, meshPortalGate };
