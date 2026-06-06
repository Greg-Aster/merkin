export type InputActionId = string;
export type InputDevice = "keyboard" | "mouse" | "touch" | "gamepad";
export type InputActionPhase = "idle" | "pressed" | "held" | "released";

export type KeyboardInputBinding = {
	readonly device: "keyboard";
	readonly code: string;
	readonly action: InputActionId;
	readonly scale?: number;
};

export type MouseButtonInputBinding = {
	readonly device: "mouse";
	readonly button: number;
	readonly action: InputActionId;
	readonly scale?: number;
};

export type GamepadButtonInputBinding = {
	readonly device: "gamepad";
	readonly button: number;
	readonly action: InputActionId;
	readonly scale?: number;
};

export type GamepadAxisInputBinding = {
	readonly device: "gamepad";
	readonly axis: number;
	readonly action: InputActionId;
	readonly scale?: number;
	readonly deadzone?: number;
};

export type TouchInputBinding = {
	readonly device: "touch";
	readonly touchId: string;
	readonly action: InputActionId;
	readonly scale?: number;
};

export type InputBinding =
	| KeyboardInputBinding
	| MouseButtonInputBinding
	| GamepadButtonInputBinding
	| GamepadAxisInputBinding
	| TouchInputBinding;

export type InputActionState = {
	readonly value: number;
	readonly previousValue: number;
	readonly phase: InputActionPhase;
};

export type InputFocusState = {
	readonly visible: boolean;
	readonly focused: boolean;
	readonly uiCapturingInput: boolean;
	readonly pointerLocked: boolean;
	readonly gameplayInputEnabled: boolean;
};

export type InputPointerClick = {
	readonly pointerId: number;
	readonly button: number;
	readonly position: readonly [number, number];
};

export type InputPointerState = {
	readonly lookActive: boolean;
	readonly clicks: readonly InputPointerClick[];
};

export type MobileInputControlsPort = {
	setTouchAction(touchId: string, active: boolean): void;
	setTouchActionValue(touchId: string, value: number): void;
	setTouchLookActive(active: boolean): void;
	addTouchLookDelta(deltaX: number, deltaY: number): void;
	clearTouchControls(): void;
};

export type InputSnapshot = {
	readonly actions: ReadonlyMap<InputActionId, InputActionState>;
	readonly pointerDelta: readonly [number, number];
	readonly pointer: InputPointerState;
	readonly focus: InputFocusState;
	readonly timestamp: number;
};

export type ActionMap = {
	readonly id: string;
	readonly bindings: readonly InputBinding[];
};

export type PlayerInputComponent = {
	readonly actions: ReadonlyMap<InputActionId, InputActionState>;
	readonly lookDelta: readonly [number, number];
};

export type InputCommandMapping<TCommand = unknown> = {
	readonly action: InputActionId;
	readonly phase?: Exclude<InputActionPhase, "idle">;
	readonly threshold?: number;
	create(
		state: InputActionState,
		snapshot: InputSnapshot,
	): TCommand | undefined;
};

export type InputCommandFactory<TCommand = unknown> = (
	snapshot: InputSnapshot,
) => readonly TCommand[];

export type InputPlatformPort = {
	snapshot(timestamp?: number): InputSnapshot;
	setBindings(bindings: readonly InputBinding[]): void;
	setFocusState(state: Partial<InputFocusState>): void;
	dispose(): void;
};

const emptyFocusState: InputFocusState = {
	visible: true,
	focused: true,
	uiCapturingInput: false,
	pointerLocked: false,
	gameplayInputEnabled: true,
};

export function createActionMap(
	id: string,
	bindings: readonly InputBinding[],
): ActionMap {
	return { id, bindings };
}

export function emptyInputSnapshot(timestamp = 0): InputSnapshot {
	return {
		actions: new Map(),
		pointerDelta: [0, 0],
		pointer: { lookActive: false, clicks: [] },
		focus: emptyFocusState,
		timestamp,
	};
}

export function getActionValue(
	snapshot: InputSnapshot,
	action: InputActionId,
): number {
	return snapshot.actions.get(action)?.value ?? 0;
}

export function isActionActive(
	snapshot: InputSnapshot,
	action: InputActionId,
	threshold = 0,
): boolean {
	return getActionValue(snapshot, action) > threshold;
}

