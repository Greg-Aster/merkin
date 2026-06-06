export type SystemId = string;

export type SystemAccess = {
	reads?: readonly string[];
	writes?: readonly string[];
};

export type SystemContext = Record<string, unknown>;

export type System<TContext = SystemContext> = SystemAccess & {
	id: SystemId;
	order?: number;
	update(context: TContext): void;
};

export type SystemUpdate<TContext = SystemContext> = (
	context: TContext,
) => void;
