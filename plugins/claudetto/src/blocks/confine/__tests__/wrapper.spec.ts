import { afterAll, describe, expect, test } from "bun:test";
import {
	chmod,
	copyFile,
	mkdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnCommand } from "../../../../../../claudekit/session/command.ts";
import { exists, makeScratch, SCRIPT, stubPath } from "./harness.ts";

const { scratch, project, fakeHome, run } = await makeScratch();
const log = join(scratch, "bwrap.log");

/** A `bwrap` that writes its arguments one per line, ended by a line `--end`, and runs nothing. */
const RECORDER = `#!/bin/sh\n{ printf '%s\\n' "$@"; echo --end; } >> "${log}"\n`;

const calls = async (): Promise<string[][]> => {
	const text = await readFile(log, "utf8").catch(() => "");
	return text
		.split("--end\n")
		.filter((chunk) => chunk !== "")
		.map((chunk) => chunk.trimEnd().split("\n"));
};

const linux = async () => {
	await rm(log, { force: true });
	const stubs = await stubPath("Linux", { bwrap: RECORDER });
	return { stubs, env: { PATH: stubs } };
};

afterAll(() => rm(scratch, { recursive: true, force: true }));

describe("the missing sandbox program", () => {
	const marker = join(tmpdir(), `confine-marker-${process.pid}`);

	test("a Linux without `bwrap` refuses the command and runs nothing", async () => {
		const stubs = await stubPath("Linux");

		const done = await run(`touch ${marker}`, { PATH: stubs });

		expect(done.code).toBe(126);
		expect(done.out).toContain("`bwrap`");
		expect(await exists(marker)).toBe(false);
		await rm(stubs, { recursive: true, force: true });
	});

	test("`--check` says the same", async () => {
		const stubs = await stubPath("Linux");

		const done = await spawnCommand([SCRIPT, "--check", "--"], {
			cwd: project,
			env: { HOME: fakeHome, PATH: stubs },
		});

		expect(done.code).toBe(126);
		expect(done.stderr).toContain("`bwrap`");
		await rm(stubs, { recursive: true, force: true });
	});

	test("an unknown system refuses too", async () => {
		const stubs = await stubPath("Plan9");

		const done = await run(`touch ${marker}`, { PATH: stubs });

		expect(done.code).toBe(126);
		expect(await exists(marker)).toBe(false);
		await rm(stubs, { recursive: true, force: true });
	});
});

describe("the `bwrap` call of Linux", () => {
	const check = async (env: Record<string, string>) =>
		spawnCommand([SCRIPT, "--check", "--"], {
			cwd: project,
			env: { HOME: fakeHome, CLAUDETTO_CONFINE_ROOT: project, ...env },
		});

	test("`--check` and the real call start `bwrap` with the same sandbox flags", async () => {
		const { env } = await linux();

		await check(env);
		await run("echo hi", env);

		const [probe, real] = await calls();
		const flags = (args: string[] | undefined) =>
			(args ?? []).filter((a) => a.startsWith("--") && a.length > 2);
		for (const flag of ["--new-session", "--proc"]) {
			expect(probe).toContain(flag);
			expect(real).toContain(flag);
		}
		expect(flags(probe).every((f) => flags(real).includes(f))).toBe(true);
	});

	test("a command string `--check` is run, not taken for the check", async () => {
		const { env } = await linux();

		const done = await run("--check", env);

		expect(done.code).toBe(0);
		const [real] = await calls();
		expect(real).toContain("--bind");
		expect(real?.slice(-3)).toEqual(["/bin/bash", "-c", "--check"]);
	});

	test("the hooks folder and the git config are bound read-only though they are not there yet", async () => {
		const { env } = await linux();
		await mkdir(join(project, ".git"), { recursive: true });

		await run("true", env);

		const [real] = await calls();
		const hooks = join(project, ".git", "hooks");
		const config = join(project, ".git", "config");
		expect(real).toContain(hooks);
		expect(real).toContain(config);
		expect(await exists(hooks)).toBe(true);
	});

	test("`.git` is a mount point of its own, so it cannot be moved away", async () => {
		const { env } = await linux();

		await run("true", env);

		const [real] = await calls();
		const git = join(project, ".git");
		const at = (real ?? []).findIndex(
			(arg, i) => arg === git && real?.[i - 1] === git,
		);
		expect(real?.[at - 2]).toBe("--bind");
	});

	test("the cache folders are bound though they are not there yet", async () => {
		const { env } = await linux();

		await run("true", env);

		const [real] = await calls();
		const dirs = [".bun", ".cache"].map((dir) => join(fakeHome, dir));
		for (const dir of dirs) {
			expect(real).toContain(dir);
		}
		expect(await Promise.all(dirs.map(exists))).toEqual([true, true]);
	});
});

describe("the root of the project", () => {
	test.each([
		["the root of the file system", "/"],
		["the home folder", fakeHome],
		["a folder above the home folder", scratch],
	])("refuses %s", async (_name, root) => {
		const { env } = await linux();

		const done = await run("true", { ...env, CLAUDETTO_CONFINE_ROOT: root });

		expect(done.code).toBe(126);
		expect(done.out).toContain("not run");
		expect(await calls()).toEqual([]);
	});

	test("takes a folder inside the home folder", async () => {
		const { env } = await linux();

		const done = await run("true", env);

		expect(done.code).toBe(0);
	});
});

describe.if(process.platform === "darwin")("the check on macOS", () => {
	test("fails when the sandbox cannot start with the profile", async () => {
		const tree = join(scratch, "tree");
		await mkdir(join(tree, "bin"), { recursive: true });
		await mkdir(join(tree, "src", "blocks", "confine"), { recursive: true });
		await copyFile(SCRIPT, join(tree, "bin", "claudetto-confine"));
		await chmod(join(tree, "bin", "claudetto-confine"), 0o755);
		await writeFile(
			join(tree, "src", "blocks", "confine", "profile.sb"),
			`(version 1)
(this is not a profile
`,
		);

		const done = await spawnCommand(
			[join(tree, "bin", "claudetto-confine"), "--check", "--"],
			{
				cwd: project,
				env: { HOME: fakeHome, CLAUDETTO_CONFINE_ROOT: project },
			},
		);

		expect(done.code).toBe(126);
		expect(done.stderr).toContain("not run");
	});
});
