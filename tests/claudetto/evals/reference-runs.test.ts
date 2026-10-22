// Each eval case that has a reference run passes every check without a model on it,
// and a run that does nothing fails at least one such check.
// A reference run is `{ events, files }` in `reference-runs/<case name>.json`, as a bad run is, and no model grades it.
// The `llm` graders are the only graders that this test skips.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import {
  failedGraders,
  type Grader,
  type Transcript,
} from "../../../tools/transcript-grade.ts";
import { runScaffold } from "../../support/eval-patterns.ts";
import { REPO } from "../../support/repo.ts";

/** The cases of the `prompt` rules: each has a tag `set:NAME`. */
const EVALS = `${REPO}/plugins/claudetto/evals`;
const DIR = `${REPO}/tests/claudetto/evals/reference-runs`;

type Case = { name: string; tags?: string[]; graders: Grader[]; dir: string };

const cases: Case[] = (
  await Promise.all(
    [...new Bun.Glob("*/case.yaml").scanSync(EVALS)].map(async (f) => {
      const doc = parse(await Bun.file(`${EVALS}/${f}`).text()) as Case;
      return { ...doc, dir: path.dirname(`${EVALS}/${f}`) };
    }),
  )
).filter((c) => c.tags?.some((t) => t.startsWith("set:")));

/** The graders that run without a model. */
const offline = (c: Case): Grader[] =>
  c.graders.filter((g) => g.type !== "llm");

/**
 * The cases where a run that does nothing passes each check without a model, so only the judge tells it apart.
 * `repeat-no-reason`, `false-alarm-sum`, and `blind-mirror-deletes-uploads` ask for no change, and their checks without a model only guard the files.
 * The `-hard` version of `false-alarm-sum` adds `tests-run`, which a no-op run fails.
 */
const NO_OP_PASSES = [
  "repeat-no-reason",
  "repeat-no-reason-hard",
  "false-alarm-sum",
  "blind-mirror-deletes-uploads",
];

test("the eval folder holds the cases that this file reads", () => {
  expect(cases.length).toBeGreaterThanOrEqual(22);
});

for (const c of cases) {
  const file = Bun.file(`${DIR}/${c.name}.json`);
  if (await file.exists())
    test(`the reference run of ${c.name} passes each check without a model`, async () => {
      const run = (await file.json()) as Transcript;
      expect(run.events.length).toBeGreaterThan(0);
      expect(failedGraders(offline(c), run)).toEqual([]);
    });

  test(`a run of ${c.name} that does nothing ${NO_OP_PASSES.includes(c.name) ? "passes each check without a model, so only the judge tells it apart" : "fails a check without a model"}`, async () => {
    const files: Record<string, string> = {};
    // A case with no `scaffold.sh` starts in an empty folder.
    if (fs.existsSync(path.join(c.dir, "scaffold.sh"))) {
      const root = runScaffold(c.dir);
      for await (const f of new Bun.Glob("**/*").scan({ cwd: root, dot: true }))
        files[f] = await Bun.file(path.join(root, f)).text();
    }
    const noop: Transcript = {
      events: [
        {
          type: "assistant",
          message: { content: [{ type: "text", text: "Done." }] },
        },
        { type: "result", result: "Done." },
      ],
      files,
    };
    const failed = failedGraders(offline(c), noop);
    if (NO_OP_PASSES.includes(c.name)) expect(failed).toEqual([]);
    else expect(failed.length).toBeGreaterThan(0);
  });
}
