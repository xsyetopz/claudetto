/** A plain object copied from `value`, or `{}` for anything else, so a read never throws on a shape it did not expect. */
export const objectOf = (value: unknown): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}
	return Object.fromEntries(Object.entries(value));
};

/** `objectOf` of the parsed `text`, or `{}` when `text` is not JSON. */
export const parsedOf = (text: string): Record<string, unknown> => {
	try {
		return objectOf(JSON.parse(text));
	} catch {
		return {};
	}
};

/** The value at `key` of an object or an array, or `undefined` for any other `value`. */
export const fieldOf = (value: unknown, key: string): unknown =>
	typeof value === "object" && value !== null && key in value
		? Reflect.get(value, key)
		: undefined;
