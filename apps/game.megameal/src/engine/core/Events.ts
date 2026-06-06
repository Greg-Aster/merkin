export type EngineEvent<TType extends string = string> = {
	type: TType;
	[key: string]: unknown;
};

export type EventHandler<TEvent extends EngineEvent = EngineEvent> = (
	event: TEvent,
) => void;

export class EventBus<TEvent extends EngineEvent = EngineEvent> {
	private readonly queue: TEvent[] = [];
	private readonly allHandlers = new Set<EventHandler<TEvent>>();
	private readonly typedHandlers = new Map<
		TEvent["type"],
		Set<EventHandler<TEvent>>
	>();

	get size(): number {
		return this.queue.length;
	}

	emit(event: TEvent): void {
		this.queue.push(event);
	}

	subscribe(handler: EventHandler<TEvent>): () => void;
	subscribe(type: TEvent["type"], handler: EventHandler<TEvent>): () => void;
	subscribe(
		typeOrHandler: TEvent["type"] | EventHandler<TEvent>,
		handler?: EventHandler<TEvent>,
	): () => void {
		if (typeof typeOrHandler === "function") {
			this.allHandlers.add(typeOrHandler);
			return () => {
				this.allHandlers.delete(typeOrHandler);
			};
		}

		if (!handler) {
			throw new Error(
				`Event subscription for "${typeOrHandler}" requires a handler.`,
			);
		}

		let handlers = this.typedHandlers.get(typeOrHandler);

		if (!handlers) {
			handlers = new Set();
			this.typedHandlers.set(typeOrHandler, handlers);
		}

		handlers.add(handler);
		return () => {
			handlers?.delete(handler);
		};
	}

	drain(): TEvent[] {
		const events = this.queue.splice(0);

		for (const event of events) {
			this.notify(event);
		}

		return events;
	}

	peek(): readonly TEvent[] {
		return [...this.queue];
	}

	clearQueue(): void {
		this.queue.length = 0;
	}

	clearSubscriptions(): void {
		this.allHandlers.clear();
		this.typedHandlers.clear();
	}

	clear(): void {
		this.clearQueue();
		this.clearSubscriptions();
	}

	private notify(event: TEvent): void {
		for (const handler of this.allHandlers) {
			handler(event);
		}

		const handlers = this.typedHandlers.get(event.type);

		if (!handlers) {
			return;
		}

		for (const handler of handlers) {
			handler(event);
		}
	}
}
