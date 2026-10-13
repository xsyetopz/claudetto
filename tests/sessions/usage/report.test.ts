// Tests of the `dotclaude-usage` bin and its helpers (task 28.4): the parse of transcripts, the `--days` filter, and the `--json` output.
// Fixture timestamps are relative to the real now at test time, because the tool reads `Date.now()`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { store } from "../../../src/plugins/dotclaude-sessions/slices/usage/adapters/store.ts";
import {
  briefSize,
  callCost,
  median,
  quantile,
  tokens,
} from "../../../src/plugins/dotclaude-sessions/slices/usage/domain/parse.ts";
import {
  agentType,
  type Entry,
  type Usage,
} from "../../../src/plugins/dotclaude-sessions/slices/usage/domain/transcript.ts";
import { installedSkills } from "../../../src/plugins/dotclaude-sessions/slices/usage/domain/runs.ts";
import {
  reserve,
  turnsFromText,
} from "../../../src/plugins/dotclaude-sessions/slices/usage/domain/turns.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const TOOL = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-usage");
const DAY = 86_400_000;
const near = (a: number, b: number) =>
  expect(Math.abs(a - b) < 1e-9, `${a} is not ${b}`).toBeTruthy();

test("a sonnet call costs input, output, cache read, and the 5m and 1h writes at their prices", async () => {
  const c = callCost("claude-sonnet-5-5", {
    input_tokens: 1000,
    output_tokens: 500,
    cache_read_input_tokens: 2000,
    cache_creation_input_tokens: 30_000,
    cache_creation: {
      ephemeral_5m_input_tokens: 10_000,
      ephemeral_1h_input_tokens: 20_000,
    },
  });
  // $2 input, $10 output, $0.1 read, $2.5 5m write, $4 1h write, per million tokens.
  near(c.write, (10_000 * 2.5 + 20_000 * 4) / 1e6);
  near(c.total, (1000 * 2 + 500 * 10 + 2000 * 0.1) / 1e6 + c.write);
  expect(c.read).toBe(2000);
  expect(c.context).toBe(33_000);
  expect(c.rewrite).toBe(false);
});

test("a call with no split of the cache write prices all of it as a 5m write", async () => {
  const c = callCost("claude-opus-5-5", {
    cache_creation_input_tokens: 1_000_000,
  });
  near(c.write, 5);
  near(c.total, 5);
});

test("each model has its own price, and an unknown model costs nothing", async () => {
  const usage = { input_tokens: 1_000_000 };
  near(callCost("claude-mythos-5-1", usage).total, 10);
  near(callCost("claude-fable-5-1", usage).total, 10);
  near(callCost("claude-opus-5-5", usage).total, 4);
  near(callCost("claude-sonnet-5-5", usage).total, 2);
  near(callCost("claude-haiku-5-5", usage).total, 0.5);
  expect(callCost("gpt-x", usage)).toStrictEqual({
    total: 0,
    write: 0,
    context: 0,
    read: 0,
  });
  expect(callCost(undefined, usage).total).toBe(0);
});

test("a haiku 5.5 prompt over 100,000 tokens, with its cache reads and writes, pays the long prices", async () => {
  const haiku = (u: Usage) => callCost("claude-haiku-5-5", u).total;
  near(haiku({ input_tokens: 100_000 }), (100_000 * 0.1) / 1e6);
  near(haiku({ input_tokens: 100_001 }), (100_001 * 0.5) / 1e6);
  near(
    haiku({ input_tokens: 1, cache_read_input_tokens: 100_000 }),
    (1 * 0.5 + 100_000 * 0.05) / 1e6,
  );
});

test("each version of a family has its own price, and a version that is not listed gets the newest price", async () => {
  const read = { cache_read_input_tokens: 1_000_000 };
  near(callCost("claude-fable-5-1", read).total, 0.25);
  near(callCost("claude-fable-5", read).total, 1);
  near(callCost("claude-opus-9-9", { input_tokens: 1_000_000 }).total, 4);
});

