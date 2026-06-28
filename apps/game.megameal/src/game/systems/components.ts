import type { Command, Entity } from "../../engine/core/index.js";
import type { vec3 } from "../../engine/math/index.js";

export const PLAYER_ENTITY_RESOURCE = "game:playerEntity";
export const INPUT_SNAPSHOT_RESOURCE = "game:inputSnapshot";
export const MOVEMENT_INTENT_COMPONENT = "MovementIntent";
export const PLAYER_INPUT_COMPONENT = "PlayerInput";
export const FIRST_PERSON_CONTROLLER_COMPONENT = "FirstPersonController";
export const COLLECTIBLE_COMPONENT = "Collectible";
export const HEALTH_COMPONENT = "Health";
export const PORTAL_COMPONENT = "Portal";
export const STORY_NOTE_COMPONENT = "StoryNote";
export const NPC_COMPONENT = "Npc";
export const MOVEMENT_BEHAVIOR_COMPONENT = "MovementBehavior";
export const LIGHT_MODULATION_COMPONENT = "LightModulation";
export const INTERACTION_TARGET_COMPONENT = "InteractionTarget";
export const NPC_SIGNIFICANCE_COMPONENT = "NpcSignificance";
export const FOLLOW_TARGET_COMPONENT = "FollowTarget";
export const COLLECTED_COUNT_RESOURCE = "game:collectedCount";
export const TOTAL_COLLECTIBLES_RESOURCE = "game:totalCollectibles";
export const CHARACTER_BOUNDS_RESOURCE = "game:characterBounds";
export const ACTIVE_PORTAL_RESOURCE = "game:activePortal";
export const ACTIVE_STORY_NOTE_RESOURCE = "game:activeStoryNote";
export const ACTIVE_NPC_RESOURCE = "game:activeNpc";
export const ACTIVE_INTERACTION_TARGET_RESOURCE =
	"game:activeInteractionTarget";
export const OPEN_STORY_NOTE_RESOURCE = "game:openStoryNote";
export const OPEN_NPC_DIALOG_RESOURCE = "game:openNpcDialog";
export const RUNTIME_SCENE_TRANSITION_RESOURCE = "game:runtimeSceneTransition";
export const CHARGED_ACTION_COMPONENT = "ChargedAction";
export const PLAYER_LIGHT_FEEDBACK_COMPONENT = "PlayerLightFeedback";

export type MovementIntentComponent = {
	readonly direction: ReturnType<typeof vec3>;
	readonly sprinting: boolean;
};

export type FirstPersonControllerComponent = {
	readonly yawRadians: number;
	readonly pitchRadians: number;
	readonly mouseSensitivity: number;
	readonly minPitchRadians: number;
	readonly maxPitchRadians: number;
	readonly eyeHeight: number;
	readonly fovDegrees: number;
	readonly near: number;
	readonly far: number;
};

export type CollectibleComponent = {
	readonly id: string;
	readonly label: string;
	readonly radius: number;
	readonly value: number;
};

export type HealthComponent = {
	readonly current: number;
	readonly max: number;
};

export type PortalComponent = {
	readonly id: string;
	readonly label: string;
	readonly prompt?: string;
	readonly targetRuntimeSceneId?: string;
	readonly activationRadius?: number;
};

export type StoryNoteComponent = {
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly location: string;
	readonly excerpt: string;
	readonly body: string;
	readonly markerColor?: string;
	readonly markerSize?: number;
	readonly activationRadius?: number;
};

export type NpcComponent = {
	readonly id: string;
	readonly archetype: string;
	readonly displayName: string;
};

export type MovementBehaviorComponent =
	| {
			readonly kind: "static";
	  }
	| {
			readonly kind: "hover-wander";
			readonly basePosition: readonly [number, number, number];
			readonly radius: number;
			readonly speed: number;
			readonly hoverHeight: number;
			readonly bobAmplitude: number;
			readonly bobSpeed: number;
			readonly phase?: number;
	  };

export type LightModulationComponent = {
	readonly baseIntensity: number;
	readonly baseDistance: number;
	readonly minimumIntensityScale: number;
	readonly pulseSpeed: number;
	readonly pulseSoftness: number;
	readonly activeLightPercent: number;
	readonly blinkPeriodSeconds: readonly [number, number];
	readonly blinkFadeSeconds: number;
	readonly phase?: number;
	readonly maxActiveLights?: number;
};

export type InteractionTargetComponent = {
	readonly kind: "npc";
	readonly prompt: string;
	readonly activationRadius: number;
};

