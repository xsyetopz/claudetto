// Tests of the calls of each run, the context that each call reads again, and the unused skills of `claudetto-usage` (task 28.5).
// Each fixture is a small transcript written to a temp folder, with timestamps relative to the real now.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type {
  Block,
  Entry,
  Usage,
} from "../../../src/plugins/claudetto-sessions/slices/usage/domain/transcript.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const BIN = path.join(PLUGINS, "claudetto-sessions", "bin", "claudetto-usage");
const at = new Date(Date.now() - 3_600_000).toISOString();

/** The parts of the `--json` report that these tests read. */
type Report = {
  calls: {
    runs: number;
    calls: number;
    reread: number;
    top: {
      id: string;
      type: string;
      calls: number;
      reread: number;
      rereadPerCall: number;
      rereadMax: number;
    }[];
  };
  unusedSkills: {
    available: number;
    unused: { skill: string; chars: number }[];
  };
  overWindowShare: number;
  turnCap: { runs: number };
};

const call = (id: string, usage: Usage, content: Block[] = []): Entry => ({
  type: "assistant",
  timestamp: at,
  message: {
    id,
    model: "claude-sonnet-5-5",
    stop_reason: "end_turn",
    usage,
    content,
  },
});
const skillCall = (id: string, skill: string): Block => ({
  type: "tool_use",
  id,
  name: "Skill",
  input: { skill },
});
const listing = (...lines: string[]): Entry => ({
  type: "attachment",
  timestamp: at,
  attachment: {
    type: "skill_listing",
    names: lines.map(
      (l) => (/^- (\S+?): /.exec(l) as RegExpExecArray)[1] as string,
    ),
    content: lines.join("\n"),
  },
});

const write = async (file: string, entries: Entry[]) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await Bun.write(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
};

// A config folder with a `projects` folder, and a report of it as JSON.
const setup = async (
  build: (config: string) => Promise<void>,
): Promise<Report> => {
  const config = tmpDir("runs");
  await build(config);
  const out = runBin(
    BIN,
    ["--days", "7", "--json", "--root", path.join(config, "projects")],
    { ...process.env, CLAUDE_CONFIG_DIR: config },
  );
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout) as Report;
};

test("each run has its calls, and the context that each call reads again is the cache read plus the input", async () => {
  const r = await setup(async (config) => {
    const main = path.join(config, "projects", "p", "s.jsonl");
    await write(main, [
      call("a", { input_tokens: 10, cache_read_input_tokens: 1000 }),
      // A second record of the same message counts once.
      call("a", {
        input_tokens: 10,
        cache_read_input_tokens: 1000,
        output_tokens: 5,
      }),
      call("b", {
        input_tokens: 20,
        cache_read_input_tokens: 2000,
        cache_creation_input_tokens: 900,
      }),
      call("c", { input_tokens: 30, cache_read_input_tokens: 3000 }),
    ]);
    await write(
      path.join(config, "projects", "p", "s", "subagents", "agent-x.jsonl"),
      [
        call("d", { input_tokens: 1, cache_read_input_tokens: 99 }),
        call("e", { input_tokens: 2, cache_read_input_tokens: 198 }),
      ],
    );
    await Bun.write(
      path.join(config, "projects", "p", "s", "subagents", "agent-x.meta.json"),
      '{"agentType":"plug:helper"}',
    );
  });
  expect(r.calls.runs).toBe(2);
  expect(r.calls.calls).toBe(5);
  expect(r.calls.reread).toBe(1010 + 2020 + 3030 + 100 + 200);
  expect(r.calls.top).toStrictEqual([
    {
      id: "s",
      type: "main",
      calls: 3,
      reread: 6060,
      rereadPerCall: 2020,
      rereadMax: 3030,
    },
    {
      id: "x",
      type: "plug:helper",
      calls: 2,
      reread: 300,
      rereadPerCall: 150,
      rereadMax: 200,
    },
  ]);
});