test("a write over 30k tokens that is larger than the read is a full rewrite", async () => {
  const rewrite = (write: number, read: number) =>
    callCost("claude-sonnet-5-5", {
      cache_creation_input_tokens: write,
      cache_read_input_tokens: read,
    }).rewrite;
  expect(rewrite(30_001, 0)).toBe(true);
  expect(rewrite(30_000, 0)).toBe(false);
  expect(rewrite(40_000, 40_000)).toBe(false);
  expect(rewrite(40_000, 39_999)).toBe(true);
});

test("the agent type is main outside `subagents`, and comes from the meta file inside", async () => {
  const root = tmpDir("usage");
  const sub = path.join(root, "s", "subagents");
  fs.mkdirSync(sub, { recursive: true });
  await Bun.write(
    path.join(sub, "agent-1.meta.json"),
    '{"agentType":"dotclaude:x"}',
  );
  expect(await agentType(store, path.join(root, "s.jsonl"))).toBe("main");
  expect(await agentType(store, path.join(sub, "agent-1.jsonl"))).toBe(
    "dotclaude:x",
  );
  expect(await agentType(store, path.join(sub, "agent-2.jsonl"))).toBe(
    "subagent",
  );
});

test("the median and the quantile pick from sorted values and give zero for none", async () => {
  expect(median([5, 1, 3])).toBe(3);
  expect(median([4, 1, 2, 3])).toBe(2);
  expect(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBe(9);
  expect(median([])).toBe(0);
  expect(quantile([], 0.9)).toBe(0);
});

test("the token estimate is the larger of chars over 4 and words over 0.75", async () => {
  expect(tokens("")).toBe(0);
  expect(tokens("a b c")).toBe(4);
  expect(tokens("x".repeat(40))).toBe(10);
});

test("the report reserve is a twentieth of the limit and at least 3", async () => {
  expect(reserve(10)).toBe(3);
  expect(reserve(100)).toBe(5);
});

test("the turn count restarts at a prompt, and tool results and plain meta entries do not restart it", async () => {
  const lines = [
    { type: "user", message: { content: "prompt" } },
    { type: "assistant", message: { id: "a" } },
    { type: "user", message: { content: [{ type: "tool_result" }] } },
    { type: "assistant", message: { id: "b" } },
    { type: "user", isMeta: true, message: { content: "reminder" } },
    { type: "assistant", message: { id: "b" } },
    { type: "assistant", message: { id: "c" } },
  ].map((e) => JSON.stringify(e));
  expect(turnsFromText(lines.join("\n"))).toBe(3);
  lines.splice(
    5,
    0,
    JSON.stringify({
      type: "user",
      isMeta: true,
      origin: { kind: "task-notification" },
    }),
  );
  expect(turnsFromText(lines.join("\n"))).toBe(2);
});

// A transcript with one main-session call at `at` and a `Skill` call.
const transcript = (
  model: string,
  at: string,
  usage: Usage,
  extra: Partial<Entry> = {},
): Entry[] => {
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
};

const write = async (file: string, entries: Entry[], ageDays: number) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
  const when = new Date(Date.now() - ageDays * DAY);
  fs.utimesSync(file, when, when);
};

/** The parts of the `--json` report that these tests read. */
type Report = {
  total: number;
  byAgent: { type: string; cost: number; share: number }[];
  output: { messages: number };
  entrypoints: Record<string, number>;
  skills: { skill: string; uses: number }[];
  delegation: {
    mainTurns: number;
    runsByType: { type: string; runs: number }[];
  };
  cacheHitRate: { all: number | null };
};

const run = (root: string, ...args: string[]): Report => {
  const out = runBin(TOOL, ["--root", root, "--json", ...args], {
    ...process.env,
    CLAUDE_CONFIG_DIR: root,
  });
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout) as Report;
};

const fixture = async () => {
  const root = tmpDir("usage");
  const iso = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  // One million input tokens: $2 for sonnet 5.5, and $0.5 for haiku 5.5 at its long prices.
  const million = { input_tokens: 1_000_000, output_tokens: 0 };
  await write(
    path.join(root, "p", "recent.jsonl"),
    transcript("claude-sonnet-5-5", iso(1), million),
    1,
  );
  await write(
    path.join(root, "p", "old.jsonl"),
    transcript("claude-haiku-5-5", iso(30), million),
    30,
  );
  return root;
};

