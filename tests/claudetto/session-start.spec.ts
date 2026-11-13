import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	contextOf,
	detect,
	ZSH_LINE,
} from "../../plugins/claudetto/hooks/session-start";

const SCRIPT = join(
	import.meta.dir,
	"../../plugins/claudetto/hooks/session-start.ts",
);

let dir = "";

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "session-start-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const put = (name: string, text = "") => Bun.write(join(dir, name), text);

test("the packageManager field wins over a lock file, and its version is cut", async () => {
	await put("package.json", '{"packageManager":"pnpm@9.1.0+sha512.abc"}');
	await put("bun.lock");

	expect(await detect(dir)).toBe("pnpm");
});

test("a package.json without the field falls to the lock file", async () => {
	await put("package.json", "{}");
	await put("yarn.lock");

	expect(await detect(dir)).toBe("yarn");
});

test("a package.json that does not parse falls to the lock file", async () => {
	await put("package.json", "{");
	await put("package-lock.json");

	expect(await detect(dir)).toBe("npm");
});

test("a lock file of another ecosystem names its manager", async () => {
	await put("uv.lock");

	expect(await detect(dir)).toBe("uv");
});

test("a folder with no manager names none", async () => {
	expect(await detect(dir)).toBeUndefined();
});

test("the output carries the manager as additionalContext", () => {
	const out = contextOf("bun");

	expect(out).toContain('"hookEventName":"SessionStart"');
	expect(out).toContain(
		'"additionalContext":"Package manager of this project: `bun`',
	);
});

test("the hook appends the zsh line to CLAUDE_ENV_FILE and names the manager once", async () => {
	await put("bun.lock");
	const envFile = join(dir, "env.sh");
	const run = Bun.spawn(["bun", SCRIPT], {
		stdin: new Blob([JSON.stringify({ cwd: dir })]),
		stdout: "pipe",
		env: { ...process.env, CLAUDE_ENV_FILE: envFile },
	});
	const out = await new Response(run.stdout).text();
	await run.exited;

	expect(await Bun.file(envFile).text()).toBe(ZSH_LINE);
	expect(out).toBe(contextOf("bun"));
});

test("the hook prints nothing for a folder with no manager", async () => {
	const run = Bun.spawn(["bun", SCRIPT], {
		stdin: new Blob([JSON.stringify({ cwd: dir })]),
		stdout: "pipe",
		env: { ...process.env, CLAUDE_ENV_FILE: join(dir, "env.sh") },
	});

	expect(await new Response(run.stdout).text()).toBe("");
});
