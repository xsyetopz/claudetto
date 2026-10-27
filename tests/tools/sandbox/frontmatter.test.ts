// Pins `claudetto-sandbox --check-frontmatter`: it runs one headless session with a debug log,
// prints each line that names an unknown frontmatter field, and exits 1 when there is one.
// A fake `claude` first on `PATH` writes the debug file, so no test starts Claude Code.

import { expect, test } from "bun:test";
import { cp } from "node:fs/promises";
import path from "node:path";
import { file as bunFile, write as bunWrite } from "bun";
import { pluginLoaded } from "../../../dev/sandbox/domain/frontmatter.ts";
import { withPathFirst, writeProgram } from "../../support/fake-program.ts";
import { type Env, tmpDir } from "../../support/repo.ts";
import { spawnText } from "../fixture-repo.ts";
import { FAKE_CLAUDE, LAB, LOADED } from "./fake-claude.ts";

const N_3_RE = /\b3\b/;

const UNKNOWN = "[WARN] agents/x.md: unknown frontmatter field `foo`";

interface Setup {
	dir: string;
	claude: string;
	out: string;
}

const setUp = async (): Promise<Setup> => {
	const dir = await tmpDir("lab-frontmatter");
	const claude = await writeProgram(dir, "claude", FAKE_CLAUDE);
	return { dir, claude, out: path.join(dir, "out.json") };
};

const run = async (s: Setup, env: Env, lab = LAB) => {
	const r = await spawnText(
		process.execPath,
		[
			path.join(lab, "main.ts"),
			"--dir",
			path.join(s.dir, "sandbox"),
			"--check-frontmatter",
		],
		{
			env: {
				...withPathFirst(process.env, s.dir),
				CLAUDE_CODE_OAUTH_TOKEN: "t",
				FAKE_OUT: s.out,
				...env,
			},
		},
	);
	return r;
};

test("a log with no unknown-field line passes", async () => {
	const s = await setUp();
	const r = await run(s, {
		FAKE_LOG_TEXT: `${LOADED}\n[DEBUG] loaded 3 agents\n`,
	});
	expect(r.status, r.stderr).toBe(0);
	const argv = JSON.parse(await bunFile(s.out).text());
	expect(argv.includes("--debug-file")).toBeTruthy();
	expect(argv.slice(-2)).toStrictEqual(["-p", "Reply with OK."]);
	expect(!argv.includes("--check-frontmatter")).toBeTruthy();
});

test("a log with an unknown-field line fails and the output names the line", async () => {
	const s = await setUp();
	const r = await run(s, { FAKE_LOG_TEXT: `${LOADED}\n${UNKNOWN}\n` });
	expect(r.status, r.stderr).toBe(1);
	expect(r.stdout.includes(UNKNOWN), r.stdout).toBeTruthy();
});

test("a log with no loaded plugin fails the check", async () => {
	const s = await setUp();
	const r = await run(s, { FAKE_LOG_TEXT: "[DEBUG] loaded 3 agents\n" });
	expect(r.status, r.stderr).toBe(1);
});

test("the count of the enabled plugins does not show a loaded plugin, because it counts the built-in plugins", () => {
	expect(pluginLoaded("Found 3 plugins (3 enabled, 0 disabled)")).toBe(false);
	expect(pluginLoaded("Loaded inline plugin from path: demo")).toBe(true);
});

test("a failed session fails the check", async () => {
	const s = await setUp();
	const r = await run(s, { FAKE_LOG_TEXT: "", FAKE_EXIT: "3" });
	expect(r.status).toBe(1);
	expect(r.stderr).toMatch(N_3_RE);
});

test("a session with no debug log fails the check", async () => {
	const s = await setUp();
	const r = await run(s, {});
	expect(r.status).toBe(1);
});

/** Runs the check on a copy of the sandbox tool whose `frontmatter.ts` has `from` replaced by `to`, and gives the exit code of the copy and of the real tool. */
const mutationExits = async (from: string, to: string, env: Env) => {
	const s = await setUp();
	const copy = path.join(s.dir, "lab");
	await cp(LAB, copy, { recursive: true });
	const file = path.join(copy, "domain/frontmatter.ts");
	const source = await bunFile(file).text();
	const mutated = source.replace(from, to);
	if (mutated === source) {
		throw new Error("the mutation must change the file");
	}
	await bunWrite(file, mutated);
	return [(await run(s, env, copy)).status, (await run(s, env)).status];
};

const CHECK = "hits.length === 0 && loaded ? 0 : 1";

test("mutation: a check that skips the plugin test would pass a log with no plugin", async () => {
	const env = { FAKE_LOG_TEXT: "[DEBUG] nothing\n" };
	expect(
		await mutationExits(CHECK, "hits.length === 0 ? 0 : 1", env),
	).toStrictEqual([0, 1]);
});

test("mutation: a check that ignores the log would pass the unknown-field log", async () => {
	const env = { FAKE_LOG_TEXT: `${LOADED}\n${UNKNOWN}\n` };
	expect(await mutationExits(CHECK, "0", env)).toStrictEqual([0, 1]);
});
