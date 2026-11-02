export const clamp = (value: number, low: number, high: number): number =>
	Math.min(Math.max(value, low), high);
