// Runtime JavaScript in `plugins/` is `.mjs` on Node (design D19).
// The one exception is the `.test.ts` files of the hook lab, which
// `claude plugin test` requires, and the `types/*.d.ts` file that a manifest
// names. Generated files that git ignores, such as `.claude-plugin/types/`,
// are out of scope.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = path.join(import.meta.dirname, "../..");
const SCRIPT = /\.(?:js|cjs|ts|mts|cts|jsx|tsx)$/;

/** The `types` paths that the manifest of each plugin names. */
function namedTypes(root, files) {
  return files
    .filter((f) => /^plugins\/[^/]+\/\.claude-plugin\/plugin\.json$/.test(f))
    .flatMap((f) => {
      const plugin = f.split("/").slice(0, 2).join("/");
      const types = JSON.parse(
        fs.readFileSync(path.join(root, f), "utf8"),
      ).types;
      return types ? [path.posix.join(plugin, types)] : [];
    });
}

/** The plugin files that break the runtime rule. */
function offRuntime(root, files) {
  const allowed = new Set(namedTypes(root, files));
  return files.filter(
    (f) =>
      f.startsWith("plugins/") &&
      SCRIPT.test(f) &&
      !/\/tests\/[^/]+\.test\.ts$/.test(f) &&
      !allowed.has(f),
  );
}

test("plugins ship no script that is not `.mjs`, except the allowed ones", () => {
  const r = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "plugins"],
    { cwd: REPO, encoding: "utf8" },
  );
  expect(r.status).toBe(0);
  const files = r.stdout.split("\n").filter(Boolean);
  expect(files.some((f) => f.endsWith(".mjs"))).toBe(true);
  expect(offRuntime(REPO, files)).toEqual([]);
});

test("a `.js`, a `.ts`, and a `.d.ts` that no manifest names fail", () => {
  const root = fs.mkdtempSync(path.join(process.env.TMPDIR, "runtimes-"));
  const manifest = "plugins/p/.claude-plugin/plugin.json";
  fs.mkdirSync(path.dirname(path.join(root, manifest)), { recursive: true });
  fs.writeFileSync(
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
    "plugins/p/types/extra.d.ts",
  ];
  expect(offRuntime(root, files)).toEqual([
    "plugins/p/features/x/cli.js",
    "plugins/p/features/x/rules.ts",
    "plugins/p/types/extra.d.ts",
  ]);
});
