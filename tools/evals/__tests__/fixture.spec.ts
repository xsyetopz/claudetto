import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file as bunFile } from "bun";
import { executeSession } from "../execute.ts";
import { seededKeys, seedFixture } from "../fixture.ts";
import { isSession, ok, stubRunner } from "./stub.ts";

const REAL_FIXTURES = join(import.meta.dir, "../fixtures");

const makeRoot = async (): Promise<string> => {
	const root = await mkdtemp(join(tmpdir(), "evals-fixture-"));
	await mkdir(join(root, "K", "repo", "docs"), { recursive: true });
	await writeFile(join(root, "K", "prompt.txt"), "  do it\n");
	await writeFile(join(root, "K", "repo", "a.ts.tpl"), "export const a = 1;\n");
	await writeFile(join(root, "K", "repo", "docs", "b.md"), "# b\n");
	await mkdir(join(root, "NOREPO"));
	return root;
};

describe("the fixtures that exist", () => {
	test("a folder with a `repo` is seeded and one without is not", async () => {
		const root = await makeRoot();

		const keys = await seededKeys(root);

		expect([...keys]).toEqual(["K"]);
	});

	test("a missing root holds none", async () => {
		const keys = await seededKeys("/no/such/evals/root");

		expect(keys.size).toBe(0);
	});

	test("the `I13` fixture is on disk", async () => {
		const keys = await seededKeys(REAL_FIXTURES);

		expect(keys.has("I13")).toBe(true);
	});
});

describe("seeding a fixture", () => {
	test("copies the files without the `.tpl` suffix and keeps the folders", async () => {
		const root = await makeRoot();
		const dest = join(await mkdtemp(join(tmpdir(), "evals-dest-")), "repo");
		const { run } = stubRunner();

		await seedFixture(run, { root, key: "K", dest });

		expect(await readFile(join(dest, "a.ts"), "utf8")).toBe(
			"export const a = 1;\n",
		);
		expect(await readFile(join(dest, "docs", "b.md"), "utf8")).toBe("# b\n");
	});

	test("commits the seed with git in the scratch folder, in order", async () => {
		const root = await makeRoot();
		const dest = join(await mkdtemp(join(tmpdir(), "evals-dest-")), "repo");
		const { run, calls } = stubRunner();

		await seedFixture(run, { root, key: "K", dest });

		expect(
			calls.map((c) => (c.argv.includes("commit") ? "commit" : c.argv[1])),
		).toEqual(["init", "add", "commit"]);
		expect(calls.every((c) => c.options.cwd === dest)).toBe(true);
	});

	test("returns the trimmed prompt and a grader that runs `grade.ts` of the fixture", async () => {
		const root = await makeRoot();
		const dest = join(await mkdtemp(join(tmpdir(), "evals-dest-")), "repo");
		const { run } = stubRunner();

		const seeded = await seedFixture(run, { root, key: "K", dest });

		expect(seeded).toEqual({
			kind: "seeded",
			prompt: "do it",
			grader: ["bun", join(root, "K", "grade.ts")],
		});
	});

	test("stops at the first git step that fails", async () => {
		const root = await makeRoot();
		const dest = join(await mkdtemp(join(tmpdir(), "evals-dest-")), "repo");
		const { run, calls } = stubRunner((call) =>
			call.argv[1] === "add" ? ok({ code: 128, stderr: "bad" }) : ok(),
		);

		const seeded = await seedFixture(run, { root, key: "K", dest });

		expect(seeded.kind).toBe("failed");
		expect(calls).toHaveLength(2);
	});

	test("a key with no fixture fails before any command runs", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner();

		const seeded = await seedFixture(run, {
			root,
			key: "MISSING",
			dest: join(root, "out"),
		});

		expect(seeded.kind).toBe("failed");
		expect(calls).toHaveLength(0);
	});

	test("the `I13` fixture seeds the files the scenario names", async () => {
		const dest = join(await mkdtemp(join(tmpdir(), "evals-dest-")), "repo");
		const { run } = stubRunner();

		const seeded = await seedFixture(run, {
			root: REAL_FIXTURES,
			key: "I13",
			dest,
		});

		expect(seeded.kind).toBe("seeded");
		const names = [
			"report.ts",
			"report.test.ts",
			"docs/report.md",
			"package.json",
		];
		const found = await Promise.all(
			names.map((name) => bunFile(join(dest, name)).exists()),
		);
		expect(found).toEqual([true, true, true, true]);
	});
});

describe("executing a session", () => {
	const deps = (root: string, run: ReturnType<typeof stubRunner>["run"]) => ({
		run,
		fixturesRoot: root,
		pluginDir: "/p",
		tempPrefix: join(tmpdir(), "claudetto-eval-"),
	});

	test("scores the grader's exit status after the session ran", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner((call) =>
			call.argv[0] === "bun" ? ok({ code: 1, stdout: "asked first" }) : ok(),
		);

		const outcome = await executeSession(deps(root, run), {
			key: "K",
			arm: "main.md",
			run: 1,
		});

		expect(outcome.score).toEqual({ verdict: "fail", detail: "asked first" });
		expect(calls.filter(isSession)).toHaveLength(1);
	});

	test("gives the grader the transcript of the session", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner((call) =>
			isSession(call) ? ok({ stdout: "line one\n" }) : ok(),
		);

		await executeSession(deps(root, run), { key: "K", arm: "main.md", run: 1 });

		const grader = calls.find((c) => c.argv[0] === "bun");
		const path = grader?.options.env?.["EVAL_TRANSCRIPT"] ?? "";
		expect(await readFile(path, "utf8")).toBe("line one\n");
	});

	test("a session that timed out is an error and is not graded", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner((call) =>
			isSession(call) ? ok({ code: undefined, timedOut: true }) : ok(),
		);

		const outcome = await executeSession(deps(root, run), {
			key: "K",
			arm: "main.md",
			run: 1,
		});

		expect(outcome.score.verdict).toBe("error");
		expect(calls.some((c) => c.argv[0] === "bun")).toBe(false);
	});

	test("a case with no fixture is an error and starts no session", async () => {
		const root = await makeRoot();
		const { run, calls } = stubRunner();

		const outcome = await executeSession(deps(root, run), {
			key: "MISSING",
			arm: "main.md",
			run: 1,
		});

		expect(outcome.score.verdict).toBe("error");
		expect(calls.filter(isSession)).toHaveLength(0);
	});
});