test("`--json` prints the report of the window, and `--days` keeps only the calls inside it", async () => {
  const root = await fixture();
  const week = run(root, "--days", "7");
  expect(week.total).toBe(2);
  expect(week.byAgent).toStrictEqual([{ type: "main", cost: 2, share: 100 }]);
  expect(week.output.messages).toBe(1);
  expect(week.entrypoints).toStrictEqual({ cli: 1 });
  expect(week.skills).toStrictEqual([{ skill: "demo", uses: 1 }]);
  expect(week.delegation.mainTurns).toBe(1);

  const quarter = run(root, "--days", "60");
  expect(quarter.total).toBe(2.5);
  expect(quarter.output.messages).toBe(2);
  expect(quarter.skills).toStrictEqual([{ skill: "demo", uses: 2 }]);
});

test("`--days` drops the old calls of a file that was written lately", async () => {
  const root = tmpDir("usage");
  const iso = (days: number) => new Date(Date.now() - days * DAY).toISOString();
  const million = { input_tokens: 1_000_000 };
  const old = transcript("claude-sonnet-5-5", iso(30), million);
  const recent = transcript("claude-haiku-5-5", iso(1), million);
  // The file has a fresh mtime, so the filter on the timestamp of each entry must act.
  await write(path.join(root, "p", "mixed.jsonl"), [...old, ...recent], 0);
  const r = run(root, "--days", "7");
  expect(r.total).toBe(0.5);
  expect(r.output.messages).toBe(1);
});

test("a window with no transcript gives an empty report", () => {
  // `--days` takes whole days, so the empty folder is the window with no transcript.
  const r = run(tmpDir("usage-empty"), "--days", "1");
  expect(r.total).toBe(0);
  expect(r.byAgent).toStrictEqual([]);
  expect(r.cacheHitRate.all).toBe(null);
});

test("a subagent transcript counts under its agent type from the meta file", async () => {
  const root = tmpDir("usage");
  const at = new Date(Date.now() - DAY).toISOString();
  const million = { input_tokens: 1_000_000 };
  await write(
    path.join(root, "p", "s.jsonl"),
    transcript("claude-sonnet-5-5", at, million),
    1,
  );
  const sub = path.join(root, "p", "s", "subagents");
  await write(
    path.join(sub, "agent-abc.jsonl"),
    transcript("claude-haiku-5-5", at, million),
    1,
  );
  await Bun.write(
    path.join(sub, "agent-abc.meta.json"),
    '{"agentType":"dotclaude:investigator"}',
  );
  const r = run(root, "--days", "7");
  expect(r.byAgent.map((a) => [a.type, a.cost])).toStrictEqual([
    ["main", 2],
    ["dotclaude:investigator", 0.5],
  ]);
  expect(r.delegation.runsByType).toStrictEqual([
    { type: "dotclaude:investigator", runs: 1 },
  ]);
});

test("`--days` skips a file that nothing has written since the window began", async () => {
  const root = tmpDir("usage");
  const at = new Date(Date.now() - DAY).toISOString();
  await write(
    path.join(root, "p", "stale.jsonl"),
    transcript("claude-sonnet-5-5", at, { input_tokens: 1_000_000 }),
    30,
  );
  expect(run(root, "--days", "7").total).toBe(0);
});

test("the brief reader skips a `null`, a number, and an array line, and reads the prompt after them", async () => {
  const prompt = JSON.stringify({
    type: "user",
    message: { content: "- read src/a.ts\n- write src/b.ts" },
  });
  const store = {
    read: async () => `null\n5\n[]\n${prompt}`,
    list: async () => [],
  };
  expect(await briefSize(store, "s.jsonl")).toStrictEqual({
    files: 2,
    items: 2,
  });
});

test("a meta file or an installed-plugins file that is `null` gives the defaults and does not throw", async () => {
  const root = tmpDir("usage-null");
  const file = path.join(root, "p", "subagents", "agent-n.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(path.join(root, "p", "subagents", "agent-n.meta.json"), "null");
  expect(await agentType(store, file)).toBe("subagent");
  fs.mkdirSync(path.join(root, "plugins"));
  fs.writeFileSync(path.join(root, "plugins", "installed_plugins.json"), "null");
  expect(await installedSkills(store, root)).toStrictEqual([]);
});
