// Tests of the pure parts of the `turngate` slice: the summary of the calls, the judge request, the parse of a verdict, and the task reason.

import { expect, test } from "bun:test";
import path from "node:path";
import {
  callLine,
  summary,
  targetOf,
} from "../../../plugins/claudetto/slices/turngate/domain/calls.ts";
import {
  judgeReason,
  judgeRequest,
  parseVerdict,
  replyExcerpt,
} from "../../../plugins/claudetto/slices/turngate/domain/judge.ts";
import {
  runningTasks,
  tasksReason,
} from "../../../plugins/claudetto/slices/turngate/domain/tasks.ts";
import {
  MAX_CALLS,
  MAX_NAMED_TASKS,
  MAX_QUOTE_CHARS,
  MAX_TARGET_CHARS,
  REPLY_HEAD_CHARS,
  REPLY_TAIL_CHARS,
} from "../../../plugins/claudetto/slices/turngate/limits.ts";

test("the target of a call is its first named input field, cut to one line", () => {
  expect(targetOf({ command: "bun test\necho done", file_path: "/a" })).toBe(
    "bun test",
  );
  expect(targetOf({ file_path: "/p/a.ts" })).toBe("/p/a.ts");
  expect(targetOf({ content: "x" })).toBe("");
  expect(targetOf({ command: "x".repeat(MAX_TARGET_CHARS + 5) }).length).toBe(
    MAX_TARGET_CHARS + 1,
  );
});

test("a deny and an error are errors in the line, and a read-only call keeps its mark", () => {
  expect(callLine("Bash", { command: "rm -r x" }, { deny: "no" }).error).toBe(
    "denied: no",
  );
  expect(
    callLine(
      "Bash",
      { command: "bun test" },
      { isError: true, text: "1 fail\nmore" },
    ).error,
  ).toBe("1 fail");
  expect(callLine("Read", { file_path: "/a" }, { isReadOnly: true })).toEqual({
    tool: "Read",
    target: "/a",
    isReadOnly: true,
  });
});

test("the summary numbers the calls in order and keeps the last ones", () => {
  const lines = [
    callLine("Edit", { file_path: "/a" }, {}),
    callLine("Bash", { command: "a `b`" }, { isError: true, text: "boom" }),
    callLine("Read", { file_path: "/a" }, { isReadOnly: true }),
  ];
  expect(summary(lines)).toBe(
    "1. Edit `/a`: ok\n2. Bash `a 'b'`: error: boom\n3. Read `/a`: ok, read-only",
  );
  const edit = callLine("Edit", { file_path: "/a" }, {});
  const many = Array.from({ length: MAX_CALLS + 2 }, () => edit);
  const text = summary(many);
  expect(text.split("\n")[0]).toBe("(2 earlier calls are not shown)");
  expect(text).toContain(`${MAX_CALLS + 2}. Edit`);
  expect(text).not.toContain("\n1. Edit");
});

test("a long reply keeps its start and its end, with a mark of the cut", () => {
  const reply = `${"a".repeat(REPLY_HEAD_CHARS)}${"b".repeat(10)}${"c".repeat(REPLY_TAIL_CHARS)}`;
  const excerpt = replyExcerpt(reply);
  expect(excerpt).toContain("[… 10 characters cut …]");
  expect(excerpt).not.toContain("b");
  expect(replyExcerpt("short")).toBe("short");
});

test("the judge request holds the reply and the summary only", () => {
  const r = judgeRequest("Done.", [callLine("Edit", { file_path: "/a" }, {})]);
  expect(r.prompt).toContain("<reply>\nDone.\n</reply>");
  expect(r.prompt).toContain("1. Edit `/a`: ok");
  expect(r.system.length).toBeGreaterThan(0);
});

test("a verdict parses from JSON in the text, and a bad verdict gives `undefined`", () => {
  expect(parseVerdict('{"fault":"none"}')).toEqual({ fault: "none" });
  expect(
    parseVerdict('Here: {"fault":"claim","quote":" q ","fix":"f"} end'),
  ).toEqual({ fault: "claim", quote: "q", fix: "f" });
  expect(parseVerdict('{"fault":"claim","quote":"q"}')).toBeUndefined();
  expect(
    parseVerdict('{"fault":"other","quote":"q","fix":"f"}'),
  ).toBeUndefined();
  expect(
    parseVerdict('{"fault":"toString","quote":"q","fix":"f"}'),
  ).toBeUndefined();
  expect(parseVerdict("no json")).toBeUndefined();
  expect(parseVerdict("{not json}")).toBeUndefined();
});

test("the block reason holds the cut quote and the fix", () => {
  const reason = judgeReason({
    fault: "promise",
    quote: "q".repeat(MAX_QUOTE_CHARS + 10),
    fix: "Run it now.",
  });
  expect(reason).toContain(`"${"q".repeat(MAX_QUOTE_CHARS)}…"`);
  expect(reason).toContain("Run it now.");
});

test("only running tasks count, and the reason names at most the bound", () => {
  const tasks = Array.from({ length: MAX_NAMED_TASKS + 2 }, (_, i) => ({
    id: `b${i}`,
    status: "running",
    description: "watch",
  }));
  expect(
    runningTasks([...tasks, { id: "x", status: "completed", description: "" }])
      .length,
  ).toBe(tasks.length);
  expect(runningTasks(undefined)).toEqual([]);
  const reason = tasksReason(tasks);
  expect(reason).toContain("- `b0`: watch");
  expect(reason).not.toContain(`\`b${MAX_NAMED_TASKS}\``);
  expect(reason).toContain("and 2 more");
});

// `Failure-Gaps-0.1.0`, "Answers of the Checks at No Cost": a plugin `hooks.json` accepts `type: "prompt"` and `type: "agent"`, and the gate uses neither, because the old judge on `Stop` put its whole prompt into the block text.
test("no `hooks.json` of a plugin has a hook of type `prompt` or `agent`", async () => {
  const root = path.join(import.meta.dir, "../../..");
  const files = [...new Bun.Glob("plugins/*/hooks/hooks.json").scanSync(root)];
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) {
    const doc: { hooks?: Record<string, { hooks: { type: string }[] }[]> } =
      await Bun.file(path.join(root, f)).json();
    const types = Object.values(doc.hooks ?? {})
      .flat()
      .flatMap((m) => m.hooks.map((h) => h.type));
    expect(
      types.filter((t) => t === "prompt" || t === "agent"),
      f,
    ).toStrictEqual([]);
  }
});
