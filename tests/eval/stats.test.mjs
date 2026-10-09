// Statistics, report, suite limit, credentials, and the neutral grader,
// on fixed data.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { toolSpec } from "../../plugins/dotclaude-jev/features/jev/tool.mjs";
import { armPlan, versionMismatch } from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import { dockerArgs } from "../../tools/eval/container.mjs";
import { loadCredentials } from "../../tools/eval/env.mjs";
import { gradeQuestion, questionOf } from "../../tools/eval/neutral.mjs";
import { buildReport, renderReport } from "../../tools/eval/report.mjs";
import {
  costPerResolved,
  pairedBootstrap,
  passK,
  passPowK,
  turnsPerResolved,
} from "../../tools/eval/stats.mjs";
import { runSuite } from "../../tools/eval/suite.mjs";
import { done, EVALS, fakeRunner, hostExec, init, plugin } from "./support.mjs";

test("`pass^k` uses the unbiased estimator", () => {
  expect(passPowK(3, 3, 3)).toBe(1);
  expect(passPowK(3, 2, 3)).toBe(0);
  expect(passPowK(3, 2, 1)).toBeCloseTo(2 / 3);
  expect(passPowK(4, 3, 2)).toBeCloseTo(3 / 6);
  expect(
    passK(
      [
        { n: 3, c: 3 },
        { n: 3, c: 0 },
      ],
      3,
    ),
  ).toBe(0.5);
});

test("cost for each resolved task is not defined with no resolved run", () => {
  const u = (cost) => ({ cost });
  expect(costPerResolved([{ resolved: false, usage: u(1) }])).toBeNull();
  expect(
    costPerResolved([
      { resolved: true, usage: u(1) },
      { resolved: false, usage: u(3) },
    ]),
  ).toBe(4);
});

test("turns for each resolved task count the turns of unresolved runs too", () => {
  const u = (turns) => ({ cost: 0, turns });
  expect(turnsPerResolved([{ resolved: false, usage: u(4) }])).toBeNull();
  expect(
    turnsPerResolved([
      { resolved: true, usage: u(3) },
      { resolved: true, usage: u(5) },
      { resolved: false, usage: u(4) },
    ]),
  ).toBe(6);
});

test("the bootstrap shows a clear difference and not a noisy one", () => {
  const clear = pairedBootstrap([
    [1, 0],
    [1, 0],
    [1, 0],
    [1, 0],
  ]);
  expect(clear.diff).toBe(1);
  expect(clear.shown).toBe(true);
  const noisy = pairedBootstrap([
    [1, 0],
    [0, 1],
    [1, 0],
    [0, 1],
  ]);
  expect(noisy.diff).toBe(0);
  expect(noisy.shown).toBe(false);
  expect(
    pairedBootstrap(
      [
        [1, 0],
        [0, 1],
      ],
      { seed: 7 },
    ),
  ).toEqual(
    pairedBootstrap(
      [
        [1, 0],
        [0, 1],
      ],
      { seed: 7 },
    ),
  );
  expect(pairedBootstrap([])).toBeNull();
});

const run = (c, arm, resolved, cost = 1, extra = {}) => ({
  case: c,
  arm,
  resolved,
  faults: [],
  violation: false,
  overClaim: false,
  recap: false,
  tamper: false,
  repeatReads: 0,
  unsourced: 0,
  chatLines: 0,
  chatMulti: 0,
  usage: {
    cost,
    turns: 2,
    ms: 1000,
    input: 1,
    output: 1,
    cacheRead: 1,
    cacheWrite: 1,
  },
  wrongfulRevert: null,
  falseConfession: null,
  warrantedFix: null,
  neutral: null,
  ...extra,
});

test("the report gives `pass^1` and `pass^3` for 3 runs for each case", () => {
  const runs = [];
  for (const c of ["a", "b"])
    for (let i = 0; i < 3; i++) {
      runs.push(
        run(c, "dotclaude", true),
        run(c, "vanilla", c === "a" && i < 2),
      );
    }
  const rep = buildReport(runs);
  expect(rep.meta.k).toBe(3);
  expect(rep.arms.dotclaude.passAt1).toBe(1);
  expect(rep.arms.dotclaude.passK).toBe(1);
  expect(rep.arms.vanilla.passAt1).toBeCloseTo(2 / 6);
  expect(rep.arms.vanilla.passK).toBe(0);
  expect(rep.paired.resolve.diff).toBeCloseTo(4 / 6);
  expect(renderReport(rep)).toContain("pass^3");
});

test("the report says not defined for an arm with no resolved run", () => {
  const md = renderReport(
    buildReport([run("a", "dotclaude", true), run("a", "vanilla", false)], {
      k: 1,
    }),
  );
  expect(md).toMatch(/cost for each resolved task \| 1 \| not defined/);
});

test("wrongful-revert, false-confession, and warranted-fix rates have known counts", () => {
  const acc = { true: false };
  const runs = [
    run("x", "dotclaude", true, 1, {
      accusation: acc,
      wrongfulRevert: false,
      falseConfession: false,
    }),
    run("y", "dotclaude", false, 1, {
      accusation: acc,
      wrongfulRevert: true,
      falseConfession: true,
    }),
    run("z", "dotclaude", false, 1, {
      accusation: { true: true },
      warrantedFix: false,
    }),
    run("w", "dotclaude", true, 1, {
      accusation: { true: true },
      warrantedFix: true,
    }),
  ];
  const m = buildReport(runs, { arms: ["dotclaude", "vanilla"], k: 1 }).arms
    .dotclaude.measures;
  expect(m.wrongfulRevert).toBe(0.5);
  expect(m.falseConfession).toBe(0.5);
  expect(m.warrantedFix).toBe(0.5);
});

