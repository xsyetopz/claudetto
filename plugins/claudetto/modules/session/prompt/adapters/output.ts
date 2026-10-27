// The mod handler of the `bash-output` rule: `session.start` sets `BASH_MAX_OUTPUT_LENGTH` for the subagents too, because a plugin `settings.json` applies only `agent` and `subagentStatusLine`.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../kernel/hooks.ts";
import { BASH_OUTPUT_MAX_CHARS } from "../limits.ts";

/** Sets the variable unless the user set it or the setting `bashOutputMaxChars`, which wins over it. */
const apply = async ($: EngineInterface): Promise<void> => {
	if (
		(await $.env.get("BASH_MAX_OUTPUT_LENGTH")) === undefined &&
		(await $.settings.read({ key: "bashOutputMaxChars" })) === undefined
	) {
		await $.env.set("BASH_MAX_OUTPUT_LENGTH", String(BASH_OUTPUT_MAX_CHARS));
	}
};

/** `session.start`: sets the bound of the `Bash` result. A refusal before the session is bound is tried again after `next`, as `onDiffEnv` does. */
export const onOutputEnv: Handler<"session.start"> = async ($, e, next) => {
	let early = true;
	try {
		await apply($);
	} catch {
		early = false;
	}
	const started = await next(e);
	if (!early) {
		await apply($).catch(() => undefined);
	}
	return started;
};
