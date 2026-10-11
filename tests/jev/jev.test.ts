// dotclaude-jev: the `features/jev/cli.ts` request bodies, answer text, and retries,
// with a fake `fetch` (no call reaches the TypeSafe API).

import { expect, test } from "bun:test";
import {
  type AskBody,
  buildBody,
  call,
  parseArgs,
  UsageError,
  type VerbBody,
  verbBody,
} from "../../plugins/dotclaude-jev/features/jev/cli.ts";
import {
  format,
  formatChoice,
  formatNoul,
  formatScore,
} from "../../plugins/dotclaude-jev/features/jev/format.ts";
import {
  ATTEMPT_TIMEOUT_MS,
  JEV_TIMEOUT_MS,
  MARGIN_MS,
  MIN_CONFIDENCE,
  TRIES,
} from "../../plugins/dotclaude-jev/features/jev/limits.ts";

/** A stdin reader, which may answer at once or later. */
type Stdin = () => string | Promise<string>;

const noStdin: Stdin = () => {
  throw new Error("stdin read");
};
// The wrappers make each reader a promise, as `buildBody` and `verbBody` expect.
const body = async (
  argv: string[],
  stdin: Stdin = noStdin,
): Promise<AskBody | VerbBody> =>
  buildBody(parseArgs(argv), async () => stdin());
const verb = async (
  argv: string[],
  stdin: Stdin = noStdin,
): Promise<VerbBody> => verbBody(parseArgs(argv), async () => stdin());

/** The request that a fake `fetch` gets: the URL and the fields of `init` that `call` sets. */
type FakeRequest = { url: string; init: { headers: Record<string, string> } };

/**
 * A fake `fetch` with the fields that `call` reads.
 * The cast adds no check, because the fake has no `preconnect` member of `typeof fetch`.
 */
const fakeFetch = (
  respond: (url: string, init: FakeRequest["init"]) => Promise<Response>,
): typeof fetch => respond as unknown as typeof fetch;

test("each verb builds its question type", async () => {
  expect(await body(["yes", "Is it safe?", "--state", "diff"])).toStrictEqual({
    state: "diff",
    model: "jev-latest",
    questions: { q: { type: "noul", instructions: "Is it safe?" } },
  });
  expect(
    (await verb(["PICK", "Which fix?", "a=Retry the call", "b"])).questions.q,
  ).toStrictEqual({
    type: "choice",
    instructions: "Which fix?",
    criteria: { a: "Retry the call", b: null },
  });
  const rated = await verb(["rate", "Risk?", "low", "high", "--state=x"]);
  expect(rated).toMatchObject({
    state: "x",
    questions: { q: { type: "score" } },
  });
  expect(rated.questions.q.criteria).toStrictEqual(["low", "high"]);
});

test("the state comes from stdin or the text itself, and never from a file", async () => {
  expect((await body(["yes", "Q", "--state", "-"], () => "piped")).state).toBe(
    "piped",
  );
  expect((await body(["yes", "Q"])).state).toBe("");
  // The path of a file that exists is text, so the client never reads it.
  const here = new URL(import.meta.url).pathname;
  expect((await body(["yes", "Q", "--state", here])).state).toBe(here);
  expect((await body(["yes", "Q", "--state", ".env"])).state).toBe(".env");
});

test("after `--`, a word is never a flag", async () => {
  const parsed = parseArgs(["yes", "--state", "-", "--", "--state", "x"]);
  expect(parsed.state).toBe("-");
  expect(parsed.words).toStrictEqual(["--state", "x"]);
  const pick = await verb(
    ["pick", "--", "Q", "--state=/etc/passwd", "b"],
    noStdin,
  );
  expect(pick.state).toBe("");
  expect(pick.questions.q.instructions).toBe("Q");
  expect(pick.questions.q.criteria).toStrictEqual({
    "--state": "/etc/passwd",
    b: null,
  });
});

test("`ask` takes the API questions, with or without the wrapper", async () => {
  const questions = { x: { type: "noul", instructions: "Q" } };
  // The `ask` body carries the questions as the caller gave them.
  expect(await body(["ask"], () => JSON.stringify(questions))).toStrictEqual({
    state: "",
    model: "jev-latest",
    questions,
  });
  expect(
    (
      await body(["ask", "--state", "s"], () =>
        JSON.stringify({ state: "ignored", questions }),
      )
    ).state,
  ).toBe("s");
});

