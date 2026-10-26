// Lab tests of the `decide` hooks: they ask Jev only with the option `jev` and a key. The stub of `http.fetch` stands for the TypeSafe API, so no test sends a request.

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import {
  ATTEMPT_TIMEOUT_MS,
  BACKOFF_MS,
  MIN_CONFIDENCE,
} from "../modules/jev/index.ts";

const answers = (confidence: number, approval = 0.05) => ({
  pick_0: {
    type: "choice",
    choice: "sql",
    confidence,
    probabilities: { sql: 0.9, kv: 0.1 },
  },
  approval_0: { type: "noul", noul: approval },
});

/** A reply of the API with `status` and the `answers` as JSON. */
const reply = (status: number, body: unknown = {}) => ({
  value: {
    status,
    ok: status >= 200 && status < 300,
    headers: {},
    text: JSON.stringify(body),
  },
});

const okay = (body: object) =>
  reply(200, {
    model: "jev-latest",
    answers: body,
    usage: { input_tokens: 1, output_tokens: 1 },
  });

const option = (decide: string): { options: PluginOptions } => ({
  options: { decide },
});

const choose = (
  question: string,
  header: string,
  rows: [string, string][],
) => ({
  question,
  header,
  multiSelect: false,
  options: rows.map(([label, description]) => ({ label, description })),
});

const STORE = choose("Which store?", "Store", [
  ["sql", "relations"],
  ["kv", "keys"],
]);
const COLOR = choose("Which color?", "Color", [
  ["red", "warm"],
  ["blue", "cool"],
]);

const ask = ($: Engine, questions = [STORE]) =>
  $.tool.call({ tool: "AskUserQuestion", questions });

/** `fetches` holds the argument of each `http.fetch`, `seen.input` the input that the built-in tool got, and `processes` the argv of each process run. */
const stub = (
  on: On,
  key: string,
  body: object = answers(0.9),
  send: (n: number, clock: ReturnType<typeof mock.clock>) => unknown = () =>
    okay(body),
) => {
  mock.env(on, { TYPESAFE_API_KEY: key });
  const clock = mock.clock(on);
  const fetches: {
    url: string;
    init?: { headers?: Record<string, string>; body?: string };
  }[] = [];
  const processes: (readonly string[])[] = [];
  const seen = { input: undefined as unknown };
  on("http.fetch", (_$, e) => {
    fetches.push(e);
    return send(fetches.length, clock) as never;
  });
  on("process.run", (_$, e) => {
    processes.push(e.argv);
    return { deny: "no process" };
  });
  on("tool.call", (_$, e, next) => {
    if (e.tool !== "AskUserQuestion") return next(e);
    seen.input = e;
    return { result: "ok" };
  });
  return { fetches, processes, seen, clock };
};

test(
  "with the option off, `AskUserQuestion` passes unchanged and no process runs",
  option("off"),
  async ($: Engine, on: On) => {
    const { fetches, seen } = stub(on, "typesafe-key");
    await ask($);
    expect(fetches).toEqual([]);
    expect(seen.input).toMatchObject({ questions: [STORE] });
  },
);

test(
  "No Key: with the option `jev` and no key, `AskUserQuestion` sends nothing to Jev and the dialog shows",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, processes, seen } = stub(on, "");
    await ask($);
    expect(fetches).toEqual([]);
    expect(processes).toEqual([]);
    expect(JSON.stringify(seen.input)).toContain("Which store?");
  },
);

test(
  "with the option `jev` and a key, one request asks Jev for the questions, and no process runs",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, processes } = stub(on, "typesafe-key");
    await ask($);
    expect(processes).toEqual([]);
    expect(fetches).toHaveLength(1);
    expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
    const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
    expect(body.model).toBe("jev-latest");
    expect(Object.keys(body.questions)).toEqual(["pick_0", "approval_0"]);
    expect(fetches[0]?.init?.headers?.["authorization"]).toBe(
      "Bearer typesafe-key",
    );
  },
);

test(
  "with the option `jev`, many questions go in one request, and they share one state object",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches } = stub(on, "typesafe-key");
    await ask($, [STORE, COLOR]);
    expect(fetches).toHaveLength(1);
    const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
    expect(Object.keys(body.questions)).toEqual([
      "pick_0",
      "approval_0",
      "pick_1",
      "approval_1",
    ]);
    expect(typeof body.state).toBe("object");
    expect(Array.isArray(body.state)).toBe(false);
    expect(JSON.stringify(body.state)).toContain("Which color?");
  },
);

test(
  "Jev Picks: with the option `jev` and a sure pick, Jev answers and the built-in tool does not run",
  option("jev"),
  async ($: Engine, on: On) => {
    const { seen } = stub(on, "typesafe-key");
    const answer = JSON.stringify(await ask($));
    expect(seen.input).toBeUndefined();
    expect(answer).toContain('"Which store?":"sql"');
    expect(answer).toContain("0.90");
  },
);

test(
  "Timeout: a try over `ATTEMPT_TIMEOUT_MS` ends with no retry, and the dialog shows",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, seen, clock } = stub(
      on,
      "typesafe-key",
      answers(0.9),
      async (_n, c) => {
        await c.sleep(ATTEMPT_TIMEOUT_MS * 5);
        return okay(answers(0.9));
      },
    );
    const pending = ask($);
    await clock.settle();
    await clock.advance(ATTEMPT_TIMEOUT_MS);
    await pending;
    expect(fetches).toHaveLength(1);
    expect(JSON.stringify(seen.input)).toContain("Which store?");
  },
);

