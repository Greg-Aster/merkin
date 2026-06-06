import {
	type ComponentName,
	ComponentStorage,
	type ComponentValue,
} from "./Component";
import { type Entity, EntityIdAllocator } from "./Entity";

export type ResourceName = string;

export class World {
	private readonly allocator: EntityIdAllocator;
	private readonly aliveEntities = new Set<Entity>();
	private readonly componentStores = new Map<ComponentName, ComponentStorage>();
	private readonly resources = new Map<ResourceName, unknown>();

	constructor(allocator = new EntityIdAllocator()) {
		this.allocator = allocator;
	}

	createEntity(): Entity {
		const entity = this.allocator.allocate();
		this.aliveEntities.add(entity);
		return entity;
	}

	destroyEntity(entity: Entity): boolean {
		if (!this.aliveEntities.delete(entity)) {
			return false;
		}

		for (const storage of this.componentStores.values()) {
			storage.remove(entity);
		}

		return true;
	}

	isAlive(entity: Entity): boolean {
		return this.aliveEntities.has(entity);
	}

	entities(): Entity[] {
		return [...this.aliveEntities].sort((a, b) => a - b);
	}

	addComponent<TComponent>(
		entity: Entity,
		componentName: ComponentName,
		component: TComponent,
	): TComponent {
		this.assertEntityAlive(entity);
		return this.getOrCreateStorage<TComponent>(componentName).set(
			entity,
			component,
		);
	}

	getComponent<TComponent = ComponentValue>(
		entity: Entity,
		componentName: ComponentName,
	): TComponent | undefined {
		return this.getStorage<TComponent>(componentName)?.get(entity);
	}

	requireComponent<TComponent = ComponentValue>(
		entity: Entity,
		componentName: ComponentName,
	): TComponent {
		const component = this.getComponent<TComponent>(entity, componentName);

		if (component === undefined) {
			throw new Error(
				`Entity ${entity} does not have component "${componentName}".`,
			);
		}

		return component;
	}

	hasComponent(entity: Entity, componentName: ComponentName): boolean {
		return this.getStorage(componentName)?.has(entity) ?? false;
	}

	removeComponent<TComponent = ComponentValue>(
		entity: Entity,
		componentName: ComponentName,
	): TComponent | undefined {
		return this.getStorage<TComponent>(componentName)?.remove(entity);
	}

	getStorage<TComponent = ComponentValue>(
		componentName: ComponentName,
	): ComponentStorage<TComponent> | undefined {
		return this.componentStores.get(componentName) as
			| ComponentStorage<TComponent>
			| undefined;
	}

	query(componentNames: readonly ComponentName[]): Entity[] {
		if (componentNames.length === 0) {
			return this.entities();
		}

		const stores = componentNames.map((componentName) =>
			this.getStorage(componentName),
		);

		if (stores.some((storage) => storage === undefined)) {
			return [];
		}

		const typedStores = stores.filter(
			(storage): storage is ComponentStorage => storage !== undefined,
		);
		const seedStore = typedStores.sort((a, b) => a.size - b.size)[0];

		if (!seedStore) {
			return [];
		}

		return seedStore
			.entities()
			.filter(
				(entity) =>
					this.aliveEntities.has(entity) &&
					typedStores.every((storage) => storage.has(entity)),
			);
	}

	setResource<TResource>(
		resourceName: ResourceName,
		resource: TResource,
	): TResource {
		this.resources.set(resourceName, resource);
		return resource;
	}

	getResource<TResource>(resourceName: ResourceName): TResource | undefined {
		return this.resources.get(resourceName) as TResource | undefined;
	}

	requireResource<TResource>(resourceName: ResourceName): TResource {
		const resource = this.getResource<TResource>(resourceName);

		if (resource === undefined) {
			throw new Error(`World resource "${resourceName}" is not registered.`);
		}

		return resource;
	}

	hasResource(resourceName: ResourceName): boolean {
		return this.resources.has(resourceName);
	}

	removeResource<TResource>(resourceName: ResourceName): TResource | undefined {
		const resource = this.getResource<TResource>(resourceName);
		this.resources.delete(resourceName);
		return resource;
	}

	clear(): void {
		this.aliveEntities.clear();
		this.componentStores.clear();
		this.resources.clear();
		this.allocator.reset();
	}

	private getOrCreateStorage<TComponent>(
		componentName: ComponentName,
	): ComponentStorage<TComponent> {
		let storage = this.componentStores.get(componentName);

		if (!storage) {
			storage = new ComponentStorage<TComponent>();
			this.componentStores.set(componentName, storage);
		}

		return storage as ComponentStorage<TComponent>;
	}

	private assertEntityAlive(entity: Entity): void {
		if (!this.isAlive(entity)) {
			throw new Error(`Entity ${entity} is not alive in this world.`);
		}
	}
}
