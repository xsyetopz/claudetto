// Code in `plugins/`, `tests/`, and `tools/` uses the Bun API where the map of design D28 gives one.
// A `node:` module stays only for what Bun 1.4.3 has no API for, such as `node:path` and the folder calls of `node:fs`.
// `existsSync` and `statSync` stay allowed, because a test cannot tell a file from a folder, and a folder keeps `node:fs`.
// The hook-lab tests (`plugins/*/tests/`) run in the mod runtime of `claude plugin test`, not in Bun, so they are out of scope.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "./repo.ts";

/** The `node:` modules that the map replaces as a whole, with the Bun API of each. */
const WHOLE: Record<string, string> = {
  "node:child_process": "Bun.spawn, Bun.spawnSync, Bun.$",
  "node:url":
    "import.meta.dir, import.meta.path, Bun.fileURLToPath, Bun.pathToFileURL",
  "node:http": "Bun.serve, fetch",
  "node:https": "fetch",
  "node:timers/promises": "Bun.sleep",
  "node:test": "bun:test",
  "node:assert": "bun:test expect",
  "node:assert/strict": "bun:test expect",
  "node:process": "Bun.env, Bun.argv, Bun.stdin",
  "node:crypto": "Bun.CryptoHasher, Bun.hash, crypto",
};

const FILE_CALLS = "Bun.file, Bun.write, BunFile.delete, Bun.Glob";

/** The members of a `node:` module that the map replaces, with the Bun API of each. */
const MEMBERS: Record<string, Record<string, string>> = {
  "node:fs": Object.fromEntries(
    [
      "readFileSync",
      "readFile",
      "writeFileSync",
      "writeFile",
      "unlinkSync",
      "unlink",
      "globSync",
      "glob",
    ].map((name) => [name, FILE_CALLS]),
  ),
  "node:fs/promises": Object.fromEntries(
    ["readFile", "writeFile", "unlink", "glob"].map((name) => [
      name,
      FILE_CALLS,
    ]),
  ),
  "node:util": {
    inspect: "Bun.inspect",
    isDeepStrictEqual: "Bun.deepEquals",
  },
};

const IMPORT =
  /^\s*import\s+(?:type\s+)?([^;'"]*?)\s+from\s+["'](node:[\w/]+)["'];?/gm;

/** The faults of one file: each `node:` import or member that the map gives a Bun API for. */
function offMap(file: string, source: string): string[] {
  const faults: string[] = [];
  for (const [, clause = "", spec = ""] of source.matchAll(IMPORT)) {
    const whole = WHOLE[spec];
    if (whole) {
      faults.push(`${file}: ${spec} (use ${whole})`);
      continue;
    }
    const members = MEMBERS[spec];
    if (!members) continue;
    const used = new Set<string>();
    const named = clause.match(/\{([\s\S]*)\}/)?.[1] ?? "";
    for (const part of named.split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name) used.add(name);
    }
    const binding = clause
      .replace(/\{[\s\S]*\}/, "")
      .replace(/\*\s+as\s+/, "")
      .replace(/,/g, " ")
      .trim();
    if (binding) {
      for (const [, name = ""] of source.matchAll(
        new RegExp(`(?<![\\w.$])${binding}\\.(\\w+)`, "g"),
      )) {
        used.add(name);
      }
    }
    for (const name of [...used].sort()) {
      const api = members[name];
      if (api) faults.push(`${file}: ${spec} ${name} (use ${api})`);
    }
  }
  return faults;
}

/** The script files of `plugins/`, `tests/`, and `tools/`, with the `bin/` files that have no extension. */
async function scripts(): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of [
    "{plugins,tests,tools}/**/*.{ts,mjs}",
    "plugins/*/bin/*",
  ]) {
    for await (const file of new Bun.Glob(pattern).scan({ cwd: REPO })) {
      const rel = file.split(path.sep).join("/");
      if (/^plugins\/[^/]+\/tests\//.test(rel) || rel.endsWith(".d.ts"))
        continue;
      if (rel.includes("/node_modules/")) continue;
      files.push(rel);
    }
  }
  return [...new Set(files)].sort();
}

// A lint of the live repository.
test("lint: no file imports a `node:` module or member that the map of design D28 gives a Bun API for", async () => {
  const faults: string[] = [];
  for (const file of await scripts()) {
    faults.push(...offMap(file, await Bun.file(path.join(REPO, file)).text()));
  }
  expect(faults).toEqual([]);
});

test("`node:child_process`, a file read through `node:fs`, and `inspect` fail, and a folder call and `node:path` pass", () => {
  const source = [
    'import { spawnSync } from "node:child_process";',
    'import fs from "node:fs";',
    'import { mkdirSync, writeFileSync as write } from "node:fs";',
    'import path from "node:path";',
    'import { inspect, parseArgs } from "node:util";',
    "fs.readdirSync(dir);",
    "fs.readFileSync(file);",
    "fs.mkdtempSync(dir);",
  ].join("\n");
  expect(offMap("x.ts", source)).toEqual([
    "x.ts: node:child_process (use Bun.spawn, Bun.spawnSync, Bun.$)",
    `x.ts: node:fs readFileSync (use ${FILE_CALLS})`,
    `x.ts: node:fs writeFileSync (use ${FILE_CALLS})`,
    "x.ts: node:util inspect (use Bun.inspect)",
  ]);
});

test("an import clause does not run across lines into a fixture string", () => {
  const source = [
    'import { REPO } from "./repo.ts";',
    "const f = [",
    "  'import fs from \"node:child_process\";',",
    "];",
  ].join("\n");
  expect(offMap("x.ts", source)).toEqual([]);
});

test("a `node:` import inside a string of a fixture is not an import", () => {
  const source = "const f = 'import fs from \"node:child_process\";';";
  expect(offMap("x.ts", source)).toEqual([]);
});
