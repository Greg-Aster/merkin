import type { RenderableComponent } from "../../engine/modules/rendering/index.js";
import type { StreamingChunkRole } from "./streaming/index.js";

export const PERFORMANCE_LOD_COMPONENT = "PerformanceLod";
export const STREAMING_CHUNK_COMPONENT = "StreamingChunk";

export type PerformanceLodTierOverride = {
	readonly id: string;
	readonly renderable?: RenderableComponent;
};

export type PerformanceLodComponent = {
	readonly groupId?: string;
	readonly tiers: readonly PerformanceLodTierOverride[];
};

export type StreamingChunkComponent = {
	readonly id?: string;
	readonly role: Exclude<StreamingChunkRole, "startup">;
	readonly center?: readonly [number, number, number];
	readonly loadRadius?: number;
	readonly unloadRadius?: number;
	readonly priority?: number;
	readonly assetIds?: readonly string[];
	readonly includeRenderable?: boolean;
	readonly includeLight?: boolean;
	readonly includeCollider?: boolean;
};
