// Helpers for the fixture tests of the router cases:
// `solve` runs one case with a fake runner that writes the work, and returns the record.

import fs from "node:fs";
import path from "node:path";
import { loadCases } from "../../tools/eval/cases.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import {
  done,
  EVALS,
  fakeRunner,
  hostExec,
  init,
  plugin,
  write,
} from "./support.mjs";

const ROUTER = path.join(EVALS, "router");

/** The record of case `id` after `act(job)` wrote the work. */
export function solve(id, act) {
  const { def, dir } = loadCases(ROUTER, [id])[0];
  return runCase(def, {
    arm: "dotclaude",
    model: "m",
    runner: fakeRunner([init(plugin), done("Done.")], act),
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
  });
}

/** Whether the run is resolved and touched no guarded file. */
export const resolves = async (id, act) => {
  const r = await solve(id, act);
  return r.resolved && r.tamper === false;
};

/** An `act` that writes each file of `files` (a map from path to text). */
export const writes = (files) => (job) => {
  for (const [rel, text] of Object.entries(files)) write(job, rel, text);
};

/** An `act` that replaces each `from` with `to` in a file, one `[file, from, to]` for each edit. */
export const edits = (list) => (job) => {
  for (const [rel, from, to] of list) {
    const f = path.join(job.workDir, rel);
    const text = fs.readFileSync(f, "utf8");
    if (!text.includes(from)) throw new Error(`${rel} has no ${from}`);
    fs.writeFileSync(f, text.replaceAll(from, to));
  }
};

/** An `act` that rewrites each file under `src/` with `fn(text, rel)`. */
export const rewriteAll = (fn) => (job) => {
  const walk = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
      );
  for (const f of walk(path.join(job.workDir, "src"))) {
    const rel = path.relative(job.workDir, f);
    const text = fs.readFileSync(f, "utf8");
    const next = fn(text, rel);
    if (next !== text) fs.writeFileSync(f, next);
  }
};
