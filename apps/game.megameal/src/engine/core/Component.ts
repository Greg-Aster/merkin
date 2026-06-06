import type { Entity } from "./Entity";

export type ComponentName = string;
export type ComponentValue = unknown;

export class ComponentStorage<TComponent = ComponentValue> {
	private readonly components = new Map<Entity, TComponent>();

	get size(): number {
		return this.components.size;
	}

	set(entity: Entity, component: TComponent): TComponent {
		this.components.set(entity, component);
		return component;
	}

	get(entity: Entity): TComponent | undefined {
		return this.components.get(entity);
	}

	has(entity: Entity): boolean {
		return this.components.has(entity);
	}

	remove(entity: Entity): TComponent | undefined {
		const component = this.components.get(entity);
		this.components.delete(entity);
		return component;
	}

	clear(): void {
		this.components.clear();
	}

	entities(): Entity[] {
		return [...this.components.keys()].sort((a, b) => a - b);
	}

	entries(): Array<[Entity, TComponent]> {
		return [...this.components.entries()].sort(([a], [b]) => a - b);
	}
}
