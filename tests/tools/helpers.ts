// The shared helpers of the tests of `tools/`: whether a path exists with no blocking call, and a value that is not `undefined`.

import { exists } from "../../tools/exists.ts";

/** True when `target` exists, as a file, a folder, or a link that resolves. */
export const pathExists = (target: string): Promise<boolean> => exists(target);

/** `value`, or a thrown error when it is `undefined`, so a test reads an item of a list with no type assertion. */
export const defined = <T>(value: T | undefined, what = "the value"): T => {
	if (value === undefined) {
		throw new Error(`${what} is missing`);
	}
	return value;
};
