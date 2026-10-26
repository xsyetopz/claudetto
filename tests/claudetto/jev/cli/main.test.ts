// The command `claudetto-decide` (`adapters/cli.ts`): arguments, request body, retries, exit codes, `ask`, and `render`.
// The API is a fake `fetch`, and the waits are a fake `sleep`, so no test sends a request or waits.

import { expect, spyOn, test } from "bun:test";
import {
  ApiError,
  buildBody,
  EXIT,
  exitOf,
  main,
  parseArgs,
  post,
  render,
  UsageError,
} from "../../../../plugins/claudetto/modules/jev/adapters/cli.ts";
import {
  BACKOFF_MS,
  ERROR_BODY_MAX,
  TRIES,
} from "../../../../plugins/claudetto/modules/jev/limits.ts";
import { BODY, KEY, replies, reply, waits } from "./support.ts";

test("`yes` with a question and no flag reads the question as a word", () => {
  expect(parseArgs(["yes", "--", "Use the cache?"])).toEqual({
    kind: "yes",
    words: ["Use the cache?"],
    state: undefined,
    json: false,
    images: [],
  });
});

test("`--state` takes the value after it, and the words keep their order", () => {
  expect(
    parseArgs(["pick", "--state", "-", "--", "Which?", "sql", "kv=keys"]),
  ).toEqual({
    kind: "pick",
    words: ["Which?", "sql", "kv=keys"],
    state: "-",
    json: false,
    images: [],
  });
});

test("a word after `--` that looks like a flag is a literal word", () => {
  expect(parseArgs(["yes", "--", "--state"])).toEqual({
    kind: "yes",
    words: ["--state"],
    state: undefined,
    json: false,
    images: [],
  });
});

test("an unknown verb is a usage fault", () => {
  expect(() => parseArgs(["guess", "--", "q"])).toThrow(UsageError);
});

test("a `pick` with one option is a usage fault", async () => {
  const args = parseArgs(["pick", "--", "Which?", "sql"]);
  await expect(buildBody(args, async () => "")).rejects.toThrow(UsageError);
});

test("`--state -` reads the state from stdin", async () => {
  const args = parseArgs(["yes", "--state", "-", "--", "Safe?"]);
  const body = (await buildBody(args, async () => "the state")) as {
    state: string;
  };
  expect(body.state).toBe("the state");
});

test("a `yes` body asks one `noul` question with the question as its instructions", async () => {
  const args = parseArgs(["yes", "--", "Safe?"]);
  expect(await buildBody(args, async () => "")).toEqual({
    state: "",
    model: "jev-latest",
    questions: { q: { type: "noul", instructions: "Safe?" } },
  });
});

test("a `pick` body gives each option its key and its description", async () => {
  const args = parseArgs(["pick", "--", "Which?", "sql=relations", "kv"]);
  expect(await buildBody(args, async () => "")).toEqual({
    state: "",
    model: "jev-latest",
    questions: {
      q: {
        type: "choice",
        instructions: "Which?",
        criteria: { sql: "relations", kv: null },
      },
    },
  });
});

test("each cause of the CLI gives its exit code", () => {
  expect(exitOf(new UsageError("usage"))).toBe(EXIT.usage);
  expect(exitOf(new ApiError(401, "key"))).toBe(EXIT.invalidKey);
  expect(exitOf(new ApiError(402, "balance"))).toBe(EXIT.noBalance);
  expect(exitOf(new ApiError(500, "server"))).toBe(EXIT.failed);
  expect(exitOf(new Error("other"))).toBe(EXIT.failed);
});

test("the exit codes are 0 to 4, one for each cause", () => {
  expect(Object.values(EXIT).sort()).toEqual([0, 1, 2, 3, 4]);
});

