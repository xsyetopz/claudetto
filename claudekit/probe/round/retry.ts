const TRANSIENT = ["no result event", "exit ", "error_during_execution"];

export const worthRetry = (why: string): boolean =>
	TRANSIENT.some((cause) => why.includes(cause));
