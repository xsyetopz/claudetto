import type { On, PluginOptions } from "claude-code";
import { numberOption, switchOption } from "./options.ts";

/** Ten minutes is the most `$.process.run` allows. */
const SWEEP_TIMEOUT_MS = 600_000;

/** The option as the flag that carries it. A number of 0 or more passes, and 0 turns the kind off. */
const FLAGS = [
	["handoffCleanupPeriodDays", "--handoff-days"],
	["sessionTempCleanupPeriodDays", "--session-days"],
	["probeCleanupPeriodMinutes", "--probe-minutes"],
	["trashCleanupPeriodDays", "--trash-days"],
] as const;

export const hygiene = (on: On, options: PluginOptions): void => {
	const flags = FLAGS.flatMap(([key, flag]) => {
		const value = numberOption(options, key, undefined, 0);
		return value === undefined ? [] : [flag, String(Math.trunc(value))];
	});
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		if (switchOption(options, "hygieneEnabled")) {
			const [session, root, days] = await Promise.all([
				$.session.id(),
				$.session.root(),
				$.settings.read({ key: "cleanupPeriodDays" }).catch(() => undefined),
			]);
			// The sweep removes files the session does not wait on, so the start goes on without it.
			void $.process
				.run(
					[
						`${$.plugin.root}/bin/claudetto-hygiene`,
						"--session",
						session,
						...(typeof days === "number" ? ["--days", String(days)] : []),
						...flags,
					],
					{ cwd: root, timeoutMs: SWEEP_TIMEOUT_MS },
				)
				.catch(() => undefined);
		}
		return next(e);
	});
};
