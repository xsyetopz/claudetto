// The gate of `tools/check.ts` (design D9 of change `redesign-0-4-0`): CI skips only the type check, and a test file with 0 cases fails the gate.

import { expect, test } from "bun:test";
import { emptyTestFiles, STEPS, summary } from "../../tools/check.ts";
import { spawnText } from "./fixture-repo.ts";

test("`--ci` skips only the type check, and both runs check the generated files", () => {
	expect(STEPS.filter((s) => s.ciLacks).map((s) => s.name)).toEqual([
		"typecheck",
	]);
	expect(STEPS.map((s) => s.name)).toContain("generate --check");
});

test("a test file with no suite in the JUnit report is a file with 0 cases", () => {
	const xml = `<testsuites>
  <testsuite name="tests/a.test.ts" file="tests/a.test.ts" tests="1">
    <testcase name="a" file="tests/a.test.ts" />
  </testsuite>
</testsuites>`;
	expect(emptyTestFiles(["tests/b.test.ts", "tests/a.test.ts"], xml)).toEqual([
		"tests/b.test.ts",
	]);
});

test("a passed step shows only its count lines", () => {
	const text = [
		"tests/tools/lock.test.ts:",
		"A run is in progress.",
		`${String.fromCharCode(27)}[32m 1615 pass${String.fromCharCode(27)}[0m`,
		" 0 fail",
		"│ typescript │ 412 │",
		"Found 84 clones.",
		"✓ No type errors in 446 files [58.91ms]",
	].join("\n");
	expect(summary(text)).toEqual([
		"1615 pass",
		"0 fail",
		"Found 84 clones.",
		"✓ No type errors in 446 files [58.91ms]",
	]);
});

test("a failed step prints its whole output and ends with its exit code", async () => {
	const script = `import { $ } from "bun"; import { output, recipe } from "${import.meta.dir}/../../tools/recipes.ts"; await recipe(async () => { await output($\`sh -c "echo out-line; echo err-line >&2; exit 3" 2>&1\`); });`;
	const run = await spawnText("bun", ["-e", script]);
	expect(run.status).toBe(3);
	expect(run.stderr).toContain("out-line");
	expect(run.stderr).toContain("err-line");
});

/** Runs `body` in a `bun -e` script that imports the exports of `tools/check.ts`, and gives its exit code and output. */
const spawn = async (body: string) => {
	const run = await spawnText("bun", [
		"-e",
		`import { $ } from "bun"; import { output } from "${import.meta.dir}/../../tools/recipes.ts"; import { checkEmpty, main } from "${import.meta.dir}/../../tools/check.ts"; ${body}`,
	]);
	return { code: run.status, out: run.stdout, err: run.stderr };
};

test("the script main prints counts for a pass, skips a step with `--ci`, and exits with the code of the failed step", async () => {
	const run = await spawn(`await main(["--ci"], [
    { name: "good", run: async () => "noise\\n 5 pass\\n 0 fail\\n" },
    { name: "types", ciLacks: "types", run: async () => " 7 pass\\n" },
    { name: "bad", run: () => output($\`sh -c "echo full-output-line; exit 4" 2>&1\`) },
    { name: "never", run: async () => "unreached\\n 9 pass\\n" },
  ]);`);
	expect(run.code).toBe(4);
	expect(run.out).toContain("check: good");
	expect(run.out).toContain("5 pass");
	expect(run.out).toContain("check: skip types");
	expect(run.out).not.toContain("7 pass");
	expect(run.out).not.toContain("noise");
	expect(run.out).not.toContain("never");
	expect(run.err).toContain("full-output-line");
});

test("the script main exits 0 when each step passes", async () => {
	const run = await spawn(
		`await main([], [{ name: "good", run: async () => " 5 pass\\n" }]);`,
	);
	expect(run.code).toBe(0);
	expect(run.out).toContain("5 pass");
});

const JUNIT = `<testsuites><testsuite name="a" file="tests/a.test.ts" tests="1"><testcase name="a" file="tests/a.test.ts" /></testsuite></testsuites>`;

test("a test file with 0 cases ends the check with exit code 1 and names the file", async () => {
	const run = await spawn(
		`checkEmpty(["tests/a.test.ts", "tests/b.test.ts"], '${JUNIT}');`,
	);
	expect(run.code).toBe(1);
	expect(run.err).toContain("tests/b.test.ts runs 0 cases.");
	expect(run.err).not.toContain("tests/a.test.ts");
});

test("each test file with cases leaves the check running", async () => {
	const run = await spawn(
		`checkEmpty(["tests/a.test.ts"], '${JUNIT}'); console.log("on");`,
	);
	expect(run.code).toBe(0);
	expect(run.out).toContain("on");
});
