import type { On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

/** Ten minutes is the most `$.process.run` allows. */
const SWEEP_TIMEOUT_MS = 600_000;

export const hygiene: Block = {
	id: "hygiene",
	kind: "session",
	routes: ["classic.SessionStart", "process.run"],
	needs: "2.1.314",
};

export const attachHygiene = (on: On, _context: BlockContext): void => {
	on("classic.SessionStart", { source: "startup" }, async ($, e, next) => {
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
		];
		// The sweep removes files the session does not wait on, so the start goes on without it.
		void $.process
			.run(argv, { cwd: root, timeoutMs: SWEEP_TIMEOUT_MS })
			.catch(() => undefined);
		return next(e);
	});
};
