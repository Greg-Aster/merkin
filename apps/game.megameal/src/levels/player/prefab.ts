import type { PrefabDefinition } from "../../game/prefabs/index.js";
import { playerPackageConfig } from "./config.js";
import {
	PLAYER_MATERIAL_ASSET_ID,
	PLAYER_MESH_ASSET_ID,
	PLAYER_PREFAB_ID,
} from "./constants.js";

export const playerPrefab = {
	id: PLAYER_PREFAB_ID,
	assetIds: [PLAYER_MESH_ASSET_ID, PLAYER_MATERIAL_ASSET_ID],
	tags: ["actor", "player"],
	components: {
		Transform: {
			position: playerPackageConfig.transform.position,
			rotation: playerPackageConfig.transform.rotation,
			scale: playerPackageConfig.transform.scale,
		},
		Renderable: {
			meshId: PLAYER_MESH_ASSET_ID,
			materialId: PLAYER_MATERIAL_ASSET_ID,
			visible: playerPackageConfig.renderable.visible,
		},
		RigidBody: {
			type: "kinematic",
			mass: playerPackageConfig.rigidBody.mass,
		},
		Collider: {
			intent: "solid",
			channel: "player",
			shape: {
				type: "capsule",
				halfHeight: playerPackageConfig.collider.halfHeight,
				radius: playerPackageConfig.collider.radius,
			},
		},
		CharacterController: {
			speed: playerPackageConfig.characterController.speed,
			sprintMultiplier:
				playerPackageConfig.characterController.sprintMultiplier,
			jumpForce: playerPackageConfig.characterController.jumpForce,
			gravity: playerPackageConfig.characterController.gravity,
			verticalVelocity: 0,
			groundY: playerPackageConfig.characterController.groundY,
			grounded: true,
		},
		FirstPersonController: {
			yawRadians: 0,
			pitchRadians: 0,
			mouseSensitivity:
				playerPackageConfig.firstPersonController.mouseSensitivity,
			minPitchRadians:
				playerPackageConfig.firstPersonController.minPitchRadians,
			maxPitchRadians:
				playerPackageConfig.firstPersonController.maxPitchRadians,
			eyeHeight: playerPackageConfig.firstPersonController.eyeHeight,
			fovDegrees: playerPackageConfig.firstPersonController.fovDegrees,
			near: playerPackageConfig.firstPersonController.near,
			far: playerPackageConfig.firstPersonController.far,
		},
		CameraTarget: {
			active: true,
			priority: 100,
		},
		Health: {
			current: playerPackageConfig.health.current,
			max: playerPackageConfig.health.max,
		},
		PlayerInput: {},
	},
} satisfies PrefabDefinition;
