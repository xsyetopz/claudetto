// The cause of an invalid run: the image runs `claude` as a user that is not root,
// the container output is kept in the run record, and a call with no valid run fails.

import { expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { armPlan } from "../../tools/eval/arms.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { dockerArgs, dockerRunner } from "../../tools/eval/container.mjs";
import { buildReport, renderReport } from "../../tools/eval/report.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import { allInvalid } from "../../tools/eval/suite.mjs";
import {
  EVAL_STDERR_CHARS,
  EVAL_STDOUT_TAIL_CHARS,
} from "../../tools/limits.mjs";
import { EVALS, hostExec } from "./support.mjs";

const dockerfile = fs
  .readFileSync(
    path.join(import.meta.dirname, "../../tools/eval/container/Dockerfile"),
    "utf8",
  )
  .split("\n");

test("the image runs claude as the user node, after every step that needs root", () => {
  const at = (re) => dockerfile.findLastIndex((l) => re.test(l));
  const user = at(/^USER node$/);
  expect(user).toBeGreaterThan(-1);
  expect(user).toBeGreaterThan(at(/^RUN /));
  expect(at(/^USER /)).toBe(user);
  const text = dockerfile.join("\n");
  expect(text).toContain("npm install -g");
  expect(text).toContain("git config --system");
  expect(text).toMatch(
    /chown[^\n]*node[^\n]*\/work[^\n]*\/config|chown[^\n]*\/work/,
  );
});

test("no plan and no argument list asks for root", () => {
  const plan = armPlan("dotclaude", { model: "m", addons: ["x"] });
  const args = dockerArgs({
    name: "n",
    image: "i",
    workDir: "/w",
    configDir: "/c",
    harnessDir: "/h",
    pluginsDir: "/p",
    plan,
  });
  const all = [...args, ...plan.args, ...plan.setup].join(" ");
  expect(all).not.toMatch(/--user|(^| )-u( |$)|\bsudo\b|IS_SANDBOX/);
  expect(all).not.toContain("root");
  // The setup commands run in the same `sh -c` as `claude`, so the user and the config folder are the same.
  expect(args.at(-1)).toContain("claude plugin install dotclaude@dotclaude");
  expect(plan.env.CLAUDE_CONFIG_DIR).toBe("/config");
});

function failingSpawn(stderr, stdout) {
  return () => {
    const child = new EventEmitter();
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {};
    setTimeout(() => {
      child.stderr.write(stderr);
      child.stdout.write(stdout);
      setTimeout(() => child.emit("close", 1), 10);
    }, 5);
    return child;
  };
}

const job = {
  workDir: "/w",
  configDir: "/c",
  hookScript: "",
  rules: {},
  settings: {},
  claims: [],
  prompt: "p",
  plan: { env: {}, setup: [], args: [] },
};

test("the runner keeps the first of stderr and the last of stdout", async () => {
  const err = `E${"x".repeat(EVAL_STDERR_CHARS * 2)}`;
  const out = `${"y".repeat(EVAL_STDOUT_TAIL_CHARS * 2)}Z`;
  const r = await dockerRunner({
    image: "i",
    pluginsDir: "/p",
    secrets: { CLAUDE_CODE_OAUTH_TOKEN: "t" },
    timeoutS: 60,
    spawn: failingSpawn(err, out),
  })(job);
  expect(r.stderr).toHaveLength(EVAL_STDERR_CHARS);
  expect(r.stderr[0]).toBe("E");
  expect(r.stdoutTail).toHaveLength(EVAL_STDOUT_TAIL_CHARS);
  expect(r.stdoutTail.endsWith("Z")).toBe(true);
});

test("an invalid run keeps its stderr and the report prints it", async () => {
  const [c] = loadCases(EVALS, ["bugfix-range"]);
  const runner = dockerRunner({
    image: "i",
    pluginsDir: "/p",
    secrets: { CLAUDE_CODE_OAUTH_TOKEN: "t" },
    timeoutS: 60,
    spawn: failingSpawn("cannot be used with root/sudo privileges\n", "tail\n"),
  });
  const run = await runCase(c.def, {
    arm: "vanilla",
    model: "m",
    runner,
    exec: hostExec,
    caseDir: c.dir,
    run: 0,
  });
  expect(run.faults).toContain("No init event.");
  expect(run.stderr).toContain("root/sudo");
  expect(run.stdoutTail).toContain("tail");
  const md = renderReport(
    buildReport([run], { arms: ["vanilla", "dotclaude"] }),
  );
  expect(md).toContain("Invalid runs:");
  expect(md).toContain("root/sudo");
  expect(md).toContain("tail");
});

test("allInvalid names each arm with no valid run", () => {
  const bad = { arm: "a", faults: ["No init event."] };
  const good = { arm: "b", faults: [] };
  expect(allInvalid([bad, bad], ["a", "b"])).toMatch(/every run/i);
  expect(allInvalid([bad, good], ["a", "b"])).toMatch(/arm a/);
  expect(allInvalid([good, { ...good, arm: "a" }], ["a", "b"])).toBeNull();
  expect(allInvalid([], ["a", "b"])).toBeNull();
});