test("the skills that the transcripts list and the period did not call are unused, with the listing size", async () => {
  const r = await setup(async (config) => {
    await write(path.join(config, "projects", "p", "s.jsonl"), [
      listing("- used: a", "- plug:idle: long text here", "- idle: b"),
      call("a", { input_tokens: 1 }, [skillCall("t1", "used")]),
    ]);
  });
  expect(r.unusedSkills.available).toBe(3);
  expect(r.unusedSkills.unused).toStrictEqual([
    { skill: "plug:idle", chars: "- plug:idle: long text here".length + 1 },
    { skill: "idle", chars: "- idle: b".length + 1 },
  ]);
});

test("a call of a skill by its name with no plugin prefix counts as a use of the plugin skill", async () => {
  const r = await setup(async (config) => {
    await write(path.join(config, "projects", "p", "s.jsonl"), [
      listing("- plug:one: a", "- plug:two: b"),
      call("a", { input_tokens: 1 }, [skillCall("t1", "one")]),
    ]);
  });
  expect(r.unusedSkills.unused.map((s) => s.skill)).toStrictEqual(["plug:two"]);
});

test("with no listing in the transcripts, the list comes from the installed plugins and the skills folder, and the source says so", async () => {
  const r = await setup(async (config) => {
    const plugin = path.join(config, "plugins", "cache", "m", "plug", "1.0.0");
    fs.mkdirSync(path.join(plugin, "skills", "one"), { recursive: true });
    await Bun.write(
      path.join(plugin, "skills", "one", "SKILL.md"),
      "---\nname: one\n---\nBody\n",
    );
    fs.mkdirSync(path.join(plugin, "skills", "two"), { recursive: true });
    await Bun.write(
      path.join(plugin, "skills", "two", "SKILL.md"),
      "---\nname: two\n---\nBody\n",
    );
    await Bun.write(
      path.join(config, "plugins", "installed_plugins.json"),
      JSON.stringify({ plugins: { "plug@m": [{ installPath: plugin }] } }),
    );
    fs.mkdirSync(path.join(config, "skills", "mine"), { recursive: true });
    await Bun.write(
      path.join(config, "skills", "mine", "SKILL.md"),
      "---\nname: mine\n---\n",
    );
    await write(path.join(config, "projects", "p", "s.jsonl"), [
      call("a", { input_tokens: 1 }, [skillCall("t1", "plug:one")]),
    ]);
  });
  expect(r.unusedSkills.available).toBe(3);
  expect(r.unusedSkills.unused.map((s) => s.skill).sort()).toStrictEqual([
    "mine",
    "plug:two",
  ]);
});

test("`--window` sets the context window, and `--agents-dir` supplies `maxTurns`", async () => {
  const config = tmpDir("runs");
  const agents = path.join(config, "agents");
  fs.mkdirSync(agents);
  await Bun.write(
    path.join(agents, "helper.md"),
    "---\nname: helper\nmaxTurns: 3\n---\n",
  );
  const sub = path.join(config, "projects", "p", "s", "subagents");
  await write(path.join(config, "projects", "p", "s.jsonl"), [
    call("m", { input_tokens: 1 }),
  ]);
  await write(path.join(sub, "agent-x.jsonl"), [
    { type: "user", timestamp: at, message: { content: "brief" } },
    call("a", { input_tokens: 1000 }),
    call("b", { input_tokens: 1000 }),
    call("c", { input_tokens: 1000 }),
  ]);
  await Bun.write(
    path.join(sub, "agent-x.meta.json"),
    '{"agentType":"plug:helper"}',
  );
  const run = (...args: string[]): Report => {
    const out = runBin(
      BIN,
      ["--json", "--root", path.join(config, "projects"), ...args],
      { ...process.env, CLAUDE_CONFIG_DIR: config },
    );
    if (out.status !== 0) throw new Error(out.stderr);
    return JSON.parse(out.stdout) as Report;
  };
  expect(run().overWindowShare).toBe(0);
  expect(run("--window", "500").overWindowShare > 0).toBeTruthy();
  expect(run().turnCap.runs).toBe(0);
  expect(run("--agents-dir", agents).turnCap.runs).toBe(1);
});
