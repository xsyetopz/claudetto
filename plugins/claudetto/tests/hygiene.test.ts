// Lab tests of the `hygiene` `session.start` hook (spec `session-hygiene`, "Cleanup at Start" and "Leaked Probe Folders").
// The stub of `process.run` stands for `find` and for the cleanup script, and the session starts before the stub answers, so the hook does not hold the first prompt.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

interface Out {
	probes: string;
	cleanup: string;
}
const NONE: Out = { probes: "", cleanup: "" };
/** Stubs core, the settings, and the two runs: `find` gives `probes`, and the cleanup script gives `cleanup`. A run answers only at `release()`. */
const engine = (on: On, out: Out, days?: unknown) => {
	const seen: { argvs: (readonly string[])[]; logs: string[] } = {
		argvs: [],
		logs: [],
	};
	const { promise: done, resolve: release } = Promise.withResolvers<void>();
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("env.get", (_$, e) => ({
		value: { HOME: "/home/u", CLAUDE_CODE_TMPDIR: "/tmp" }[e.name],
	}));
	const dir = {
		kind: "dir",
		size: 0,
		mtimeMs: 0,
		realPath: "/private/tmp",
	} as const; // As on macOS, `/tmp` leads here, so the cleanup runs once.
	on("fs.stat", (_$, e) => ({ value: { ...dir, isLink: e.path === "/tmp" } }));
	on("session.root", () => ({ value: "/proj" }));
	on("session.id", () => ({ value: "sid" }));
	on("settings.read", () => ({
		value: days === undefined ? {} : { cleanupPeriodDays: days },
	}));
	on("process.run", async (_$, e) => {
		seen.argvs.push(e.argv);
		await done;
		return ran(e.argv.join(" ").includes("-mmin") ? out.probes : out.cleanup);
	});
	on("ui.log", (_$, e) => {
		seen.logs.push(e.text);
		return { value: undefined };
	});
	return { seen, release };
};
const start = ($: Engine) =>
	$.session.start({ cwd: "/proj", surface: "terminal", isInteractive: true });

// Lets the sweep, which the hook does not wait for, end.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Starts the session, lets the sweep end, and gives what the sweep did and the start result. */
const swept = async ($: Engine, on: On, out: Out, days?: unknown) => {
	const { seen, release } = engine(on, out, days);
	const started = await start($);
	release();
	await settle();
	return { ...seen, started };
};

test("with nothing to remove, the session starts and nothing is logged", async ($: Engine, on: On) => {
	const seen = await swept($, on, { probes: "", cleanup: "unknown\t0\n" });
	expect(seen.started).toStrictEqual({ cwd: "/proj" });
	expect(seen.argvs[0]?.[0]).toBe("sh");
	expect(seen.logs).toStrictEqual([]);
});

test("the session starts before the cleanup ends, and the cleanup logs what it removed", async ($: Engine, on: On) => {
	const t = "/tmp/claude-501";
	const { seen, release } = engine(on, {
		probes: `${t}/fswatch-probe-a\n${t}/fswatch-probe-b\n`,
		cleanup: `dir\t2048\t${t}/p/s1\nfile\t1024\t/tmp/claudetto/x/s2.log\nworktree\t/proj/.claude/worktrees/w\nunknown\t0\n`,
	});
	expect(await start($)).toStrictEqual({ cwd: "/proj" });
	expect(seen.logs).toStrictEqual([]);
	release();
	await settle();
	expect(seen.logs).toStrictEqual([
		"claudetto cleanup removed 1 folder, 1 file, 1 worktree, 2 leftover `fswatch-probe-*` folders of Claude Code (anthropics/claude-code#104170) of 3 KB.",
	]);
});

test("Unknown Folder: a kept worktree and an entry that no rule names show no message", async ($: Engine, on: On) => {
	const cleanup = "kept\tunmerged\t/proj/.claude/worktrees/u\nunknown\t3\n";
	expect((await swept($, on, { ...NONE, cleanup })).logs).toStrictEqual([]);
});

test("Removed Folders: one folder of 2 MB gives the notice `removed 1 folder` with the size", async ($: Engine, on: On) => {
	const cleanup = "dir\t2097152\t/tmp/claude-501/p/s1\nunknown\t0\n";
	expect((await swept($, on, { ...NONE, cleanup })).logs).toStrictEqual([
		"claudetto cleanup removed 1 folder of 2 MB.",
	]);
});

test("the age is `cleanupPeriodDays` of Claude Code, and 30 when it is not set", async ($: Engine, on: On) => {
	const { argvs } = await swept($, on, NONE);
	expect(argvs.at(-1)?.at(-2)).toBe("30");
});

test("the age follows `cleanupPeriodDays` when it is a whole number over 0", async ($: Engine, on: On) => {
	const { argvs } = await swept($, on, NONE, 7);
	expect(argvs.at(-1)?.at(-2)).toBe("7");
});
