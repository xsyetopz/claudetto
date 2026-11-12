import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	asked,
	choose,
	dismissOn,
	lab,
	logged,
	run,
	startup,
} from "./setup.mock";

const BREW = /brew/u;

const withBrew = (on: On, pick: (question: string) => string) => {
	const state = lab(on, "{}", pick);
	state.path = "/bin";
	state.files.set("/bin/brew", "");
	return state;
};

test("a Yes shows the brew command and then runs it", async ($: Engine, on: On) => {
	const state = withBrew(on, choose(BREW, "Yes"));

	await run($, "claudetto:setup");

	expect(asked(state, "brew install ast-grep")).toHaveLength(1);
	expect(state.runs).toContainEqual(["brew", "install", "ast-grep"]);
});

test("a No runs nothing and records the decline", async ($: Engine, on: On) => {
	const state = withBrew(on, choose(BREW, "No"));

	await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "ast-grep"]);
	expect(state.store.get("optional-tool:ast-grep")).toBe(true);
});

test("a startup without betterleaks logs its notice every time, and records nothing", async ($: Engine, on: On) => {
	const state = lab(on);
	state.path = "/bin";
	state.files.set("/bin/brew", "");

	await startup($);
	await startup($);

	const notices = logged(state, "`betterleaks`");
	expect(notices).toHaveLength(2);
	expect(notices[0]).toContain("brew install betterleaks");
	expect(state.store.has("optional-tool:betterleaks")).toBe(false);
});

test("a No to betterleaks records nothing and names the install step", async ($: Engine, on: On) => {
	const state = withBrew(on, choose(BREW, "No"));

	const out = await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "betterleaks"]);
	expect(state.store.has("optional-tool:betterleaks")).toBe(false);
	expect(out.text).toContain("brew install betterleaks");
});

test("a dismissed install question runs nothing and records nothing", async ($: Engine, on: On) => {
	const state = withBrew(
		on,
		dismissOn(BREW, () => "Skip"),
	);

	await run($, "claudetto:setup");

	expect(state.runs).not.toContainEqual(["brew", "install", "ast-grep"]);
	expect(state.store.has("optional-tool:ast-grep")).toBe(false);
});

test("a platform with no package manager gets the releases page, and nothing runs", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	state.path = "/bin";

	const out = await run($, "claudetto:setup");

	expect(out.text).toContain("https://github.com/ast-grep/ast-grep/releases");
	expect(asked(state, "brew")).toEqual([]);
	expect(state.runs.filter((argv) => argv[0] === "brew")).toEqual([]);
});

test("ast-grep on the PATH asks and says nothing", async ($: Engine, on: On) => {
	const state = lab(on, "{}");
	state.path = "/bin";
	state.files.set("/bin/ast-grep", "");

	const out = await run($, "claudetto:setup");

	expect(asked(state, "ast-grep")).toEqual([]);
	expect(out.text).not.toContain("ast-grep");
});

test("a startup without Mole logs its install notice every time, and a No to it names the install step", async ($: Engine, on: On) => {
	const state = withBrew(on, choose(BREW, "No"));

	await startup($);
	await startup($);
	const out = await run($, "claudetto:setup");

	expect(logged(state, "brew install mole")).toHaveLength(2);
	expect(state.runs).not.toContainEqual(["brew", "install", "mole"]);
	expect(out.text).toContain("brew install mole");
});

const MOLE_FILE = "/home/u/.config/mole/purge_paths";
const DF_HEAD = "Filesystem 1024-blocks Used Available Capacity Mounted on\n";
const moleLab = (on: On, df = "", root = "/p") => {
	const state = lab(
		on,
		"{}",
		() => "Skip",
		(argv) => {
			if (argv[0] === "df") {
				return df;
			}
			return argv.includes("--show-toplevel") ? `${root}\n` : "";
		},
	);
	state.path = "/bin";
	state.files.set("/bin/mo", "");
	return state;
};

test("setup adds the project root to Mole's purge_paths once, keeping what the file held", async ($: Engine, on: On) => {
	const state = moleLab(on);
	state.files.set(MOLE_FILE, "# Mole Purge Paths\n~/Library/CloudStorage");

	const first = await run($, "claudetto:setup");
	const second = await run($, "claudetto:setup");

	expect(state.files.get(MOLE_FILE)).toBe(
		"# Mole Purge Paths\n~/Library/CloudStorage\n/p\n",
	);
	expect(first.text).toContain(MOLE_FILE);
	expect(second.text).not.toContain(MOLE_FILE);
});

test("a purge_paths entry holding the project, written with ~, adds nothing", async ($: Engine, on: On) => {
	const state = moleLab(on, "", "/home/u/code/p");
	state.files.set(MOLE_FILE, "~/code\n");

	await run($, "claudetto:setup");

	expect(state.written.filter((w) => w.path === MOLE_FILE)).toEqual([]);
});

test("a disk over 80% full logs its free space and both Mole previews", async ($: Engine, on: On) => {
	const full = moleLab(
		on,
		`${DF_HEAD}/dev/disk3s5 482000000 395000000 47185920 81% /System/Volumes/Data\n`,
	);

	await startup($);

	expect(logged(full, "% full")).toEqual([
		"The disk holding this project is 81% full, 45.0 GiB free. Preview what Mole would remove: `! mo clean --dry-run` for caches, `! mo purge --dry-run` for build folders.",
	]);
});

test("a disk at 80% full logs no disk line", async ($: Engine, on: On) => {
	const state = moleLab(
		on,
		`${DF_HEAD}/dev/disk3s5 482000000 385000000 97000000 80% /System/Volumes/Data\n`,
	);

	await startup($);

	expect(logged(state, "% full")).toEqual([]);
});
