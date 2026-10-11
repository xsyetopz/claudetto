// Runtime code in `plugins/` is `.ts` with erasable syntax, or `.mjs` until the port of design D11 ends.
// A `.d.ts` file is allowed only when a manifest names it as its `types`.
// Generated files that git ignores, such as `.claude-plugin/types/`, are out of scope.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO, tmpDir } from "./repo.ts";

const SCRIPT = /\.(?:js|cjs|mts|cts|jsx|tsx)$|\.d\.ts$/;

/** The `types` paths that the manifest of each plugin names. */
async function namedTypes(root: string, files: string[]): Promise<string[]> {
  const named = [];
  for (const f of files) {
    if (!/^plugins\/[^/]+\/\.claude-plugin\/plugin\.json$/.test(f)) continue;
    const plugin = f.split("/").slice(0, 2).join("/");
    const { types } = JSON.parse(await Bun.file(path.join(root, f)).text()) as {
      types?: string;
    };
    if (types) named.push(path.posix.join(plugin, types));
  }
  return named;
}

/** The plugin files that break the runtime rule. */
async function offRuntime(root: string, files: string[]): Promise<string[]> {
  const allowed = new Set(await namedTypes(root, files));
  return files.filter(
    (f) => f.startsWith("plugins/") && SCRIPT.test(f) && !allowed.has(f),
  );
}

// A lint of the live repository.
test("lint: plugins ship no script that is not `.ts` or `.mjs`, except the allowed ones", async () => {
  const r = Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "plugins",
    ],
    { cwd: REPO },
  );
  expect(r.exitCode).toBe(0);
  const files = r.stdout.toString().split("\n").filter(Boolean);
  expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
  expect(await offRuntime(REPO, files)).toStrictEqual([]);
});

test("a `.js`, a `.tsx`, and a `.d.ts` that no manifest names fail, and a `.ts` passes", async () => {
  const root = tmpDir("runtimes");
  const manifest = "plugins/p/.claude-plugin/plugin.json";
  fs.mkdirSync(path.dirname(path.join(root, manifest)), { recursive: true });
  await Bun.write(
    path.join(root, manifest),
    JSON.stringify({ name: "p", types: "./types/index.d.ts" }),
  );
  const files = [
    manifest,
    "plugins/p/hooks/register.mjs",
    "plugins/p/tests/guard.test.ts",
    "plugins/p/types/index.d.ts",
    "plugins/p/features/x/cli.js",
    "plugins/p/features/x/rules.ts",
    "plugins/p/features/x/view.tsx",
    "plugins/p/types/extra.d.ts",
  ];
  expect(await offRuntime(root, files)).toStrictEqual([
    "plugins/p/features/x/cli.js",
    "plugins/p/features/x/view.tsx",
    "plugins/p/types/extra.d.ts",
  ]);
});
