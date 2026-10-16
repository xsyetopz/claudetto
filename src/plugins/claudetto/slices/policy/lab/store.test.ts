// Lab tests of the `policy` slice: only the tool `ai_policy` writes the verdict store.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bash, denyOf, option, stub } from "./world.ts";

const TOOL = "mcp__claudetto__ai_policy";
const FILE = "/home/me/.claudetto/policy/github.com_them_forge.json";

test(
  // biome-ignore lint/plugin: a test name
  "a file tool does not write the verdict store, in a session with no repository",
  option(),
  async ($: Engine, on: On) => {
    stub(on, { files: {}, repos: {} });
    const calls = [
      $.tool.call({ tool: "Write", file_path: FILE, content: "{}" }),
      $.tool.call({
        tool: "Edit",
        file_path: FILE,
        old_string: "a",
        new_string: "b",
      }),
      $.tool.call({
        tool: "NotebookEdit",
        notebook_path: FILE,
        new_source: "x",
      }),
      $.tool.call({
        tool: "Write",
        file_path: "/tmp/../home/me/.claudetto/policy/x.json",
        content: "{}",
      }),
    ];
    for (const call of calls) expect(denyOf(await call)).toContain(TOOL);
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a command does not write the verdict store, in a session with no repository",
  option(),
  async ($: Engine, on: On) => {
    stub(on, { files: {}, repos: {} });
    for (const command of [
      "echo '{}' > ~/.claudetto/policy/x.json",
      "echo '{}' >> /home/me/.claudetto/policy/x.json",
      "cp x.json ~/.claudetto/policy/x.json",
      "mv x.json ~/.claudetto/policy/x.json",
      "rm ~/.claudetto/policy/x.json",
      "rm -rf ~/.claudetto",
      "tee ~/.claudetto/policy/x.json",
      "sed -i s/forbidden/allowed/ ~/.claudetto/policy/x.json",
      "python3 fix.py ~/.claudetto/policy/x.json",
      "cd ~/.claudetto/policy && echo x > a.json",
      "cd ~/.claudetto && rm -rf policy",
      "touch /home/me/.claudetto/policy/x.json",
    ])
      expect(denyOf(await bash($, command)), command).toContain(TOOL);
  },
);

test(
  "a command that only reads the verdict store is allowed",
  option(),
  async ($: Engine, on: On) => {
    stub(on, { files: {}, repos: {} });
    for (const command of [
      "cat ~/.claudetto/policy/x.json",
      "ls ~/.claudetto/policy",
      "grep forbidden ~/.claudetto/policy/*.json",
    ])
      expect(denyOf(await bash($, command)), command).toBeUndefined();
  },
);
