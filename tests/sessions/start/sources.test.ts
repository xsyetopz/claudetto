// Tests of the start by source and the compare mode of `dotclaude-start` (task 28.5).
// Each fixture is a small transcript written to a temp folder, in the shape that Claude Code 2.1.296 writes.

import { expect, test } from "bun:test";
import path from "node:path";
import { store } from "../../../src/plugins/dotclaude-sessions/slices/start-cost/adapters/store.ts";
import { reportOf } from "../../../src/plugins/dotclaude-sessions/slices/start-cost/domain/report.ts";
import {
  compareSources,
  nameSource,
  type SourceSize,
  sourceSizes,
  toolSource,
} from "../../../src/plugins/dotclaude-sessions/slices/start-cost/domain/sources.ts";
import {
  type Attachment,
  type Entry,
  readEntries,
} from "../../../src/plugins/dotclaude-sessions/slices/start-cost/domain/transcript.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const BIN = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-start");

const att = (attachment: Attachment): Entry => ({
  type: "attachment",
  attachment,
});
const request = (input: number): Entry => ({
  type: "assistant",
  message: { id: `m${input}`, usage: { input_tokens: input }, content: [] },
});

const write = async (entries: Entry[]) => {
  const dir = tmpDir("start");
  const file = path.join(dir, "s.jsonl");
  await Bun.write(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
  return file;
};

// A start: the system prompt and two tools, then the listings, then the first request.
const SKILLS = "- plain: 10 chars.\n- plug:one: more text here.";
// `Attachment.tools` types only `name`, but `charsOf` counts the whole tool object.
const TOOLS = [
  { name: "Bash", description: "b" },
  { name: "mcp__files__read", description: "r" },
];
const start = (extra: Entry[] = []): Entry[] => [
  att({
    type: "prompt_snapshot",
    systemPrompt: ["s".repeat(100)],
    tools: TOOLS,
  }),
  att({
    type: "instructions",
    files: [{ path: "CLAUDE.md", content: "c".repeat(50) }],
  }),
  att({
    type: "output_style_instructions",
    style: { name: "x", prompt: "o".repeat(30) },
  }),
  att({ type: "skill_listing", names: ["plain", "plug:one"], content: SKILLS }),
  att({
    type: "agent_listing_delta",
    builtInTypes: ["claude"],
    addedLines: ["- claude: catch-all", "- plug:helper: helps\nsecond line"],
  }),
  att({ type: "date", date: "2026-10-10" }),
  ...extra,
  request(5),
  att({
    type: "skill_listing",
    names: ["late"],
    content: "- late: after the request",
  }),
];

const chars = (rows: SourceSize[]) =>
  Object.fromEntries(rows.map((r) => [r.source, r.chars]));

test("the names of a tool, skill, and agent map to a built-in set, a plugin by prefix, or an MCP server", async () => {
  expect(toolSource("Bash")).toBe("built-in");
  expect(toolSource("mcp__files__read")).toBe("MCP server files");
  expect(toolSource("plug:tool")).toBe("plugin plug");
  expect(nameSource("plug:one")).toBe("plugin plug");
  expect(nameSource("claude", ["claude"])).toBe("built-in");
  const plain = nameSource("plain");
  expect(plain).not.toBe("built-in");
  expect(!plain.startsWith("plugin "), plain).toBeTruthy();
});

test("the start groups the first request by source, and leaves out a record after the first request", async () => {
  const rows = chars(
    sourceSizes(await readEntries(store, await write(start()))),
  );
  const bash = JSON.stringify({ name: "Bash", description: "b" }).length;
  const mcp = JSON.stringify({
    name: "mcp__files__read",
    description: "r",
  }).length;
  const plain = "- plain: 10 chars.".length + 1;
  const claude = "- claude: catch-all".length + 1;
  expect(rows["system prompt"]).toBe(100);
  expect(rows["MCP server files"]).toBe(mcp);
  expect(rows["CLAUDE.md and memory"]).toBe(
    JSON.stringify([{ path: "CLAUDE.md", content: "c".repeat(50) }]).length,
  );
  expect(rows["output style"]).toBe(30);
  expect(rows["plugin plug"]).toBe(
    "- plug:one: more text here.".length +
      1 +
      "- plug:helper: helps\nsecond line".length +
      1,
  );
  expect(rows["built-in"]).toBe(bash + claude);
  expect(rows["built-in or user (no plugin prefix)"]).toBe(plain);
  expect(rows["other attachments"]).toBe(
    JSON.stringify({ type: "date", date: "2026-10-10" }).length,
  );
  expect(JSON.stringify(rows).includes("late")).toBe(false);
});

test("the compare mode prints the difference by source, other minus base", async () => {
  const base = await readEntries(store, await write(start()));
  const other = await readEntries(
    store,
    await write(
      start([
        att({
          type: "skill_listing",
          names: ["extra:a"],
          content: `- extra:a: ${"x".repeat(20)}`,
        }),
        att({ type: "deferred_tools_delta", addedLines: ["mcp__extra__tool"] }),
      ]),
    ),
  );
  expect(compareSources(base, other)).toStrictEqual([
    { source: "plugin extra", base: 0, other: 32, diff: 32 },
    {
      source: "MCP server extra",
      base: 0,
      other: "mcp__extra__tool".length,
      diff: 16,
    },
  ]);
  expect(compareSources(base, base)).toStrictEqual([]);
});

test("the bin prints the compare table, and it needs two readable files", async () => {
  const a = await write([...start(), request(100)]);
  const b = await write([
    ...start([
      att({
        type: "skill_listing",
        names: ["extra:a"],
        content: "- extra:a: x",
      }),
    ]),
    request(900),
  ]);
  const run = (...args: string[]) => runBin(BIN, args);
  const ok = run("--compare", a, b);
  expect(ok.status, ok.stderr).toBe(0);
  expect(ok.stdout).toMatch(
    /First request tokens: base 5, other 5, difference 0/,
  );
  expect(ok.stdout).toMatch(/\+13 .*plugin extra/);
  expect(run("--compare", a).status).toBe(2);
});

test("the report fails on size only when a bound is given", async () => {
  const file = await write(start());
  expect((await reportOf(store, file, undefined)).ok).toBe(true);
  expect((await reportOf(store, file, 4)).ok).toBe(false);
  const run = (...args: string[]) => runBin(BIN, [file, ...args]);
  expect(run().status).toBe(0);
  expect(run("--bound", "4").status).toBe(1);
  expect(run("--text-max", "10").status).toBe(1);
});
