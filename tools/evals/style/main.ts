// Plan mode is the default: it prints the sessions and a token bound read from the fake API, and makes no
// model call. `--run` starts the sessions, which are paid.

import { resolve } from "node:path";
import { cwd } from "node:process";
import { shareText, weeklyShare } from "../../../claudekit/price/share.ts";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import {
	makeFolders,
	removeFolders,
} from "../../../claudekit/session/folders.ts";
import { readResult, readTokens } from "../../../claudekit/session/result.ts";
import { EVAL_MIN_RUNS_PER_ARM } from "../../limits.ts";
import {
	type Patch,
	POSITIVE_INTEGER,
	parseFlags,
} from "../classifier/main.ts";
import {
	isStyleArm,
	preparePlugins,
	STYLE_ARMS,
	type StyleArm,
	styleArgv,
	styleEnv,
} from "./arms.ts";
import { STYLE_CASES, type StyleCase } from "./cases.ts";
import { boundTokens, type Measured, measureArms } from "./measure.ts";

export const STYLE_USAGE =
	"usage: just eval --style [--run] [--case KEY] [--arm old|new] [--runs N]";

/** The tokens the user approved for a full run; a plan above it does not start. */
export const TOKEN_CAP = 1_900_000;

const SESSION_MS = 300_000;

const TEMP_PREFIX = "/tmp/claudetto-style-";

interface Options {
	readonly run: boolean;
	readonly only?: string;
	readonly arm?: StyleArm;
	readonly runs: number;
}

export interface StyleSession {
	readonly key: string;
	readonly arm: StyleArm;
	readonly run: number;
}

const withArm: Patch<Options> = (o, v) =>
	isStyleArm(v) ? { ...o, arm: v } : undefined;

const withRuns: Patch<Options> = (o, v) =>
	POSITIVE_INTEGER.test(v) ? { ...o, runs: Number(v) } : undefined;

const VALUE_FLAGS: ReadonlyMap<string, Patch<Options>> = new Map([
	["--case", (o: Options, v: string) => ({ ...o, only: v })],
	["--arm", withArm],
	["--runs", withRuns],
]);

export const parseStyleArgs = (
	args: readonly string[],
	options: Options = { run: false, runs: EVAL_MIN_RUNS_PER_ARM },
): Options | { readonly error: string } =>
	parseFlags(args, options, VALUE_FLAGS);

export const planStyle = (options: Options): readonly StyleSession[] =>
	STYLE_CASES.filter(
		(row) => options.only === undefined || row.key === options.only,
	).flatMap((row) =>
		STYLE_ARMS.filter(
			(arm) => options.arm === undefined || arm === options.arm,
		).flatMap((arm) =>
			Array.from({ length: options.runs }, (_, at) => ({
				key: row.key,
				arm,
				run: at + 1,
			})),
		),
	);

type MeasuredArms = Readonly<Record<StyleArm, Measured>>;

/** The sessions, the measured request of each arm, and the bound that follows, with its share of the week. */
export const planLines = (
	sessions: readonly StyleSession[],
	measured: MeasuredArms,
): readonly string[] => {
	let tokens = 0;
	const arms = STYLE_ARMS.flatMap((arm) => {
		const count = sessions.filter((one) => one.arm === arm).length;
		if (count === 0) {
			return [];
		}
		const each = boundTokens(measured[arm]);
		tokens += count * each;
		return [
			`arm ${arm}: ${count} sessions, first request ${measured[arm].chars} chars and max_tokens ${measured[arm].maxTokens}, at most ${each.toLocaleString("en-US")} tokens each`,
		];
	});
	return [
		...sessions.map(
			(one) => `session ${one.key} | ${one.arm} | run ${one.run}`,
		),
		...arms,
		`model: claude-opus-5-5, ${sessions.length} sessions`,
		`total: at most ${tokens.toLocaleString("en-US")} tokens, ${shareText(weeklyShare(tokens))} of the weekly limit, against an approved ${TOKEN_CAP.toLocaleString("en-US")}`,
	];
};

export const totalTokens = (
	sessions: readonly StyleSession[],
	measured: MeasuredArms,
): number => {
	let tokens = 0;
	for (const one of sessions) {
		tokens += boundTokens(measured[one.arm]);
	}
	return tokens;
};

/** One session's verdict: a reply that keeps the rule, one that breaks it, or no reply to grade. */
export interface StyleOutcome {
	readonly session: StyleSession;
	readonly verdict: "pass" | "fail" | "error";
	readonly detail: string;
	/** Absent when the session's output states no tokens. */
	readonly tokens?: number;
}

