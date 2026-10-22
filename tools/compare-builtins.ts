#!/usr/bin/env -S bun --no-env-file
// Runs one eval case on two arms of a comparison with a built-in feature of Claude Code (tasks 5.1 and 5.2 of `0-2-0`).
// `claude plugin eval` cannot do it, because the eval child takes no `CLAUDE_PLUGIN_OPTION_*` env var.
// So this script runs the case with `claude -p` in the sandbox of `claudetto-sandbox`, with the prompt and the graders of the `case.yaml`.
//
//   bun tools/compare-builtins.ts CASE_DIR ARM [--runs N] [-j N] [--model M] [--max-cost-usd USD] [--out DIR]
//                                 [--claude-flags "--effort low"] [--tools Read,Write,Edit]
//
// An ARM is a name of `ARMS` below.
// The cases are in `tests/compare/`, so a plain eval run never picks them up.
// A run builds the fixture with the `scaffold_script` of the case, writes the settings of the arm, and runs `claude -p`.
// The graders are the `regex` (a file, or the reply) and the `tool_used` graders of the case.
// The file `final.sh` of the case, if there is one, runs in the workspace after the run, and it counts as one more grader.
// A run passes when all graders pass.
// The script stops to launch runs when the cost of the finished runs reaches `--max-cost-usd`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type Arm = {
  /** Plugin options, written to `pluginConfigs` of the sandbox settings. */
  options: Record<string, string>;
  /** Env vars of the session. */
  env: Record<string, string>;
  /** Flags of `claude`. */
  flags: string[];
  /** Tools to allow, besides the tools of the case. */
  allow: string[];
};

const ARMS: Record<string, Arm> = {
  // The arms of the goal comparison send `/goal` as the prompt.
  // The first is the plugin with the goal engine.
  // The second is a copy of the plugin with the hooks of the `goal` slice removed, so the built-in `/goal` runs and the other slices stay.
  "goal-ours": { options: {}, env: {}, flags: [], allow: [] },
  "goal-builtin": { options: {}, env: {}, flags: [], allow: [] },
};

type Grader = {
  type: string;
  name: string;
  tool?: string;
  input_match?: string;
  min?: number;
  max?: number;
  pattern?: string;
  target?: { source: string; path?: string };
};

type Block = {
  type: string;
  name?: string;
  input?: unknown;
};

const REPO = path.resolve(import.meta.dirname, "..");

const args = Bun.argv.slice(2);
const flag = (name: string, fallback: string): string => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};
const [caseDir, armName] = args.filter(
  (a, i) => !a.startsWith("-") && !args[i - 1]?.startsWith("-"),
);
if (!caseDir || !armName || !ARMS[armName]) {
  console.error(
    `usage: bun tools/compare-builtins.ts CASE_DIR ARM (${Object.keys(ARMS).join("|")})`,
  );
  process.exit(1);
}
const arm = ARMS[armName] as Arm;
const runs = Number(flag("--runs", "10"));
const jobs = Number(flag("-j", "4"));
const model = flag("--model", "haiku");
const maxCost = Number(flag("--max-cost-usd", "2"));
const out = path.resolve(
  flag("--out", fs.mkdtempSync(path.join(os.tmpdir(), "compare-builtins-"))),
);
/** Flags for `claude` from `--claude-flags "..."`, such as `--effort low`, the same for each arm. */
const extra = flag("--claude-flags", "").split(" ").filter(Boolean);
const BIN = path.join(REPO, "tools/sandbox/main.ts");

/** The plugin folder of the arm. The arm `goal-builtin` gets a copy with the hooks of the `goal` slice removed. */
const pluginDir = async (): Promise<string> => {
  const source = path.join(REPO, "plugins/claudetto");
  if (armName !== "goal-builtin") return source;
  const copy = path.join(out, "plugin-without-goal");
  fs.cpSync(source, copy, { recursive: true });
  const file = path.join(copy, "hooks/register.ts");
  const kept = (await Bun.file(file).text())
    .split("\n")
    .filter((line) => !/^\s*(on\(.*, h[6789]\)|\/\/ eval: .* goal)/.test(line))
    .join("\n")
    .replace('["goal_status", "tool_hosts_notice"]', '["tool_hosts_notice"]');
  await Bun.write(file, kept);
  return copy;
};
const PLUGIN = await pluginDir();

const spec = Bun.YAML.parse(
  await Bun.file(path.join(caseDir, "case.yaml")).text(),
) as {
  name: string;
  context?: { scaffold_script?: string };
  execution: {
    prompt: string;
    max_turns?: number;
    timeout_seconds?: number;
    allowed_tools?: string[];
  };
  graders: Grader[];
};

const grade = async (
  g: Grader,
  project: string,
  reply: string,
  calls: Block[],
): Promise<boolean> => {
  if (g.type === "regex") {
    let text = reply;
    if (g.target?.source === "file") {
      const file = path.join(project, g.target.path ?? "");
      text = (await Bun.file(file).exists()) ? await Bun.file(file).text() : "";
    }
    return new RegExp(g.pattern ?? "").test(text);
  }
  if (g.type === "tool_used") {
    const match = calls.filter(
      (c) =>
        c.name === g.tool &&
        (!g.input_match ||
          new RegExp(g.input_match).test(JSON.stringify(c.input ?? {}))),
    ).length;
    return match >= (g.min ?? 1) && (g.max === undefined || match <= g.max);
  }
  throw new Error(`unsupported grader type ${g.type}`);
};

