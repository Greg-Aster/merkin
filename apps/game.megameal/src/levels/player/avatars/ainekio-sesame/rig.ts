import type {
	ArticulatedPhysicsRigDefinition,
	PhysicsRigBodyDefinition,
	PhysicsRigJointDefinition,
} from "../../../../game/physics-rigs/index.js";
import {
	PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
	PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS,
} from "../../constants.js";

const SERVO_ORDER = ["R1", "R2", "L1", "L2", "R4", "R3", "L3", "L4"] as const;
const AINEKIO_SESAME_BODY_MESH_IDS = {
	chassis: PLAYER_AVATAR_AINEKIO_SESAME_CHASSIS_MESH_ASSET_ID,
	right_front_leg: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[1],
	right_front_foot: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[2],
	right_rear_leg: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[3],
	right_rear_foot: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[4],
	left_front_leg: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[5],
	left_front_foot: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[6],
	left_rear_leg: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[7],
	left_rear_foot: PLAYER_AVATAR_AINEKIO_SESAME_MESH_ASSET_IDS[8],
} as const;

export const AINEKIO_SESAME_PHYSICS_RIG_ID = "ainekio-sesame";

export const ainekioSesamePhysicsRig = {
	schemaVersion: 1,
	id: AINEKIO_SESAME_PHYSICS_RIG_ID,
	name: "Ainekio Sesame Eight Servo Rig",
	rootBodyId: "chassis",
	source: {
		label: "Sesame simulator URDF and firmware servo order",
		url: "https://github.com/one-for-all/sesame-robot-sim",
		license: "open-source Sesame robot project",
		notes:
			"Robot visuals are generated from the simulator URDF into avatar-owned GLB meshes; colliders remain simplified physics proxies.",
	},
	motionSource: {
		adapter: "ainekio-megameal-motion-adapter",
		protocol: "servo-target-json-v1",
	},
	bodies: [
		body(
			"chassis",
			"root",
			[0.00807, -0.44618, 0.03341],
			[0.28256, 0.21405, 0.23828],
			1.2,
		),
		body(
			"right_front_leg",
			"limb",
			[0.00653, -0.48439, -0.22866],
			[0.33553, 0.10668, 0.18077],
			0.18,
		),
		body(
			"right_rear_leg",
			"limb",
			[-0.00508, -0.48439, -0.22866],
			[0.33553, 0.10668, 0.18077],
			0.18,
		),
		body(
			"left_front_leg",
			"limb",
			[0.00653, -0.48439, 0.29547],
			[0.33553, 0.10668, 0.18077],
			0.18,
		),
		body(
			"left_rear_leg",
			"limb",
			[-0.00508, -0.48439, 0.29547],
			[0.33553, 0.10668, 0.18077],
			0.18,
		),
		body(
			"right_front_foot",
			"foot",
			[-0.402, -0.45827, -0.44714],
			[0.19173, 0.19173, 0.10483],
			0.12,
			1.4,
		),
		body(
			"right_rear_foot",
			"foot",
			[0.40345, -0.45827, -0.44714],
			[0.19173, 0.19173, 0.10483],
			0.12,
			1.4,
		),
		body(
			"left_front_foot",
			"foot",
			[-0.402, -0.45827, 0.51396],
			[0.19173, 0.19173, 0.10483],
			0.12,
			1.4,
		),
		body(
			"left_rear_foot",
			"foot",
			[0.40345, -0.45827, 0.51396],
			[0.19173, 0.19173, 0.10483],
			0.12,
			1.4,
		),
	],
	joints: [
		hip(
			"R1",
			"chassis",
			"right_front_leg",
			[-0.17675, 0.02409, -0.1778],
			[-0.17521, 0.0623, 0.08426],
			[0, -1, 0],
		),
		hip(
			"R2",
			"chassis",
			"right_rear_leg",
			[0.16205, 0.02409, -0.1778],
			[0.17521, 0.0623, 0.08426],
			[0, -1, 0],
		),
		hip(
			"L1",
			"chassis",
			"left_front_leg",
			[-0.17675, 0.02409, 0.1778],
			[-0.17521, 0.0623, -0.08426],
			[0, -1, 0],
		),
		hip(
			"L2",
			"chassis",
			"left_rear_leg",
			[0.16205, 0.02409, 0.1778],
			[0.17521, 0.0623, -0.08426],
			[0, -1, 0],
		),
		knee(
			"R3",
			"right_front_leg",
			"right_front_foot",
			[-0.32018, -0.06223, -0.13536],
			[0.08835, -0.08835, 0.08313],
			[0, 0, 1],
		),
		knee(
			"R4",
			"right_rear_leg",
			"right_rear_foot",
			[0.32018, -0.06223, -0.13536],
			[-0.08835, -0.08835, 0.08313],
			[0, 0, 1],
		),
		knee(
			"L3",
			"left_front_leg",
			"left_front_foot",
			[-0.32018, -0.06223, 0.13536],
			[0.08835, -0.08835, -0.08313],
			[0, 0, -1],
		),
		knee(
			"L4",
			"left_rear_leg",
			"left_rear_foot",
			[0.32018, -0.06223, 0.13536],
			[-0.08835, -0.08835, -0.08313],
			[0, 0, -1],
		),
	],
	servoChannels: SERVO_ORDER.map((servoId) => ({
		servoId,
		jointId: servoId,
		restAngleDeg: 0,
		minAngleDeg: -55,
		maxAngleDeg: 55,
		direction: servoId.startsWith("L") ? -1 : 1,
	})),
	simulation: {
		staleTelemetryMs: 350,
		idlePoseServoAnglesDeg: Object.fromEntries(
			SERVO_ORDER.map((servoId) => [servoId, 0]),
		),
	},
} satisfies ArticulatedPhysicsRigDefinition;

