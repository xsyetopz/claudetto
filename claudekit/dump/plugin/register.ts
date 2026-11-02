import type { On } from "claude-code";

/** The runner sets the folder; a session started by hand writes nothing. */
export const DUMPS_ENV = "CLAUDEKIT_DUMPS";

export const register = (on: On): void => {
	on("classic.PreToolUse", async ($, e, next) => {
		const dir = await $.env.get("CLAUDEKIT_DUMPS");
		if (dir) {
			const [rows, api] = await Promise.all([
				$.session.messages(),
				$.session.messages({ as: "api" }),
			]);
			await $.fs.write(
				`${dir}/${e.tool_use_id}.json`,
				JSON.stringify({ tool: e.tool, rows, api }, null, "\t"),
			);
		}
		return next(e);
	});
};
