import { boundText } from "./cut.ts";

const STREAMS = ["stdout", "stderr"] as const;

type Streams = Record<(typeof STREAMS)[number], string | undefined>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const streamsOf = (result: unknown): Streams | undefined => {
	if (!isRecord(result)) {
		return undefined;
	}
	const [out, err] = STREAMS.map((name) => result[name]);
	return {
		stdout: typeof out === "string" ? out : undefined,
		stderr: typeof err === "string" ? err : undefined,
	};
};

/** The whole text a result carries, which is what the file holds; `undefined` for a shape with no text. */
export const fullTextOf = (result: unknown): string | undefined => {
	if (typeof result === "string") {
		return result;
	}
	const streams = streamsOf(result);
	if (streams === undefined) {
		return undefined;
	}
	const parts = STREAMS.flatMap((name) => streams[name] ?? []);
	return parts.length === 0 ? undefined : parts.join("\n");
};

/** Cuts each stream alone, so a long `stdout` does not take the room of a short `stderr`. Every other field keeps its value, `isError` and the exit status included. */
export const boundResult = (
	result: unknown,
	limit: number,
	saved: string | undefined,
): unknown => {
	if (typeof result === "string") {
		return boundText(result, limit, saved);
	}
	if (!isRecord(result)) {
		return result;
	}
	const cut: Record<string, unknown> = { ...result };
	for (const name of STREAMS) {
		const text = result[name];
		if (typeof text === "string") {
			cut[name] = boundText(text, limit, saved);
		}
	}
	return cut;
};
