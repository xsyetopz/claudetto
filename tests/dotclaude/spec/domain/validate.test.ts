// Tests of the checks of the spec formats: each rule has a pass case and a
// failure case. A case compares the rules of the issues that it finds.

import { expect, test } from "bun:test";
import {
  parseDelta,
  parseSpec,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/parse.ts";
import {
  parsePackage,
  parseTasks,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/plan.ts";
import {
  type Issue,
  validateDelta,
  validateDeps,
  validatePackage,
  validateSpec,
  validateTasks,
  validateWave,
} from "../../../../src/plugins/dotclaude/slices/spec/domain/validate.ts";
import {
  DELTA_TEXT,
  must,
  PACKAGE_TEXT,
  packageText,
  SPEC_TEXT,
  TASKS_TEXT,
  withLine,
} from "./fixtures.ts";

const rules = (issues: Issue[]): string[] => issues.map((i) => i.rule);

const requirement = (
  name: string,
  text: string,
  when = "a",
  then = "b",
): string =>
  `### Requirement: ${name}\n${text}\n\n#### Scenario: Run\n- **WHEN** ${when}\n- **THEN** ${then}\n`;

const specOf = (text: string) => must(parseSpec(text));
const packageOf = (text: string) => must(parsePackage(text));

test("`validateSpec` passes the requirements of a real spec", () => {
  expect(validateSpec(specOf(SPEC_TEXT))).toStrictEqual([]);
});

test("`validateSpec` passes an EARS sentence with `WHILE` and `IF` forms", () => {
  const text = requirement(
    "Reader stops",
    "IF the file is missing THEN the reader SHALL stop with an error.",
  );
  expect(validateSpec(specOf(text))).toStrictEqual([]);
});

test("`validateSpec` fails a requirement with no `SHALL`", () => {
  const text = requirement("Reader", "The reader gives the state.");
  expect(rules(validateSpec(specOf(text)))).toStrictEqual([
    "requirement.no-shall",
  ]);
});

test("`validateSpec` fails a requirement with no scenario", () => {
  const text = "### Requirement: Reader\nThe reader SHALL run.\n";
  expect(rules(validateSpec(specOf(text)))).toStrictEqual([
    "requirement.no-scenario",
  ]);
});

test("`validateSpec` fails a scenario with no `WHEN` line", () => {
  const text = requirement("Reader", "The reader SHALL run.").replace(
    "- **WHEN** a\n",
    "",
  );
  expect(rules(validateSpec(specOf(text)))).toStrictEqual(["scenario.no-when"]);
});

test("`validateSpec` fails a scenario with an empty `THEN` line", () => {
  const text = requirement("Reader", "The reader SHALL run.", "a", "");
  expect(rules(validateSpec(specOf(text)))).toStrictEqual(["scenario.no-then"]);
});

test("`validateDelta` passes a delta with no name in two sections", () => {
  expect(validateDelta(must(parseDelta(DELTA_TEXT)))).toStrictEqual([]);
});

test("`validateDelta` fails a name that is in `ADDED` and in `REMOVED`", () => {
  const text = `## ADDED\n${requirement("Reader", "The reader SHALL run.")}\n## REMOVED\n### Requirement: Reader\n`;
  expect(rules(validateDelta(must(parseDelta(text))))).toStrictEqual([
    "delta.name-repeated",
  ]);
});

test("`validateTasks` passes each task with a `Verify:` line and a unique id", () => {
  expect(validateTasks(must(parseTasks(TASKS_TEXT)))).toStrictEqual([]);
});

test("`validateTasks` fails a task with no `Verify:` line", () => {
  const tasks = must(parseTasks("- [ ] 1.1 Write the parser\n"));
  expect(rules(validateTasks(tasks))).toStrictEqual(["task.no-verify"]);
});

test("`validateTasks` fails a repeated task id", () => {
  const text = "- [ ] 1.1 A\n  Verify: `x`\n- [ ] 1.1 B\n  Verify: `y`\n";
  expect(rules(validateTasks(must(parseTasks(text))))).toStrictEqual([
    "task.duplicate-id",
  ]);
});

test("`validatePackage` passes the package of a real change", () => {
  expect(validatePackage(packageOf(PACKAGE_TEXT))).toStrictEqual([]);
});

test("`validatePackage` fails an empty front matter field", () => {
  const pkg = packageOf(withLine(PACKAGE_TEXT, "verify:", "verify:"));
  expect(rules(validatePackage(pkg))).toStrictEqual(["package.empty-field"]);
});

test("`validatePackage` fails an empty section", () => {
  const pkg = packageOf(withLine(PACKAGE_TEXT, "1. Write", ""));
  expect(rules(validatePackage(pkg))).toStrictEqual(["package.empty-section"]);
});

test("`validatePackage` fails an `owns` list with no entry", () => {
  const pkg = packageOf(withLine(PACKAGE_TEXT, "owns:", "owns: []"));
  expect(rules(validatePackage(pkg))).toStrictEqual(["package.owns-empty"]);
});

test("`validatePackage` fails an `owns` entry with a wildcard", () => {
  const pkg = packageOf(packageText("P02", [], ["src/*/"]));
  expect(rules(validatePackage(pkg))).toStrictEqual(["package.owns-wildcard"]);
});

test("`validatePackage` fails an `owns` entry under `plugins/`", () => {
  const pkg = packageOf(packageText("P02", [], ["plugins/dotclaude/"]));
  expect(rules(validatePackage(pkg))).toStrictEqual(["package.owns-plugins"]);
});

test("`validatePackage` passes an `owns` entry that is a file path", () => {
  const pkg = packageOf(packageText("P02", [], ["src/x/a.ts"]));
  expect(validatePackage(pkg)).toStrictEqual([]);
});

test("`validateDeps` passes deps that exist and have no cycle", () => {
  const pkgs = [
    packageOf(packageText("P01")),
    packageOf(packageText("P02", ["P01"])),
    packageOf(packageText("P03", ["P01", "P02"])),
  ];
  expect(validateDeps(pkgs)).toStrictEqual([]);
});

test("`validateDeps` fails a repeated package id", () => {
  const pkgs = [packageOf(packageText("P01")), packageOf(packageText("P01"))];
  expect(rules(validateDeps(pkgs))).toStrictEqual(["plan.duplicate-id"]);
});

test("`validateDeps` fails a dep that names no package", () => {
  const pkgs = [packageOf(packageText("P02", ["P09"]))];
  expect(rules(validateDeps(pkgs))).toStrictEqual(["plan.dep-missing"]);
});

test("`validateDeps` fails a dep cycle, and names each package on it", () => {
  const pkgs = [
    packageOf(packageText("P01", ["P02"])),
    packageOf(packageText("P02", ["P01"])),
  ];
  const issues = validateDeps(pkgs);
  expect(issues.map((i) => [i.rule, i.subject])).toStrictEqual([
    ["plan.dep-cycle", "P01"],
    ["plan.dep-cycle", "P02"],
  ]);
});

test("`validateWave` passes open packages whose `owns` entries do not overlap", () => {
  const pkgs = [
    packageOf(packageText("P01", [], ["src/a/"])),
    packageOf(packageText("P02", [], ["src/b/"])),
  ];
  expect(validateWave(pkgs)).toStrictEqual([]);
});

test("`validateWave` fails two packages whose `owns` entries overlap", () => {
  const pkgs = [
    packageOf(packageText("P01", [], ["src/a/"])),
    packageOf(packageText("P02", [], ["src/a/b.ts"])),
  ];
  expect(rules(validateWave(pkgs))).toStrictEqual(["wave.owns-overlap"]);
});
