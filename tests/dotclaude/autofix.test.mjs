// The auto-fix hook (spec auto-fix, design D7) on fixture projects.
// The project tools are FAKE local binaries: a node script that logs its arguments, prints a fixed output, and exits with a fixed code.
// No real formatter or linter runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  fix,
  record,
  stateFile,
} from "../../plugins/dotclaude/features/autofix/cli.mjs";
import { TOOLS } from "../../plugins/dotclaude/features/autofix/data.mjs";
import {
  HOOK_TIMEOUT_S,
  REPORT_LINES_MAX,
  TOTAL_TIMEOUT_MS,
} from "../../plugins/dotclaude/features/autofix/limits.mjs";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "autofix-"));

/** A project folder with the given files (`path: text`). */
function project(files = {}) {
  const root = tmp();
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}

/** A fake local binary `rel` in `root`. Each run appends its argument list to `log`. */
function fake(root, rel, { out = "", code = 0, sleep = 0 } = {}) {
  const file = path.join(root, rel);
  const log = path.join(root, ".calls.jsonl");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `#!/usr/bin/env node
require("node:fs").appendFileSync(${JSON.stringify(log)}, JSON.stringify([${JSON.stringify(rel)}, ...process.argv.slice(2)]) + "\\n");
const end = Date.now() + ${sleep};
while (Date.now() < end);
process.stdout.write(${JSON.stringify(out)});
process.exit(${code});
`,
    { mode: 0o755 },
  );
}

const calls = (root) => {
  const log = path.join(root, ".calls.jsonl");
  return fs.existsSync(log)
    ? fs
        .readFileSync(log, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
};

/** The switch that setup writes after the user says yes. */
const ENV = { DOTCLAUDE_AUTOFIX: "1" };

let n = 0;
/** Record the edits of `files` (paths relative to `root`) in a new session, and return the payload for the stop. */
function edited(root, files, extra = {}) {
  const session_id = `s${++n}-${process.pid}`;
  for (const f of files)
    record(
      {
        session_id,
        cwd: root,
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: path.join(root, f) },
      },
      os.tmpdir(),
      ENV,
    );
  return { session_id, cwd: root, hook_event_name: "Stop", ...extra };
}

test("Biome: a local binary runs on the edited files, after `--`, with no shell", () => {
  const root = project({ "biome.json": "{}", "a.js": "x", "b.py": "y" });
  fake(root, "node_modules/.bin/biome");
  expect(fix(edited(root, ["a.js", "b.py"]), ENV)).toBeUndefined();
  const [call] = calls(root);
  expect(call[0]).toBe("node_modules/.bin/biome");
  expect(call.slice(1, 3)).toEqual(["check", "--write"]);
  expect(call.slice(-2)).toEqual(["--", path.join(root, "a.js")]);
  expect(calls(root)).toHaveLength(1);
});

test("Prettier: a config and a local binary run on the edited files of its extensions", () => {
  const root = project({ ".prettierrc": "{}", "a.ts": "x", "n.md": "z" });
  fake(root, "node_modules/.bin/prettier");
  fix(edited(root, ["a.ts", "n.md"]), ENV);
  const [call] = calls(root);
  expect(call.slice(-3)).toEqual([
    "--",
    path.join(root, "a.ts"),
    path.join(root, "n.md"),
  ]);
  expect(call).toContain("--write");
});

test("Ruff: `format` runs, then `check --fix`, and the issue that remains is the only text", () => {
  const root = project({
    "pyproject.toml": "[tool.ruff]\nline-length = 88\n",
    "m.py": "x",
  });
  const issue = `${path.join(root, "m.py")}:3:10: F821 Undefined name \`q\`\nFound 2 errors (1 fixed, 1 remaining).\n`;
  fake(root, ".venv/bin/ruff", { out: issue, code: 1 });
  const out = fix(edited(root, ["m.py"]), ENV);
  expect(calls(root).map((c) => c[1])).toEqual(["format", "check"]);
  expect(out.decision).toBe("block");
  expect(out.reason).toContain("\nm.py:3 F821");
  expect(out.reason).not.toContain(root);
});

test("a `pyproject.toml` with no `[tool.ruff]` table is not a Ruff config", () => {
  const root = project({ "pyproject.toml": "[project]\n", "m.py": "x" });
  fake(root, "bin/ruff");
  expect(fix(edited(root, ["m.py"]), ENV)).toBeUndefined();
  expect(calls(root)).toEqual([]);
});

