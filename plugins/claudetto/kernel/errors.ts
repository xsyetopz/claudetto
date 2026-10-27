// The error policy: a `catch` names the errors that it expects and passes the others on. No import.

/** The `code` values of a path that names no file. */
export const ABSENT = ["ENOENT", "ENOTDIR"];

/** True when `err` has a `code` or a `name` in `kinds`. */
export const isExpected = (err: unknown, ...kinds: string[]): boolean => {
	if (typeof err !== "object" || err === null) {
		return false;
	}
	const code = "code" in err ? err.code : undefined;
	const name = "name" in err ? err.name : undefined;
	return kinds.some((kind) => code === kind || name === kind);
};

export const rethrowUnless = (err: unknown, ...kinds: string[]): void => {
	if (!isExpected(err, ...kinds)) {
		throw err;
	}
};