test("bad input is a usage error", async () => {
  for (const argv of [
    ["guess", "Q"],
    ["yes"],
    ["pick", "Q", "only"],
    ["rate", "Q", ...Array(11).fill("l")],
    ["ask", "--state", "-"],
  ])
    await expect(body(argv, () => "{}")).rejects.toThrow(UsageError);
  await expect(body(["ask"], () => "not json")).rejects.toThrow(UsageError);
  // A stdin that fails for another reason keeps its own error, so it is not reported as a JSON error.
  const broken = Object.assign(new Error("stdin gone"), { code: "EIO" });
  let caught: unknown;
  try {
    await body(["ask"], () => {
      throw broken;
    });
  } catch (err) {
    caught = err;
  }
  expect(caught).toBe(broken);
});

test("the answer text lists probabilities and flags a weak answer", () => {
  expect(format("noul", { q: { noul: 0.95 } })).toBe("P(yes) = 0.95");
  expect(formatNoul({ noul: 0.55 }).split("\n").length).toBe(2);
  const choice = formatChoice({
    choice: "a",
    probabilities: { b: 0.1, a: 0.9 },
    confidence: 0.8,
  });
  expect(choice).toBe("a (confidence 0.80)\n  0.90 a\n  0.10 b");
  const score = formatScore({
    score: 0.6,
    legend: { 0: "low", 1: "high" },
    probabilities: { 0: 0.4, 1: 0.6 },
    confidence: 0.1,
  });
  expect(score.includes("score 0.60 on levels 0 to 1"), score).toBeTruthy();
  expect(score.includes("0.60 1 high"), score).toBeTruthy();
  expect(score.split("\n").length, score).toBe(4);
});

test("a 529 is retried with backoff, and a 401 names the key", async () => {
  const statuses = [529, 429, 200];
  const sent: FakeRequest[] = [];
  const waits: number[] = [];
  const fetchFn = fakeFetch(async (url, init) => {
    sent.push({ url, init });
    const status = statuses.shift() as number;
    return new Response(JSON.stringify({ answers: {} }), { status });
  });
  const res = await call({ q: 1 }, "k", {
    fetchFn,
    sleep: async (ms) => {
      waits.push(ms as number);
    },
  });
  expect<unknown>(res).toStrictEqual({ answers: {} });
  expect(waits).toStrictEqual([1000, 2000]);
  expect(sent[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
  expect(sent[0]?.init.headers["authorization"]).toBe("Bearer k");

  const denied = fakeFetch(async () => new Response("no", { status: 401 }));
  await expect(call({}, "k", { fetchFn: denied })).rejects.toThrow(
    /`TYPESAFE_API_KEY`/,
  );
});

test("the tries, their timeouts, and the waits end before the kill bound with a margin", async () => {
  // The fake `fetch` answers 529 each time, so the client uses every try.
  let tries = 0;
  const waits: number[] = [];
  await expect(
    call({}, "k", {
      fetchFn: fakeFetch(async () => {
        tries++;
        return new Response("busy", { status: 529 });
      }),
      sleep: async (ms) => {
        waits.push(ms as number);
      },
    }),
  ).rejects.toThrow(/TypeSafe API 529/);
  expect(tries).toBe(TRIES);
  expect(waits.length).toBe(TRIES - 1);
  // The worst case: each try uses its whole timeout.
  const worst = tries * ATTEMPT_TIMEOUT_MS + waits.reduce((a, b) => a + b, 0);
  expect(ATTEMPT_TIMEOUT_MS > 0).toBeTruthy();
  expect(
    worst + MARGIN_MS <= JEV_TIMEOUT_MS,
    `${worst} ms and a margin of ${MARGIN_MS} ms is over ${JEV_TIMEOUT_MS} ms`,
  ).toBeTruthy();
});

test("one confidence bound marks a weak answer in the text for both kinds of answer", () => {
  const lines = (confidence: number) =>
    formatChoice({ choice: "a", probabilities: { a: 1 }, confidence }).split(
      "\n",
    ).length;
  expect(lines(MIN_CONFIDENCE - 0.01)).toBe(lines(MIN_CONFIDENCE) + 1);
});
