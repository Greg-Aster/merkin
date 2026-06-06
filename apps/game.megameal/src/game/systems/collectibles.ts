import type { Entity, System, World } from "../../engine/core/index.js";
import { lengthSquaredVec3, vec3 } from "../../engine/math/index.js";
import {
	type RenderTransform,
	TRANSFORM_COMPONENT,
} from "../../engine/modules/rendering/index.js";
import {
	COLLECTED_COUNT_RESOURCE,
	COLLECTIBLE_COMPONENT,
	type CollectibleComponent,
	PLAYER_ENTITY_RESOURCE,
} from "./components.js";

export function createCollectibleSystem<
	TContext extends CollectibleSystemContext,
>(): System<TContext> {
	return {
		id: "collectibles",
		reads: [TRANSFORM_COMPONENT, COLLECTIBLE_COMPONENT],
		writes: [COLLECTED_COUNT_RESOURCE],
		update(context) {
			const player = context.world.getResource<Entity>(PLAYER_ENTITY_RESOURCE);

			if (player === undefined || !context.world.isAlive(player)) {
				return;
			}

			const playerTransform = context.world.getComponent<RenderTransform>(
				player,
				TRANSFORM_COMPONENT,
			);

			if (!playerTransform) {
				return;
			}

			for (const entity of context.world.query([
				TRANSFORM_COMPONENT,
				COLLECTIBLE_COMPONENT,
			])) {
				const collectible =
					context.world.requireComponent<CollectibleComponent>(
						entity,
						COLLECTIBLE_COMPONENT,
					);
				const transform = context.world.requireComponent<RenderTransform>(
					entity,
					TRANSFORM_COMPONENT,
				);
				const offset = vec3(
					transform.position.x - playerTransform.position.x,
					0,
					transform.position.z - playerTransform.position.z,
				);

				if (
					lengthSquaredVec3(offset) >
					collectible.radius * collectible.radius
				) {
					continue;
				}

				context.world.destroyEntity(entity);
				context.world.setResource(
					COLLECTED_COUNT_RESOURCE,
					(context.world.getResource<number>(COLLECTED_COUNT_RESOURCE) ?? 0) +
						collectible.value,
				);
				context.events.emit({
					type: "ItemCollected",
					entity,
					itemId: collectible.id,
					label: collectible.label,
				});
			}
		},
	};
}

type CollectibleSystemContext = {
	readonly world: World;
	readonly events: {
		emit(event: {
			readonly type: string;
			readonly [key: string]: unknown;
		}): void;
	};
};
