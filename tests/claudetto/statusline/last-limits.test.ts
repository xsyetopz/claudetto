// The last reading of a limit window: a window that the input leaves out shows dimmed with its age until its `resets_at` passes.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp, stat, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { writeInFolder } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import {
	limitsFile,
	safeLimitsFile,
	withLastLimits,
} from "../../../plugins/claudetto/modules/statusline/adapters/last-limits.ts";
import { memoryFiles, NOW, outputOf, runMain, STATUS } from "./support.ts";

const MINUTE = 60_000;
const DIM = "\x1b[2m";
const { seven_day: _, ...onlyFiveHour } = STATUS.rate_limits;
const NO_SEVEN_DAY = { ...STATUS, rate_limits: onlyFiveHour };
const SPEND = { used_usd: 5, limit_usd: 50, period: "month" };
const WITH_SPEND = {
	...STATUS,
	rate_limits: { ...STATUS.rate_limits, spend_limit: SPEND },
};

/** The limits row of one run of `main` on `input` at `now`, on the files of `memory`. */
const limitsRow = async (
	input: unknown,
	now: number,
	memory: ReturnType<typeof memoryFiles>,
	env: Record<string, string> = { NO_COLOR: "1" },
): Promise<string> => {
	const out = await outputOf(input, env, {
		now: () => now,
		files: memory.reader,
		write: memory.write,
	});
	return out.split("\n")[2] ?? "";
};

test("an input with no `seven_day` after one with it shows the last `7d` reading with its age", async () => {
	const memory = memoryFiles();
	await limitsRow(STATUS, NOW, memory);

	const row = await limitsRow(NO_SEVEN_DAY, NOW + 5 * MINUTE, memory);

	expect(row).toContain("◷ 5h 23%");
	expect(row).toContain("◷ 7d 80%");
	expect(row).toContain("5m");
});

test("the last reading shows in the dim color, with no color of its own", async () => {
	const memory = memoryFiles();
	await limitsRow(STATUS, NOW, memory, {});

	const row = await limitsRow(NO_SEVEN_DAY, NOW + MINUTE, memory, {});

	const seven = row.split(" · ")[1] ?? "";
	expect(seven.startsWith(`${DIM}◷ 7d`)).toBe(true);
	expect(seven).not.toContain("\x1b[38;");
});

test("a reading past its `resets_at` shows nothing", async () => {
	const memory = memoryFiles();
	await limitsRow(STATUS, NOW, memory);
	const afterReset = (STATUS.rate_limits.seven_day.resets_at + 60) * 1000;

	const row = await limitsRow(NO_SEVEN_DAY, afterReset, memory);

	expect(row).not.toContain("◷ 7d");
});

test("a window with no `resets_at`, such as the spend limit, shows no last reading", async () => {
	const memory = memoryFiles();
	expect(await limitsRow(WITH_SPEND, NOW, memory)).toContain("spend");

	const row = await limitsRow(STATUS, NOW + MINUTE, memory);

	expect(row).not.toContain("spend");
});

test("the same windows within a minute of the saved reading write no file, also with a spend limit", async () => {
	const memory = memoryFiles();
	let writes = 0;
	const counted = {
		...memory,
		write: async (file: string, text: string) => {
			if (file.endsWith("/claudetto/limits.json")) {
				writes++;
			}
			await memory.write(file, text);
		},
	};
	await limitsRow(WITH_SPEND, NOW, counted);

	await limitsRow(WITH_SPEND, NOW + 1000, counted);
	await limitsRow(WITH_SPEND, NOW + 2000, counted);

	expect(writes).toBe(1);
});

test("Two Accounts: a reading of one `CLAUDE_CONFIG_DIR` does not show for another", async () => {
	const memory = memoryFiles();
	await limitsRow(STATUS, NOW, memory, {
		NO_COLOR: "1",
		CLAUDE_CONFIG_DIR: "/a",
	});

	const row = await limitsRow(NO_SEVEN_DAY, NOW + MINUTE, memory, {
		NO_COLOR: "1",
		CLAUDE_CONFIG_DIR: "/b",
	});

	expect(row).not.toContain("◷ 7d");
});

