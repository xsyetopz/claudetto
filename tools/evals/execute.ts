// A failure to set up or to run is an `error` score, never a pass or a fail of the case.

import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	CommandResult,
	CommandRunner,
} from "../../claudekit/session/command.ts";
import { removeFolders } from "../../claudekit/session/folders.ts";
import { readResult, readTokens } from "../../claudekit/session/result.ts";
import { seedFixture } from "./fixture.ts";
import type { Session } from "./plan.ts";
import { type Score, scoreTree } from "./score.ts";
import { runSession } from "./session.ts";

/** `/tmp`, not `tmpdir()`, so a session sees a path of one length on any machine. */
const TEMP_PREFIX = "/tmp/claudetto-eval-";

const GRADER_MS = 120_000;

export interface Deps {
	readonly run: CommandRunner;
	readonly fixturesRoot: string;
	readonly pluginDir: string;
	readonly model?: string;
	readonly maxBudgetUsd?: number;
	/** Lets a test keep its folders under `tmpdir()`, where a sandbox allows writes. */
	readonly tempPrefix?: string;
}

/** What one session cost, read from its `result` before its folder goes. */
export interface Spend {
	readonly tokens: number;
	readonly costUsd: number;
}

export interface Outcome {
	readonly session: Session;
	readonly score: Score;
	/** Absent when the session's output holds no `result` with usage. */
	readonly spend?: Spend;
}

const spendOf = (ran: CommandResult): { spend?: Spend } => {
	const tokens = readTokens(ran.stdout);
	const costUsd = readResult(ran.stdout)?.totalCostUsd;
	return tokens === undefined || costUsd === undefined
		? {}
		: { spend: { tokens, costUsd } };
};

const errorOf = (session: Session, detail: string): Outcome => ({
	session,
	score: { verdict: "error", detail },
});

/** Seeds, runs, and grades one session inside `root`. */
const gradeIn = async (
	root: string,
	deps: Deps,
	session: Session,
): Promise<Outcome> => {
	const repo = join(root, "repo");
	const seeded = await seedFixture(deps.run, {
		root: deps.fixturesRoot,
		key: session.key,
		dest: repo,
	});
	if (seeded.kind === "failed") {
		return errorOf(session, seeded.reason);
	}
	const ran = await runSession(deps.run, session.arm, {
		prompt: seeded.prompt,
		pluginDir: deps.pluginDir,
		cwd: repo,
		...(deps.model === undefined ? {} : { model: deps.model }),
		...(deps.maxBudgetUsd === undefined
			? {}
			: { maxBudgetUsd: deps.maxBudgetUsd }),
	});
	const spend = spendOf(ran);
	if (ran.timedOut || ran.code === undefined) {
		return { ...errorOf(session, "the session did not finish"), ...spend };
	}
	const transcript = join(root, "transcript.jsonl");
	await writeFile(transcript, ran.stdout);
	const [program, ...rest] = seeded.grader;
	if (program === undefined) {
		return { ...errorOf(session, "the fixture names no grader"), ...spend };
	}
	const graded = await deps.run([program, ...rest], {
		cwd: repo,
		env: { EVAL_TRANSCRIPT: transcript },
		timeoutMs: GRADER_MS,
	});
	return { session, score: scoreTree(graded), ...spend };
};

/**
 * The score is all a caller keeps: the grader has read the repository and the transcript by the time it returns,
 * so the root goes with the run, on a throw too.
 */
export const executeSession = async (
	deps: Deps,
	session: Session,
): Promise<Outcome> => {
	const root = await mkdtemp(deps.tempPrefix ?? TEMP_PREFIX);
	try {
		return await gradeIn(root, deps, session);
	} finally {
		await removeFolders(root);
	}
};
