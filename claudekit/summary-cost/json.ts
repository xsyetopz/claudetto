export const objectOf = (value: unknown): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}
	return Object.fromEntries(Object.entries(value));
};

export const parsedOf = (text: string): Record<string, unknown> => {
	try {
		return objectOf(JSON.parse(text));
	} catch {
		return {};
	}
};
