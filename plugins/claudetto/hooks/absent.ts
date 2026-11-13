/** Whether `error` says a path is absent, which is an answer and needs no log line. */
export const isAbsent = (error: unknown): boolean =>
	String(error).includes("ENOENT");
