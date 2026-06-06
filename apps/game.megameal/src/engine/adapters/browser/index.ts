import {
	type ActionMap,
	type InputBinding,
	type InputFocusState,
	InputManager,
	type InputPlatformPort,
	type InputSnapshot,
	type MobileInputControlsPort,
} from "../../modules/input/index.js";

export * from "./audio.js";

export type AnimationFrameHandle = number;

export type DisplaySize = {
	readonly width: number;
	readonly height: number;
	readonly pixelRatio: number;
};

export type BrowserPlatformPort = {
	requestFrame(
		callback: (timeMilliseconds: number) => void,
	): AnimationFrameHandle;
	cancelFrame(handle: AnimationFrameHandle): void;
	now(): number;
	isVisible(): boolean;
	displaySize(element: Element): DisplaySize;
	onResize(handler: () => void): () => void;
	onVisibilityChange(handler: (visible: boolean) => void): () => void;
	onPageHide(handler: () => void): () => void;
	requestFullscreen(element: Element): Promise<void>;
	exitFullscreen(): Promise<void>;
	storageGet(key: string, storage?: "local" | "session"): string | undefined;
	storageSet(key: string, value: string, storage?: "local" | "session"): void;
	storageRemove(key: string, storage?: "local" | "session"): void;
	createWorker(url: URL | string, options?: WorkerOptions): Worker;
	dispose(): void;
};

export class BrowserPlatform implements BrowserPlatformPort {
	#cleanups = new Set<() => void>();

	requestFrame(
		callback: (timeMilliseconds: number) => void,
	): AnimationFrameHandle {
		return window.requestAnimationFrame(callback);
	}

	cancelFrame(handle: AnimationFrameHandle): void {
		window.cancelAnimationFrame(handle);
	}

	now(): number {
		return performance.now();
	}

	isVisible(): boolean {
		return document.visibilityState === "visible";
	}

	displaySize(element: Element): DisplaySize {
		const rect = element.getBoundingClientRect();

		return {
			width: Math.max(1, Math.floor(rect.width)),
			height: Math.max(1, Math.floor(rect.height)),
			pixelRatio: Math.min(2, window.devicePixelRatio || 1),
		};
	}

	onResize(handler: () => void): () => void {
		window.addEventListener("resize", handler);
		const cleanup = () => {
			window.removeEventListener("resize", handler);
		};
		this.#cleanups.add(cleanup);

		return () => {
			cleanup();
			this.#cleanups.delete(cleanup);
		};
	}

	onVisibilityChange(handler: (visible: boolean) => void): () => void {
		const listener = () => {
			handler(this.isVisible());
		};

		document.addEventListener("visibilitychange", listener);
		const cleanup = () => {
			document.removeEventListener("visibilitychange", listener);
		};
		this.#cleanups.add(cleanup);

		return () => {
			cleanup();
			this.#cleanups.delete(cleanup);
		};
	}

	onPageHide(handler: () => void): () => void {
		window.addEventListener("pagehide", handler, { once: true });
		const cleanup = () => {
			window.removeEventListener("pagehide", handler);
		};
		this.#cleanups.add(cleanup);

		return () => {
			cleanup();
			this.#cleanups.delete(cleanup);
		};
	}

	async requestFullscreen(element: Element): Promise<void> {
		await element.requestFullscreen?.();
	}

	async exitFullscreen(): Promise<void> {
		if (document.fullscreenElement) {
			await document.exitFullscreen();
		}
	}

	storageGet(
		key: string,
		storage: "local" | "session" = "local",
	): string | undefined {
		return this.#storage(storage).getItem(key) ?? undefined;
	}

	storageSet(
		key: string,
		value: string,
		storage: "local" | "session" = "local",
	): void {
		this.#storage(storage).setItem(key, value);
	}

	storageRemove(key: string, storage: "local" | "session" = "local"): void {
		this.#storage(storage).removeItem(key);
	}

	createWorker(url: URL | string, options?: WorkerOptions): Worker {
		return new Worker(url, options);
	}

	dispose(): void {
		for (const cleanup of this.#cleanups) {
			cleanup();
		}

		this.#cleanups.clear();
	}

	#storage(storage: "local" | "session"): Storage {
		return storage === "local" ? localStorage : sessionStorage;
	}
}