export function createInputCommandFactory<TCommand>(
	mappings: readonly InputCommandMapping<TCommand>[],
): InputCommandFactory<TCommand> {
	return (snapshot) => {
		if (!snapshot.focus.gameplayInputEnabled) {
			return [];
		}

		const commands: TCommand[] = [];

		for (const mapping of mappings) {
			const state = snapshot.actions.get(mapping.action);

			if (!state) {
				continue;
			}

			if (state.value <= (mapping.threshold ?? 0)) {
				continue;
			}

			if (mapping.phase && state.phase !== mapping.phase) {
				continue;
			}

			const command = mapping.create(state, snapshot);

			if (command !== undefined) {
				commands.push(command);
			}
		}

		return commands;
	};
}

export class InputManager implements InputPlatformPort {
	#bindings: readonly InputBinding[];
	#keyValues = new Map<string, number>();
	#mouseButtonValues = new Map<number, number>();
	#gamepadButtonValues = new Map<number, number>();
	#gamepadAxisValues = new Map<number, number>();
	#touchValues = new Map<string, number>();
	#previousActions = new Map<InputActionId, InputActionState>();
	#pointerDelta: [number, number] = [0, 0];
	#pointerLookActive = false;
	#touchLookActive = false;
	#pointerClicks: InputPointerClick[] = [];
	#focusState: InputFocusState = emptyFocusState;

	constructor(actionMap: ActionMap = createActionMap("empty", [])) {
		this.#bindings = actionMap.bindings;
	}

	setBindings(bindings: readonly InputBinding[]): void {
		this.#bindings = bindings;
	}

	setActionMap(actionMap: ActionMap): void {
		this.setBindings(actionMap.bindings);
	}

	setFocusState(state: Partial<InputFocusState>): void {
		this.#focusState = {
			...this.#focusState,
			...state,
		};

		if (!resolveFocusState(this.#focusState).gameplayInputEnabled) {
			this.clearGameplayInput();
		}
	}

