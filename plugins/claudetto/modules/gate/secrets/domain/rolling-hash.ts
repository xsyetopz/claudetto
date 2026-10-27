// The rolling hash of the first characters of a value, whose first `ENV_HEAD_BITS` bits are the head of a record.

import { ENV_HEAD_BITS } from "../../limits.ts";

export const HEAD_MASK = 2 ** ENV_HEAD_BITS - 1;

/** The first `ENV_HEAD_BITS` bits of the 32-bit hash `h`, as a number that is not negative. */
export const headOf = (h: number): number => ((h >>> 0) & HEAD_MASK) >>> 0;

export const ROLL = 16_777_619;

/** The first `ENV_HEAD_BITS` bits of the rolling hash of `text`. */
export const head = (text: string): number => {
	let h = 0;
	for (let i = 0; i < text.length; i++) {
		h = (Math.imul(h, ROLL) + text.charCodeAt(i) + 1) | 0;
	}
	return headOf(h);
};
