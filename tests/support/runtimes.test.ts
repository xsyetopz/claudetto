// Runtime code in `plugins/` is `.ts` with erasable syntax, and a plugin ships no `.js` or `.mjs` file.
// A `.d.ts` file is allowed only when a manifest names it as its `types`.
// Generated files that git ignores, such as `.claude-plugin/types/`, are out of scope.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO, tmpDir } from "./repo.ts";

const SCRIPT = /\.(?:js|mjs|cjs|mts|cts|jsx|tsx)$|\.d\.ts$/;

/** The `types` paths that the manifest of each plugin names. */
const namedTypes = async (root: string, files: string[]): Promise<string[]> => {
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
};

/** The plugin files that break the runtime rule. */
const offRuntime = async (root: string, files: string[]): Promise<string[]> => {
  const allowed = new Set(await namedTypes(root, files));
  return files.filter(
    (f) => f.startsWith("plugins/") && SCRIPT.test(f) && !allowed.has(f),
  );
};

// A lint of the live repository.
test("Shipped file: plugins ship no script that is not `.ts`, except the allowed ones", async () => {
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

test("a `.js`, a `.mjs`, a `.tsx`, and a `.d.ts` that no manifest names fail, and a `.ts` passes", async () => {
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
    "plugins/p/tests/lab.test.ts",
    "plugins/p/types/index.d.ts",
    "plugins/p/slices/x/cli.js",
    "plugins/p/slices/x/rules.ts",
    "plugins/p/slices/x/view.tsx",
    "plugins/p/types/extra.d.ts",
  ];
  expect(await offRuntime(root, files)).toStrictEqual([
    "plugins/p/hooks/register.mjs",
    "plugins/p/slices/x/cli.js",
    "plugins/p/slices/x/view.tsx",
    "plugins/p/types/extra.d.ts",
  ]);
});

/**
 * The `compilerOptions` of the repository config and of the config that it extends, with no type library.
 * The extended config extends `.claude-plugin/types/tsconfig.json`, which Claude Code writes only when it loads the plugin, so a fresh checkout such as CI does not have it.
 */
const ownOptions = async (): Promise<Record<string, unknown>> => {
  const options = {};
  for (const file of ["plugins/claudetto/tsconfig.json", "tsconfig.json"]) {
    const { compilerOptions } = await Bun.file(path.join(REPO, file)).json();
    Object.assign(options, compilerOptions);
  }
  const {
    types: _types,
    typeRoots: _roots,
    ...rest
  } = options as Record<string, unknown>;
  return { ...rest, types: [] };
};

test("Non-erasable syntax: `bun check` with the config of the repository fails on an `enum` and names the file", async () => {
  const dir = tmpDir("erasable");
  await Bun.write(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: await ownOptions(), include: ["*.ts"] }),
  );
  const file = path.join(dir, "kind.ts");
  const check = () =>
    Bun.spawnSync(["bun", "check", "--no-pretty", "-p", dir], { cwd: REPO });
  await Bun.write(file, "export const Kind = { A: 0, B: 1 } as const;\n");
  expect(check().exitCode).toBe(0);
  await Bun.write(file, "export enum Kind {\n  A,\n  B,\n}\n");
  const r = check();
  expect(r.exitCode).toBe(1);
  expect(r.stdout.toString()).toMatch(/kind\.ts\(1,13\): error TS1294/);
});
