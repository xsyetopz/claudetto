// Reading untyped JSON: a config file, a request body, or an answer of the API. Each of these is
// text from outside the program, so it is read as `unknown` and narrowed here rather than asserted.

/** The object of a value that should be one, so a value that is missing or broken reads as empty. */
export const objectOf = (value: unknown): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}
	return Object.fromEntries(Object.entries(value));
};

/** The object of a JSON text, or an empty object when the text is not an object. */
export const parsedOf = (text: string): Record<string, unknown> => {
	try {
		return objectOf(JSON.parse(text));
	} catch {
		return {};
	}
};