test("no config and no local binary: no tool runs and the hook adds no text", () => {
  const root = project({ "a.js": "x", "b.py": "y", "c.md": "z" });
  expect(fix(edited(root, ["a.js", "b.py", "c.md"]), ENV)).toBeUndefined();
  expect(calls(root)).toEqual([]);
});

test("a local binary alone is enough, and a config alone falls back to `PATH` (missing: quiet)", () => {
  const bare = project({ "a.js": "x" });
  fake(bare, "node_modules/.bin/eslint");
  fix(edited(bare, ["a.js"]), ENV);
  expect(calls(bare)).toHaveLength(1);
  const cfg = project({ "eslint.config.js": "", "a.js": "x" });
  const PATH = process.env.PATH;
  process.env.PATH = "";
  try {
    expect(fix(edited(cfg, ["a.js"]), ENV)).toBeUndefined();
  } finally {
    process.env.PATH = PATH;
  }
});

test("a tool takes only the files of its extensions, and Biome takes a file before Prettier", () => {
  const root = project({
    "biome.json": "{}",
    ".prettierrc": "{}",
    "a.js": "x",
  });
  fake(root, "node_modules/.bin/biome");
  fake(root, "node_modules/.bin/prettier");
  fix(edited(root, ["a.js"]), ENV);
  expect(calls(root).map((c) => c[0])).toEqual(["node_modules/.bin/biome"]);
});

test("edited files only: a file outside the project, in `node_modules`, or deleted is skipped", () => {
  const root = project({ "biome.json": "{}", "node_modules/p/i.js": "x" });
  const outside = project({ "o.js": "x" });
  fake(root, "node_modules/.bin/biome");
  const payload = edited(root, ["node_modules/p/i.js", "gone.js"]);
  record(
    {
      session_id: payload.session_id,
      cwd: root,
      tool_input: { file_path: path.join(outside, "o.js") },
    },
    os.tmpdir(),
    ENV,
  );
  expect(fix(payload, ENV)).toBeUndefined();
  expect(calls(root)).toEqual([]);
});

test("a notebook path is recorded", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome");
  const session_id = `nb-${process.pid}`;
  record(
    {
      session_id,
      cwd: root,
      tool_input: { notebook_path: path.join(root, "a.js") },
    },
    os.tmpdir(),
    ENV,
  );
  fix({ session_id, cwd: root, hook_event_name: "Stop" }, ENV);
  expect(calls(root)).toHaveLength(1);
});

test("the recorder changes no project file and no file between two edits", () => {
  const root = project({ "a.js": "same" });
  const before = fs.readdirSync(root);
  edited(root, ["a.js", "a.js"]);
  expect(fs.readdirSync(root)).toEqual(before);
  expect(fs.readFileSync(path.join(root, "a.js"), "utf8")).toBe("same");
});

test("the hook does not install a tool and does not run a `package.json` script", () => {
  const root = project({
    "package.json": JSON.stringify({ scripts: { lint: "touch ran" } }),
    "biome.json": "{}",
    "a.js": "x",
  });
  fix(edited(root, ["a.js"]), ENV);
  expect(fs.existsSync(path.join(root, "ran"))).toBe(false);
  expect(fs.existsSync(path.join(root, "node_modules"))).toBe(false);
});

test("all fixed: the tool exits `0` and the hook adds no text", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome", {
    out: "Checked 1 file. Fixed 1 file.\n",
  });
  expect(fix(edited(root, ["a.js"]), ENV)).toBeUndefined();
});

test("issues remain: one block with `file:line` rule lines, from the Biome `github` format", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  const file = path.join(root, "a.js");
  fake(root, "node_modules/.bin/biome", {
    code: 1,
    out: `::error title=lint/suspicious/noDebugger,file=${file},line=3,endLine=3,col=1,endColumn=10::This is an unexpected use.\n`,
  });
  const out = fix(edited(root, ["a.js"]), ENV);
  expect(out.decision).toBe("block");
  expect(out.reason.split("\n").at(-1)).toBe(
    "a.js:3 lint/suspicious/noDebugger",
  );
});