test("a 429 reply is retried with a doubling wait, and the answer is kept", async () => {
  const { fetchFn, calls } = replies(
    reply(429),
    reply(529),
    reply(200, { a: 1 }),
  );
  const { ms, sleep } = waits();
  expect(await post(BODY, KEY, { fetchFn, sleep })).toEqual({ a: 1 });
  expect(calls.count).toBe(3);
  expect(ms).toEqual([BACKOFF_MS, BACKOFF_MS * 2]);
});

test("a 429 reply on every try is the error of the last try, with its status", async () => {
  const { fetchFn, calls } = replies(
    ...Array.from({ length: TRIES }, () => reply(429)),
  );
  const { ms, sleep } = waits();
  const err = await post(BODY, KEY, { fetchFn, sleep }).catch(
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(429);
  expect(calls.count).toBe(TRIES);
  expect(ms.length).toBe(TRIES - 1);
});

test("a 401 reply is not retried", async () => {
  const { fetchFn, calls } = replies(reply(401, "bad key"));
  const { ms, sleep } = waits();
  await expect(post(BODY, KEY, { fetchFn, sleep })).rejects.toThrow(ApiError);
  expect(calls.count).toBe(1);
  expect(ms).toEqual([]);
});

test("an error body is cut to the bound of `ERROR_BODY_MAX` characters", async () => {
  const { fetchFn } = replies(reply(400, "x".repeat(ERROR_BODY_MAX * 3)));
  const { sleep } = waits();
  const err = (await post(BODY, KEY, { fetchFn, sleep }).catch(
    (e: unknown) => e,
  )) as Error;
  expect(err.message.split("x").length - 1).toBe(ERROR_BODY_MAX);
});

test("`main` with no key exits with the usage code and prints no key", async () => {
  const saved = process.env["TYPESAFE_API_KEY"];
  delete process.env["TYPESAFE_API_KEY"];
  try {
    expect(await main(["yes", "--", "Safe?"])).toBe(EXIT.usage);
  } finally {
    if (saved === undefined) delete process.env["TYPESAFE_API_KEY"];
    else process.env["TYPESAFE_API_KEY"] = saved;
  }
});

test("`--json` before `--` is the flag, and after `--` it is a word", () => {
  expect(parseArgs(["yes", "--json", "--", "Safe?"]).json).toBe(true);
  expect(parseArgs(["yes", "--", "--json"])).toEqual({
    kind: "yes",
    words: ["--json"],
    state: undefined,
    json: false,
    images: [],
  });
});

test("`ask` is a verb with no words", () => {
  expect(parseArgs(["ask"])).toEqual({
    kind: "ask",
    words: [],
    state: undefined,
    json: false,
    images: [],
  });
});

test("`ask` sends the questions and the state of the JSON on stdin", async () => {
  const stdin = JSON.stringify({
    state: "the state",
    questions: { kind_0: { type: "choice" } },
  });
  expect(await buildBody(parseArgs(["ask"]), async () => stdin)).toEqual({
    state: "the state",
    model: "jev-latest",
    questions: { kind_0: { type: "choice" } },
  });
});

test("`ask` keeps a state that is an object as the object", async () => {
  const state = { goal: "ship", files: ["a.ts", "b.ts"] };
  const stdin = JSON.stringify({
    state,
    questions: { kind_0: { type: "choice" } },
  });
  const body = (await buildBody(parseArgs(["ask"]), async () => stdin)) as {
    state: unknown;
  };
  expect(body.state).toEqual(state);
});

test("`ask` with no state sends an empty state", async () => {
  const stdin = JSON.stringify({ questions: { kind_0: { type: "choice" } } });
  const body = (await buildBody(parseArgs(["ask"]), async () => stdin)) as {
    state: string;
  };
  expect(body.state).toBe("");
});

test("`ask` with stdin that is not JSON is a usage fault", async () => {
  const args = parseArgs(["ask"]);
  await expect(buildBody(args, async () => "not json")).rejects.toThrow(
    UsageError,
  );
});

test("`ask` with no `questions` in the JSON is a usage fault", async () => {
  const args = parseArgs(["ask"]);
  await expect(buildBody(args, async () => "{}")).rejects.toThrow(UsageError);
});

test("`ask` prints the answers as JSON", () => {
  const answers = { kind_0: { choice: "facts", confidence: 0.9 } };
  expect(JSON.parse(render(parseArgs(["ask"]), answers))).toEqual(answers);
});

test("without `--json` the command prints the text of the answer", () => {
  const answers = { q: { noul: 0.9 } };
  expect(render(parseArgs(["yes", "--", "Safe?"]), answers)).toBe(
    "P(yes) = 0.90",
  );
});

test("`--json` prints the text and the structured answer of `yes`", () => {
  const answers = { q: { noul: 0.9 } };
  const out = JSON.parse(
    render(parseArgs(["yes", "--json", "--", "Safe?"]), answers),
  );
  expect(out.text).toBe("P(yes) = 0.90");
  expect(out.answer).toEqual({ choice: "yes", confidence: 0.9 });
});

test("`--json` prints the chosen key and its confidence for `pick`", () => {
  const answers = {
    q: {
      choice: "sql",
      confidence: 0.8,
      probabilities: { sql: 0.8, kv: 0.2 },
    },
  };
  const out = JSON.parse(
    render(parseArgs(["pick", "--json", "--", "Which?", "sql", "kv"]), answers),
  );
  expect(out.answer).toEqual({ choice: "sql", confidence: 0.8 });
});

test("`--json` with a reply that has no answer throws", () => {
  const args = parseArgs(["yes", "--json", "--", "Safe?"]);
  expect(() => render(args, {})).toThrow();
});

test("`--image <path>` repeats on `yes`, `pick`, `ask`, and `box`, in order", () => {
  for (const verb of ["yes", "pick", "ask", "box"] as const) {
    const args = parseArgs([
      verb,
      "--image",
      "a.png",
      "--image",
      "b.jpg",
      "--",
      "Q?",
    ]);
    expect(args.kind).toBe(verb);
    expect(args.images).toEqual(["a.png", "b.jpg"]);
    expect(args.words).toEqual(["Q?"]);
  }
});

test("a verb with no `--image` has an empty list of images", () => {
  expect(parseArgs(["yes", "--", "Q?"]).images).toEqual([]);
});

test("`--image` after `--` is a literal word", () => {
  const args = parseArgs(["yes", "--", "--image", "a.png"]);
  expect(args.images).toEqual([]);
  expect(args.words).toEqual(["--image", "a.png"]);
});

test("`--image` with no path is a usage fault with the usage", () => {
  for (const verb of ["yes", "pick", "ask", "box"]) {
    expect(() => parseArgs([verb, "--image"])).toThrow(UsageError);
    expect(() => parseArgs([verb, "--", "Q?", "--image"])).not.toThrow();
  }
  expect(() => parseArgs(["yes", "--image"])).toThrow(UsageError);
});

test("`main` with `--image` and no path exits with the usage code", async () => {
  const saved = process.env["TYPESAFE_API_KEY"];
  process.env["TYPESAFE_API_KEY"] = KEY;
  const spy = spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await main(["yes", "--image"])).toBe(EXIT.usage);
  } finally {
    spy.mockRestore();
    if (saved === undefined) delete process.env["TYPESAFE_API_KEY"];
    else process.env["TYPESAFE_API_KEY"] = saved;
  }
});

test("a file path in `--state` stays text and is not read as a file", async () => {
  const args = parseArgs(["yes", "--state", "/etc/hosts", "--", "Q?"]);
  expect(args.state).toBe("/etc/hosts");
  expect(args.images).toEqual([]);
  const body = (await buildBody(args, async () => "")) as { state: string };
  expect(body.state).toBe("/etc/hosts");
});

test("the verb `box` is known to the parser", () => {
  expect(parseArgs(["box", "--image", "a.png", "--", "the cat"])).toEqual({
    kind: "box",
    words: ["the cat"],
    state: undefined,
    json: false,
    images: ["a.png"],
  });
});
