// Tests of the calls of each run, the context that each call reads again, and the unused skills of `dotclaude-usage` (task 28.5).
// Each fixture is a small transcript written to a temp folder, with timestamps relative to the real now.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const BIN = path.join(PLUGINS, "dotclaude-sessions", "bin", "dotclaude-usage");
const at = new Date(Date.now() - 3_600_000).toISOString();

const call = (id, usage, content = []) => ({
  type: "assistant",
  timestamp: at,
  message: {
    id,
    model: "claude-sonnet-4",
    stop_reason: "end_turn",
    usage,
    content,
  },
});
const skillCall = (id, skill) => ({
  type: "tool_use",
  id,
  name: "Skill",
  input: { skill },
});
const listing = (...lines) => ({
  type: "attachment",
  timestamp: at,
  attachment: {
    type: "skill_listing",
    names: lines.map((l) => /^- (\S+?): /.exec(l)[1]),
    content: lines.join("\n"),
  },
});

function write(file, entries) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
}

// A config folder with a `projects` folder, and a report of it as JSON.
function setup(build) {
  const config = tmpDir("runs");
  build(config);
  const out = execFileSync(
    process.execPath,
    [BIN, "--days", "7", "--json", "--root", path.join(config, "projects")],
    { encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: config } },
  );
  return JSON.parse(out);
}

test("each run has its calls, and the context that each call reads again is the cache read plus the input", () => {
  const r = setup((config) => {
    const main = path.join(config, "projects", "p", "s.jsonl");
    write(main, [
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
    write(
      path.join(config, "projects", "p", "s", "subagents", "agent-x.jsonl"),
      [
        call("d", { input_tokens: 1, cache_read_input_tokens: 99 }),
        call("e", { input_tokens: 2, cache_read_input_tokens: 198 }),
      ],
    );
    fs.writeFileSync(
      path.join(config, "projects", "p", "s", "subagents", "agent-x.meta.json"),
      '{"agentType":"plug:helper"}',
    );
  });
  assert.equal(r.calls.runs, 2);
  assert.equal(r.calls.calls, 5);
  assert.equal(r.calls.reread, 1010 + 2020 + 3030 + 100 + 200);
  assert.deepEqual(r.calls.top, [
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

test("the skills that the transcripts list and the period did not call are unused, with the listing size", () => {
  const r = setup((config) => {
    write(path.join(config, "projects", "p", "s.jsonl"), [
      listing("- used: a", "- plug:idle: long text here", "- idle: b"),
      call("a", { input_tokens: 1 }, [skillCall("t1", "used")]),
    ]);
  });
  assert.equal(r.unusedSkills.source, "the skill listings of the transcripts");
  assert.equal(r.unusedSkills.available, 3);
  assert.deepEqual(r.unusedSkills.unused, [
    { skill: "plug:idle", chars: "- plug:idle: long text here".length + 1 },
    { skill: "idle", chars: "- idle: b".length + 1 },
  ]);
});

test("a call of a skill by its name with no plugin prefix counts as a use of the plugin skill", () => {
  const r = setup((config) => {
    write(path.join(config, "projects", "p", "s.jsonl"), [
      listing("- plug:one: a", "- plug:two: b"),
      call("a", { input_tokens: 1 }, [skillCall("t1", "one")]),
    ]);
  });
  assert.deepEqual(
    r.unusedSkills.unused.map((s) => s.skill),
    ["plug:two"],
  );
});

test("with no listing in the transcripts, the list comes from the installed plugins and the skills folder, and the source says so", () => {
  const r = setup((config) => {
    const plugin = path.join(config, "plugins", "cache", "m", "plug", "1.0.0");
    fs.mkdirSync(path.join(plugin, "skills", "one"), { recursive: true });
    fs.writeFileSync(
      path.join(plugin, "skills", "one", "SKILL.md"),
      "---\nname: one\n---\nBody\n",
    );
    fs.mkdirSync(path.join(plugin, "skills", "two"), { recursive: true });
    fs.writeFileSync(
      path.join(plugin, "skills", "two", "SKILL.md"),
      "---\nname: two\n---\nBody\n",
    );
    fs.writeFileSync(
      path.join(config, "plugins", "installed_plugins.json"),
      JSON.stringify({ plugins: { "plug@m": [{ installPath: plugin }] } }),
    );
    fs.mkdirSync(path.join(config, "skills", "mine"), { recursive: true });
    fs.writeFileSync(
      path.join(config, "skills", "mine", "SKILL.md"),
      "---\nname: mine\n---\n",
    );
    write(path.join(config, "projects", "p", "s.jsonl"), [
      call("a", { input_tokens: 1 }, [skillCall("t1", "plug:one")]),
    ]);
  });
  assert.equal(r.unusedSkills.available, 3);
  assert.deepEqual(r.unusedSkills.unused.map((s) => s.skill).sort(), [
    "mine",
    "plug:two",
  ]);
});

test("`--window` sets the context window, and `--agents-dir` supplies `maxTurns`", () => {
  const config = tmpDir("runs");
  const agents = path.join(config, "agents");
  fs.mkdirSync(agents);
  fs.writeFileSync(
    path.join(agents, "helper.md"),
    "---\nname: helper\nmaxTurns: 3\n---\n",
  );
  const sub = path.join(config, "projects", "p", "s", "subagents");
  write(path.join(config, "projects", "p", "s.jsonl"), [
    call("m", { input_tokens: 1 }),
  ]);
  write(path.join(sub, "agent-x.jsonl"), [
    { type: "user", timestamp: at, message: { content: "brief" } },
    call("a", { input_tokens: 1000 }),
    call("b", { input_tokens: 1000 }),
    call("c", { input_tokens: 1000 }),
  ]);
  fs.writeFileSync(
    path.join(sub, "agent-x.meta.json"),
    '{"agentType":"plug:helper"}',
  );
  const run = (...args) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [BIN, "--json", "--root", path.join(config, "projects"), ...args],
        {
          encoding: "utf8",
          env: { ...process.env, CLAUDE_CONFIG_DIR: config },
        },
      ),
    );
  assert.equal(run().overWindowShare, 0);
  assert.ok(run("--window", "500").overWindowShare > 0);
  assert.equal(run().turnCap.runs, 0);
  assert.equal(run("--agents-dir", agents).turnCap.runs, 1);
});
