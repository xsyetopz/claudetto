// The two providers of a decision with fake runs: the CLI run of Jev and the completion of the model.
// Each failure of a provider gives its cause, and no test reaches the network or a model.

import { expect, test } from "bun:test";
import {
  type Completion,
  createFallback,
} from "../../../plugins/dotclaude/slices/decide/adapters/fallback.ts";
import {
  type CliRun,
  createJev,
} from "../../../plugins/dotclaude/slices/decide/adapters/jev.ts";
import type {
  Cause,
  DecisionRequest,
} from "../../../plugins/dotclaude/slices/decide/ports.ts";

const REQUEST: DecisionRequest = {
  question: "Which store?",
  options: [
    { key: "sql", description: "relations" },
    { key: "kv", description: "keys" },
  ],
};

/** A fake CLI run with the exit code and the stdout of `run`. */
const runWith = (run: Partial<CliRun>) => async (): Promise<CliRun> => ({
  exitCode: 0,
  stdout: "",
  stderr: "",
  ...run,
});

test("a Jev run with exit 0 and an answer is an answer", async () => {
  const jev = createJev(runWith({ stdout: "  sql, relations fit\n" }));
  expect(await jev.decide(REQUEST)).toEqual({
    ok: true,
    text: "sql, relations fit",
  });
});

test("a Jev run with exit 0 and no answer is the cause `failed`", async () => {
  const jev = createJev(runWith({ stdout: "  \n" }));
  expect(await jev.decide(REQUEST)).toEqual({ ok: false, cause: "failed" });
});

const EXIT_CAUSES: [number, Cause][] = [
  [2, "usage"],
  [3, "invalid-key"],
  [4, "no-balance"],
  [1, "failed"],
];

for (const [exitCode, cause] of EXIT_CAUSES) {
  test(`a Jev run with exit ${exitCode} gives the cause \`${cause}\``, async () => {
    const jev = createJev(runWith({ exitCode, stderr: "reason" }));
    expect(await jev.decide(REQUEST)).toEqual({ ok: false, cause });
  });
}

test("a Jev run that throws gives the cause `failed`", async () => {
  const jev = createJev(async () => {
    throw new Error("spawn failed");
  });
  expect(await jev.decide(REQUEST)).toEqual({ ok: false, cause: "failed" });
});

test("the Jev run gets the arguments of the request, with the question after `--`", async () => {
  const calls: unknown[] = [];
  const jev = createJev(async (call) => {
    calls.push(call);
    return { exitCode: 0, stdout: "sql", stderr: "" };
  });
  await jev.decide(REQUEST);
  // The options come in a random order, so the test compares the options as a set.
  const [call] = calls as { args: string[]; stdin: unknown }[];
  expect(call?.args.slice(0, 3)).toEqual(["pick", "--", "Which store?"]);
  expect(call?.args.slice(3).sort()).toEqual(["kv=keys", "sql=relations"]);
  expect(call?.stdin).toBeUndefined();
});

/** A fake completion that gives `reply`. */
const completion = (reply: Completion) => async (): Promise<Completion> =>
  reply;

test("a model that answers gives its text, trimmed", async () => {
  const model = createFallback(
    completion({ isAnswered: true, text: " kv \n" }),
  );
  expect(await model.decide(REQUEST)).toEqual({ ok: true, text: "kv" });
});

test("a model with no reply gives the cause `model-failed`", async () => {
  const model = createFallback(completion({ isAnswered: false }));
  expect(await model.decide(REQUEST)).toEqual({
    ok: false,
    cause: "model-failed",
  });
});

test("a model with an empty reply gives the cause `model-failed`", async () => {
  const model = createFallback(completion({ isAnswered: true, text: " " }));
  expect(await model.decide(REQUEST)).toEqual({
    ok: false,
    cause: "model-failed",
  });
});

test("a model that throws gives the cause `model-failed`", async () => {
  const model = createFallback(async () => {
    throw new Error("refused");
  });
  expect(await model.decide(REQUEST)).toEqual({
    ok: false,
    cause: "model-failed",
  });
});
