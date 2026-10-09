// The rules of the auto-fix hook (design D7): which tool runs on which file, how to read its output, and the report.
// The functions are pure. `cli.mjs` runs the tools and reads the files.

import path from "node:path";
import { BIN_DIRS, TOOLS } from "./data.mjs";
import { REPORT_LINES_MAX } from "./limits.mjs";

/** The folders of generated and vendored files. The hook never runs a tool on a file in one of them. */
const SKIPPED = new Set([
  "node_modules",
  ".git",
  "vendor",
  "dist",
  "build",
  "target",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
]);

/** The path of the file that a tool call edited, or undefined. */
export function editedPath(input) {
  const p = input?.file_path ?? input?.notebook_path;
  return typeof p === "string" && p !== "" ? p : undefined;
}

/** True when `file` (absolute) is in `root`, outside a skipped folder. */
export function eligible(root, file) {
  const rel = path.relative(root, file);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return false;
  return !rel.split(path.sep).some((part) => SKIPPED.has(part));
}

/** The config names of `tool` that its project has: `exists` tests a file, `read` gives its text. */
function hasConfig(tool, root, exists, read) {
  return tool.configs.some((c) => {
    const file = path.join(root, typeof c === "string" ? c : c.file);
    if (!exists(file)) return false;
    return typeof c === "string" || read(file).includes(c.has);
  });
}

/** The local binary of `tool` in the project, or undefined. */
export function localBin(tool, root, exists) {
  for (const dir of BIN_DIRS) {
    const bin = path.join(root, dir, tool.name);
    if (exists(bin)) return bin;
  }
  return undefined;
}

/**
 * The runs for `files`: `{ tool, command, steps, files }` for each detected tool that has a file.
 * `command` is the local binary when the project has one, else the tool name for a `PATH` lookup.
 * A step is the argument list with `--` (unless the tool has `dashes: false`) and the file paths.
 */
export function plan(root, files, { exists, read }) {
  const taken = new Map();
  const runs = [];
  for (const tool of TOOLS) {
    const bin = localBin(tool, root, exists);
    if (!bin && !hasConfig(tool, root, exists, read)) continue;
    const mine = files.filter((f) => {
      if (!tool.exts.includes(path.extname(f).slice(1).toLowerCase()))
        return false;
      return !tool.group || !taken.get(tool.group)?.has(f);
    });
    if (mine.length === 0) continue;
    if (tool.group) {
      const set = taken.get(tool.group) ?? new Set();
      for (const f of mine) set.add(f);
      taken.set(tool.group, set);
    }
    const tail = tool.dashes === false ? mine : ["--", ...mine];
    runs.push({
      tool: tool.name,
      command: bin ?? tool.name,
      steps: tool.steps.map((s) => [...s, ...tail]),
      files: mine,
    });
  }
  return runs;
}

/** The `file:line rule` lines of the output `text` of the tool `name`, with paths relative to `root`. */
export function parseIssues(name, text, root) {
  const spec = TOOLS.find((t) => t.name === name)?.issue;
  if (!spec) return [];
  const out = [];
  for (const line of text.split("\n")) {
    const m = spec.re.exec(line.trim());
    if (!m) continue;
    const file = m[spec.file ?? 1];
    const rule = typeof spec.rule === "number" ? m[spec.rule] : spec.rule;
    const shown = path.isAbsolute(file) ? path.relative(root, file) : file;
    out.push(`${shown}:${m[spec.line ?? 2]} ${rule}`);
  }
  return out;
}

/** The `Stop` output for the remaining `issues`, or undefined when there are none. */
export function report(issues) {
  const unique = [...new Set(issues)];
  if (unique.length === 0) return undefined;
  const head =
    "The project tools fixed what they can in the files that you edited.\n" +
    "These issues remain, and no tool can fix them by itself.\n" +
    "Fix each one, and then stop.";
  const room = REPORT_LINES_MAX - head.split("\n").length;
  let shown = unique.slice(0, room);
  let more = "";
  if (unique.length > room) {
    shown = unique.slice(0, room - 1);
    more = `\n${unique.length - shown.length} more issues are not shown.`;
  }
  return { decision: "block", reason: `${head}\n${shown.join("\n")}${more}` };
}
