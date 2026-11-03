// The price bound is read from a request, not guessed: one session per arm runs against the fake Messages
// API, which costs nothing, and its first request gives the input size and the reply cap.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { startFakeApi } from "../../../claudekit/api/fake.ts";
import { fieldOf } from "../../../claudekit/api/json.ts";
import { CHARS_PER_TOKEN } from "../../../claudekit/compaction-cost/transcripts/transcripts.ts";
import type { CommandRunner } from "../../../claudekit/session/command.ts";
import { fakeApiEnv } from "../../../claudekit/session/env.ts";
import { STYLE_FILE, type StyleArm, styleArgv, styleEnv } from "./arms.ts";
import { STYLE_CASES } from "./cases.ts";

const MEASURE_MS = 120_000;

/** The first request of one session. */
export interface Measured {
	readonly chars: number;
	readonly maxTokens: number;
	/** Whether the request carries the first rule of the arm's `Concise.md`, so a swap that did not happen shows. */
	readonly carriesStyle: boolean;
}

/** The longest prompt of the cases, so the bound holds for every case. */
const LONGEST_PROMPT =
	STYLE_CASES.map((row) => row.prompt).sort((a, b) => b.length - a.length)[0] ??
	"";

/** The first line of the style body, after the front matter and the opening tag. */
const firstRule = (file: string): string =>
	file
		.split("---")
		.slice(2)
		.join("---")
		.split("\n")
		.find((line) => line.trim() !== "" && !line.startsWith("<")) ?? "";

/** The tokens of one session's request and reply, at most: the input at `CHARS_PER_TOKEN`, plus the reply cap. */
export const boundTokens = (one: Measured): number =>
	Math.ceil(one.chars / CHARS_PER_TOKEN) + one.maxTokens;

/** Runs one session of an arm against the fake API; `undefined` when no request reached it. */
export const measureArm = async (
	run: CommandRunner,
	dir: string,
	scratch: string,
): Promise<Measured | undefined> => {
	const api = startFakeApi();
	try {
		await run(styleArgv(LONGEST_PROMPT, dir), {
			cwd: join(scratch, "work"),
			env: { ...fakeApiEnv(api.url, join(scratch, "config")), ...styleEnv() },
			timeoutMs: MEASURE_MS,
		});
		const raw = api.bodies[0];
		if (raw === undefined) {
			return undefined;
		}
		const rule = firstRule(await readFile(join(dir, STYLE_FILE), "utf8"));
		const maxTokens = fieldOf(JSON.parse(raw), "max_tokens");
		return {
			chars: raw.length,
			maxTokens: typeof maxTokens === "number" ? maxTokens : 0,
			carriesStyle:
				rule !== "" && raw.includes(JSON.stringify(rule).slice(1, -1)),
		};
	} finally {
		await api.stop();
	}
};

export const measureArms = async (
	run: CommandRunner,
	dirs: Readonly<Record<StyleArm, string>>,
	scratch: string,
): Promise<Readonly<Record<StyleArm, Measured | undefined>>> => ({
	old: await measureArm(run, dirs.old, scratch),
	new: await measureArm(run, dirs.new, scratch),
});
