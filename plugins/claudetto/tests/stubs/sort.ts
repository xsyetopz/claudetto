// The order of `Array.prototype.sort` with no compare function, which the lab tests of several slices share.

/** Orders strings by UTF-16 code unit, as `sort()` does with no compare function. */
export const byCode = (a: string, b: string): number =>
	Number(a > b) - Number(a < b);
