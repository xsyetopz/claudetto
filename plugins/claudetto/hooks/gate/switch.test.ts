import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bash, scanned } from "../secrets.mock.ts";

const SKILLS = [1, 2, 3, 4, 5, 6, 7].map(
	(i) => `.claude/skills/openspec-${i}/SKILL.md`,
);

// `differ` is what `git diff --name-only` prints; `runs` collects each git argv.
const lab = (
	on: On,
	differ: string[],
	runs: string[][] = [],
	denyWrite: string[] = [],
) => {
	on("process.run", (_$, e, next) => {
		if (e.argv[0] !== "git") {
			return scanned(e) ?? next(e);
		}
		runs.push([...e.argv]);
		return {
			value: {
				exitCode: 0,
				stdout: e.argv[1] === "diff" ? differ.map((f) => `${f}\n`).join("") : "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("settings.read", () => ({
		value: { sandbox: { filesystem: { denyWrite } } },
	}));
	on("session.cwd", () => ({ value: "/p" }));
	on("session.messages", () => ({ value: [] }));
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "allow" }));
};
const diffs = (runs: string[][]) => runs.filter((r) => r[1] === "diff");

test("Skills Differ: a switch that would rewrite sandbox-protected files is denied and names them", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, SKILLS, runs);
	const v = await bash($, "git switch main");
	expect(v.decision).toBe("deny");
	for (const f of SKILLS) {
		expect(v.reason).toContain(`\`${f}\``);
	}
	expect(diffs(runs)[0]?.slice(0, 5)).toEqual([
		"git",
		"diff",
		"--name-only",
		"HEAD",
		"main",
	]);
	expect(diffs(runs)[0]).toContain(".claude/skills");
});

for (const command of [
	"git checkout main",
	"git rebase main",
	"git reset --hard main",
	"git switch -c next main",
]) {
	test(`${command} is checked for protected files and denied when they differ`, async ($: Engine, on: On) => {
		lab(on, SKILLS);
		expect((await bash($, command)).decision).toBe("deny");
	});
}

test("No Difference: a switch with no protected file changed passes", async ($: Engine, on: On) => {
	lab(on, []);
	expect((await bash($, "git switch main")).decision).toBe("allow");
});

test("a hard reset compares the working tree, so an uncommitted protected file counts", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, [".claude/settings.json"], runs);
	await bash($, "git reset --hard");
	expect(diffs(runs)[0]?.slice(0, 4)).toEqual([
		"git",
		"diff",
		"--name-only",
		"HEAD",
	]);
	expect(diffs(runs)[0]?.[4]).toBe("--");
});

test("a path the settings' sandbox denyWrite names is compared too", async ($: Engine, on: On) => {
	const runs: string[][] = [];
	lab(on, [], runs, ["secrets/", "/p/vendor", "~/elsewhere"]);
	await bash($, "git switch main");
	const argv = diffs(runs)[0] ?? [];
	expect(argv).toContain("secrets/");
	expect(argv).toContain("/p/vendor");
	expect(argv).not.toContain("~/elsewhere");
});

for (const command of [
	"git checkout -- src/a.ts",
	"git rebase --continue",
	"git reset --soft HEAD~1",
	"git switch -c fresh",
]) {
	test(`${command} moves no protected file and runs no diff`, async ($: Engine, on: On) => {
		const runs: string[][] = [];
		lab(on, SKILLS, runs);
		expect((await bash($, command)).decision).not.toBe("deny");
		expect(diffs(runs)).toEqual([]);
	});
}