test(
  "Rate Limit Retry: a 429 and then a 529 wait `BACKOFF_MS` and twice that, and the third try answers",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, seen, clock } = stub(
      on,
      "typesafe-key",
      answers(0.9),
      (n) => (n === 1 ? reply(429) : n === 2 ? reply(529) : okay(answers(0.9))),
    );
    const pending = ask($);
    await clock.settle();
    expect(fetches).toHaveLength(1);
    await clock.advance(BACKOFF_MS);
    expect(fetches).toHaveLength(2);
    await clock.advance(BACKOFF_MS * 2);
    const answer = JSON.stringify(await pending);
    expect(fetches).toHaveLength(3);
    expect(seen.input).toBeUndefined();
    expect(answer).toContain('"Which store?":"sql"');
  },
);

test(
  "a 429 on each try ends after `TRIES` tries, and the dialog shows",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, seen, clock } = stub(
      on,
      "typesafe-key",
      answers(0.9),
      () => reply(429),
    );
    const pending = ask($);
    await clock.settle();
    await clock.advance(BACKOFF_MS * 3);
    await pending;
    expect(fetches).toHaveLength(3);
    expect(JSON.stringify(seen.input)).toContain("Which store?");
  },
);

test(
  "a 401 is not retried, the dialog shows, and the key is in no message",
  option("jev"),
  async ($: Engine, on: On) => {
    const { fetches, seen } = stub(on, "typesafe-key", answers(0.9), () =>
      reply(401, { detail: "bad" }),
    );
    await ask($);
    expect(fetches).toHaveLength(1);
    expect(JSON.stringify(seen.input)).not.toContain("typesafe-key");
  },
);

const shownWith = async ($: Engine, on: On, pick: number, approval: number) => {
  const { seen } = stub(on, "typesafe-key", answers(pick, approval));
  await ask($);
  return JSON.stringify(seen.input);
};

test(
  "Jev Unsure: with the option `jev` and an unsure pick, the dialog stays",
  option("jev"),
  async ($: Engine, on: On) => {
    const shown = await shownWith($, on, MIN_CONFIDENCE - 0.01, 0.05);
    expect(shown).toContain("Which store?");
  },
);

// The floor is 0.5 for a pick (`confidence.md`) (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
test(
  "Jev Picks: a pick just over the floor of 0.5 answers with no dialog",
  option("jev"),
  async ($: Engine, on: On) => {
    const { seen } = stub(on, "typesafe-key", answers(MIN_CONFIDENCE + 0.01));
    expect(JSON.stringify(await ask($))).toContain('"Which store?":"sql"');
    expect(seen.input).toBeUndefined();
  },
);

test(
  "with the option `jev` and an approval yes, the dialog stays",
  option("jev"),
  async ($: Engine, on: On) => {
    const shown = await shownWith($, on, 0.95, 0.95);
    expect(shown).toContain("Which store?");
  },
);

const describeAsk = ($: Engine, on: On) => {
  const description = "Asks the user.";
  on("tool.describe", () => ({ description }));
  const provider = { plugin: "engine", tier: "core" } as const;
  return $.tool.describe({ tool: "AskUserQuestion", description, provider });
};

test(
  "`tool.describe` of `AskUserQuestion` adds to the description with the option `jev` and a key",
  option("jev"),
  async ($: Engine, on: On) => {
    mock.env(on, { TYPESAFE_API_KEY: "typesafe-key" });
    const answer = await describeAsk($, on);
    expect(answer.description).toStartWith("Asks the user.");
    expect(answer.description.length).toBeGreaterThan("Asks the user.".length);
  },
);

test(
  "Key Set: the sensitive option `TYPESAFE_API_KEY` in `options` turns Jev on with no env var, and goes in the header",
  { options: { decide: "jev", TYPESAFE_API_KEY: "secure-key" } },
  async ($: Engine, on: On) => {
    const { fetches } = stub(on, "");
    expect((await describeAsk($, on)).description).not.toBe("Asks the user.");
    await ask($, [STORE]);
    expect(fetches.map((f) => f.init?.headers?.["authorization"])).toEqual([
      "Bearer secure-key",
    ]);
    expect(JSON.stringify(fetches.map((f) => f.init?.body))).not.toContain(
      "secure-key",
    );
  },
);

test(
  "`tool.describe` of `AskUserQuestion` stays as it is with no key",
  option("jev"),
  async ($: Engine, on: On) => {
    mock.env(on, { TYPESAFE_API_KEY: "" });
    expect((await describeAsk($, on)).description).toBe("Asks the user.");
  },
);

test(
  "with one sure pick and one unsure pick, the dialog gets the note of Jev",
  option("jev"),
  async ($: Engine, on: On) => {
    const unsure = {
      pick_1: {
        type: "choice",
        choice: "red",
        confidence: MIN_CONFIDENCE - 0.01,
        probabilities: { red: 0.7, blue: 0.3 },
      },
    };
    const body = { ...answers(0.9), ...unsure, approval_1: { noul: 0.05 } };
    const { seen } = stub(on, "typesafe-key", body);
    await ask($, [STORE, COLOR]);
    const shown = seen.input as {
      questions: { options: { description: string }[] }[];
    };
    const description = shown.questions[0]?.options[0]?.description ?? "";
    expect(description).toMatch(/^relations/);
    expect(description).not.toBe("relations");
  },
);
