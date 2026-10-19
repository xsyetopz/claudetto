// Lab tests of the ground check of the `handoff` slice (spec `handoff`, "Ground check of quoted values").
// The stubs answer the fork, the session model, the write, and the stat of the compaction hook,
// and record each debug line of `$.ui.log`.
// The transcript has one `Read` result with the line `FIRST-LINE: amber-falcon-42`.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { GROUND_WARNING } from "../prompts.ts";

/** The warning up to the values that it names. */
const WARNING = GROUND_WARNING({ values: "" }).slice(0, -1);

const read = {
  tool_use_id: "t1",
  tool: "Read",
  input: { file_path: "/w/a.txt", offset: 1, limit: 600 },
  text: "1\tFIRST-LINE: amber-falcon-42\n2\tfiller",
};

/** A turn that ends with an assistant reply, so there is no tail. */
const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Read a.txt.", toolUses: [], handle: "h0" },
  { role: "assistant", text: "", toolUses: [read], handle: "h1" },
  { role: "user", text: "", toolUses: [], toolResults: [], handle: "h2" },
  { role: "assistant", text: "Done.", toolUses: [], handle: "h3" },
];

/** The stubs for a fork that writes `handoff`, and the debug log lines. */
const engine = (on: On, handoff: string): string[] => {
  const logs: string[] = [];
  on("model.fork", () => ({
    value: {
      isAnswered: true,
      text: handoff,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    },
  }));
  on("session.model", () => ({ value: "claude-haiku-5-5" }));
  on("fs.write", () => ({ value: undefined }));
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("ui.log", (_$, e) => {
    if (e.to === "debug") logs.push(e.text);
    return { value: undefined };
  });
  return logs;
};

/** The text of the handed message after an `auto` compaction with the fork text `handoff`, and the debug log lines. */
const handed = async ($: Engine, on: On, handoff: string) => {
  const logs = engine(on, handoff);
  const result = await $.session.compact({
    trigger: "auto",
    messages: MESSAGES,
  });
  return { text: result.messages?.[0]?.text ?? "", logs };
};

test("a changed value gives a warning that names it and one debug log line", async ($: Engine, on: On) => {
  const { text, logs } = await handed(
    $,
    on,
    "- Read `a.txt` lines 1 to 600: DONE, line 1 is `FIRST-LINE: amber-falcon-24`.",
  );
  expect(text).toContain(
    GROUND_WARNING({ values: "`FIRST-LINE: amber-falcon-24`" }),
  );
  expect(logs).toEqual([
    "ground check: `FIRST-LINE: amber-falcon-24` is not in the messages of the session",
  ]);
});

test("a true value gives no warning and no log line", async ($: Engine, on: On) => {
  const { text, logs } = await handed(
    $,
    on,
    "- Read `a.txt` lines 1 to 600: DONE, line 1 is `FIRST-LINE: amber-falcon-42`.",
  );
  expect(text).toContain("`FIRST-LINE: amber-falcon-42`");
  expect(text).not.toContain(WARNING);
  expect(logs).toEqual([]);
});

test("a line with an odd count of backticks and a short value makes no value of prose", async ($: Engine, on: On) => {
  const { text, logs } = await handed(
    $,
    on,
    [
      "- Step 1 (offset `1`): DONE. Line 1 is `FIRST-LINE: amber-falcon-42`.",
      "- Next: read `a.txt` at the next offset, then run ` cat b.txt for the code word.",
    ].join("\n"),
  );
  expect(text).not.toContain(WARNING);
  expect(logs).toEqual([]);
});
