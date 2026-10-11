// Tests of the `dotclaude-usage` bin and its helpers (task 28.4): the parse of transcripts, the `--days` filter, and the `--json` output.
// Fixture timestamps are relative to the real now at test time, because the tool reads `Date.now()`.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  callCost,
  median,
  quantile,
  tokens,
} from "../../../plugins/dotclaude-sessions/features/usage/parse.mjs";
import {
  reserve,
  turnsFromText,
} from "../../../plugins/dotclaude-sessions/features/usage/turns.mjs";
import { agentType } from "../../../plugins/dotclaude-sessions/lib/transcript.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const TOOL = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-usage");
const DAY = 86_400_000;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);

test("a sonnet call costs input, output, cache read, and the 5m and 1h writes at their prices", () => {
  const c = callCost("claude-sonnet-4", {
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 2000,
    cache_creation_input_tokens: 30_000,
    cache_creation: {
      ephemeral_5m_input_tokens: 10_000,
      ephemeral_1h_input_tokens: 20_000,
    },
  });
  // $2 input, $10 output, $0.2 read, $2.5 5m write, $4 1h write, per million tokens.
  near(c.write, (10_000 * 2.5 + 20_000 * 4) / 1e6);
  near(c.total, (1000 * 2 + 500 * 10 + 2000 * 0.2) / 1e6 + c.write);
  assert.equal(c.read, 2000);
  assert.equal(c.context, 33_000);
  assert.equal(c.rewrite, false);
});

test("a call with no split of the cache write prices all of it as a 5m write", () => {
  const c = callCost("claude-opus-4", {
    cache_creation_input_tokens: 1_000_000,
  });
  near(c.write, 5);
  near(c.total, 5);
});

test("each model family has its own price, and an unknown model costs nothing", () => {
  const usage = { input_tokens: 1_000_000 };
  near(callCost("claude-fable-1", usage).total, 10);
  near(callCost("claude-opus-4", usage).total, 4);
  near(callCost("claude-sonnet-4", usage).total, 2);
  near(callCost("claude-haiku-4", usage).total, 1);
  assert.deepEqual(callCost("gpt-x", usage), {
    total: 0,
    write: 0,
    context: 0,
    read: 0,
  });
  assert.equal(callCost(undefined, usage).total, 0);
});

test("a write over 30k tokens that is larger than the read is a full rewrite", () => {
  const rewrite = (write, read) =>
    callCost("claude-sonnet-4", {
      cache_creation_input_tokens: write,
      cache_read_input_tokens: read,
    }).rewrite;
  assert.equal(rewrite(30_001, 0), true);
  assert.equal(rewrite(30_000, 0), false);
  assert.equal(rewrite(40_000, 40_000), false);
  assert.equal(rewrite(40_000, 39_999), true);
});

test("the agent type is main outside `subagents`, and comes from the meta file inside", () => {
  const root = tmpDir("usage");
  const sub = path.join(root, "s", "subagents");
  fs.mkdirSync(sub, { recursive: true });
  fs.writeFileSync(
    path.join(sub, "agent-1.meta.json"),
    '{"agentType":"dotclaude:x"}',
  );
  assert.equal(agentType(path.join(root, "s.jsonl")), "main");
  assert.equal(agentType(path.join(sub, "agent-1.jsonl")), "dotclaude:x");
  assert.equal(agentType(path.join(sub, "agent-2.jsonl")), "subagent");
});

test("the median and the quantile pick from sorted values and give zero for none", () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 2, 3]), 2);
  assert.equal(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
  assert.equal(median([]), 0);
  assert.equal(quantile([], 0.9), 0);
});

test("the token estimate is the larger of chars over 4 and words over 0.75", () => {
  assert.equal(tokens(""), 0);
  assert.equal(tokens("a b c"), 4);
  assert.equal(tokens("x".repeat(40)), 10);
});

test("the report reserve is a twentieth of the limit and at least 3", () => {
  assert.equal(reserve(10), 3);
  assert.equal(reserve(100), 5);
});

test("the turn count restarts at a prompt, and tool results and plain meta entries do not restart it", () => {
  const lines = [
    { type: "user", message: { content: "prompt" } },
    { type: "assistant", message: { id: "a" } },
    { type: "user", message: { content: [{ type: "tool_result" }] } },
    { type: "assistant", message: { id: "b" } },
    { type: "user", isMeta: true, message: { content: "reminder" } },
    { type: "assistant", message: { id: "b" } },
    { type: "assistant", message: { id: "c" } },
  ].map((e) => JSON.stringify(e));
  assert.equal(turnsFromText(lines.join("\n")), 3);
  lines.splice(
    5,
    0,
    JSON.stringify({
      type: "user",
      isMeta: true,
      origin: { kind: "task-notification" },
    }),
  );
  assert.equal(turnsFromText(lines.join("\n")), 2);
});

