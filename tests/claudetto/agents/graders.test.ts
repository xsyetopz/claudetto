// Runs the graders of the agent evals on recorded transcripts, one that passes and some that fail.
// A transcript with the name `pass` must pass each grader.
// A transcript with a name that starts with `fail-` must fail the graders that `FAILS` names, and no other grader.
// The `llm` graders need a model, so this test skips them.
// The transcripts are hand-built, so the test shows what each grader does, not what a model does.

import { expect, test } from "bun:test";
import path from "node:path";
import { parse } from "yaml";
import { answerLinePattern } from "../../support/eval-patterns.ts";
import { REPO, walk } from "../../support/repo.ts";
import {
  failedGraders,
  type Grader,
  type Transcript,
} from "../../support/transcript-grade.ts";

const EVALS = path.join(REPO, "src/plugins/claudetto/slices/agents/evals");
const TRANSCRIPTS = path.join(import.meta.dir, "transcripts");

/** The graders that each failing transcript must fail. */
const ANSWERS = [
  "answer-loadconfig",
  "answer-retrymax",
  "answer-flushqueue",
  "answer-toslug",
];
const AGENT_TYPE = ["investigator-agents", "no-other-agent-type"];
const FAILS: Record<string, string[]> = {
  "big-file-subagent/fail-wrong-agent": [
    "subagent-used",
    "no-other-agent-type",
  ],
  "delegation-related-split/fail-wrong-agent": AGENT_TYPE,
  "delegation-related-grouped/fail-wrong-agent": AGENT_TYPE,
  "fail-dump-all-files": ANSWERS,
  "fail-flat-list": ANSWERS,
  "fail-no-agent": ["subagent-used"],
};

const load = async (file: string) =>
  (await Bun.file(file).json()) as Transcript;
const graders = async (name: string) =>
  (
    parse(await Bun.file(path.join(EVALS, name, "case.yaml")).text()) as {
      graders: Grader[];
    }
  ).graders;

const cases = walk(TRANSCRIPTS, { keep: (f) => f.endsWith(".json") });

test("the transcripts cover the three agent evals", () => {
  const names = new Set(cases.map((f) => path.basename(path.dirname(f))));
  expect([...names].sort()).toEqual([
    "big-file-subagent",
    "delegation-related-grouped",
    "delegation-related-split",
  ]);
});

for (const file of cases) {
  const c = path.basename(path.dirname(file));
  const name = path.basename(file, ".json");
  test(`${c}: transcript \`${name}\` ${name === "pass" ? "passes each grader" : "fails the expected graders"}`, async () => {
    const failed = failedGraders(await graders(c), await load(file));
    const expected =
      name === "pass"
        ? []
        : (FAILS[`${c}/${name}`] ?? FAILS[name] ?? ["missing"]);
    expect(failed.sort()).toEqual([...expected].sort());
  });
}

test("the answer graders of both delegation evals hold the shared pattern", async () => {
  const files = [
    "src/config/load.mjs",
    "src/net/retry.mjs",
    "src/jobs/run.mjs",
    "src/text/slug.mjs",
  ];
  for (const c of ["delegation-related-split", "delegation-related-grouped"]) {
    const answers = (await graders(c)).filter((g) =>
      g.name.startsWith("answer-"),
    );
    expect(answers.map((g) => g.pattern)).toEqual(
      files.map((f, i) => answerLinePattern(i + 1, f)),
    );
  }
});

test("each agent eval judges the question with a model, and no regex reads the message", async () => {
  for (const c of [
    "big-file-subagent",
    "delegation-related-split",
    "delegation-related-grouped",
  ]) {
    const all = await graders(c);
    const g = all.find((x) => x.name === "no-plain-question");
    expect(g?.type, c).toBe("llm");
    expect(
      all.some((x) => x.type === "regex" && typeof x.target !== "object"),
      c,
    ).toBeFalse();
  }
});
