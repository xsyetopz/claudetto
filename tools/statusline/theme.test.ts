import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lineFilePath } from "../../plugins/claudetto/hooks/limits/heartbeat.ts";
import {
	statusOf,
	statusWithFiles,
	subagentsWithFiles,
} from "../../plugins/claudetto/statusline/main.ts";
import { plain } from "../../plugins/claudetto/statusline/width.ts";
import { NOW } from "./support.ts";

const ESC = String.fromCharCode(27);
const ROOT = await mkdtemp(join(tmpdir(), "claudetto-theme-"));
afterAll(() => rm(ROOT, { recursive: true, force: true }));

const ON_1M = {
	context_window: { total_input_tokens: 100_000, context_window_size: 1_000_000 },
};
const ADDED = { cost: { total_lines_added: 12, total_lines_removed: 3 } };
const env = { COLUMNS: "120" };

const render = (fields: object, local: { window?: number; theme?: string }) =>
	statusOf(JSON.stringify(fields), env, NOW, { changes: [], ...local });

describe("context is measured against the window in force", () => {
	test("100k input tokens on a 1M model with a 300k compaction window read `ctx 33% of 300k`", () => {
		expect(plain(render(ON_1M, { window: 300_000 }))).toBe("◫ ctx 33% of 300k");
	});

	test("with no window file the context part is left out", () => {
		expect(render({ ...ON_1M, ...ADDED }, {})).toBe("+12 -3");
	});
});

describe("colours follow the Claude Code theme", () => {
	test("`light` paints success and error with the light palette", () => {
		expect(render(ADDED, { theme: "light" })).toBe(
			`${ESC}[38;2;44;122;57m+12${ESC}[0m ${ESC}[38;2;171;43;63m-3${ESC}[0m`,
		);
	});

	test("a daltonized theme paints its own success and error", () => {
		expect(render(ADDED, { theme: "dark-daltonized" })).toBe(
			`${ESC}[38;2;51;153;255m+12${ESC}[0m ${ESC}[38;2;255;102;102m-3${ESC}[0m`,
		);
	});

	test("an ANSI theme paints with SGR codes, plain on light and bright on dark", () => {
		expect(render(ADDED, { theme: "light-ansi" })).toBe(
			`${ESC}[32m+12${ESC}[0m ${ESC}[31m-3${ESC}[0m`,
		);
		expect(render(ADDED, { theme: "dark-ansi" })).toBe(
			`${ESC}[92m+12${ESC}[0m ${ESC}[91m-3${ESC}[0m`,
		);
	});

	test("a name the engine has no table for paints with `dark`, as `RK` does", () => {
		expect(render(ADDED, { theme: "solarized" })).toBe(
			`${ESC}[38;2;78;186;101m+12${ESC}[0m ${ESC}[38;2;255;107;128m-3${ESC}[0m`,
		);
	});

	test("with no theme the line has no colour, as under `NO_COLOR`", () => {
		expect(render(ADDED, {})).toBe("+12 -3");
	});

	test("`NO_COLOR` wins over a theme", () => {
		expect(
			statusOf(JSON.stringify(ADDED), { ...env, NO_COLOR: "1" }, NOW, {
				changes: [],
				theme: "light",
			}),
		).toBe("+12 -3");
	});
});

describe("the line file the mod writes", () => {
	const project = join(ROOT, "project");
	const session = "s/1";
	const input = (fields: object) =>
		JSON.stringify({ session_id: session, workspace: { project_dir: project }, ...fields });

	test("the line reads the window and the theme from the session's file", async () => {
		const path = join(project, lineFilePath(session));
		await mkdir(join(path, ".."), { recursive: true });
		await writeFile(path, JSON.stringify({ window: 300_000, theme: "light" }));
		expect(await statusWithFiles(input(ON_1M), env, NOW)).toBe(
			`${ESC}[2m◫ ctx${ESC}[0m ${ESC}[38;2;78;117;48m33%${ESC}[0m ${ESC}[2mof 300k${ESC}[0m`,
		);
	});

	test("the subagent rows take their colour from the same file", async () => {
		const rows = (id: string) =>
			subagentsWithFiles(
				JSON.stringify({
					session_id: id,
					cwd: project,
					tasks: [{ id: "t", name: "x", status: "running", startTime: NOW - 5000 }],
				}),
				env,
				NOW,
			);
		expect(await rows(session)).toContain("\\u001b[1mx\\u001b[0m");
		expect(await rows("none")).not.toContain("\\u001b");
	});

	test("a session with no file prints no context part and no colour", async () => {
		expect(
			await statusWithFiles(
				JSON.stringify({ session_id: "none", workspace: { project_dir: project }, ...ON_1M, ...ADDED }),
				env,
				NOW,
			),
		).toBe("+12 -3");
	});

	test("a file of the wrong shape is ignored", async () => {
		const path = join(project, lineFilePath("bad"));
		await writeFile(path, JSON.stringify({ window: "300k", theme: 7 }));
		expect(
			await statusWithFiles(
				JSON.stringify({ session_id: "bad", workspace: { project_dir: project }, ...ON_1M, ...ADDED }),
				env,
				NOW,
			),
		).toBe("+12 -3");
	});
});
