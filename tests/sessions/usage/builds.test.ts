// Tests of the build of each session in `dotclaude-usage` (P38): the stamp row of a transcript, and the total of each build.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { formatStamp, type StampRecord } from "../../../src/kernel/stamp.ts";
import type { Entry } from "../../../src/plugins/dotclaude-sessions/slices/usage/domain/transcript.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const TOOL = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-usage");
const AT = new Date(Date.now() - 86_400_000).toISOString();

/** The `--json` report parts that these tests read. */
type Report = {
  builds: {
    byBuild: { build: string; sessions: number; cost: number }[];
    latest: { id: string; build: string; cost: number }[];
  };
};

const stampOf = (version: string, sha: string): StampRecord => ({
  version,
  sha,
  shaSource: "git",
  sessionId: "s",
  at: AT,
});

/** A session with one call of `model` on one million input tokens, and a stamp row when `stamp` is given. */
const session = (model: string, stamp?: StampRecord): Entry[] => [
  ...(stamp
    ? [
        {
          type: "system",
          subtype: "informational",
          timestamp: AT,
          content: formatStamp(stamp),
        },
      ]
    : []),
  {
    type: "user",
    timestamp: AT,
    entrypoint: "cli",
    message: { content: "hi" },
  },
  {
    type: "assistant",
    timestamp: AT,
    message: {
      id: "m1",
      model,
      stop_reason: "end_turn",
      usage: { input_tokens: 1_000_000 },
      content: [],
    },
  },
];

const write = async (root: string, name: string, entries: Entry[]) => {
  const file = path.join(root, "p", `${name}.jsonl`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(file, entries.map((e) => JSON.stringify(e)).join("\n"));
};

const run = (root: string): Report => {
  const out = runBin(TOOL, ["--root", root, "--json"], {
    ...process.env,
    CLAUDE_CONFIG_DIR: root,
  });
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout) as Report;
};

test("the sessions of one build add up to one total, and a session with no stamp row is `unknown`", async () => {
  const root = tmpDir("usage");
  // Two sessions of one build, one session of a second build, and one session with no stamp row.
  await write(
    root,
    "a",
    session("claude-sonnet-5-5", stampOf("1.0.0", "0123456")),
  );
  await write(
    root,
    "b",
    session("claude-haiku-5-5", stampOf("1.1.0", "fedcba9")),
  );
  await write(root, "c", session("claude-sonnet-5-5"));
  await write(
    root,
    "d",
    session("claude-sonnet-5-5", stampOf("1.0.0", "0123456")),
  );
  const { builds } = run(root);
  // Sonnet 5.5 costs $2 and haiku 5.5 $0.5 per million input tokens, so the largest total comes first.
  expect(
    builds.byBuild.map((b) => [b.build, b.sessions, b.cost]),
  ).toStrictEqual([
    ["1.0.0 0123456", 2, 4],
    ["unknown", 1, 2],
    ["1.1.0 fedcba9", 1, 0.5],
  ]);
});

test("each session shows its own build, from its stamp row", async () => {
  const root = tmpDir("usage");
  await write(
    root,
    "a",
    session("claude-sonnet-5-5", stampOf("1.0.0", "0123456")),
  );
  await write(
    root,
    "b",
    session("claude-haiku-5-5", stampOf("1.1.0", "fedcba9")),
  );
  await write(root, "c", session("claude-sonnet-5-5"));
  const { builds } = run(root);
  expect(
    Object.fromEntries(builds.latest.map((s) => [s.id, s.build])),
  ).toStrictEqual({
    a: "1.0.0 0123456",
    b: "1.1.0 fedcba9",
    c: "unknown",
  });
});
