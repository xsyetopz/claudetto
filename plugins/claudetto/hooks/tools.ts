import type { BuiltinToolName } from "claude-code";

/** The tools whose result is a file the session changed. */
export const WRITERS = [
	"Edit",
	"NotebookEdit",
	"Write",
] satisfies BuiltinToolName[];

const WRITER_NAMES: ReadonlySet<string> = new Set(WRITERS);

export const isWriter = (tool: string): boolean => WRITER_NAMES.has(tool);

/** `Promise.withResolvers` without `reject`, which `claude plugin validate` cannot type: it checks against the `es2023` library. */
export const deferred = <T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
} => {
	// A `Promise` runs its executor before the constructor returns, so `settle` is set by the `return`.
	let settle!: (value: T) => void;
	const promise = new Promise<T>((resolve) => {
		settle = resolve;
	});
	return { promise, resolve: settle };
};

/** Reads a stream to its end, as `Array.fromAsync` does, for the same `es2023` reason. */
export const collect = async <T>(stream: AsyncIterable<T>): Promise<T[]> => {
	const items: T[] = [];
	for await (const item of stream) {
		items.push(item);
	}
	return items;
};

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