export type NpcSignificanceComponent = {
	readonly tier: "near" | "mid" | "far";
	readonly distanceSquared: number;
	readonly updateEveryTicks: number;
};

export type ConversationComponent = {
	readonly mode: "read-only";
	readonly title: string;
	readonly excerpt: string;
	readonly body: string;
	readonly durationMs?: number;
};

export type FollowTargetComponent = {
	readonly targetStableId: string;
	readonly offset?: readonly [number, number, number];
	readonly scale?: readonly [number, number, number];
	readonly inheritRotation?: boolean;
};

export type ActivePortalState = {
	readonly entity: Entity;
	readonly id: string;
	readonly label: string;
	readonly prompt: string;
	readonly targetRuntimeSceneId?: string;
	readonly canTravel: boolean;
	readonly distanceSquared: number;
};

export type ActiveStoryNoteState = {
	readonly entity: Entity;
	readonly id: string;
	readonly title: string;
	readonly author: string;
	readonly location: string;
	readonly excerpt: string;
	readonly body: string;
	readonly prompt: string;
	readonly distanceSquared: number;
};

export type ActiveNpcState = {
	readonly entity: Entity;
	readonly id: string;
	readonly archetype: string;
	readonly displayName: string;
	readonly prompt: string;
	readonly conversation: ConversationComponent;
	readonly distanceSquared: number;
};

export type ActiveInteractionTargetState =
	| ({
			readonly kind: "portal";
	  } & ActivePortalState)
	| ({
			readonly kind: "story-note";
	  } & ActiveStoryNoteState)
	| ({
			readonly kind: "npc";
	  } & ActiveNpcState);

export type OpenStoryNoteState = ActiveStoryNoteState;
export type OpenNpcDialogState = ActiveNpcState;

export type ChargedActionComponent = {
	readonly actionId: "charge.light";
	readonly active: boolean;
	readonly chargeSeconds: number;
	readonly normalizedCharge: number;
};

export type PlayerLightFeedbackComponent = {
	readonly baseIntensity: number;
	readonly baseDistance: number;
};

export type RuntimeSceneTransitionPort = {
	currentRuntimeSceneId(): string | undefined;
	canLoadRuntimeScene(runtimeSceneId: string): boolean;
	requestRuntimeScene(runtimeSceneId: string): void;
};

export type CharacterMovementBounds = {
	readonly minX: number;
	readonly maxX: number;
	readonly minZ: number;
	readonly maxZ: number;
};

export type MoveEntityCommand = Command<"MoveEntity"> & {
	readonly entity: Entity;
	readonly direction: ReturnType<typeof vec3>;
	readonly sprinting?: boolean;
};

export type JumpEntityCommand = Command<"JumpEntity"> & {
	readonly entity: Entity;
};

export type InteractAtScreenPointCommand = Command<"InteractAtScreenPoint"> & {
	readonly pointerId: number;
	readonly button: number;
	readonly position: readonly [number, number];
};

export type InteractWithActiveTargetCommand =
	Command<"InteractWithActiveTarget">;

export type CloseStoryNoteCommand = Command<"CloseStoryNote">;

export type GameplayCommand =
	| MoveEntityCommand
	| JumpEntityCommand
	| InteractAtScreenPointCommand
	| InteractWithActiveTargetCommand
	| CloseStoryNoteCommand;

export type GameHudState = {
	readonly playerAlive: boolean;
	readonly playerPosition: readonly [number, number, number];
	readonly health: readonly [number, number];
	readonly remainingCollectibles: number;
	readonly collectedCount: number;
	readonly moving: boolean;
	readonly pointerLocked: boolean;
	readonly lookActive: boolean;
	readonly inputEnabled: boolean;
	readonly charging: boolean;
	readonly chargeAmount: number;
	readonly activePortal?: {
		readonly label: string;
		readonly prompt: string;
		readonly canTravel: boolean;
	};
	readonly activeStoryNote?: {
		readonly title: string;
		readonly author: string;
		readonly location: string;
		readonly excerpt: string;
		readonly prompt: string;
	};
	readonly activeNpc?: {
		readonly displayName: string;
		readonly prompt: string;
		readonly excerpt: string;
	};
	readonly openStoryNote?: {
		readonly title: string;
		readonly author: string;
		readonly location: string;
		readonly excerpt: string;
		readonly body: string;
	};
	readonly openNpcDialog?: {
		readonly displayName: string;
		readonly title: string;
		readonly excerpt: string;
		readonly body: string;
	};
};
