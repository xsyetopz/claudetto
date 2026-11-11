// With `CLAIM_CHECK_JOB` set to a job file, `session.start` runs the claim-check scoring on the engine's `$` and returns when it is done.
// The engine counts only a hook's own code against its time budget, never a `$` call, so a run of many minutes in model calls stays inside it.
import type { On } from "claude-code";

import { jobOf, runJob } from "./score.ts";

export const register = (on: On): void => {
	on("session.start", async ($, e, next) => {
		const out = await next(e);
		const path = await $.env.get("CLAIM_CHECK_JOB");
		if (path === undefined || path === "") {
			return out;
		}
		await runJob($, jobOf(await $.fs.read(path)));
		return out;
	});
};
