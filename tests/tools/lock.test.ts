// Behavior of the eval lock: one run at a time, a stale lock is taken, and a failed check keeps the lock.
// Each test works in its own folder under `TMPDIR`.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import {
	file as bunFile,
	spawn as bunSpawn,
	write as bunWrite,
	sleep,
} from "bun";
import {
	HELD_CODE,
	LOCKS,
	pidsOf,
	runLocked,
	TOOL_ERROR_CODE,
	takeLock,
} from "../../tools/lock.ts";
import { REPO } from "../support/repo.ts";
import { defined, pathExists } from "./helpers.ts";

const CHECK_RE = / check$/;
const N_4242_RE = /^4242 /;

const lockIn = async (): Promise<string> =>
	path.join(
		await mkdtemp(path.join(defined(process.env["TMPDIR"], "TMPDIR"), "lock-")),
		"results/.eval.lock",
	);

/** Takes the lock `file` as the run `4242`, and gives the lock and the text of the file. It throws when another run holds the lock. */
const takeFree = async (file: string) => {
	const lock = await takeLock(file, 4242);
	if (!("release" in lock)) {
		throw new Error("the lock has a holder");
	}
	return { lock, text: await bunFile(file).text() };
};

/** The process id of a process that has ended. */
const gonePid = async (): Promise<number> => {
	const child = bunSpawn([process.execPath, "-e", "0"]);
	await child.exited;
	return child.pid;
};

/** The text of the lock `file` once it names 2 processes, the run and its command, or after `tries` checks 50 ms apart. */
const lockText = async (file: string, tries = 100): Promise<string> => {
	const text = (await pathExists(file)) ? await bunFile(file).text() : "";
	if (pidsOf(text).length >= 2 || tries <= 0) {
		return text;
	}
	await sleep(50);
	return lockText(file, tries - 1);
};

test("a free lock is taken, and the release removes it", async () => {
	const file = await lockIn();
	const { lock, text } = await takeFree(file);
	expect(text).toMatch(N_4242_RE);
	await lock.release();
	expect(await pathExists(file)).toBe(false);
});

test("a second run gets the holder while the first run is alive", async () => {
	const file = await lockIn();
	const first = await takeLock(file, process.pid);
	const second = await takeLock(file, 4242);
	expect("holder" in second).toBeTruthy();
	if (!("holder" in second)) {
		throw new Error("the second run took the lock");
	}
	expect(second.holder).toMatch(new RegExp(`^${process.pid} `));
	expect("release" in first).toBeTruthy();
	if (!("release" in first)) {
		throw new Error("the first run got a holder");
	}
	await first.release();
});

test("a lock whose process is gone is stale, and the next run takes it", async () => {
	const file = await lockIn();
	const gone = await gonePid();
	await mkdir(path.dirname(file), { recursive: true });
	await bunWrite(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
	const { text } = await takeFree(file);
	expect(text).toMatch(N_4242_RE);
});

test("a lock of another user's live process counts as held", async () => {
	// Process 1 is alive, and a signal to it fails with `EPERM`, not `ESRCH`.
	const file = await lockIn();
	await mkdir(path.dirname(file), { recursive: true });
	await bunWrite(file, "1 2026-10-10T00:00:00.000Z\n");
	expect("holder" in (await takeLock(file, 4242))).toBeTruthy();
});

test("two runs that find a stale lock at the same time give one owner (review row 122)", async () => {
	const file = await lockIn();
	await mkdir(path.dirname(file), { recursive: true });
	const gone = await gonePid();
	await bunWrite(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
	// Both process ids are alive, so the lock of the first run is not stale for the second run.
	const [a, b] = await Promise.all([
		takeLock(file, process.pid),
		takeLock(file, process.ppid),
	]);
	expect(["release" in a, "release" in b].filter(Boolean)).toHaveLength(1);
	const run = `import { takeLock } from ${JSON.stringify(path.join(REPO, "tools/lock.ts"))};
const lock = await takeLock(${JSON.stringify(file)});
console.log("release" in lock ? "owner" : "holder");
if ("release" in lock) { await Bun.sleep(1000); await lock.release(); }`;
	await bunWrite(file, `${gone} 2026-10-10T00:00:00.000Z\n`);
	const runs = Array.from({ length: 6 }, () =>
		bunSpawn([process.execPath, "-e", run], { stdout: "pipe" }),
	);
	const outs = await Promise.all(
		runs.map(async (r) => (await new Response(r.stdout).text()).trim()),
	);
	expect(outs.filter((out) => out === "owner")).toHaveLength(1);
});

test("a release removes only the lock of its own run (review row 122)", async () => {
	const file = await lockIn();
	const first = await takeLock(file, 111);
	if (!("release" in first)) {
		throw new Error("the lock has a holder");
	}
	await bunWrite(file, `${process.pid} 2026-10-10T00:00:00.000Z\n`);
	await first.release();
	expect(await pathExists(file)).toBe(true);
});

test("the lock holds while the command of a stopped run lives (review row 123)", async () => {
	const file = await lockIn();
	const run = `import { runLocked } from ${JSON.stringify(path.join(REPO, "tools/lock.ts"))};
process.exit(await runLocked(${JSON.stringify(file)}, [process.execPath, "-e", "await Bun.sleep(30000)"]));`;
	const wrapper = bunSpawn([process.execPath, "-e", run]);
	const text = await lockText(file);
	const [, child] = pidsOf(text);
	if (child === undefined) {
		throw new Error(`the lock names no command: ${text}`);
	}
	try {
		wrapper.kill("SIGTERM");
		await wrapper.exited;
		expect("holder" in (await takeLock(file, 4242))).toBeTruthy();
	} finally {
		process.kill(child, "SIGTERM");
	}
});

test("the lock file holds the PID and the owner, and a second run sees both (I17)", async () => {
	const file = await lockIn();
	const first = await takeLock(file, process.pid, "check");
	if (!("release" in first)) {
		throw new Error("the lock has a holder");
	}
	const text = await bunFile(file).text();
	expect(text).toMatch(new RegExp(`^${process.pid} \\S+ check\n$`));
	const second = await takeLock(file, 4242, "eval");
	if (!("holder" in second)) {
		throw new Error("the second run took the lock");
	}
	expect(second.holder).toMatch(CHECK_RE);
	await first.release();
});

test("the locks of `eval` and `check` are two files", () => {
	expect(
		Object.keys(LOCKS).sort((a, b) => Number(a > b) - Number(a < b)),
	).toStrictEqual(["check", "eval"]);
	expect(LOCKS["check"]).not.toBe(LOCKS["eval"]);
});

test("a run that finds the lock held exits with `HELD_CODE`, and the command does not run", async () => {
	const file = await lockIn();
	const first = await takeLock(file, process.pid, "check");
	if (!("release" in first)) {
		throw new Error("the lock has a holder");
	}
	const mark = `${file}.ran`;
	const code = await runLocked(file, ["touch", mark], "check");
	expect(code).toBe(HELD_CODE);
	expect(await pathExists(mark)).toBe(false);
	await first.release();
});

test("a command that cannot start is a tool error, not a result, and the lock is freed", async () => {
	const file = await lockIn();
	const code = await runLocked(file, ["/no/such/command-claudetto"], "check");
	expect(code).toBe(TOOL_ERROR_CODE);
	expect(await pathExists(file)).toBe(false);
});

test("a command that fails keeps its own exit code", async () => {
	const code = await runLocked(
		await lockIn(),
		[process.execPath, "-e", "process.exit(3)"],
		"check",
	);
	expect(code).toBe(3);
});
