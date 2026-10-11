// The import rules of design D18 as pure functions from a map of path to source to a list of violations.
// `tests/dotclaude/imports.test.mjs` runs them over the files of `plugins/`,
// and `tests/dotclaude/import-rules.test.mjs` breaks each rule with a fixture.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "./repo.mjs";

const posix = path.posix;

// Comments hold sample imports (a JSDoc type), so they are removed before the parse.
const stripComments = (src) =>
  src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Every import, re-export, and dynamic import of a source, as `{ spec, dynamic }`.
export function parseImports(source) {
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

// The part of a path under its plugin: `lib/budget.mjs`, `features/reads/cli.mjs`.
const within = (file) => file.split("/").slice(2);

// Rule 1: `lib/` imports only `lib/` by relative path.
export function checkLib(files) {
  const bad = [];
  for (const { file, spec, target } of edges(files))
    if (within(file)[0] === "lib" && target && inside(file, target))
      if (within(target)[0] !== "lib")
        bad.push(`${file}: lib imports ${spec}, and lib imports only lib`);
  return bad;
}

// Rule 2: a feature file imports only `lib/` and its own feature folder.
export function checkFeatures(files) {
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
export function checkEntries(files) {
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
export function checkPluginBoundary(files) {
  return edges(files)
    .filter(({ file, target }) => target && !inside(file, target))
    .map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);
}

// Rule 5: a plugin imports only relative paths and `node:` modules, never a package.
export function checkNoPackages(files) {
  return edges(files)
    .filter(({ spec }) => !spec.startsWith(".") && !spec.startsWith("node:"))
    .map(({ file, spec }) => `${file}: bare import ${spec}`);
}

const isModuleEntry = (file) =>
  /^plugins\/[^/]+\/hooks\/(register\.mjs|module\/index\.mjs)$/.test(file);

// Rule 6: the graph of a hooks module has no `node:` import, no `import()`, and literal `on()` names.
export function checkModuleGraph(files) {
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

// A `bin/` file of a plugin is an entry point with no file extension.
const isScript = (rel) =>
  /\.(mjs|cjs|js)$/.test(rel) || /^plugins\/[^/]+\/bin\/[^/.]+$/.test(rel);

// The tracked and new files of `plugins/`, with no git-ignored file and no folder without files.
export function repoFiles() {
  const ls = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "plugins"],
    { cwd: REPO, encoding: "utf8" },
  );
  const files = {};
  for (const rel of ls.stdout.split("\n"))
    if (isScript(rel) && fs.existsSync(path.join(REPO, rel)))
      files[rel] = fs.readFileSync(path.join(REPO, rel), "utf8");
  return files;
}

export const RULES = {
  checkLib,
  checkFeatures,
  checkEntries,
  checkPluginBoundary,
  checkNoPackages,
  checkModuleGraph,
};
