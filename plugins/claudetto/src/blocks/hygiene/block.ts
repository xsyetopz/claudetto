import type { On, PluginOptions } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

/** Ten minutes is the most `$.process.run` allows. */
const SWEEP_TIMEOUT_MS = 600_000;

export const hygiene: Block = {
	id: "hygiene",
	kind: "session",
	routes: ["classic.SessionStart", "process.run"],
	needs: "2.1.314",
};

/** The option as the flag that carries it. Only a whole number of 0 or more passes, and 0 turns the kind off. */
const FLAGS = [
	["handoffCleanupPeriodDays", "--handoff-days"],
	["sessionTempCleanupPeriodDays", "--session-days"],
	["probeCleanupPeriodMinutes", "--probe-minutes"],
] as const;

const kindFlags = (options: PluginOptions): string[] =>
	FLAGS.flatMap(([key, flag]) => {
		const value = options[key];
		return typeof value === "number" && Number.isInteger(value) && value >= 0
			? [flag, String(value)]
			: [];
	});

export const attachHygiene = (on: On, context: BlockContext): void => {
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
		if (context.options["hygieneEnabled"] === false) {
			return next(e);
		}
		const [session, root, days] = await Promise.all([
			$.session.id(),
			$.session.root(),
			$.settings.read({ key: "cleanupPeriodDays" }).catch(() => undefined),
		]);
		const argv = [
			`${$.plugin.root}/bin/claudetto-hygiene`,
			"--session",
			session,
			...(typeof days === "number" ? ["--days", String(days)] : []),
			...kindFlags(context.options),
		];
		// The sweep removes files the session does not wait on, so the start goes on without it.
		void $.process
			.run(argv, { cwd: root, timeoutMs: SWEEP_TIMEOUT_MS })
			.catch(() => undefined);
		return next(e);
	});
};
