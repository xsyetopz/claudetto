import type { BuiltinToolName } from "claude-code";

/** The tools whose result is a file the session changed. */
export const WRITERS = [
	"Edit",
	"NotebookEdit",
	"Write",
] satisfies BuiltinToolName[];

const WRITER_NAMES: ReadonlySet<string> = new Set(WRITERS);

export const isWriter = (tool: string): boolean => WRITER_NAMES.has(tool);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** A number from 0 to 1, or undefined for anything else. */
export const probability = (x: unknown): number | undefined =>
	typeof x === "number" && x >= 0 && x <= 1 ? x : undefined;

/** The results of `step` on each item, one call finishing before the next starts, for steps that read what the one before recorded or that git locks against each other. */
export const inOrder = async <T, R>(
	items: readonly T[],
	step: (item: T) => Promise<R>,
): Promise<R[]> => {
	const [head, ...rest] = items;
	return head === undefined
		? []
		: [await step(head), ...(await inOrder(rest, step))];
};