export const gradeReply = (
	row: StyleCase,
	session: StyleSession,
	stdout: string,
): StyleOutcome => {
	const result = readResult(stdout);
	const tokens = readTokens(stdout);
	const measured = tokens === undefined ? {} : { tokens };
	if (result === undefined || result.isError || result.text.trim() === "") {
		return {
			session,
			verdict: "error",
			detail: "the session gave no reply",
			...measured,
		};
	}
	const passes = row.passes(result.text);
	return {
		session,
		verdict: passes ? "pass" : "fail",
		detail: result.text.trim().slice(0, 80).replaceAll("\n", " "),
		...measured,
	};
};

export const reportLines = (
	outcomes: readonly StyleOutcome[],
): readonly string[] =>
	STYLE_CASES.flatMap((row) =>
		STYLE_ARMS.map((arm) => {
			const mine = outcomes.filter(
				(one) => one.session.key === row.key && one.session.arm === arm,
			);
			const count = (verdict: string) =>
				mine.filter((one) => one.verdict === verdict).length;
			return `${row.key} | ${arm}: ${count("pass")} pass, ${count("fail")} fail, ${count("error")} error | grader: ${row.exactness}`;
		}),
	).filter((line) => !line.includes(": 0 pass, 0 fail, 0 error"));

export const failLines = (
	outcomes: readonly StyleOutcome[],
): readonly string[] =>
	outcomes
		.filter((one) => one.verdict === "fail")
		.map(
			(one) =>
				`fail ${one.session.key} | ${one.session.arm} | run ${one.session.run} | ${one.detail}`,
		);

/** The tokens that the sessions reported, never an estimate; a session without them is named. */
export const spendLine = (outcomes: readonly StyleOutcome[]): string => {
	let tokens = 0;
	let counted = 0;
	const unmeasured: string[] = [];
	for (const { session, tokens: own } of outcomes) {
		if (own === undefined) {
			unmeasured.push(`${session.key} | ${session.arm} | run ${session.run}`);
			continue;
		}
		tokens += own;
		counted += 1;
	}
	const gap =
		unmeasured.length === 0 ? "" : `; unmeasured: ${unmeasured.join(", ")}`;
	return `measured: ${tokens.toLocaleString("en-US")} tokens in ${counted} of ${outcomes.length} sessions, ${shareText(weeklyShare(tokens))} of the weekly limit${gap}`;
};

/** Runs `sessions` one at a time, so a paid run never overlaps itself. */
const runAll = async (
	run: CommandRunner,
	dirs: Readonly<Record<StyleArm, string>>,
	work: string,
	sessions: readonly StyleSession[],
	done: readonly StyleOutcome[] = [],
): Promise<readonly StyleOutcome[]> => {
	const [next, ...rest] = sessions;
	const row = STYLE_CASES.find((one) => one.key === next?.key);
	if (next === undefined || row === undefined) {
		return done;
	}
	const ran = await run(styleArgv(row.prompt, dirs[next.arm]), {
		cwd: work,
		env: styleEnv(),
		timeoutMs: SESSION_MS,
	});
	return runAll(run, dirs, work, rest, [
		...done,
		gradeReply(row, next, ran.stdout),
	]);
};

export const styleMain = async (
	args: readonly string[],
	io: {
		readonly run: CommandRunner;
		readonly out: (line: string) => void;
		readonly root?: string;
		readonly tempPrefix?: string;
	},
): Promise<number> => {
	const options = parseStyleArgs(args);
	if ("error" in options) {
		io.out(options.error);
		io.out(STYLE_USAGE);
		return 2;
	}
	const sessions = planStyle(options);
	const folders = await makeFolders(io.tempPrefix ?? TEMP_PREFIX);
	try {
		const dirs = await preparePlugins(
			io.run,
			resolve(io.root ?? cwd()),
			folders.root,
		);
		const found = await measureArms(io.run, dirs, folders.root);
		if (found.old === undefined || found.new === undefined) {
			io.out("The fake API saw no request, so the bound is unmeasured.");
			return 1;
		}
		if (!found.old.carriesStyle || !found.new.carriesStyle) {
			io.out("A request lacks the first rule of its arm's `Concise.md`.");
			return 1;
		}
		const measured: MeasuredArms = { old: found.old, new: found.new };
		for (const line of planLines(sessions, measured)) {
			io.out(line);
		}
		if (!options.run) {
			io.out(
				"Plan only. Nothing ran. Add --run to start these sessions, which are paid.",
			);
			return 0;
		}
		if (totalTokens(sessions, measured) > TOKEN_CAP) {
			io.out(
				`The bound is above ${TOKEN_CAP.toLocaleString("en-US")} tokens, so no session started.`,
			);
			return 2;
		}
		const outcomes = await runAll(io.run, dirs, folders.work, sessions);
		for (const line of [
			...reportLines(outcomes),
			...failLines(outcomes),
			spendLine(outcomes),
		]) {
			io.out(line);
		}
		return outcomes.some((one) => one.verdict === "error") ? 1 : 0;
	} finally {
		await removeFolders(folders.root);
	}
};
