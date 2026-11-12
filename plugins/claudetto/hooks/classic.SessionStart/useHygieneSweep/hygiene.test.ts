import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { deferred } from "../../tools";

const ok = {
	exitCode: 0,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false,
};

/** Each hygiene process the start launched, as its argv and cwd; `run` answers the process. */
const lab = (
	on: On,
	days?: number,
	run: () => Promise<typeof ok> = () => Promise.resolve(ok),
) => {
	const launched: { argv: readonly string[]; cwd: string | undefined }[] = [];
	mock.store(on, {});
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: {
			version: "2.1.318",
			base: "2.1.318",
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("env.get", () => ({ value: undefined }));
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/repo" }));
	on("settings.read", () => ({
		value: days === undefined ? {} : { cleanupPeriodDays: days },
	}));
	on("fs.exists", () => ({ value: false }));
	on("process.run", async (_$, e) => {
		if (e.argv[0]?.endsWith("claudetto-hygiene") === true) {
			launched.push({ argv: e.argv, cwd: e.init?.cwd });
			return { value: await run() };
		}
		return { value: ok };
	});
	return launched;
};

const start = ($: Engine, source: "startup" | "resume" | "compact") =>
	$.classic.SessionStart({ source, transcript_path: "/t.jsonl" });

test("a startup runs the sweep in the project with the session id and cleanupPeriodDays", async ($: Engine, on: On) => {
	const launched = lab(on, 14);

	await start($, "startup");

	expect(launched).toHaveLength(1);
	expect(launched[0]?.cwd).toBe("/repo");
	expect(launched[0]?.argv.slice(1)).toEqual([
		"--session",
		"s-1",
		"--days",
		"14",
		"--probe-minutes",
		"60",
		"--trash-days",
		"7",
	]);
});

test("an unset cleanupPeriodDays passes no --days", async ($: Engine, on: On) => {
	const launched = lab(on);

	await start($, "startup");

	expect(launched[0]?.argv).not.toContain("--days");
});

test("the start returns while the sweep still runs", async ($: Engine, on: On) => {
	const sweep = deferred<typeof ok>();
	const launched = lab(on, undefined, () => sweep.promise);

	await start($, "startup");

	expect(launched).toHaveLength(1);
	sweep.resolve(ok);
});

test("a failed sweep does not fail the start", async ($: Engine, on: On) => {
	const launched = lab(on, undefined, () =>
		Promise.reject(new Error("exit 1")),
	);

	await start($, "startup");

	expect(launched).toHaveLength(1);
});

test("a resume and a compaction run the sweep too, so a session that lasts days still sweeps", async ($: Engine, on: On) => {
	const launched = lab(on);

	await start($, "resume");
	await start($, "compact");

	expect(launched).toHaveLength(2);
});

test(
	"the retention options go to the process as flags, and 0 is passed as off",
	{
		options: {
			sessionTempCleanupPeriodDays: 3,
			probeCleanupPeriodMinutes: 15,
			trashCleanupPeriodDays: 0,
		},
	},
	async ($: Engine, on: On) => {
		const launched = lab(on);

		await start($, "startup");

		expect(launched[0]?.argv.join(" ")).toContain(
			"--session-days 3 --probe-minutes 15 --trash-days 0",
		);
	},
);

test(
	"hygieneEnabled false starts no process",
	{ options: { hygieneEnabled: false } },
	async ($: Engine, on: On) => {
		const launched = lab(on);

		await start($, "startup");

		expect(launched).toEqual([]);
	},
);