test("the last reading is in `claudetto/limits.json` of `CLAUDE_CONFIG_DIR`, with no hash key", async () => {
	const memory = memoryFiles();

	await limitsRow(STATUS, NOW, memory, {
		NO_COLOR: "1",
		CLAUDE_CONFIG_DIR: "/c",
	});

	expect(
		[...memory.files.keys()].filter((f) => f.includes("claudetto/")),
	).toEqual(["/c/claudetto/limits.json"]);
});

test("with no `CLAUDE_CONFIG_DIR`, the last reading is in `~/.claude/claudetto/limits.json`", async () => {
	const memory = memoryFiles();

	await limitsRow(STATUS, NOW, memory);

	expect(memory.files.has("/home/user/.claude/claudetto/limits.json")).toBe(
		true,
	);
});

test("a reading in the config folder is not read from another config folder", async () => {
	const memory = memoryFiles();
	const saved = {
		seven_day: { at: NOW, window: STATUS.rate_limits.seven_day },
	};
	memory.files.set("/c/claudetto/limits.json", JSON.stringify(saved));
	const ports = { files: memory.reader, write: memory.write, now: () => NOW };
	const read = (configDir: string) =>
		withLastLimits(
			{ rate_limits: onlyFiveHour },
			ports,
			() => undefined,
			limitsFile(configDir),
		);

	expect((await read("/c")).limits.seven_day).toBeDefined();
	expect((await read("/d")).limits.seven_day).toBeUndefined();
});

test("`writeInFolder` creates the missing folder of the file", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "last-limits-"));
	const file = limitsFile(path.join(root, "config"));
	if (file === undefined) {
		throw new Error("the test needs a limits file");
	}

	await writeInFolder(file, "{}\n");

	expect(await bunFile(file).text()).toBe("{}\n");
});

/** A new config folder in the temp folder. */
const configFolder = () =>
	mkdtemp(path.join(os.tmpdir(), "last-limits-config-"));

test("a safe config folder gives its limits file path and has the `claudetto` folder", async () => {
	const config = await configFolder();

	const file = await safeLimitsFile(config);

	expect(file).toBe(path.join(config, "claudetto", "limits.json"));
	expect((await stat(path.join(config, "claudetto"))).isDirectory()).toBe(true);
});

test("a `claudetto` folder that is a link gives no path", async () => {
	const config = await configFolder();
	const elsewhere = await configFolder();
	await symlink(elsewhere, path.join(config, "claudetto"));

	expect(await safeLimitsFile(config)).toBeUndefined();
});

test("a `claudetto` folder of another owner gives no path", async () => {
	const config = await configFolder();
	await mkdir(path.join(config, "claudetto"));

	expect(await safeLimitsFile(config, os.userInfo().uid + 1)).toBeUndefined();
});

test("a `limits.json` that is a link gives no path", async () => {
	const config = await configFolder();
	await mkdir(path.join(config, "claudetto"));
	await symlink(
		path.join(config, "target"),
		path.join(config, "claudetto", "limits.json"),
	);

	expect(await safeLimitsFile(config)).toBeUndefined();
});

test("a config folder that is a file, so `mkdir` fails, gives no path and no throw", async () => {
	const config = await configFolder();
	const file = path.join(config, "file");
	await bunWrite(file, "");

	expect(await safeLimitsFile(file)).toBeUndefined();
});

test("a relative config folder gives no path", async () => {
	expect(await safeLimitsFile("relative/config")).toBeUndefined();
});

test("a failed write of the limits file prints nothing on stderr", async () => {
	let attempted = false;
	const run = await runMain(STATUS, {
		env: { COLUMNS: "200", NO_COLOR: "1" },
		write: async (file: string) => {
			if (!file.endsWith("/claudetto/limits.json")) {
				return;
			}
			attempted = true;
			throw new Error("EROFS");
		},
	});

	expect(attempted).toBe(true);
	expect(run.err).toEqual([]);
});
