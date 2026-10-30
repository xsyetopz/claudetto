// One session end to end: seed a scratch repository, run the session in it, grade the tree it left.
// A failure to set up or to run is an `error` score, never a pass or a fail of the case.

import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CommandRunner } from "./command.ts";
import { seedFixture } from "./fixture.ts";
import type { Session } from "./plan.ts";
import { type Score, scoreTree } from "./score.ts";
import { runSession } from "./session.ts";

/**
 * The prefix of each session's folder. It is `/tmp` and not `tmpdir()`, so the path a session sees
 * has one length on any machine, as `tools/capture/run.ts` does.
 */
const TEMP_PREFIX = "/tmp/claudetto-eval-";

/** How long a grader command may run. */
const GRADER_MS = 120_000;

/** What `executeSession` needs from outside: the command runner, the fixtures folder, the plugin folder, and the optional model and spend cap passed to each session. */
export interface Deps {
	readonly run: CommandRunner;
	readonly fixturesRoot: string;
	readonly pluginDir: string;
	readonly model?: string;
	readonly maxBudgetUsd?: number;
}

/** The session that ran and its score. */
export interface Outcome {
	readonly session: Session;
	readonly score: Score;
}

const errorOf = (session: Session, detail: string): Outcome => ({
	session,
	score: { verdict: "error", detail },
});

/** Runs `session` and returns its score. The transcript lands in the session's folder as `transcript.jsonl`. */
export const executeSession = async (
	deps: Deps,
	session: Session,
): Promise<Outcome> => {
	const root = await mkdtemp(TEMP_PREFIX);
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
	if (ran.timedOut || ran.code === undefined) {
		return errorOf(session, "the session did not finish");
	}
	const transcript = join(root, "transcript.jsonl");
	await writeFile(transcript, ran.stdout);
	const [program, ...rest] = seeded.grader;
	if (program === undefined) {
		return errorOf(session, "the fixture names no grader");
	}
	const graded = await deps.run([program, ...rest], {
		cwd: repo,
		env: { EVAL_TRANSCRIPT: transcript },
		timeoutMs: GRADER_MS,
	});
	return { session, score: scoreTree(graded) };
};