type Result = {
  run: number;
  cost: number;
  turns: number;
  graders: Record<string, boolean>;
  passed: boolean;
  error?: string;
};

const scaffoldProject = (project: string): void => {
  const scaffold = spec.context?.scaffold_script;
  if (!scaffold) return;
  const r = Bun.spawnSync(["bash", path.resolve(caseDir, scaffold)], {
    cwd: project,
  });
  if (r.exitCode !== 0) throw new Error(`scaffold failed: ${r.stderr}`);
};

const claudeArgs = (root: string): string[] => {
  const only = flag("--tools", "");
  const tools = [
    ...(only ? only.split(",") : (spec.execution.allowed_tools ?? [])),
    ...arm.allow,
  ];
  return [
    "bun",
    BIN,
    "--dir",
    root,
    "--plugin-dir",
    PLUGIN,
    "--model",
    model,
    ...arm.flags,
    ...extra,
    "--permission-mode",
    "acceptEdits",
    "--allowedTools",
    tools.join(","),
    "--max-turns",
    String(spec.execution.max_turns ?? 25),
    "--debug-file",
    path.join(root, "debug.log"),
    "--output-format",
    "stream-json",
    "--verbose",
    "-p",
    spec.execution.prompt,
  ];
};

type StreamLine = {
  type: string;
  message?: { content?: Block[] };
  result?: string;
  total_cost_usd?: number;
  num_turns?: number;
};

const toolCalls = (o: StreamLine): Block[] =>
  o.type === "assistant"
    ? (o.message?.content ?? []).filter(
        (b) => b.type === "tool_use" || b.type === "server_tool_use",
      )
    : [];

const parseStream = (
  stream: string,
): { calls: Block[]; reply: string; cost: number; turns: number } => {
  const calls: Block[] = [];
  let done: StreamLine | undefined;
  for (const line of stream.split("\n")) {
    if (!line.trim()) continue;
    const o = JSON.parse(line) as StreamLine;
    calls.push(...toolCalls(o));
    if (o.type === "result") done = o;
  }
  return {
    calls,
    reply: done?.result ?? "",
    cost: done?.total_cost_usd ?? 0,
    turns: done?.num_turns ?? 0,
  };
};

const runOnce = async (n: number): Promise<Result> => {
  const root = path.join(out, `run-${n}`);
  const project = path.join(root, "project");
  const config = path.join(root, "config");
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(config, { recursive: true });
  scaffoldProject(project);
  await Bun.write(
    path.join(config, "settings.json"),
    JSON.stringify({
      pluginConfigs: { "claudetto@inline": { options: arm.options } },
    }),
  );
  const proc = Bun.spawn(claudeArgs(root), {
    env: { ...process.env, ...arm.env },
    stdout: Bun.file(path.join(root, "stream.jsonl")),
    stderr: Bun.file(path.join(root, "stderr.txt")),
    timeout: (spec.execution.timeout_seconds ?? 600) * 1000,
  });
  await proc.exited;
  const { calls, reply, cost, turns } = parseStream(
    await Bun.file(path.join(root, "stream.jsonl")).text(),
  );
  const graders = Object.fromEntries(
    await Promise.all(
      spec.graders.map(
        async (g) =>
          [g.name, await grade(g, project, reply, calls)] as [string, boolean],
      ),
    ),
  );
  // `final.sh` in the folder of the case runs in the workspace, and it must exit 0.
  const final = path.resolve(caseDir, "final.sh");
  if (await Bun.file(final).exists())
    graders["final-checks"] =
      Bun.spawnSync(["bash", final], { cwd: project }).exitCode === 0;
  return {
    run: n,
    cost,
    turns,
    graders,
    passed: Object.values(graders).every(Boolean),
  };
};

const results: Result[] = [];
let next = 1;
let spent = 0;
const worker = async (): Promise<void> => {
  while (next <= runs && spent < maxCost) {
    const n = next++;
    try {
      const r = await runOnce(n);
      spent += r.cost;
      results.push(r);
      console.log(
        `run ${n}: ${r.passed ? "pass" : "FAIL"} $${r.cost.toFixed(3)} turns ${r.turns} ${JSON.stringify(r.graders)}`,
      );
    } catch (e) {
      results.push({
        run: n,
        cost: 0,
        turns: 0,
        graders: {},
        passed: false,
        error: String(e),
      });
      console.log(`run ${n}: ERROR ${e}`);
    }
  }
};
await Promise.all(Array.from({ length: jobs }, worker));
results.sort((a, b) => a.run - b.run);
const passes = results.filter((r) => r.passed).length;
const summary = {
  case: spec.name,
  arm: armName,
  model,
  runs: results.length,
  passes,
  cost: results.reduce((s, r) => s + r.cost, 0),
  out,
  results,
};
await Bun.write(
  path.join(out, "summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  `${spec.name} ${armName}: ${passes}/${results.length} passed, $${summary.cost.toFixed(3)}, ${out}`,
);
