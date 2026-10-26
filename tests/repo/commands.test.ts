// Bun runs each command of the workspace and of the plugins (`AGENTS.md`).
// A plugin command also passes `--no-env-file`, so Bun does not load the `.env` of the project of the user.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { SNIPPET } from "../../plugins/claudetto/snippets.ts";
import { REPO, tmpDir } from "../support/repo.ts";

const PACKAGE_MANAGER = "bun@1.4.4";
const PLUGIN_COMMAND = /^bun --no-env-file /;

type Manifest = { packageManager?: string; scripts?: Record<string, string> };

/** The faults of a `package.json`: a command that does not start with `bun`, and a wrong `packageManager`. */
const offBun = (manifest: Manifest): string[] => {
  const faults = Object.entries(manifest.scripts ?? {})
    .filter(([, command]) => !/^bunx? /.test(command))
    .map(([name, command]) => `script ${name}: ${command}`);
  if (manifest.packageManager !== PACKAGE_MANAGER) {
    faults.push(`packageManager: ${manifest.packageManager}`);
  }
  return faults;
};

/** The `command` of each command hook in a parsed `hooks.json`. */
const hookCommands = (hooks: unknown): string[] => {
  if (Array.isArray(hooks)) return hooks.flatMap(hookCommands);
  if (hooks === null || typeof hooks !== "object") return [];
  const entry = hooks as Record<string, unknown>;
  const own =
    entry["type"] === "command" && typeof entry["command"] === "string"
      ? [entry["command"]]
      : [];
  return [...own, ...Object.values(entry).flatMap(hookCommands)];
};

/** The commands that do not start with `bun --no-env-file`. */
const offPluginBun = (commands: string[]): string[] =>
  commands.filter((command) => !PLUGIN_COMMAND.test(command));

// A lint of the live repository.
test("lint: each script of `package.json` starts with `bun`, and `packageManager` is `bun@1.4.4`", async () => {
  const manifest = await Bun.file(path.join(REPO, "package.json")).json();
  expect(offBun(manifest)).toEqual([]);
});

// A lint of the live repository.
test("lint: each command hook of a plugin and each status line command of the snippet start with `bun --no-env-file`", async () => {
  const files = new Bun.Glob("plugins/*/hooks/hooks.json").scan({
    cwd: REPO,
    absolute: true,
  });
  // A `hooks.json` has `modules` and no command hook in 0.2.0, so the lint proves the file list.
  const hooks: string[] = [];
  let seen = 0;
  for await (const file of files) {
    seen += 1;
    hooks.push(...hookCommands(await Bun.file(file).json()));
  }
  expect(seen).toBeGreaterThanOrEqual(1);
  const commands = [
    SNIPPET.statusLine.command,
    SNIPPET.subagentStatusLine.command,
    ...hooks,
  ];
  expect(offPluginBun(commands)).toEqual([]);
});

test("a script on `node`, `npx`, or `pnpm`, and a `pnpm` package manager, fail", () => {
  expect(
    offBun({
      packageManager: "pnpm@12.10.1",
      scripts: {
        test: "node --test",
        lint: "npx biome ci",
        md: "pnpm run lint:md",
        ok: "bun test",
        tool: "bunx tsc",
      },
    }),
  ).toEqual([
    "script test: node --test",
    "script lint: npx biome ci",
    "script md: pnpm run lint:md",
    "packageManager: pnpm@12.10.1",
  ]);
});

test("a hook on `node`, and a hook on `bun` that loads `.env`, fail", () => {
  const hooks = {
    hooks: {
      PreToolUse: [
        {
          hooks: [
            { type: "command", command: 'node "x/cli.ts"' },
            { type: "command", command: 'bun "x/cli.ts"' },
            { type: "command", command: 'bun --no-env-file "x/cli.ts"' },
            { type: "prompt", prompt: "node" },
          ],
        },
      ],
    },
  };
  expect(offPluginBun(hookCommands(hooks))).toEqual([
    'node "x/cli.ts"',
    'bun "x/cli.ts"',
  ]);
});

// A failed check can print the environment of a child, so no `.env` value of the developer may reach a test.
test("with the `bunfig.toml` of the repository, Bun loads no `.env` file", async () => {
  const dir = tmpDir("bunfig-env");
  fs.copyFileSync(
    path.join(REPO, "bunfig.toml"),
    path.join(dir, "bunfig.toml"),
  );
  await Bun.write(path.join(dir, ".env"), "CLAUDETTO_PROBE=loaded\n");
  const env = { ...process.env };
  delete env["CLAUDETTO_PROBE"];
  const r = Bun.spawnSync(
    [
      process.execPath,
      "-e",
      "process.stdout.write(process.env.CLAUDETTO_PROBE ?? 'unset')",
    ],
    { cwd: dir, env },
  );
  expect(r.stdout.toString()).toBe("unset");
});
