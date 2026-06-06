<script lang="ts">
import { onDestroy } from "svelte";
import type { MobileInputControlsPort } from "../engine/index.js";

type TouchActionIds = {
	readonly moveForward: string;
	readonly moveBack: string;
	readonly moveLeft: string;
	readonly moveRight: string;
	readonly jump: string;
	readonly sprint: string;
	readonly interactPrimary: string;
	readonly chargeLight: string;
};

type Props = {
	readonly input: MobileInputControlsPort;
	readonly touchActions: TouchActionIds;
};

const { input, touchActions }: Props = $props();

let lookPointerId: number | undefined = $state();
let lastLookX = 0;
let lastLookY = 0;
let movePointerId: number | undefined = $state();

onDestroy(() => {
	input.clearTouchControls();
});

function pressAction(event: PointerEvent, touchId: string): void {
	event.preventDefault();
	capturePointer(event);
	input.setTouchAction(touchId, true);
}

function releaseAction(event: PointerEvent, touchId: string): void {
	event.preventDefault();
	input.setTouchAction(touchId, false);
	releasePointer(event);
}

function startMove(event: PointerEvent): void {
	event.preventDefault();

	if (movePointerId !== undefined) {
		return;
	}

	movePointerId = event.pointerId;
	updateMove(event);
	capturePointer(event);
}

function updateMove(event: PointerEvent): void {
	if (event.pointerId !== movePointerId) {
		return;
	}

	event.preventDefault();

	const target = event.currentTarget as HTMLElement;
	const rect = target.getBoundingClientRect();
	const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	const x = clampSigned((event.clientX - centerX) / radius);
	const y = clampSigned((event.clientY - centerY) / radius);
	const deadzone = 0.18;

	input.setTouchActionValue(
		touchActions.moveLeft,
		x < -deadzone ? Math.abs(x) : 0,
	);
	input.setTouchActionValue(touchActions.moveRight, x > deadzone ? x : 0);
	input.setTouchActionValue(
		touchActions.moveForward,
		y < -deadzone ? Math.abs(y) : 0,
	);
	input.setTouchActionValue(touchActions.moveBack, y > deadzone ? y : 0);
}

function endMove(event: PointerEvent): void {
	if (event.pointerId !== movePointerId) {
		return;
	}

	event.preventDefault();
	movePointerId = undefined;
	clearMove();
	releasePointer(event);
}

function clearMove(): void {
	input.setTouchActionValue(touchActions.moveLeft, 0);
	input.setTouchActionValue(touchActions.moveRight, 0);
	input.setTouchActionValue(touchActions.moveForward, 0);
	input.setTouchActionValue(touchActions.moveBack, 0);
}

function startLook(event: PointerEvent): void {
	event.preventDefault();

	if (lookPointerId !== undefined) {
		return;
	}

	lookPointerId = event.pointerId;
	lastLookX = event.clientX;
	lastLookY = event.clientY;
	input.setTouchLookActive(true);
	capturePointer(event);
}

function moveLook(event: PointerEvent): void {
	if (event.pointerId !== lookPointerId) {
		return;
	}

	event.preventDefault();
	input.addTouchLookDelta(event.clientX - lastLookX, event.clientY - lastLookY);
	lastLookX = event.clientX;
	lastLookY = event.clientY;
}

function endLook(event: PointerEvent): void {
	if (event.pointerId !== lookPointerId) {
		return;
	}

	event.preventDefault();
	lookPointerId = undefined;
	input.setTouchLookActive(false);
	releasePointer(event);
}

function capturePointer(event: PointerEvent): void {
	(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function releasePointer(event: PointerEvent): void {
	(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
}

function clampSigned(value: number): number {
	return Math.max(-1, Math.min(1, value));
}
</script>

<section class="mobile-controls" aria-label="Mobile game controls">
	<button
		type="button"
		class="move-pad"
		aria-label="Move"
		onpointerdown={startMove}
		onpointermove={updateMove}
		onpointerup={endMove}
		onpointercancel={endMove}
	>
		Move
	</button>

	<button
		type="button"
		class="look-pad"
		aria-label="Look"
		onpointerdown={startLook}
		onpointermove={moveLook}
		onpointerup={endLook}
		onpointercancel={endLook}
	>
		Look
	</button>

	<div class="action-pad" aria-label="Actions">
		<button
			type="button"
			class="control"
			aria-label="Jump"
			onpointerdown={(event) => pressAction(event, touchActions.jump)}
			onpointerup={(event) => releaseAction(event, touchActions.jump)}
			onpointercancel={(event) => releaseAction(event, touchActions.jump)}
		>
			Jump
		</button>
		<button
			type="button"
			class="control"
			aria-label="Run"
			onpointerdown={(event) => pressAction(event, touchActions.sprint)}
			onpointerup={(event) => releaseAction(event, touchActions.sprint)}
			onpointercancel={(event) => releaseAction(event, touchActions.sprint)}
		>
			Run
		</button>
		<button
			type="button"
			class="control"
			aria-label="Use"
			onpointerdown={(event) => pressAction(event, touchActions.interactPrimary)}
			onpointerup={(event) => releaseAction(event, touchActions.interactPrimary)}
			onpointercancel={(event) =>
				releaseAction(event, touchActions.interactPrimary)}
		>
			Use
		</button>
		<button
			type="button"
			class="control"
			aria-label="Charge"
			onpointerdown={(event) => pressAction(event, touchActions.chargeLight)}
			onpointerup={(event) => releaseAction(event, touchActions.chargeLight)}
			onpointercancel={(event) => releaseAction(event, touchActions.chargeLight)}
		>
			Charge
		</button>
	</div>
</section>

<style>
	.mobile-controls {
		display: none;
	}

	@media (pointer: coarse) {
		.mobile-controls {
			position: absolute;
			right: 12px;
			bottom: 12px;
			left: 12px;
			z-index: 10;
			display: grid;
			grid-template-columns: minmax(108px, 132px) minmax(88px, 1fr) minmax(
					108px,
					132px
				);
			gap: 10px;
			align-items: end;
			pointer-events: none;
			touch-action: none;
			user-select: none;
		}

		.action-pad {
			display: grid;
			gap: 8px;
			pointer-events: auto;
		}

		.action-pad {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.control,
		.look-pad,
		.move-pad {
			min-width: 0;
			border: 1px solid rgb(232 243 226 / 24%);
			border-radius: 8px;
			background: rgb(13 18 17 / 78%);
			color: #f7f3e8;
			font: inherit;
			font-size: 0.8rem;
			font-weight: 800;
			letter-spacing: 0;
			touch-action: none;
			backdrop-filter: blur(10px);
		}

		.control {
			aspect-ratio: 1;
			padding: 0;
		}

		.move-pad,
		.look-pad {
			height: 124px;
			padding: 0;
			pointer-events: auto;
		}

		.control:active,
		.move-pad:active,
		.look-pad:active {
			border-color: rgb(184 242 207 / 52%);
			background: rgb(30 51 45 / 84%);
		}
	}

	@media (pointer: coarse) and (max-width: 520px) {
		.mobile-controls {
			grid-template-columns: 112px minmax(76px, 1fr) 112px;
			gap: 8px;
		}

		.move-pad,
		.look-pad {
			height: 112px;
		}
	}
</style>
