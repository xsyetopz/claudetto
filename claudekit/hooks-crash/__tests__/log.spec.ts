import { describe, expect, test } from "bun:test";
import { crashLines } from "../log.ts";

describe("crashLines", () => {
	test("keeps the lines where the CLI says the hooks worker crashed, died, or turned a plugin off", () => {
		const log = `2026-11-03T10:00:00.000Z [DEBUG] hooks worker: loaded (worker) claudetto
2026-11-03T10:01:00.000Z [WARN] no answer to a heartbeat within 5000ms: the hooks worker is wedged (a hook spinning without yielding)
2026-11-03T10:01:01.000Z [WARN] hooks worker: the heartbeat verdict names claudetto turn.step
2026-11-03T10:01:02.000Z [ERROR] the hooks worker died: SIGKILL
2026-11-03T10:01:03.000Z [WARN] claudetto was unloaded: it crashed the hooks worker
2026-11-03T10:01:04.000Z [DEBUG] tool.call settled in 3ms`;

		expect(crashLines(log)).toEqual([
			"2026-11-03T10:01:00.000Z [WARN] no answer to a heartbeat within 5000ms: the hooks worker is wedged (a hook spinning without yielding)",
			"2026-11-03T10:01:01.000Z [WARN] hooks worker: the heartbeat verdict names claudetto turn.step",
			"2026-11-03T10:01:02.000Z [ERROR] the hooks worker died: SIGKILL",
			"2026-11-03T10:01:03.000Z [WARN] claudetto was unloaded: it crashed the hooks worker",
		]);
	});

	test("finds nothing in a log of a session whose hooks ran", () => {
		expect(
			crashLines(`hooks worker: loaded (worker) claudetto
respawn later
`),
		).toEqual([]);
	});
});
