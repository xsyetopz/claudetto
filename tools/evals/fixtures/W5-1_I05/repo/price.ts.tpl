const KG_PER_UNIT = 0.4;
const ZONE_FACTOR = 1.5;
const RATE_PER_KG = 3.5;

export const price = (qty: number): number =>
	qty * KG_PER_UNIT * ZONE_FACTOR * RATE_PER_KG;
