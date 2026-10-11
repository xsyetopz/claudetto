// The turn bound of a subagent: the count of turns in the transcript, `maxTurns` of the agent file,
// and the one note at `TURNS_LEFT_AT` turns left (task 10.9).
// The reads are fakes, so no test reads a real transcript.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  HAIKU_CONTEXT_MAX,
  TURNS_LEFT_AT,
} from "../../../plugins/dotclaude/features/context/limits.ts";
import type { TranscriptRow } from "../../../plugins/dotclaude/features/context/turns.ts";
import {
  countTurns,
  maxTurnsOf,
} from "../../../plugins/dotclaude/features/context/turns.ts";
import { decide } from "../../../plugins/dotclaude/hooks/PostToolUse/context.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

/** The output of the report-now hook, as the test reads it. */

const AGENTS = path.join(PLUGINS, "dotclaude/agents");
const MODEL = "claude-haiku-5-5";
/** The `maxTurns` of the `test-runner` agent file and of the `implementer` agent file. */
const LIMIT = (await maxTurnsOf("test-runner")) as number;
const LONG = (await maxTurnsOf("implementer")) as number;

/** `n` assistant rows with distinct ids and a small context. */
const turns = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    type: "assistant",
    message: {
      id: `msg_${i}`,
      model: MODEL,
      usage: { input_tokens: 1_000 },
    },
  }));
type Turn = ReturnType<typeof turns>[number];
const payload = (agent_type?: string) => ({
  agent_id: "a1",
  ...(agent_type === undefined ? {} : { agent_type }),
  transcript_path: "/s/x.jsonl",
});
/** The note of `decide` for a transcript of `rows`. */
const note = async (
  rows: TranscriptRow[],
  p = payload("dotclaude:test-runner"),
) =>
  (await decide(p, async () => rows, { readAll: async () => rows }))
    ?.hookSpecificOutput.additionalContext;

test("below the level, a subagent gets no note", async () => {
  expect(await note(turns(LIMIT - TURNS_LEFT_AT - 1))).toBe(undefined);
});

test("at the level, a subagent gets a note", async () => {
  expect(
    ((await note(turns(LIMIT - TURNS_LEFT_AT))) as string).length > 0,
    `${((await note(turns(LIMIT - TURNS_LEFT_AT))) as string).length}`,
  ).toBeTruthy();
});

test("rows with one `message.id` count one turn", async () => {
  const rows = turns(10).flatMap((r) => [r, r, r]);
  expect(countTurns(rows)).toBe(10);
  expect(await note(rows)).toBe(undefined);
});

test("a user row is no turn", () => {
  expect(countTurns([{ type: "user", message: {} }])).toBe(0);
});

test("an unknown agent type, and a missing one, give no note", async () => {
  expect(await note(turns(LONG), payload("dotclaude:nobody"))).toBe(undefined);
  expect(await note(turns(LONG), payload("../agents/test-runner"))).toBe(
    undefined,
  );
  expect(await note(turns(LONG), payload(undefined))).toBe(undefined);
});

test("an agent file with no `maxTurns` gives no note", async () => {
  const dir = tmpDir("turns");
  try {
    await Bun.write(path.join(dir, "free.md"), "---\nname: free\n---\nBody\n");
    expect(await maxTurnsOf("free", dir)).toBe(undefined);
    const rows = turns(LONG);
    const out = await decide(payload("free"), async () => rows, {
      readAll: async () => rows,
      agentsDir: dir,
    });
    expect(out).toBe(undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("`maxTurns` comes from the frontmatter, with or without the plugin prefix", async () => {
  expect(Number.isInteger(LIMIT)).toBe(true);
  expect(await maxTurnsOf("dotclaude:implementer")).toBe(LONG);
});

test("the count reads the whole transcript, so a long run is not cut", async () => {
  const rows = turns(LONG - TURNS_LEFT_AT);
  expect(
    ((await note(rows, payload("dotclaude:implementer"))) as string).length > 0,
    `${((await note(rows, payload("dotclaude:implementer"))) as string).length}`,
  ).toBeTruthy();
});

test("the context note and the turn note are one note", async () => {
  const rows = turns(LIMIT - TURNS_LEFT_AT);
  const turnOnly = (await note(rows)) as string;
  const last = rows[rows.length - 1] as Turn;
  last.message.usage.input_tokens = HAIKU_CONTEXT_MAX + 1;
  const out = await decide(payload("dotclaude:test-runner"), async () => rows, {
    readAll: async () => rows,
  });
  // A missing note is the empty text, so the check fails.
  const text = out?.hookSpecificOutput.additionalContext ?? "";
  expect(text.length > turnOnly.length, `${text.length}`).toBeTruthy();
});

test("`TURNS_LEFT_AT` is below the smallest `maxTurns` of the agent files", async () => {
  const all = (
    await Promise.all(
      fs.readdirSync(AGENTS).map((f) => maxTurnsOf(f.replace(/\.md$/, ""))),
    )
  ).filter(Boolean) as number[];
  expect(all.length > 0, `${all.length}`).toBeTruthy();
  expect(TURNS_LEFT_AT > 0, `${TURNS_LEFT_AT}`).toBeTruthy();
  expect(TURNS_LEFT_AT < Math.min(...all), `${TURNS_LEFT_AT}`).toBeTruthy();
});
