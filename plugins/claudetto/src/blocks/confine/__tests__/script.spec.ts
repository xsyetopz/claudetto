import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file, serve, spawn } from "bun";
import { spawnCommand } from "../../../../../../claudekit/session/command.ts";
import { exists, makeScratch, SCRIPT } from "./harness.ts";

const REFUSED = /not permitted|read-only|denied/i;

const { scratch, project, fakeHome, run } = await makeScratch();
const victim = join(scratch, "victim");

const probe = await run("true");
const ready = probe.code === 0;
// On macOS with `sandbox-exec`, and on Linux in CI, which installs `bwrap`, the sandbox must work, so a failing probe fails the suite instead of skipping it.
const mustWork =
	(process.platform === "darwin" &&
		(await file("/usr/bin/sandbox-exec").exists())) ||
	(process.platform === "linux" && process.env["CI"] !== undefined);
if (!(ready || mustWork)) {
	console.warn(
		`confine behavior tests skipped, the sandbox does not start here: ${probe.out.trim()}`,
	);
}

beforeAll(async () => {
	await Promise.all(
		[join(project, ".git", "hooks"), victim, join(fakeHome, ".ssh")].map(
			(dir) => mkdir(dir, { recursive: true }),
		),
	);
	await writeFile(join(project, ".git", "config"), "[core]\n");
	await writeFile(join(victim, "keep.txt"), "keep");
});

afterAll(() => rm(scratch, { recursive: true, force: true }));

test("the sandbox starts where the platform has one", () => {
	expect(mustWork && !ready).toBe(false);
});

describe.skipIf(!(ready || mustWork))("the confined shell", () => {
	test("runs the command string in the shell it is given and returns its status", async () => {
		const done = await run("echo hi; exit 7");

		expect(done).toEqual({ code: 7, out: "hi\n" });
	});

	test("writes in the project", async () => {
		const done = await run("echo x > inside.txt");

		expect(done.code).toBe(0);
		expect(await readFile(join(project, "inside.txt"), "utf8")).toBe("x\n");
	});

	test("writes in the temp folder", async () => {
		const target = join(tmpdir(), `confine-spec-${process.pid}`);
		const done = await run(`echo x > ${target}`);

		expect(done.code).toBe(0);
		expect(await exists(target)).toBe(true);
		await rm(target);
	});

	test("refuses a write outside the project and the temp folders", async () => {
		const target = join(scratch, "outside.txt");

		const done = await run(`echo x > ${target}`);

		expect(done.code).not.toBe(0);
		expect(await exists(target)).toBe(false);
	});

	test.each([
		["the ssh folder", join(fakeHome, ".ssh", "marker")],
		["the git config of the user", join(fakeHome, ".gitconfig")],
		[
			"the git hooks of the project",
			join(project, ".git", "hooks", "pre-commit"),
		],
	])("refuses a write to %s", async (_name, target) => {
		const done = await run(`echo x > ${target}`);

		expect(done.code).not.toBe(0);
		expect(await exists(target)).toBe(false);
	});

	test("refuses an append to the git config of the project", async () => {
		const done = await run(`echo '[x]' >> ${join(project, ".git", "config")}`);

		expect(done.code).not.toBe(0);
		expect(await readFile(join(project, ".git", "config"), "utf8")).toBe(
			"[core]\n",
		);
	});

	test.each([
		[
			"python3 rmtree",
			`python3 -c 'import shutil; shutil.rmtree("${victim}")'`,
		],
		["bash rm -rf", `bash -c "rm -rf ${victim}"`],
		["find -delete", `find ${victim} -delete`],
	])("leaves the victim folder whole under %s", async (_name, command) => {
		const done = await run(command);

		// BSD `find -delete` exits 0 after it fails to unlink, so the message and the file are the evidence.
		expect(done.out).toMatch(REFUSED);
		expect(await readFile(join(victim, "keep.txt"), "utf8")).toBe("keep");
	});

	test("writes where the caches live, though the folders are not there yet", async () => {
		const done = await run(
			"mkdir -p ~/.cache/x ~/.bun/y && echo a > ~/.cache/x/f && echo b > ~/.bun/y/f",
		);

		expect(done.code).toBe(0);
		expect(await readFile(join(fakeHome, ".cache", "x", "f"), "utf8")).toBe(
			"a\n",
		);
	});

	describe("a repository", () => {
		const repoOf = async (name: string, hooks: boolean) => {
			const repo = join(scratch, name);
			await spawnCommand(["git", "init", "-q", repo], { cwd: scratch });
			if (!hooks) {
				await rm(join(repo, ".git", "hooks"), { recursive: true });
			}
			return repo;
		};
		const inRepo = (repo: string, command: string) =>
			run(command, { CLAUDETTO_CONFINE_ROOT: repo }, repo);

		test("refuses to create the hooks folder when it is not there", async () => {
			const repo = await repoOf("no-hooks", false);

			const done = await inRepo(
				repo,
				"mkdir .git/hooks && echo x > .git/hooks/pre-commit",
			);

			expect(done.code).not.toBe(0);
			expect(await exists(join(repo, ".git", "hooks", "pre-commit"))).toBe(
				false,
			);
		});

		test("refuses to move `.git` away and start a new one", async () => {
			const repo = await repoOf("moved", true);

			const done = await inRepo(repo, "mv .git .git.x && git init -q");

			expect(done.code).not.toBe(0);
			expect(await exists(join(repo, ".git.x"))).toBe(false);
			expect(await exists(join(repo, ".git", "HEAD"))).toBe(true);
		});

		test("keeps `git commit` working in it", async () => {
			const repo = await repoOf("commits", true);

			const done = await inRepo(
				repo,
				"echo a > a && git add a && git -c user.name=u -c user.email=u@x commit -qm one && git log --oneline | wc -l",
			);

			expect(done.out.trim()).toBe("1");
		});
	});

	test("keeps git working in a scratch repository", async () => {
		const repo = await mkdtemp(join(tmpdir(), "confine-repo-"));
		const done = await run(
			"git init -q . && echo a > a && git add a && git -c user.name=u -c user.email=u@x commit -qm one && git log --oneline | wc -l",
			{},
			repo,
		);

		expect(done.out.trim()).toBe("1");
		await rm(repo, { recursive: true, force: true });
	});

	test("keeps the network open", async () => {
		const server = serve({
			port: 0,
			hostname: "127.0.0.1",
			fetch: () => new Response("pong"),
		});
		const child = spawn([SCRIPT, `curl -s http://127.0.0.1:${server.port}/`], {
			env: { ...process.env, CLAUDETTO_CONFINE_ROOT: project },
			cwd: project,
			stdout: "pipe",
		});
		const out = await new Response(child.stdout).text();
		await server.stop(true);

		expect(out).toBe("pong");
	});
});
