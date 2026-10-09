// The case suites of `evals/`: router classes (11.6), delegation (10.7), code graph (17.7),
// the big-file case (10.4), and the leak check over every suite.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TABLE } from "../../plugins/dotclaude/features/router/data.mjs";
import { loadCases } from "../../tools/eval/cases.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import { generateFiles, overlay } from "../../tools/eval/oracle.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import {
  call,
  done,
  EVALS,
  hostExec,
  init,
  ok,
  plugin,
  ROOT,
  say,
} from "./support.mjs";

const suite = (name) => loadCases(path.join(EVALS, name));

/** Copies the fixture to a new folder, generates its files, and returns the folder. */
function work({ def, dir }) {
  const w = fs.mkdtempSync(path.join(os.tmpdir(), "suite-"));
  fs.cpSync(path.join(dir, "fixture"), w, { recursive: true });
  generateFiles(def, w);
  overlay(path.join(dir, "oracle"), path.join(w, ".oracle"));
  return w;
}
const passes = (c, w) =>
  c.def.oracle.tests.every((t) => hostExec(t.cmd, w) === 0);

test("each task class of the router table has 3 to 5 cases", () => {
  const cases = suite("router");
  for (const cls of Object.keys(TABLE)) {
    const n = cases.filter((c) => c.def.taskClass === cls).length;
    expect([cls, n >= 3 && n <= 5]).toEqual([cls, true]);
  }
});

test("a case of any suite fails on its untouched fixture", () => {
  for (const s of ["router", "delegation", "code-graph", "handoff"])
    for (const c of suite(s)) {
      const w = work(c);
      try {
        expect([c.def.id, passes(c, w)]).toEqual([c.def.id, false]);
      } finally {
        fs.rmSync(w, { recursive: true, force: true });
      }
    }
}, 60_000);

test("an answer case passes once the answer file is right", () => {
  const answers = {
    "router/search-1": [
      "ANSWER.md",
      "src/cli/alias.mjs\nsrc/cli/batch.mjs\nsrc/cli/dispatch.mjs\nsrc/cli/run.mjs\nsrc/jobs/schedule.mjs\n",
    ],
    "delegation/related-grouped": [
      "ANSWERS.md",
      "src/config/load.mjs\nsrc/net/retry.mjs\nsrc/jobs/run.mjs\nsrc/text/slug.mjs\n",
    ],
    "code-graph/impact-callers": [
      "IMPACT.md",
      "src/cart.mjs\nsrc/invoice.mjs\nsrc/promo.mjs\n",
    ],
  };
  for (const [id, [file, text]] of Object.entries(answers)) {
    const [s, name] = id.split("/");
    const c = suite(s).find((x) => x.def.id === name);
    const w = work(c);
    try {
      expect(passes(c, w)).toBe(false);
      fs.writeFileSync(path.join(w, file), text);
      expect([id, passes(c, w)]).toEqual([id, true]);
    } finally {
      fs.rmSync(w, { recursive: true, force: true });
    }
  }
});

test("the delegation cases ask the same questions and differ in the delegation line", () => {
  const [g, s] = ["related-grouped", "related-split"].map(
    (id) => suite("delegation").find((c) => c.def.id === id).def.prompt,
  );
  expect(g.replace("for all the questions", "X")).toBe(
    s.replace("for each question", "X"),
  );
});

test("`--suite` names a folder of `evals/`", () => {
  expect(parseArgs(["--suite", "delegation"]).suite).toBe("delegation");
});

test("`plugins/` names no case of any suite", () => {
  const ids = ["", "router", "delegation", "code-graph"].flatMap((s) =>
    loadCases(path.join(EVALS, s)).map((c) => c.def.id),
  );
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
      );
  for (const f of walk(path.join(ROOT, "plugins"))) {
    const text = fs.readFileSync(f, "utf8");
    for (const id of ids)
      expect([f, id, text.includes(id)]).toEqual([f, id, false]);
  }
});

// Task 10.4: a subagent answers from a generated 1 MB file with bounded tool results.
const big = loadCases(EVALS, ["big-file-subagent"])[0];

test("the big file is generated at setup and the repository holds no large file", () => {
  expect(fs.readdirSync(path.join(big.dir, "fixture"))).toEqual([
    "package.json",
  ]);
  const w = work(big);
  try {
    const text = fs.readFileSync(path.join(w, "data/big.log"), "utf8");
    expect(text.length).toBeGreaterThanOrEqual(1_048_576);
    expect(text.match(/KX-7731/g)).toHaveLength(1);
  } finally {
    fs.rmSync(w, { recursive: true, force: true });
  }
});

const bigRun = (outputLen) =>
  runCase(big.def, {
    arm: "dotclaude",
    model: "m",
    exec: hostExec,
    caseDir: big.dir,
    expectedVersion: "2.1.295",
    runner: async (job) => {
      fs.writeFileSync(path.join(job.workDir, "ANSWER.md"), "KX-7731\n");
      return {
        events: [
          init(plugin),
          call("a", "Grep", {}),
          ok("a", "x".repeat(outputLen)),
          say("done"),
          done("done"),
        ],
        exitCode: 0,
      };
    },
  });

test("the grader accepts a result at the bound and rejects one over it", async () => {
  const under = await bigRun(8000);
  expect(under.oversizeResults).toBe(0);
  expect(under.resolved).toBe(true);
  const over = await bigRun(8001);
  expect(over.oversizeResults).toBe(1);
  expect(over.resolved).toBe(false);
});
