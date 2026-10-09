// Test T1: the import lines of the plugins follow the dependency rule of design D18.
// Each rule is a pure function from a map of path to source to a list of violations.
// The repository test runs all rules over the tracked files, and each fixture test breaks one rule.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = path.join(import.meta.dirname, "../..");
const posix = path.posix;

// Comments hold sample imports (a JSDoc type), so they are removed before the parse.
const stripComments = (src) =>
  src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Every import, re-export, and dynamic import of a source, as `{ spec, dynamic }`.
function parseImports(source) {
  const src = stripComments(source);
  const found = [];
  const from = /^[ \t]*(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']/gm;
  const bare = /^[ \t]*import\s*["']([^"']+)["']/gm;
  for (const re of [from, bare])
    for (const m of src.matchAll(re))
      found.push({ spec: m[1], dynamic: false });
  for (const m of src.matchAll(/(?<![\w.$])import\s*\(\s*(["'])?([^"')]*)/g))
    found.push({ spec: m[1] ? m[2] : null, dynamic: true });
  return found;
}

// The plugin folder of a path: `plugins/<name>`.
const pluginOf = (file) => file.split("/").slice(0, 2).join("/");

// Where a relative import points, or `null` for a `node:` module or a bare package.
const resolve = (file, spec) =>
  spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;

// The static relative and package imports of each file, with the target path of a relative one.
function edges(files) {
  const out = [];
  for (const [file, source] of Object.entries(files))
    for (const { spec, dynamic } of parseImports(source))
      if (!dynamic) out.push({ file, spec, target: resolve(file, spec) });
  return out;
}

const inside = (file, target) =>
  target === pluginOf(file) || target.startsWith(`${pluginOf(file)}/`);

// The part of a path under its plugin: `lib/budget.mjs`, `features/guard/cli.mjs`.
const within = (file) => file.split("/").slice(2);

// Rule 1: `lib/` imports only `lib/` by relative path.
function checkLib(files) {
  const bad = [];
  for (const { file, spec, target } of edges(files))
    if (within(file)[0] === "lib" && target && inside(file, target))
      if (within(target)[0] !== "lib")
        bad.push(`${file}: lib imports ${spec}, and lib imports only lib`);
  return bad;
}

// Rule 2: a feature file imports only `lib/` and its own feature folder.
function checkFeatures(files) {
  const bad = [];
  for (const { file, spec, target } of edges(files)) {
    const [top, name] = within(file);
    if (top !== "features" || !target || !inside(file, target)) continue;
    const [tTop, tName] = within(target);
    if (tTop !== "lib" && !(tTop === "features" && tName === name))
      bad.push(
        `${file}: feature ${name} imports ${spec}, outside lib and itself`,
      );
  }
  return bad;
}

// Rule 3: entry points import `lib/` and features, and a `cli.mjs` only its own feature and `lib/`.
function checkEntries(files) {
  const bad = [];
  for (const { file, spec, target } of edges(files)) {
    const [top, name, leaf] = within(file);
    if (top === "lib" || !target || !inside(file, target)) continue;
    const [tTop, tName] = within(target);
    if (top === "features") {
      if (leaf !== "cli.mjs") continue;
      if (tTop === "features" && tName !== name)
        bad.push(`${file}: cli imports ${spec}, another feature`);
    } else if (tTop !== "lib" && tTop !== "features")
      bad.push(
        `${file}: entry point imports ${spec}, outside lib and features`,
      );
  }
  return bad;
}

// Rule 4: no import leaves its plugin, so none reaches another plugin, `tools/`, or `tests/`.
function checkPluginBoundary(files) {
  return edges(files)
    .filter(({ file, target }) => target && !inside(file, target))
    .map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);
}

// Rule 5: a plugin imports only relative paths and `node:` modules, never a package.
function checkNoPackages(files) {
  return edges(files)
    .filter(({ spec }) => !spec.startsWith(".") && !spec.startsWith("node:"))
    .map(({ file, spec }) => `${file}: bare import ${spec}`);
}

const isModuleEntry = (file) =>
  /^plugins\/[^/]+\/hooks\/(register\.mjs|module\/index\.mjs)$/.test(file);

// Rule 6: the graph of a hooks module has no `node:` import, no `import()`, and literal `on()` names.
function checkModuleGraph(files) {
  const bad = [];
  const seen = new Set();
  const queue = Object.keys(files).filter(isModuleEntry);
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file) || !(file in files)) continue;
    seen.add(file);
    for (const { spec, dynamic } of parseImports(files[file])) {
      if (dynamic) bad.push(`${file}: import() in the module graph`);
      else if (spec.startsWith("node:"))
        bad.push(`${file}: ${spec} in the module graph`);
      else if (resolve(file, spec)) queue.push(resolve(file, spec));
    }
    const code = stripComments(files[file]);
    for (const m of code.matchAll(/(?<![\w.$])on\(\s*(?!["'])/g))
      bad.push(
        `${file}: on() event name is not a string literal at ${m.index}`,
      );
  }
  return bad;
}

// The tracked and new files of `plugins/`, with no git-ignored file and no folder without files.
function repoFiles() {
  const ls = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "plugins"],
    { cwd: REPO, encoding: "utf8" },
  );
  const files = {};
  for (const rel of ls.stdout.split("\n"))
    if (/\.(mjs|cjs|js)$/.test(rel) && fs.existsSync(path.join(REPO, rel)))
      files[rel] = fs.readFileSync(path.join(REPO, rel), "utf8");
  return files;
}

const RULES = {
  checkLib,
  checkFeatures,
  checkEntries,
  checkPluginBoundary,
  checkNoPackages,
  checkModuleGraph,
};

test("the plugins hold the files that the rules read", () => {
  const files = Object.keys(repoFiles());
  expect(files).toContain("plugins/dotclaude/hooks/register.mjs");
  expect(files).toContain("plugins/dotclaude/lib/budget.mjs");
  expect(files.some((f) => f.includes("/features/"))).toBe(true);
});

for (const [name, check] of Object.entries(RULES))
  test(`the plugins pass ${name}`, () => {
    expect(check(repoFiles())).toEqual([]);
  });

test("`parseImports` reads static, re-export, side-effect, and dynamic imports, and skips comments", () => {
  const src = [
    '/** @type {import("x").Y} */',
    '// import a from "commented";',
    'import a from "./a.mjs";',
    'import {\n  b,\n} from "../b.mjs";',
    'export * from "node:fs";',
    'import "./side.mjs";',
    'const m = await import("./d.mjs");',
    "const n = import(name);",
  ].join("\n");
  expect(parseImports(src)).toEqual([
    { spec: "./a.mjs", dynamic: false },
    { spec: "../b.mjs", dynamic: false },
    { spec: "node:fs", dynamic: false },
    { spec: "./side.mjs", dynamic: false },
    { spec: "./d.mjs", dynamic: true },
    { spec: null, dynamic: true },
  ]);
});

const P = "plugins/dotclaude";

test("rule 1: lib importing a feature is a violation", () => {
  const files = {
    [`${P}/lib/a.mjs`]: 'import { x } from "../features/guard/rules.mjs";',
    [`${P}/lib/b.mjs`]:
      'import { y } from "./a.mjs";\nimport fs from "node:fs";',
    [`${P}/features/guard/rules.mjs`]: "export const x = 1;",
  };
  expect(checkLib(files)).toEqual([
    `${P}/lib/a.mjs: lib imports ../features/guard/rules.mjs, and lib imports only lib`,
  ]);
});

test("rule 2: a feature importing another feature is a violation", () => {
  const files = {
    [`${P}/features/guard/rules.mjs`]:
      'import { x } from "../prompt/data.mjs";\nimport { y } from "../../lib/b.mjs";\nimport { z } from "./own.mjs";',
  };
  expect(checkFeatures(files)).toEqual([
    `${P}/features/guard/rules.mjs: feature guard imports ../prompt/data.mjs, outside lib and itself`,
  ]);
});

test("rule 3: a cli imports another feature, and an entry point imports a hook folder", () => {
  const files = {
    [`${P}/features/guard/cli.mjs`]:
      'import { x } from "../setup/rules.mjs";\nimport { y } from "../guard/rules.mjs";',
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.mjs";\nimport { b } from "../features/prompt/data.mjs";\nimport { c } from "../lib/budget.mjs";\nimport { d } from "../skills/setup/scripts/settings.mjs";',
  };
  expect(checkEntries(files)).toEqual([
    `${P}/features/guard/cli.mjs: cli imports ../setup/rules.mjs, another feature`,
    `${P}/hooks/register.mjs: entry point imports ../skills/setup/scripts/settings.mjs, outside lib and features`,
  ]);
});

test("rule 4: an import that leaves its plugin is a violation, for a plugin, `tools`, and `tests`", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs":
      'import { a } from "../../dotclaude/lib/budget.mjs";\nimport { b } from "../../../tools/limits.mjs";\nimport { c } from "../../../tests/support/x.mjs";\nimport { d } from "../features/jev/rules.mjs";',
  };
  expect(checkPluginBoundary(files)).toEqual([
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../dotclaude/lib/budget.mjs leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tools/limits.mjs leaves its plugin",
    "plugins/dotclaude-jev/hooks/register.mjs: import ../../../tests/support/x.mjs leaves its plugin",
  ]);
});

test("rule 5: a package import is a violation, and a `node:` import is not", () => {
  const files = {
    [`${P}/skills/setup/scripts/a.mjs`]:
      'import pkg from "left-pad";\nimport fs from "node:fs";\nimport { z } from "../../../lib/budget.mjs";',
  };
  expect(checkNoPackages(files)).toEqual([
    `${P}/skills/setup/scripts/a.mjs: bare import left-pad`,
  ]);
});

test("rule 6: `node:`, `import()`, and a computed `on()` name in the module graph are violations", () => {
  const files = {
    [`${P}/hooks/register.mjs`]:
      'import { a } from "../features/guard/rules.mjs";\nexport function register(on) {\n  on("tool.check", () => {});\n  on(EVENT, () => {});\n}',
    [`${P}/features/guard/rules.mjs`]:
      'import { b } from "../../lib/b.mjs";\nconst m = await import("./x.mjs");',
    [`${P}/lib/b.mjs`]: 'import fs from "node:fs";',
    [`${P}/features/guard/cli.mjs`]: 'import fs from "node:fs";',
  };
  const bad = checkModuleGraph(files);
  expect(bad).toHaveLength(3);
  expect(bad).toContain(`${P}/lib/b.mjs: node:fs in the module graph`);
  expect(bad).toContain(
    `${P}/features/guard/rules.mjs: import() in the module graph`,
  );
  expect(
    bad.some((v) => v.startsWith(`${P}/hooks/register.mjs: on() event name`)),
  ).toBe(true);
});

test("rule 6 also covers the add-on module of the current jev layout", () => {
  const files = {
    "plugins/dotclaude-jev/hooks/register.mjs": 'import fs from "node:fs";',
  };
  expect(checkModuleGraph(files)).toEqual([
    "plugins/dotclaude-jev/hooks/register.mjs: node:fs in the module graph",
  ]);
});

test("the module graph of `dotclaude-jev` holds its feature files and no `node:` import", () => {
  const files = repoFiles();
  const jev = Object.keys(files).filter((f) =>
    f.startsWith("plugins/dotclaude-jev/"),
  );
  expect(jev).toContain("plugins/dotclaude-jev/hooks/register.mjs");
  expect(jev).toContain("plugins/dotclaude-jev/features/jev/tool.mjs");
  const graph = {};
  for (const f of jev) if (!f.endsWith("/cli.mjs")) graph[f] = files[f];
  for (const f of Object.keys(graph))
    for (const { spec } of parseImports(graph[f]))
      expect(spec.startsWith("node:")).toBe(false);
  // The client is the one file with `node:` imports, and no module file imports it.
  expect(files["plugins/dotclaude-jev/features/jev/cli.mjs"]).toContain(
    'from "node:fs"',
  );
  for (const f of Object.keys(graph))
    for (const { spec } of parseImports(graph[f]))
      expect(spec.endsWith("cli.mjs")).toBe(false);
});
