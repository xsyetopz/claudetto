// dotclaude-jev: the `features/jev/cli.mjs` request bodies, answer text, and retries,
// with a fake `fetch` (no call reaches the TypeSafe API).

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBody,
  call,
  format,
  parseArgs,
  UsageError,
} from "../../plugins/dotclaude-jev/features/jev/cli.mjs";
import {
  ATTEMPT_TIMEOUT_MS,
  JEV_TIMEOUT_MS,
  MARGIN_MS,
  MIN_CONFIDENCE,
  TRIES,
} from "../../plugins/dotclaude-jev/features/jev/limits.mjs";

const noStdin = () => {
  throw new Error("stdin read");
};
const body = (argv, stdin = noStdin) => buildBody(parseArgs(argv), stdin);

test("each verb builds its question type", () => {
  assert.deepEqual(body(["yes", "Is it safe?", "--state", "diff"]), {
    state: "diff",
    model: "jev-latest",
    questions: { q: { type: "noul", instructions: "Is it safe?" } },
  });
  assert.deepEqual(
    body(["PICK", "Which fix?", "a=Retry the call", "b"]).questions.q,
    {
      type: "choice",
      instructions: "Which fix?",
      criteria: { a: "Retry the call", b: null },
    },
  );
  const rated = body(["rate", "Risk?", "low", "high", "--state=x"]);
  assert.partialDeepStrictEqual(rated, {
    state: "x",
    questions: { q: { type: "score" } },
  });
  assert.deepEqual(rated.questions.q.criteria, ["low", "high"]);
});

test("the state comes from stdin or the text itself, and never from a file", () => {
  assert.equal(
    body(["yes", "Q", "--state", "-"], () => "piped").state,
    "piped",
  );
  assert.equal(body(["yes", "Q"]).state, "");
  // The path of a file that exists is text, so the client never reads it.
  const here = new URL(import.meta.url).pathname;
  assert.equal(body(["yes", "Q", "--state", here]).state, here);
  assert.equal(body(["yes", "Q", "--state", ".env"]).state, ".env");
});

test("after `--`, a word is never a flag", () => {
  const parsed = parseArgs(["yes", "--state", "-", "--", "--state", "x"]);
  assert.equal(parsed.state, "-");
  assert.deepEqual(parsed.words, ["--state", "x"]);
  const pick = body(["pick", "--", "Q", "--state=/etc/passwd", "b"], noStdin);
  assert.equal(pick.state, "");
  assert.equal(pick.questions.q.instructions, "Q");
  assert.deepEqual(pick.questions.q.criteria, {
    "--state": "/etc/passwd",
    b: null,
  });
});

test("`ask` takes the API questions, with or without the wrapper", () => {
  const questions = { x: { type: "noul", instructions: "Q" } };
  assert.deepEqual(
    body(["ask"], () => JSON.stringify(questions)),
    {
      state: "",
      model: "jev-latest",
      questions,
    },
  );
  assert.equal(
    body(["ask", "--state", "s"], () =>
      JSON.stringify({ state: "ignored", questions }),
    ).state,
    "s",
  );
});

test("bad input is a usage error", () => {
  for (const argv of [
    ["guess", "Q"],
    ["yes"],
    ["pick", "Q", "only"],
    ["rate", "Q", ...Array(11).fill("l")],
    ["ask", "--state", "-"],
  ])
    assert.throws(() => body(argv, () => "{}"), UsageError);
  assert.throws(() => body(["ask"], () => "not json"), UsageError);
  // A stdin that fails for another reason keeps its own error, so it is not reported as a JSON error.
  const broken = Object.assign(new Error("stdin gone"), { code: "EIO" });
  assert.throws(
    () =>
      body(["ask"], () => {
        throw broken;
      }),
    (err) => err === broken,
  );
});

test("the answer text lists probabilities and flags a weak answer", () => {
  assert.equal(format("noul", { q: { noul: 0.95 } }), "P(yes) = 0.95");
  assert.equal(format("noul", { q: { noul: 0.55 } }).split("\n").length, 2);
  const choice = format("choice", {
    q: { choice: "a", probabilities: { b: 0.1, a: 0.9 }, confidence: 0.8 },
  });
  assert.equal(choice, "a (confidence 0.80)\n  0.90 a\n  0.10 b");
  const score = format("score", {
    q: {
      score: 0.6,
      legend: { 0: "low", 1: "high" },
      probabilities: { 0: 0.4, 1: 0.6 },
      confidence: 0.1,
    },
  });
  assert.ok(score.includes("score 0.60 on levels 0 to 1"), score);
  assert.ok(score.includes("0.60 1 high"), score);
  assert.equal(score.split("\n").length, 4, score);
});

test("a 529 is retried with backoff, and a 401 names the key", async () => {
  const statuses = [529, 429, 200];
  const sent = [];
  const waits = [];
  const fetchFn = async (url, init) => {
    sent.push({ url, init });
    const status = statuses.shift();
    return new Response(JSON.stringify({ answers: {} }), { status });
  };
  const res = await call({ q: 1 }, "k", {
    fetchFn,
    sleep: async (ms) => waits.push(ms),
  });
  assert.deepEqual(res, { answers: {} });
  assert.deepEqual(waits, [1000, 2000]);
  assert.equal(sent[0].url, "https://api.typesafe.ai/v1/systemone");
  assert.equal(sent[0].init.headers.authorization, "Bearer k");

  const denied = async () => new Response("no", { status: 401 });
  await assert.rejects(call({}, "k", { fetchFn: denied }), {
    message: /`TYPESAFE_API_KEY` is not valid/,
  });
});

test("the tries, their timeouts, and the waits end before the kill bound with a margin", async () => {
  // The fake `fetch` answers 529 each time, so the client uses every try.
  let tries = 0;
  const waits = [];
  await assert.rejects(
    call({}, "k", {
      fetchFn: async () => {
        tries++;
        return new Response("busy", { status: 529 });
      },
      sleep: async (ms) => waits.push(ms),
    }),
    { message: /TypeSafe API 529/ },
  );
  assert.equal(tries, TRIES);
  assert.equal(waits.length, TRIES - 1);
  // The worst case: each try uses its whole timeout.
  const worst = tries * ATTEMPT_TIMEOUT_MS + waits.reduce((a, b) => a + b, 0);
  assert.ok(ATTEMPT_TIMEOUT_MS > 0);
  assert.ok(
    worst + MARGIN_MS <= JEV_TIMEOUT_MS,
    `${worst} ms and a margin of ${MARGIN_MS} ms is over ${JEV_TIMEOUT_MS} ms`,
  );
});

test("one confidence bound marks a weak answer in the text for both kinds of answer", () => {
  const at = (confidence) => ({
    q: {
      choice: "a",
      probabilities: { a: 1 },
      confidence,
    },
  });
  const lines = (confidence) =>
    format("choice", at(confidence)).split("\n").length;
  assert.equal(lines(MIN_CONFIDENCE - 0.01), lines(MIN_CONFIDENCE) + 1);
});