	setKey(code: string, pressed: boolean): void {
		if (pressed && !this.gameplayInputEnabled()) {
			return;
		}

		this.setValue(this.#keyValues, code, pressed ? 1 : 0);
	}

	setMouseButton(button: number, pressed: boolean): void {
		if (pressed && !this.gameplayInputEnabled()) {
			return;
		}

		this.setValue(this.#mouseButtonValues, button, pressed ? 1 : 0);
	}

	setGamepadButton(button: number, pressed: boolean): void {
		if (pressed && !this.gameplayInputEnabled()) {
			return;
		}

		this.setValue(this.#gamepadButtonValues, button, pressed ? 1 : 0);
	}

	setGamepadAxis(axis: number, value: number): void {
		const clamped = clampSignedInputValue(value);

		if (clamped !== 0 && !this.gameplayInputEnabled()) {
			return;
		}

		if (clamped === 0) {
			this.#gamepadAxisValues.delete(axis);
			return;
		}

		this.#gamepadAxisValues.set(axis, clamped);
	}

	setTouch(touchId: string, active: boolean): void {
		if (active && !this.gameplayInputEnabled()) {
			return;
		}

		this.setValue(this.#touchValues, touchId, active ? 1 : 0);
	}

	setTouchValue(touchId: string, value: number): void {
		const clamped = clampInputValue(value);

		if (clamped > 0 && !this.gameplayInputEnabled()) {
			return;
		}

		this.setValue(this.#touchValues, touchId, clamped);
	}

	setTouchLookActive(active: boolean): void {
		this.#touchLookActive =
			active && resolveFocusState(this.#focusState).gameplayInputEnabled;

		if (!this.#touchLookActive) {
			this.#pointerDelta = [0, 0];
		}
	}

	addPointerDelta(deltaX: number, deltaY: number): void {
		if (!this.#pointerLookActive) {
			return;
		}

		this.#pointerDelta = [
			this.#pointerDelta[0] + deltaX,
			this.#pointerDelta[1] + deltaY,
		];
	}

	addTouchLookDelta(deltaX: number, deltaY: number): void {
		if (!this.#touchLookActive || !this.gameplayInputEnabled()) {
			return;
		}

		this.#pointerDelta = [
			this.#pointerDelta[0] + deltaX,
			this.#pointerDelta[1] + deltaY,
		];
	}

	setPointerLookActive(active: boolean): void {
		this.#pointerLookActive =
			active && resolveFocusState(this.#focusState).gameplayInputEnabled;

		if (!this.#pointerLookActive) {
			this.#pointerDelta = [0, 0];
		}
	}

	addPointerClick(click: InputPointerClick): void {
		if (!this.gameplayInputEnabled()) {
			return;
		}

		this.#pointerClicks.push({
			pointerId: click.pointerId,
			button: click.button,
			position: [click.position[0], click.position[1]],
		});
	}

	snapshot(timestamp = 0): InputSnapshot {
		const focus = resolveFocusState(this.#focusState);

		if (!focus.gameplayInputEnabled) {
			this.clearGameplayInput();
		}

		const actions = focus.gameplayInputEnabled
			? this.resolveActions()
			: new Map<InputActionId, InputActionState>();
		const lookActive =
			focus.gameplayInputEnabled &&
			(this.#pointerLookActive || this.#touchLookActive);
		const pointerDelta = lookActive
			? this.#pointerDelta
			: ([0, 0] as [number, number]);
		const pointerClicks = focus.gameplayInputEnabled ? this.#pointerClicks : [];

		this.#pointerDelta = [0, 0];
		this.#pointerClicks = [];
		this.#previousActions = actions;

		return {
			actions,
			pointerDelta,
			pointer: {
				lookActive,
				clicks: pointerClicks,
			},
			focus,
			timestamp,
		};
	}

	dispose(): void {
		this.#bindings = [];
		this.clearGameplayInput();
		this.#focusState = emptyFocusState;
	}

	clearGameplayInput(): void {
		this.#keyValues.clear();
		this.#mouseButtonValues.clear();
		this.#gamepadButtonValues.clear();
		this.#gamepadAxisValues.clear();
		this.#previousActions.clear();
		this.clearPointerInput();
		this.clearTouchControls();
	}

	clearPointerInput(): void {
		this.#pointerDelta = [0, 0];
		this.#pointerLookActive = false;
		this.#pointerClicks = [];
	}

	clearTouchControls(): void {
		this.#touchValues.clear();
		this.#touchLookActive = false;
		this.#pointerDelta = [0, 0];
	}

	gameplayInputEnabled(): boolean {
		return resolveFocusState(this.#focusState).gameplayInputEnabled;
	}

	private resolveActions(): Map<InputActionId, InputActionState> {
		const values = new Map<InputActionId, number>();

		for (const binding of this.#bindings) {
			const value = this.readBindingValue(binding);

			if (value === 0) {
				continue;
			}

			values.set(
				binding.action,
				Math.max(values.get(binding.action) ?? 0, value),
			);
		}

		const actions = new Map<InputActionId, InputActionState>();
		const actionIds = new Set([
			...values.keys(),
			...this.#previousActions.keys(),
		]);

		for (const action of actionIds) {
			const value = values.get(action) ?? 0;
			const previousValue = this.#previousActions.get(action)?.value ?? 0;
			actions.set(action, {
				value,
				previousValue,
				phase: resolveActionPhase(value, previousValue),
			});
		}

		return actions;
	}

	private readBindingValue(binding: InputBinding): number {
		const scale = binding.scale ?? 1;

		if (binding.device === "keyboard") {
			return (this.#keyValues.get(binding.code) ?? 0) * scale;
		}

		if (binding.device === "mouse") {
			return (this.#mouseButtonValues.get(binding.button) ?? 0) * scale;
		}

		if (binding.device === "touch") {
			return (this.#touchValues.get(binding.touchId) ?? 0) * scale;
		}

		if ("button" in binding) {
			return (this.#gamepadButtonValues.get(binding.button) ?? 0) * scale;
		}

		const rawAxis = this.#gamepadAxisValues.get(binding.axis) ?? 0;
		const deadzone = binding.deadzone ?? 0;
		const axisValue = Math.abs(rawAxis) <= deadzone ? 0 : rawAxis;
		return Math.max(0, axisValue * scale);
	}

	private setValue<TKey>(
		values: Map<TKey, number>,
		key: TKey,
		value: number,
	): void {
		const clamped = clampInputValue(value);

		if (clamped === 0) {
			values.delete(key);
			return;
		}

		values.set(key, clamped);
	}
}

export function resolveFocusState(state: InputFocusState): InputFocusState {
	const gameplayInputEnabled =
		state.visible &&
		state.focused &&
		!state.uiCapturingInput &&
		state.gameplayInputEnabled;

	return {
		...state,
		gameplayInputEnabled,
	};
}

export function resolveActionPhase(
	value: number,
	previousValue: number,
	threshold = 0,
): InputActionPhase {
	if (value > threshold && previousValue <= threshold) {
		return "pressed";
	}

	if (value > threshold && previousValue > threshold) {
		return "held";
	}

	if (value <= threshold && previousValue > threshold) {
		return "released";
	}

	return "idle";
}

function clampInputValue(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}

function clampSignedInputValue(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(-1, Math.min(1, value));
}
