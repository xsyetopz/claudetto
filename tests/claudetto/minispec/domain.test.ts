// The pure rules of `minispec`: the tasks, the spec deltas and their merge, the names, and the arguments.

import { expect, test } from "bun:test";
import { parseArgs } from "../../../plugins/claudetto/slices/minispec/domain/args.ts";
import {
  mergeDelta,
  parseDelta,
  parseRequirements,
  requirementIssues,
} from "../../../plugins/claudetto/slices/minispec/domain/spec.ts";
import {
  parseTasks,
  taskIssues,
} from "../../../plugins/claudetto/slices/minispec/domain/tasks.ts";
import {
  nameIssue,
  nearest,
} from "../../../plugins/claudetto/slices/minispec/domain/text.ts";
import { DELTA } from "./store.ts";

test("a check in a code span is a command, and a check in prose is not (S9)", () => {
  const tasks = parseTasks(
    [
      "- [ ] 1.1 A",
      "  Check: `just test x`",
      "- [x] 1.2 B",
      "  Check: that it works",
      "- [ ] 1.3 C",
      "- [ ] 1.4 D",
      "  Check:",
      "  ```bash",
      "  bun test",
      "  ```",
    ].join("\n"),
  );
  expect(tasks.map((t) => [t.id, t.done, t.check, t.hasCheckField])).toEqual([
    ["1.1", false, "just test x", true],
    ["1.2", true, null, true],
    ["1.3", false, null, false],
    ["1.4", false, "bun test", true],
  ]);
});

test("the task issues name a prose check, a missing check, a duplicate id, and an empty file", () => {
  const issues = taskIssues(
    "- [ ] 1.1 A\n  Check: it works\n- [ ] 1.1 B\n  Check: `ls`\n- [ ] 1.2 C\n",
  );
  expect(issues).toHaveLength(3);
  expect(issues[0]).toContain("prose");
  expect(issues[1]).toContain("twice");
  expect(issues[2]).toContain("no check");
  expect(taskIssues("# Tasks\n")).toHaveLength(1);
  expect(taskIssues("- [ ] 1.1 A\n  Check: `ls`\n")).toEqual([]);
});

test("a delta has its sections, and a requirement needs a statement and a scenario", () => {
  const delta = parseDelta(DELTA);
  expect(delta.purpose).toBe("Export data.");
  expect(delta.added.map((r) => r.name)).toEqual(["Export a file"]);
  expect(requirementIssues(delta.added)).toEqual([]);
  const bare = parseRequirements("### Requirement: A\n\n#### Scenario: B\n");
  expect(requirementIssues(bare)).toHaveLength(1);
  const noScenario = parseRequirements("### Requirement: A\n\nIt works.\n");
  expect(requirementIssues(noScenario)).toHaveLength(1);
  expect(
    requirementIssues(parseRequirements("### Requirement: A\n")),
  ).toHaveLength(2);
});

test("a requirement in another language or with lower-case words is valid", () => {
  for (const statement of [
    "System musi zapisywac plik.",
    "システムはファイルを書き込む。",
    "the system shall write a file.",
  ]) {
    const reqs = parseRequirements(
      `### Requirement: A\n\n${statement}\n\n#### Scenario: B\n\n- x\n`,
    );
    expect(requirementIssues(reqs)).toEqual([]);
  }
});

test("a merge adds, modifies, and removes requirements, and refuses a bad name", () => {
  const first = mergeDelta("export", null, parseDelta(DELTA));
  if (!first.ok) throw new Error("merge failed");
  expect(parseRequirements(first.text).map((r) => r.name)).toEqual([
    "Export a file",
  ]);
  expect(first.text).toContain("Export data.");
  const again = mergeDelta("export", first.text, parseDelta(DELTA));
  expect(again.ok).toBe(false);
  const changed = DELTA.replace("## ADDED", "## MODIFIED").replace(
    "write a file",
    "write two files",
  );
  const second = mergeDelta("export", first.text, parseDelta(changed));
  if (!second.ok) throw new Error("merge failed");
  expect(second.text).toContain("two files");
  const removed = mergeDelta(
    "export",
    first.text,
    parseDelta("## REMOVED Requirements\n\n### Requirement: Export a file\n"),
  );
  if (!removed.ok) throw new Error("merge failed");
  expect(parseRequirements(removed.text)).toEqual([]);
  expect(
    mergeDelta(
      "export",
      first.text,
      parseDelta("## REMOVED Requirements\n\n### Requirement: Nope\n"),
    ).ok,
  ).toBe(false);
});

test("names are lowercase words with hyphens, and a bad command gets the nearest one", () => {
  expect(nameIssue("add-export", "change")).toBeNull();
  expect(nameIssue("Add_Export", "change")).toContain("lowercase");
  expect(nameIssue("dodaj-eksport-żółć", "change")).toBeNull();
  expect(nameIssue("エクスポート-追加", "change")).toBeNull();
  expect(nameIssue("../x", "change")).not.toBeNull();
  expect(nameIssue("a".repeat(61), "change")).toContain("shorter");
  expect(nearest("lst", ["new", "list", "show"])).toBe("list");
  expect(nearest("zzzzzz", ["new", "list"])).toBeUndefined();
});

test("the arguments take flags in any place, `--` ends the flags, and a bad flag or tier is a fault", () => {
  const p = parseArgs([
    "new",
    "--tier",
    "big",
    "x",
    "--json",
    "--capability=c",
  ]);
  expect(p.command).toBe("new");
  expect(p.words).toEqual(["x"]);
  expect(p.options).toMatchObject({ tier: "big", json: true, capability: "c" });
  expect(parseArgs(["show", "--", "--json"]).words).toEqual(["--json"]);
  expect(parseArgs(["new", "--tier", "small", "x"]).error).toContain("small");
  expect(parseArgs(["list", "--bogus"]).error).toContain("--bogus");
  expect(parseArgs(["new", "--tier"]).error).toContain("needs a value");
  expect(parseArgs(["-h"]).help).toBe(true);
});