export type BrowserInputAdapterOptions = {
	readonly actionMap?: ActionMap;
	readonly target?: HTMLElement;
	readonly input?: InputManager;
};

type PointerLookSession = {
	readonly pointerId: number;
	readonly button: number;
	readonly startX: number;
	readonly startY: number;
	lastX: number;
	lastY: number;
	lookActive: boolean;
};

const HELD_LOOK_BUTTON = 0;
const CLICK_MOVEMENT_THRESHOLD_PIXELS = 5;

export class BrowserInputAdapter
	implements InputPlatformPort, MobileInputControlsPort
{
	readonly input: InputManager;

	readonly #target: HTMLElement | Window;
	readonly #pointerTarget: HTMLElement | undefined;
	readonly #cleanups: Array<() => void> = [];
	#pointerLookSession: PointerLookSession | undefined;

	constructor(options: BrowserInputAdapterOptions = {}) {
		this.input = options.input ?? new InputManager(options.actionMap);
		this.#pointerTarget = options.target;
		this.#target = options.target ?? window;

		if (options.actionMap) {
			this.input.setActionMap(options.actionMap);
		}

		this.#bind();
		this.#syncFocusState();
	}

	snapshot(timestamp?: number): InputSnapshot {
		this.#pollGamepads();
		this.#syncFocusState();
		return this.input.snapshot(timestamp);
	}

	setBindings(bindings: readonly InputBinding[]): void {
		this.input.setBindings(bindings);
	}

	setFocusState(state: Partial<InputFocusState>): void {
		this.input.setFocusState(state);

		if (!this.input.gameplayInputEnabled()) {
			this.#endPointerLook({ emitClick: false });
		}
	}

	setTouchAction(touchId: string, active: boolean): void {
		this.input.setTouch(touchId, active);
	}

	setTouchActionValue(touchId: string, value: number): void {
		this.input.setTouchValue(touchId, value);
	}

	setTouchLookActive(active: boolean): void {
		this.input.setTouchLookActive(active);
	}

	addTouchLookDelta(deltaX: number, deltaY: number): void {
		this.input.addTouchLookDelta(deltaX, deltaY);
	}

	clearTouchControls(): void {
		this.input.clearTouchControls();
	}

	async requestPointerLock(): Promise<void> {
		if (!this.#pointerTarget?.requestPointerLock) {
			return;
		}

		await this.#pointerTarget.requestPointerLock();
	}

	dispose(): void {
		for (const cleanup of this.#cleanups.splice(0).reverse()) {
			cleanup();
		}

		this.#endPointerLook({ emitClick: false });
		this.input.dispose();
	}

	#bind(): void {
		this.#listen(window, "keydown", (event) => {
			this.input.setKey((event as KeyboardEvent).code, true);
		});
		this.#listen(window, "keyup", (event) => {
			this.input.setKey((event as KeyboardEvent).code, false);
		});
		this.#listen(this.#target, "pointerdown", (event) => {
			this.#handlePointerDown(event as PointerEvent);
		});
		this.#listen(window, "pointermove", (event) => {
			this.#handlePointerMove(event as PointerEvent);
		});
		this.#listen(window, "pointerup", (event) => {
			this.#handlePointerUp(event as PointerEvent);
		});
		this.#listen(window, "pointercancel", (event) => {
			this.#handlePointerCancel(event as PointerEvent);
		});
		this.#listen(window, "blur", () => {
			this.#endPointerLook({ emitClick: false });
			this.input.setFocusState({ focused: false });
		});
		this.#listen(window, "focus", () => {
			this.input.setFocusState({ focused: true });
		});
		this.#listen(document, "visibilitychange", () => {
			if (document.visibilityState !== "visible") {
				this.#endPointerLook({ emitClick: false });
			}
			this.#syncFocusState();
		});
		this.#listen(document, "pointerlockchange", () => {
			this.#syncFocusState();
		});
		this.#listen(window, "gamepadconnected", () => {
			this.#pollGamepads();
		});
		this.#listen(window, "gamepaddisconnected", () => {
			this.#pollGamepads();
		});
	}

	#listen(
		target: EventTarget,
		type: string,
		handler: EventListener,
		options?: AddEventListenerOptions,
	): void {
		target.addEventListener(type, handler, options);
		this.#cleanups.push(() => {
			target.removeEventListener(type, handler, options);
		});
	}

	#handlePointerDown(event: PointerEvent): void {
		if (event.pointerType !== "mouse") {
			return;
		}

		this.#syncFocusState();

		if (!this.input.gameplayInputEnabled()) {
			return;
		}

		if (event.button !== HELD_LOOK_BUTTON) {
			this.input.setMouseButton(event.button, true);
			return;
		}

		this.#endPointerLook({ emitClick: false });
		this.input.setMouseButton(event.button, true);
		this.#pointerLookSession = {
			pointerId: event.pointerId,
			button: event.button,
			startX: event.clientX,
			startY: event.clientY,
			lastX: event.clientX,
			lastY: event.clientY,
			lookActive: false,
		};
		this.#setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	#handlePointerMove(event: PointerEvent): void {
		const session = this.#pointerLookSession;

		if (!session || event.pointerId !== session.pointerId) {
			return;
		}

		const deltaX = event.clientX - session.lastX;
		const deltaY = event.clientY - session.lastY;
		session.lastX = event.clientX;
		session.lastY = event.clientY;

		if (!session.lookActive) {
			const movedDistance = Math.hypot(
				event.clientX - session.startX,
				event.clientY - session.startY,
			);

			if (movedDistance <= CLICK_MOVEMENT_THRESHOLD_PIXELS) {
				event.preventDefault();
				return;
			}

			session.lookActive = true;
			this.input.setPointerLookActive(true);
		}

		this.input.addPointerDelta(deltaX, deltaY);
		event.preventDefault();
	}

	#handlePointerUp(event: PointerEvent): void {
		if (event.pointerType === "mouse") {
			this.input.setMouseButton(event.button, false);
		}

		this.#endPointerLook({ event, emitClick: true });
	}

	#handlePointerCancel(event: PointerEvent): void {
		if (event.pointerType === "mouse") {
			this.input.setMouseButton(event.button, false);
		}

		this.#endPointerLook({ event, emitClick: false });
	}

	#endPointerLook(options: {
		readonly event?: PointerEvent;
		readonly emitClick: boolean;
	}): void {
		const session = this.#pointerLookSession;

		if (!session) {
			this.input.setPointerLookActive(false);
			return;
		}

		this.#pointerLookSession = undefined;
		this.input.setMouseButton(session.button, false);
		this.input.setPointerLookActive(false);
		this.#releasePointerCapture(session.pointerId);

		if (
			!options.emitClick ||
			!options.event ||
			options.event.pointerId !== session.pointerId ||
			options.event.button !== session.button
		) {
			return;
		}

		const movedDistance = Math.hypot(
			options.event.clientX - session.startX,
			options.event.clientY - session.startY,
		);

		if (movedDistance > CLICK_MOVEMENT_THRESHOLD_PIXELS) {
			return;
		}

		this.input.addPointerClick({
			pointerId: options.event.pointerId,
			button: options.event.button,
			position: [options.event.clientX, options.event.clientY],
		});
	}

	#setPointerCapture(pointerId: number): void {
		try {
			this.#pointerTarget?.setPointerCapture?.(pointerId);
		} catch {
			// Pointer capture is a best-effort browser convenience; window listeners
			// still own the release path when capture is unavailable.
		}
	}

	#releasePointerCapture(pointerId: number): void {
		try {
			this.#pointerTarget?.releasePointerCapture?.(pointerId);
		} catch {
			// The browser may already have released capture after blur/cancel.
		}
	}

	#pollGamepads(): void {
		const gamepads = navigator.getGamepads?.() ?? [];

		for (const gamepad of gamepads) {
			if (!gamepad) {
				continue;
			}

			for (const [index, button] of gamepad.buttons.entries()) {
				this.input.setGamepadButton(index, button.value > 0);
			}

			for (const [index, value] of gamepad.axes.entries()) {
				this.input.setGamepadAxis(index, value);
			}
		}
	}

	#syncFocusState(): void {
		this.input.setFocusState({
			focused: document.hasFocus(),
			visible: document.visibilityState === "visible",
			pointerLocked:
				this.#pointerTarget !== undefined &&
				document.pointerLockElement === this.#pointerTarget,
		});
	}
}