// A transcript with one main-session call at `at` and a `Skill` call.
function transcript(model, at, usage, extra = {}) {
  return [
    {
      type: "user",
      timestamp: at,
      entrypoint: "cli",
      message: { content: "hi" },
    },
    {
      type: "assistant",
      timestamp: at,
      message: {
        id: `m-${at}`,
        model,
        stop_reason: "end_turn",
        usage,
        content: [
          {
            type: "tool_use",
            id: `t-${at}`,
            name: "Skill",
            input: { skill: "demo" },
          },
        ],
      },
      ...extra,
    },
  ];
}

function write(file, entries, ageDays) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
  const when = new Date(Date.now() - ageDays * DAY);
  fs.utimesSync(file, when, when);
}

function run(root, ...args) {
  return JSON.parse(
    execFileSync(process.execPath, [TOOL, "--root", root, "--json", ...args], {
      encoding: "utf8",
      env: { ...process.env, CLAUDE_CONFIG_DIR: root },
    }),
  );
}

function fixture() {
  const root = tmpDir("usage");
  const iso = (days) => new Date(Date.now() - days * DAY).toISOString();
  // One million input tokens: $2 for sonnet, $1 for haiku.
  const million = { input_tokens: 1_000_000, output_tokens: 0 };
  write(
    path.join(root, "p", "recent.jsonl"),
    transcript("claude-sonnet-4", iso(1), million),
    1,
  );
  write(
    path.join(root, "p", "old.jsonl"),
    transcript("claude-haiku-4", iso(30), million),
    30,
  );
  return root;
}

test("`--json` prints the report of the window, and `--days` keeps only the calls inside it", () => {
  const root = fixture();
  const week = run(root, "--days", "7");
  assert.equal(week.total, 2);
  assert.deepEqual(week.byAgent, [{ type: "main", cost: 2, share: 100 }]);
  assert.equal(week.output.messages, 1);
  assert.deepEqual(week.entrypoints, { cli: 1 });
  assert.deepEqual(week.skills, [{ skill: "demo", uses: 1 }]);
  assert.equal(week.delegation.mainTurns, 1);

  const quarter = run(root, "--days", "60");
  assert.equal(quarter.total, 3);
  assert.equal(quarter.output.messages, 2);
  assert.deepEqual(quarter.skills, [{ skill: "demo", uses: 2 }]);
});

test("`--days` drops the old calls of a file that was written lately", () => {
  const root = tmpDir("usage");
  const iso = (days) => new Date(Date.now() - days * DAY).toISOString();
  const million = { input_tokens: 1_000_000 };
  const old = transcript("claude-sonnet-4", iso(30), million);
  const recent = transcript("claude-haiku-4", iso(1), million);
  // The file has a fresh mtime, so the filter on the timestamp of each entry must act.
  write(path.join(root, "p", "mixed.jsonl"), [...old, ...recent], 0);
  const r = run(root, "--days", "7");
  assert.equal(r.total, 1);
  assert.equal(r.output.messages, 1);
});

test("a window with no transcript gives an empty report", () => {
  const root = fixture();
  const r = run(root, "--days", "0.001");
  assert.equal(r.total, 0);
  assert.deepEqual(r.byAgent, []);
  assert.equal(r.cacheHitRate.all, null);
});

test("a subagent transcript counts under its agent type from the meta file", () => {
  const root = tmpDir("usage");
  const at = new Date(Date.now() - DAY).toISOString();
  const million = { input_tokens: 1_000_000 };
  write(
    path.join(root, "p", "s.jsonl"),
    transcript("claude-sonnet-4", at, million),
    1,
  );
  const sub = path.join(root, "p", "s", "subagents");
  write(
    path.join(sub, "agent-abc.jsonl"),
    transcript("claude-haiku-4", at, million),
    1,
  );
  fs.writeFileSync(
    path.join(sub, "agent-abc.meta.json"),
    '{"agentType":"dotclaude:investigator"}',
  );
  const r = run(root, "--days", "7");
  assert.deepEqual(
    r.byAgent.map((a) => [a.type, a.cost]),
    [
      ["main", 2],
      ["dotclaude:investigator", 1],
    ],
  );
  assert.deepEqual(r.delegation.runsByType, [
    { type: "dotclaude:investigator", runs: 1 },
  ]);
});

test("`--days` skips a file that nothing has written since the window began", () => {
  const root = tmpDir("usage");
  const at = new Date(Date.now() - DAY).toISOString();
  write(
    path.join(root, "p", "stale.jsonl"),
    transcript("claude-sonnet-4", at, { input_tokens: 1_000_000 }),
    30,
  );
  assert.equal(run(root, "--days", "7").total, 0);
});
