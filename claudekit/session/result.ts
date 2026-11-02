// A reader for the `result` of a `claude -p` run.

import { total } from "../total.ts";

/** A tool call that the permission system refused during the run. */
export interface PermissionDenial {
	readonly toolName: string;
	/** The id of the refused call, or `""` when the run did not report one. */
	readonly toolUseId: string;
	readonly toolInput: unknown;
}

/** What a run reports at its end. */
export interface RunResult {
	readonly isError: boolean;
	readonly subtype: string | undefined;
	/** The final text of the model. */
	readonly text: string;
	/** `total_cost_usd`, or `undefined` when the run did not report one. */
	readonly totalCostUsd: number | undefined;
	/** The calls the permission system refused, empty when the run reports none. */
	readonly permissionDenials: readonly PermissionDenial[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const denialOf = (value: unknown): PermissionDenial[] =>
	isRecord(value) && typeof value["tool_name"] === "string"
		? [
				{
					toolName: value["tool_name"],
					toolUseId:
						typeof value["tool_use_id"] === "string"
							? value["tool_use_id"]
							: "",
					toolInput: value["tool_input"],
				},
			]
		: [];

const resultOf = (value: Record<string, unknown>): RunResult => ({
	isError: value["is_error"] === true,
	subtype: typeof value["subtype"] === "string" ? value["subtype"] : undefined,
	text: typeof value["result"] === "string" ? value["result"] : "",
	totalCostUsd:
		typeof value["total_cost_usd"] === "number"
			? value["total_cost_usd"]
			: undefined,
	permissionDenials: Array.isArray(value["permission_denials"])
		? value["permission_denials"].flatMap(denialOf)
		: [],
});

/** The JSON in `text`, or `undefined` when it is not JSON. */
export const parsed = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
};

/** The last `result` event of the stdout of a `claude -p` run, in any of the forms `readResult` reads. */
const lastResult = (stdout: string): Record<string, unknown> | undefined => {
	const whole = parsed(stdout.trim());
	let events: unknown[];
	if (Array.isArray(whole)) {
		events = whole;
	} else if (isRecord(whole)) {
		events = [whole];
	} else {
		events = stdout.split("\n").map((line) => parsed(line.trim()));
	}
	const found = events.findLast(
		(event) => isRecord(event) && event["type"] === "result",
	);
	return isRecord(found) ? found : undefined;
};

/**
 * The `result` of the stdout of a `claude -p` run, or `undefined` when there is none. It reads
 * `--output-format json` (one object, or an array of events) and also `stream-json` (one event a line),
 * and takes the last `result` event in each.
 */
export const readResult = (stdout: string): RunResult | undefined => {
	const found = lastResult(stdout);
	return found === undefined ? undefined : resultOf(found);
};

const TOKEN_KEYS = [
	"inputTokens",
	"outputTokens",
	"cacheReadInputTokens",
	"cacheCreationInputTokens",
] as const;

const tokensOfModel = (usage: unknown): number =>
	isRecord(usage)
		? total(
				TOKEN_KEYS.map((key) => usage[key]).filter(
					(n) => typeof n === "number",
				),
			)
		: 0;

/**
 * The tokens of a `claude -p` run: the input, output, cache read, and cache write tokens of every model in
 * `modelUsage` of its last `result`, which covers subagents too. `undefined` when the run states none.
 */
export const readTokens = (stdout: string): number | undefined => {
	const usage = lastResult(stdout)?.["modelUsage"];
	return isRecord(usage)
		? total(Object.values(usage).map(tokensOfModel))
		: undefined;
};