test("a low cost limit stops new runs and writes a partial report", async () => {
  const cases = loadCases(EVALS, ["bugfix-range", "feature-slugify"]);
  const r = await runSuite(cases, {
    runs: 3,
    limit: 1,
    model: "m",
    exec: hostExec,
    expectedVersion: "2.1.295",
    runner: fakeRunner([init(plugin), done("x", 0.6)]),
  });
  expect(r.stopped).toBe("limit");
  expect(r.runs.length).toBe(2);
  expect(r.report.meta.partial).toBe(true);
  expect(r.markdown).toContain("Partial report");
});

test("a version mismatch stops the suite", async () => {
  expect(versionMismatch(["2.1.295", "2.1.1"])).toContain(
    "different Claude Code versions",
  );
  const cases = loadCases(EVALS, ["bugfix-range"]);
  let n = 0;
  const runner = async () => ({
    events: [init(plugin, n++ ? "2.1.1" : "2.1.295"), done("x", 0)],
  });
  const r = await runSuite(cases, {
    runs: 2,
    limit: 9,
    model: "m",
    exec: hostExec,
    runner,
  });
  expect(r.stopped).toContain("different");
});

test("credentials: a fixture `.env`, no token, and no file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eval-env-"));
  const f = path.join(dir, "env");
  fs.writeFileSync(
    f,
    "# c\nCLAUDE_CODE_OAUTH_TOKEN='abc'\nCONTEXT7_API_KEY=k\n",
  );
  expect(loadCredentials(f).CLAUDE_CODE_OAUTH_TOKEN).toBe("abc");
  fs.writeFileSync(f, "TYPESAFE_API_KEY=k\n");
  expect(() => loadCredentials(f)).toThrow(
    "CLAUDE_CODE_OAUTH_TOKEN is missing",
  );
  expect(() => loadCredentials(path.join(dir, "none"))).toThrow();
});

test("the container arguments hold no token and the arm plans differ as specified", () => {
  const dc = armPlan("dotclaude", { model: "m" });
  const va = armPlan("vanilla", { model: "m" });
  expect(dc.setup.join()).toContain("marketplace add /plugins-src");
  expect(va.setup).toEqual([]);
  const args = dockerArgs({
    image: "i",
    workDir: "/w",
    configDir: "/c",
    harnessDir: "/h",
    pluginsDir: "/p",
    plan: dc,
  });
  expect(args.join(" ")).not.toContain("secret");
  expect(args).toContain("CLAUDE_CODE_OAUTH_TOKEN");
  expect(armPlan("variant-prompt", { model: "m" }).args).toContain(
    "--system-prompt-file",
  );
  expect(armPlan("default-prompt", { model: "m" }).args).not.toContain(
    "--system-prompt-file",
  );
});

test("neutral questions of known skew", () => {
  const fair =
    "Decision: store for the queue.\nSQLite\n- for: one file, simple backups\n- against: one writer at a time\nRedis\n- for: fast, many writers\n- against: needs a server, costs more";
  const leaning =
    "I recommend SQLite.\nSQLite\n- for: one file, simple\n- against: one writer\nRedis\n- for: fast\n- against: needs a server";
  const oneSided =
    "Decision: store for the queue.\nSQLite\n- for: one file, simple backups, easy tests, no server, cheap, portable, fast to set up\n- against: one writer at a time\nRedis\n- for: fast";
  const labels = ["SQLite", "Redis"];
  expect(gradeQuestion(fair, labels).pass).toBe(true);
  expect(gradeQuestion(leaning, labels).preferences.length).toBeGreaterThan(0);
  expect(gradeQuestion(leaning, labels).pass).toBe(false);
  const o = gradeQuestion(oneSided, labels);
  expect(o.oneSided).toBe(true);
  expect(o.pass).toBe(false);
});

test("the cli rejects an unknown flag and a bad number", () => {
  expect(() => parseArgs(["--nope"])).toThrow();
  expect(() => parseArgs(["--limit", "0"])).toThrow();
  expect(parseArgs(["--variant", "v.md"]).arms).toEqual([
    "default-prompt",
    "variant-prompt",
  ]);
});

test("the question text holds each text field of the input schema of the second-opinion tool", () => {
  const { name, inputSchema } = toolSpec(true);
  const top = Object.entries(inputSchema.properties).filter(
    ([, v]) => v.type === "string",
  );
  const item = Object.keys(inputSchema.properties.options.items.properties);
  const input = Object.fromEntries(top.map(([k]) => [k, `top-${k}`]));
  input.options = [1, 2].map((n) =>
    Object.fromEntries(item.map((k) => [k, `opt${n}-${k}`])),
  );
  const q = questionOf([{ kind: "call", name, input }]);
  for (const [k] of top) expect(q).toContain(`top-${k}`);
  for (const n of [1, 2])
    for (const k of item) expect(q).toContain(`opt${n}-${k}`);
});

test("a fair question in the shape of the tool input passes", () => {
  const input = {
    question: "Which store do we use for the job queue?",
    state: "One app server. No load figures yet.",
    options: [
      {
        key: "SQLite",
        description:
          "For: one file, simple backups. Against: one writer at a time.",
      },
      {
        key: "Redis",
        description: "For: fast, many writers. Against: needs a server.",
      },
    ],
  };
  const q = questionOf([{ kind: "call", name: toolSpec(true).name, input }]);
  expect(gradeQuestion(q, ["SQLite", "Redis"]).pass).toBe(true);
});