function body(
	id: string,
	role: "root" | "limb" | "foot" | "body",
	position: readonly [number, number, number],
	halfExtents: readonly [number, number, number],
	mass: number,
	friction = 0.8,
): PhysicsRigBodyDefinition {
	const solidFoot = role === "foot";

	return {
		id,
		role,
		transform: {
			position,
		},
		rigidBody: {
			type: "dynamic",
			mass,
		},
		collider: {
			intent: solidFoot ? "solid" : "trigger",
			channel: role === "root" ? "player" : "player-limb",
			friction,
			restitution: 0,
			sensor: !solidFoot,
			shape: {
				type: "box",
				halfExtents,
			},
		},
		renderable: {
			kind: "mesh",
			meshId: meshIdForBody(id),
			visible: true,
		},
	};
}

function meshIdForBody(id: string): string {
	const meshId =
		AINEKIO_SESAME_BODY_MESH_IDS[
			id as keyof typeof AINEKIO_SESAME_BODY_MESH_IDS
		];

	if (!meshId) {
		throw new Error(`Ainekio/Sesame rig body "${id}" has no mesh asset.`);
	}

	return meshId;
}

function hip(
	servoId: string,
	parentBodyId: string,
	childBodyId: string,
	anchorParent: readonly [number, number, number],
	anchorChild: readonly [number, number, number],
	axis: readonly [number, number, number],
): PhysicsRigJointDefinition {
	return joint(
		servoId,
		parentBodyId,
		childBodyId,
		anchorParent,
		anchorChild,
		axis,
	);
}

function knee(
	servoId: string,
	parentBodyId: string,
	childBodyId: string,
	anchorParent: readonly [number, number, number],
	anchorChild: readonly [number, number, number],
	axis: readonly [number, number, number],
): PhysicsRigJointDefinition {
	return joint(
		servoId,
		parentBodyId,
		childBodyId,
		anchorParent,
		anchorChild,
		axis,
	);
}

function joint(
	servoId: string,
	parentBodyId: string,
	childBodyId: string,
	anchorParent: readonly [number, number, number],
	anchorChild: readonly [number, number, number],
	axis: readonly [number, number, number],
): PhysicsRigJointDefinition {
	return {
		id: servoId,
		type: "revolute",
		parentBodyId,
		childBodyId,
		anchorParent,
		anchorChild,
		axis,
		servoId,
		limitsDeg: {
			min: -60,
			max: 60,
		},
		motor: {
			stiffness: 8,
			damping: 0.85,
		},
	};
}
