// Test of the classic command hooks of each plugin: a hook file under `hooks/` sits in the folder of
// its event, and `hooks.json` names each file in a `hooks/<Event>/` folder.
// It reads each `hooks.json` as a file, because the hook lab does not load a JSON file.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS } from "../../support/repo.ts";

/** The path of a plugin file that a command names after `${CLAUDE_PLUGIN_ROOT}/`. */
const NAMED_FILE = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^\s"]+)/;

const plugins = fs
  .readdirSync(PLUGINS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/** The parts of a `hooks.json` that this test reads. */
type HookEntry = { type: string; command: string };
type HookGroup = { hooks: HookEntry[] };
type HooksFile = { hooks?: Record<string, HookGroup[]> };

/** The parsed `hooks.json` of each plugin, or an empty object for a plugin without one. */
const HOOKS_JSON = Object.fromEntries(
  await Promise.all(
    plugins.map(async (plugin): Promise<[string, HooksFile]> => {
      const file = Bun.file(path.join(PLUGINS, plugin, "hooks/hooks.json"));
      return [
        plugin,
        (await file.exists()) ? ((await file.json()) as HooksFile) : {},
      ];
    }),
  ),
);

/**
 * The command hooks of `plugin`, as `{ event, file }`.
 * `file` is the path under the plugin root, or undefined when the command names no such file.
 */
function commandHooks(plugin: string) {
  const { hooks = {} } = HOOKS_JSON[plugin] as HooksFile;
  return Object.entries(hooks).flatMap(([event, groups]) =>
    groups.flatMap((group) =>
      group.hooks
        .filter((hook) => hook.type === "command")
        .map((hook) => ({ event, file: hook.command.match(NAMED_FILE)?.[1] })),
    ),
  );
}

/** The files under `hooks/` that the command hooks of `plugin` name. */
function namedUnderHooks(plugin: string) {
  return commandHooks(plugin)
    .map((hook) => hook.file)
    .filter((file) => file?.startsWith("hooks/"));
}

/** The files in the event folders of `plugin`, as paths under the plugin root. */
function eventFolderFiles(plugin: string) {
  const hooksDir = path.join(PLUGINS, plugin, "hooks");
  if (!fs.existsSync(hooksDir)) return [];
  return fs
    .readdirSync(hooksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((folder) =>
      fs
        .readdirSync(path.join(hooksDir, folder.name))
        .map((name) => `hooks/${folder.name}/${name}`),
    );
}

test("Classic hook folder: a command hook under `hooks/` sits in the folder of its event", () => {
  const misplaced = plugins.flatMap((plugin) =>
    commandHooks(plugin)
      .filter(({ file }) => file?.startsWith("hooks/"))
      .filter(
        ({ event, file }) =>
          path.posix.dirname(file as string) !== `hooks/${event}`,
      )
      .map(({ event, file }) => `${plugin}: ${event} -> ${file}`),
  );
  expect(misplaced).toEqual([]);
});

test("Classic hook folder: `hooks.json` names each file in a `hooks/<Event>/` folder", () => {
  const unnamed = plugins.flatMap((plugin) => {
    const named = namedUnderHooks(plugin);
    return eventFolderFiles(plugin)
      .filter((file) => !named.includes(file))
      .map((file) => `${plugin}: ${file}`);
  });
  expect(unnamed).toEqual([]);
});

test("Classic hook folder: no command hook of `dotclaude` names a file outside `hooks/`", () => {
  const outside = commandHooks("dotclaude")
    .map((hook) => hook.file)
    .filter((file) => file && !file.startsWith("hooks/"));
  expect(outside).toEqual([]);
});
