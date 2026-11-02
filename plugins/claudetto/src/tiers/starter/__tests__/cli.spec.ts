import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file, spawn } from "bun";
import { offerStarter, readListing, writeStarter } from "../cli.ts";

let dir: string;

const git = async (...args: string[]): Promise<void> => {
	const done = spawn(["git", "-C", dir, ...args], { stderr: "pipe" });
	if ((await done.exited) !== 0) {
		throw new Error(await new Response(done.stderr).text());
	}
};

const put = async (path: string, text = ""): Promise<void> => {
	await mkdir(join(dir, path, ".."), { recursive: true });
	await writeFile(join(dir, path), text);
};

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "starter-"));
	await git("init", "-q");
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("readListing", () => {
	test("tracked files are the committed ones, files add the untracked", async () => {
		await put("go.mod");
		await put("main.go");
		await git("add", "go.mod");
		await git(
			"-c",
			"user.name=t",
			"-c",
			"user.email=t@t",
			"commit",
			"-qm",
			"x",
		);

		const listing = await readListing(dir);

		expect(listing.tracked).toEqual(["go.mod"]);
		expect([...listing.files].sort((a, b) => a.localeCompare(b))).toEqual([
			"go.mod",
			"main.go",
		]);
	});

	test("a folder that is not a repo lists nothing", async () => {
		const bare = await mkdtemp(join(tmpdir(), "bare-"));

		const listing = await readListing(bare);

		expect(listing).toEqual({ files: [], tracked: [] });
		await rm(bare, { recursive: true, force: true });
	});
});

describe("writeStarter", () => {
	test("a file that appeared since the plan is left as it is", async () => {
		await put("AGENTS.md", "mine\n");

		const lines = await writeStarter(dir, [
			{ path: "AGENTS.md", text: "new\n" },
			{
				path: "CLAUDE.md",
				text: `# CLAUDE.md

@AGENTS.md
`,
			},
		]);

		expect(await readFile(join(dir, "AGENTS.md"), "utf8")).toBe("mine\n");
		expect(await readFile(join(dir, "CLAUDE.md"), "utf8")).toContain(
			"@AGENTS.md",
		);
		expect(lines[0]).toContain("`AGENTS.md` exists");
	});
});

describe("offerStarter", () => {
	const repo = async (): Promise<void> => {
		await put("Cargo.toml");
		await put("src/main.rs");
		await git("add", ".");
	};

	test("a dry run shows the files and writes none", async () => {
		await repo();

		const report = await offerStarter(dir, { dryRun: true }, async () => true);

		expect(report).toContain("+++ AGENTS.md");
		expect(await file(join(dir, "AGENTS.md")).exists()).toBe(false);
	});

	test("a no writes nothing", async () => {
		await repo();

		await offerStarter(dir, { dryRun: false }, async () => false);

		expect(await file(join(dir, "AGENTS.md")).exists()).toBe(false);
	});

	test("a yes writes AGENTS.md and CLAUDE.md", async () => {
		await repo();

		await offerStarter(dir, { dryRun: false }, async () => true);

		expect(await readFile(join(dir, "CLAUDE.md"), "utf8")).toBe(
			`# CLAUDE.md

@AGENTS.md
`,
		);
		expect(await readFile(join(dir, "AGENTS.md"), "utf8")).toContain(
			"cargo build -q",
		);
	});

	test("a repo with a CLAUDE.md is not offered anything", async () => {
		await repo();
		await put("CLAUDE.md", "mine\n");
		let asked = false;

		const report = await offerStarter(dir, { dryRun: false }, async () => {
			asked = true;
			return true;
		});

		expect(asked).toBe(false);
		expect(report).toContain("`AGENTS.md` or `CLAUDE.md` exists");
	});
});
