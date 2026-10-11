// Tests of the start by source and the compare mode of `dotclaude-start` (task 28.5).
// Each fixture is a small transcript written to a temp folder, in the shape that Claude Code 2.1.296 writes.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { reportOf } from "../../../plugins/dotclaude-sessions/features/start/cli.mjs";
import {
  compareSources,
  nameSource,
  sourceSizes,
  toolSource,
} from "../../../plugins/dotclaude-sessions/features/start/sources.mjs";
import { readEntries } from "../../../plugins/dotclaude-sessions/lib/transcript.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const BIN = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-start");

const att = (attachment) => ({ type: "attachment", attachment });
const request = (input) => ({
  type: "assistant",
  message: { id: `m${input}`, usage: { input_tokens: input }, content: [] },
});

function write(entries) {
  const dir = tmpDir("start");
  const file = path.join(dir, "s.jsonl");
  fs.writeFileSync(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
  return file;
}

// A start: the system prompt and two tools, then the listings, then the first request.
const SKILLS = "- plain: 10 chars.\n- plug:one: more text here.";
const start = (extra = []) => [
  att({
    type: "prompt_snapshot",
    systemPrompt: ["s".repeat(100)],
    tools: [
      { name: "Bash", description: "b" },
      { name: "mcp__files__read", description: "r" },
    ],
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

const chars = (rows) =>
  Object.fromEntries(rows.map((r) => [r.source, r.chars]));

test("the names of a tool, skill, and agent map to a built-in set, a plugin by prefix, or an MCP server", () => {
  assert.equal(toolSource("Bash"), "built-in");
  assert.equal(toolSource("mcp__files__read"), "MCP server files");
  assert.equal(toolSource("plug:tool"), "plugin plug");
  assert.equal(nameSource("plug:one"), "plugin plug");
  assert.equal(nameSource("claude", ["claude"]), "built-in");
  const plain = nameSource("plain");
  assert.notEqual(plain, "built-in");
  assert.ok(!plain.startsWith("plugin "), plain);
});

test("the start groups the first request by source, and leaves out a record after the first request", () => {
  const rows = chars(sourceSizes(readEntries(write(start()))));
  const bash = JSON.stringify({ name: "Bash", description: "b" }).length;
  const mcp = JSON.stringify({
    name: "mcp__files__read",
    description: "r",
  }).length;
  const plain = "- plain: 10 chars.".length + 1;
  const claude = "- claude: catch-all".length + 1;
  assert.equal(rows["system prompt"], 100);
  assert.equal(rows["MCP server files"], mcp);
  assert.equal(
    rows["CLAUDE.md and memory"],
    JSON.stringify([{ path: "CLAUDE.md", content: "c".repeat(50) }]).length,
  );
  assert.equal(rows["output style"], 30);
  assert.equal(
    rows["plugin plug"],
    "- plug:one: more text here.".length +
      1 +
      "- plug:helper: helps\nsecond line".length +
      1,
  );
  assert.equal(rows["built-in"], bash + claude);
  assert.equal(rows["built-in or user (no plugin prefix)"], plain);
  assert.equal(
    rows["other attachments"],
    JSON.stringify({ type: "date", date: "2026-10-10" }).length,
  );
  assert.equal(JSON.stringify(rows).includes("late"), false);
});

test("the compare mode prints the difference by source, other minus base", () => {
  const base = readEntries(write(start()));
  const other = readEntries(
    write(
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
  assert.deepEqual(compareSources(base, other), [
    { source: "plugin extra", base: 0, other: 32, diff: 32 },
    {
      source: "MCP server extra",
      base: 0,
      other: "mcp__extra__tool".length,
      diff: 16,
    },
  ]);
  assert.deepEqual(compareSources(base, base), []);
});

test("the bin prints the compare table, and it needs two readable files", () => {
  const a = write([...start(), request(100)]);
  const b = write([
    ...start([
      att({
        type: "skill_listing",
        names: ["extra:a"],
        content: "- extra:a: x",
      }),
    ]),
    request(900),
  ]);
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });
  const ok = run("--compare", a, b);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(
    ok.stdout,
    /First request tokens: base 5, other 5, difference 0/,
  );
  assert.match(ok.stdout, /\+13 .*plugin extra/);
  assert.equal(run("--compare", a).status, 2);
});

test("the report fails on size only when a bound is given", () => {
  const file = write(start());
  assert.equal(reportOf(file, undefined).ok, true);
  assert.equal(reportOf(file, 4).ok, false);
  assert.match(reportOf(file, undefined).text, /Start by source/);
  const run = (...args) =>
    spawnSync(process.execPath, [BIN, file, ...args], { encoding: "utf8" });
  assert.equal(run().status, 0);
  assert.equal(run("--bound", "4").status, 1);
  assert.equal(run("--text-max", "10").status, 1);
});
