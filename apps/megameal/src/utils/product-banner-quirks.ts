import type { Quirk } from "../types/store-scene";

export interface PriceDriftQuirkConfig {
	intervalMs: number;
	minPrice: number;
	maxPrice: number;
}

export interface AddToCartRefusalQuirkConfig {
	message: string;
	resetMs: number;
}

export function getQuirk(
	quirks: Quirk[] | undefined,
	name: string,
): Quirk | undefined {
	return quirks?.find((quirk) => quirk.name === name);
}

function numberParam(
	quirk: Quirk | undefined,
	key: string,
	fallback: number,
): number {
	const value = quirk?.params?.[key];
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringParam(
	quirk: Quirk | undefined,
	key: string,
	fallback: string,
): string {
	const value = quirk?.params?.[key];
	return typeof value === "string" && value.trim().length > 0
		? value
		: fallback;
}

export function getPriceDriftQuirk(
	quirks: Quirk[] | undefined,
	basePrice?: number,
): PriceDriftQuirkConfig | null {
	const quirk = getQuirk(quirks, "price-drift");
	if (!quirk || typeof basePrice !== "number" || !Number.isFinite(basePrice)) {
		return null;
	}

	const minPrice = numberParam(
		quirk,
		"minPrice",
		Math.max(0.01, basePrice - 1.75),
	);
	const maxPrice = numberParam(quirk, "maxPrice", basePrice + 1.75);

	return {
		intervalMs: Math.max(10000, numberParam(quirk, "intervalMs", 1000)),
		minPrice: Math.min(minPrice, maxPrice),
		maxPrice: Math.max(minPrice, maxPrice),
	};
}

export function getAddToCartRefusalQuirk(
	quirks: Quirk[] | undefined,
): AddToCartRefusalQuirkConfig | null {
	const quirk = getQuirk(quirks, "add-to-cart-refuses");
	if (!quirk) return null;

	return {
		message: stringParam(
			quirk,
			"message",
			"Regional fulfillment denied. This item cannot be added at this time.",
		),
		resetMs: Math.max(1200, numberParam(quirk, "resetMs", 2400)),
	};
}
