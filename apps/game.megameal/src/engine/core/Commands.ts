export type Command<TType extends string = string> = {
	type: TType;
	[key: string]: unknown;
};

export class CommandBus<TCommand extends Command = Command> {
	private readonly queue: TCommand[] = [];

	get size(): number {
		return this.queue.length;
	}

	dispatch(command: TCommand): void {
		this.queue.push(command);
	}

	drain(): TCommand[] {
		return this.queue.splice(0);
	}

	peek(): readonly TCommand[] {
		return [...this.queue];
	}

	clear(): void {
		this.queue.length = 0;
	}
}