test("the block has at most `REPORT_LINES_MAX` lines and names the issues not shown", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  const file = path.join(root, "a.js");
  const many = Array.from(
    { length: 50 },
    (_, i) => `::error title=lint/r${i},file=${file},line=${i + 1}::m`,
  ).join("\n");
  fake(root, "node_modules/.bin/biome", { code: 1, out: many });
  const out = fix(edited(root, ["a.js"]), ENV);
  const lines = out.reason.split("\n");
  expect(lines.length).toBeLessThanOrEqual(REPORT_LINES_MAX);
  expect(lines.filter((l) => /^a\.js:\d+ /.test(l))).toHaveLength(
    lines.length - 4,
  );
});

test("no second block: a stop with `stop_hook_active` gives no output and runs no tool", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome", {
    code: 1,
    out: "::error title=r,file=a.js,line=1::m",
  });
  const first = edited(root, ["a.js"]);
  expect(fix(first, ENV)?.decision).toBe("block");
  const again = edited(root, ["a.js"], { stop_hook_active: true });
  expect(fix(again, ENV)).toBeUndefined();
  expect(calls(root)).toHaveLength(1);
});

test("the state file is gone after the stop, so the next turn starts empty", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome");
  const payload = edited(root, ["a.js"]);
  fix(payload, ENV);
  expect(fs.existsSync(stateFile(payload.session_id))).toBe(false);
  fix(payload, ENV);
  expect(calls(root)).toHaveLength(1);
});

test("quiet failure: a tool that exits with garbage, or has no parsable line, gives no text", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome", { code: 2, out: "panic: something\n" });
  expect(fix(edited(root, ["a.js"]), ENV)).toBeUndefined();
});

test("quiet failure: a payload with no session, or a broken state, gives no text and no throw", () => {
  expect(fix({}, ENV)).toBeUndefined();
  expect(fix(undefined, ENV)).toBeUndefined();
  expect(fix({ session_id: "never-recorded", cwd: "/" }, ENV)).toBeUndefined();
});

test("time limit: a tool that passes the total limit is stopped and the hook adds no text", () => {
  const root = project({ "biome.json": "{}", "a.js": "x" });
  fake(root, "node_modules/.bin/biome", {
    code: 1,
    sleep: 5_000,
    out: "::error title=r,file=a.js,line=1::m",
  });
  const t0 = Date.now();
  // A fake clock: the first read starts the stop, the next reads are past `TOTAL_TIMEOUT_MS` minus 200 ms.
  let reads = 0;
  const now = () => (reads++ === 0 ? 0 : TOTAL_TIMEOUT_MS - 200);
  expect(fix(edited(root, ["a.js"]), ENV, os.tmpdir(), now)).toBeUndefined();
  expect(Date.now() - t0).toBeLessThan(4_000);
});

test("the detection table has no row for `sembr`, and each row has a config and extensions", () => {
  expect(TOOLS.map((t) => t.name)).toEqual([
    "biome",
    "prettier",
    "eslint",
    "ruff",
    "rustfmt",
    "gofmt",
    "clang-format",
    "shfmt",
    "markdownlint-cli2",
  ]);
  expect(JSON.stringify(TOOLS)).not.toContain("sembr");
  for (const t of TOOLS) {
    expect(t.exts.length).toBeGreaterThan(0);
    expect(t.configs.length).toBeGreaterThan(0);
  }
});

test("`hooks.json`: the recorder is on the four edit tools, the fixer is on `Stop`, and the timeout matches the bound", () => {
  const hooks = JSON.parse(
    fs.readFileSync(path.join(PLUGIN, "hooks/hooks.json"), "utf8"),
  ).hooks;
  const cmd = 'node "${CLAUDE_PLUGIN_ROOT}/features/autofix/cli.mjs"';
  const post = hooks.PostToolUse.find((g) =>
    g.hooks.some((h) => h.command === cmd),
  );
  expect(post.matcher).toBe("Edit|Write|MultiEdit|NotebookEdit");
  const stop = hooks.Stop.flatMap((g) => g.hooks).find(
    (h) => h.command === cmd,
  );
  expect(stop.timeout).toBe(HOOK_TIMEOUT_S);
  expect(HOOK_TIMEOUT_S * 1000).toBeGreaterThan(TOTAL_TIMEOUT_MS);
});
