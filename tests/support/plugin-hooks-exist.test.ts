// Each file that a command hook of a `hooks.json` names exists in its plugin.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS } from "./repo.ts";

type Hooks = {
  hooks?: Record<string, { hooks: { type: string; command?: string }[] }[]>;
};

const ROOT_FILE = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"']+)/;

/** The plugin folders that have a `hooks/hooks.json`. */
const withHooks = fs
  .readdirSync(PLUGINS)
  .filter((name) =>
    fs.existsSync(path.join(PLUGINS, name, "hooks/hooks.json")),
  );

test("there are plugins with a `hooks.json`", () => {
  expect(withHooks.length).toBeGreaterThan(0);
});

test.each(withHooks)(
  "each file that a command hook of %s names exists",
  async (name) => {
    const dir = path.join(PLUGINS, name);
    const config: Hooks = await Bun.file(
      path.join(dir, "hooks/hooks.json"),
    ).json();
    const commands = Object.values(config.hooks ?? {})
      .flat()
      .flatMap((group) => group.hooks)
      .filter((hook) => hook.type === "command");
    for (const hook of commands) {
      const file = ROOT_FILE.exec(hook.command ?? "")?.[1];
      expect(file, hook.command).toBeDefined();
      expect(fs.existsSync(path.join(dir, file as string)), file).toBe(true);
    }
  },
);
