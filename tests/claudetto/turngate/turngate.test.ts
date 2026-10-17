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
  tasksNotice,
} from "../../../plugins/claudetto/slices/turngate/domain/tasks.ts";
import {
  MAX_CALLS,
  MAX_QUOTE_CHARS,
  REPLY_HEAD_CHARS,
  REPLY_TAIL_CHARS,
  TARGET_PART_CHARS,
} from "../../../plugins/claudetto/slices/turngate/limits.ts";

test("the target of a call is its first named input field", () => {
  expect(targetOf({ command: "bun test", file_path: "/a" })).toBe("bun test");
  expect(targetOf({ file_path: "/p/a.ts" })).toBe("/p/a.ts");
  expect(targetOf({ content: "x" })).toBe("");
});

// D22: a check at the end of a heredoc or a long `&&` chain is in the summary.
test("the target of a command is its first and its last line, each cut to the bound", () => {
  const heredoc =
    "cat > a.ts <<'EOF'\nexport const a = 1;\nEOF\nbun test tests/a.test.ts";
  expect(targetOf({ command: heredoc })).toBe(
    "cat > a.ts <<'EOF' … bun test tests/a.test.ts",
  );
  const head = "a".repeat(TARGET_PART_CHARS);
  const chain = `${head}${"b".repeat(TARGET_PART_CHARS)} && bun test`;
  expect(targetOf({ command: chain })).toBe(
    `${head}… … …${chain.slice(-TARGET_PART_CHARS)}`,
  );
  expect(chain.slice(-TARGET_PART_CHARS).endsWith("&& bun test")).toBe(true);
  const short = "x".repeat(TARGET_PART_CHARS * 2);
  expect(targetOf({ command: short })).toBe(short);
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

test("only running tasks count, and the notice gives their count unless the reply names each one", () => {
  const tasks = [
    { id: "b0", status: "running", description: "watch" },
    { id: "b1", status: "running", description: "bun run build" },
  ];
  expect(
    runningTasks([...tasks, { id: "x", status: "completed", description: "" }])
      .length,
  ).toBe(2);
  expect(runningTasks(undefined)).toEqual([]);
  expect(tasksNotice(tasks, "Done.")).toContain("2 background tasks are");
  expect(tasksNotice(tasks.slice(0, 1), "Done.")).toContain(
    "1 background task is",
  );
  expect(tasksNotice(tasks, "`b0` and `bun run build` still run.")).toBe(
    undefined,
  );
  expect(tasksNotice([], "Done.")).toBe(undefined);
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
