// The mod handlers of the `search` slice (task 19.14 of change `redesign-0-4-0`):
// `session.start` registers `grep` and `glob` (as `mcp__claudetto__grep` and `mcp__claudetto__glob`) for each of `Grep` and `Glob` that the session lacks, as on a native build.
// `tool.call` serves them with the first search program that the host has, run with `$.process.run`.
// A fault of a call is a `deny` with the reason, so the model reads an error and can pick another way.

import type { EngineInterface, MatchedHook, ToolSpec } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { isRecord } from "../../../jev/domain/jev.ts";
import {
	GLOB_PROGRAMS,
	GLOB_TOOL,
	GREP_PROGRAMS,
	GREP_TOOL,
	globArgv,
	globOutput,
	grepArgv,
	grepOutput,
	parseGrep,
	probeArgv,
	SEARCH_TOOLS,
} from "../domain/search.ts";
import { PROBE_TIMEOUT_MS, SEARCH_TIMEOUT_MS } from "../limits.ts";
import { BAD_INPUT, NO_PROGRAM, RUN_FAILED } from "../prompts.ts";

/** Registers the tool for each built-in search tool that the session lacks. A list that fails registers none, so a session that has the built-in tools never gets a copy. */
const register = async ($: EngineInterface): Promise<void> => {
	const names = (await $.tool.list()).map((tool) => tool.name);
	// One after the other, in order, and a failed register stops the rest.
	const registerFrom = async (
		pending: readonly (readonly [string, ToolSpec])[],
	): Promise<void> => {
		const [first, ...rest] = pending;
		if (first === undefined) {
			return;
		}
		if (!names.includes(first[0])) {
			await $.tool.register(first[1]);
		}
		await registerFrom(rest);
	};
	await registerFrom(Object.entries(SEARCH_TOOLS));
};

// The session is bound after `next`, and `$.tool.register` rejects before, so the first prompt waits for the registration.
export const onStart: Handler<"session.start"> = async ($, e, next) => {
	const started = await next(e);
	await register($).catch(() => undefined);
	return started;
};

/** The first of `programs` that runs on the host, or `undefined`. */
const found = async <P extends string>(
	$: EngineInterface,
	programs: readonly P[],
): Promise<P | undefined> => {
	const [program, ...rest] = programs;
	if (program === undefined) {
		return undefined;
	}
	const run = await $.process
		.run(probeArgv(program), { timeoutMs: PROBE_TIMEOUT_MS })
		.catch(() => undefined);
	return run?.exitCode === 0 ? program : found($, rest);
};

/** The output of a run, or the fault. Exit 1 is no match, and a program that fails with no output is a fault. */
const ran = async (
	$: EngineInterface,
	argv: string[],
	cwd?: string,
): Promise<{ stdout: string } | { fault: string }> => {
	const run = await $.process
		.run(argv, { timeoutMs: SEARCH_TIMEOUT_MS, ...(cwd ? { cwd } : {}) })
		.catch((error: unknown) => ({
			exitCode: 2,
			stdout: "",
			stderr: String(error),
		}));
	return run.exitCode > 1 && run.stdout === ""
		? { fault: RUN_FAILED({ reason: run.stderr.trim() || "no output" }) }
		: { stdout: run.stdout };
};

const grep = async ($: EngineInterface, fields: Record<string, unknown>) => {
	const input = parseGrep(fields);
	if (typeof input === "string") {
		return { deny: input };
	}
	const program = await found($, GREP_PROGRAMS);
	if (program === undefined) {
		return { deny: NO_PROGRAM({ names: GREP_PROGRAMS.join(", ") }) };
	}
	const out = await ran($, grepArgv(program, input));
	return "fault" in out
		? { deny: out.fault }
		: { result: grepOutput(out.stdout, input) };
};

const glob = async ($: EngineInterface, fields: Record<string, unknown>) => {
	const { pattern, path } = fields;
	if (typeof pattern !== "string" || pattern === "") {
		return { deny: BAD_INPUT({ field: "pattern" }) };
	}
	if (path !== undefined && typeof path !== "string") {
		return { deny: BAD_INPUT({ field: "path" }) };
	}
	const program = await found($, GLOB_PROGRAMS);
	if (program === undefined) {
		return { deny: NO_PROGRAM({ names: GLOB_PROGRAMS.join(", ") }) };
	}
	const cwd = await $.session.cwd();
	const dir = path?.startsWith("/") ? path : `${cwd}/${path ?? ""}`;
	const out = await ran($, globArgv(program), dir);
	return "fault" in out
		? { deny: out.fault }
		: { result: globOutput(out.stdout, pattern, dir) };
};

type CallHook = MatchedHook<
	"tool.call",
	{ readonly tool: readonly [typeof GREP_TOOL, typeof GLOB_TOOL] }
>;

/** The tools of `onCall`, for its `tool.call` filter in `hooks/register.ts`. */
export const CALL_TOOLS = [GREP_TOOL, GLOB_TOOL] as const;

/** `tool.call` on `grep` and `glob`. */
export const onCall: CallHook = ($, e) => {
	const fields = isRecord(e) ? e : {};
	return e.tool === GLOB_TOOL ? glob($, fields) : grep($, fields);
};
