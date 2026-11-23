import type { Command } from "../core/index.js";
import type {
	EngineRuntime,
	RuntimeObserver,
	RuntimeSnapshot,
} from "../runtime/index.js";

export type { RuntimeObserver, RuntimeSnapshot } from "../runtime/index.js";

export type EngineClientApi = {
	observeRuntime(observer: RuntimeObserver<RuntimeSnapshot>): () => void;
	pause(): void;
	resume(): void;
	dispatch(command: Command): void;
};

export function createEngineClientApi(runtime: EngineRuntime): EngineClientApi {
	return {
		observeRuntime(observer) {
			return runtime.observe(observer);
		},
		pause() {
			runtime.pause();
		},
		resume() {
			runtime.start();
		},
		dispatch(command) {
			runtime.commands.dispatch(command);
		},
	};
}
