// Lab tests of the handover (design D12 and D13, spec `handover`), with the stubs of `stubs/handover.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { modelOf } from "../modules/session/handoff/handover.ts";
import {
  type Case,
  HANDOVER_AGE_MS,
  HANDOVER_CONTEXT_TOKENS,
  type PathRow,
} from "../modules/session/handoff/limits.ts";
import {
  HOUR,
  stop,
  stopped,
  stubs,
  turnEnd,
  typed,
  type World,
} from "./stubs/handover.ts";

const OVER = { tokens: HANDOVER_CONTEXT_TOKENS + 1 };
const SESSION_MODEL = "claude-opus-5-5";
const FULL = ["write", "command clear", "prompt"];
const TWO_TASKS = { ...OVER, tasks: "- [x] 3.1 One\n- [ ] 3.2 Two\n" };

test("Order", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.steps).toEqual(FULL);
  expect(seen.prompts[0]).toContain(seen.texts[0] as string);
  expect(seen.logs).toHaveLength(1);
  expect(seen.logs[0]).toContain(".claudetto/handoffs/handoff-");
  expect(seen.logs[0]).not.toContain("\n");
});

test("Handoff Path: the notice gives the handoff file relative to the project", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);

  const file =
    /(?:^|\s)(\.claudetto\/handoffs\/handoff-\S+?)[,.]?(?:\s|$)/.exec(
      seen.logs[0] ?? "",
    )?.[1];

  expect(file).toBeDefined();
  expect(seen.paths[0]?.endsWith(file as string)).toBe(true);
});

test("No Model Request", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.steps).toContain("write");
  expect(seen.models).toBe(0);
});

test("Open Change", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, TWO_TASKS);
  expect(seen.paths).toHaveLength(1);
  expect(seen.paths[0]).toMatch(
    /^\/p\/\.claudetto\/handoffs\/handoff-\d{8}T\d{6}Z\.md$/,
  );
  expect(seen.paths.some((p) => p.endsWith("/handoff.md"))).toBe(false);
  expect(seen.texts[0]).toContain("`3.2`");
});

test("Ruled-Out Option", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.texts[0]).toContain("Which store? `sql`");
  expect(seen.texts[0]).toContain("Which store? `files`");
  expect(seen.texts[0]).toContain("`csv`");
});

test("Box with No Check Is Open", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, TWO_TASKS);
  expect(seen.texts[0]).toContain("no passed check: `3.1`");
  expect(seen.texts[0]).toContain("with a passed check: none");
});

test("Context Bound", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.steps).toEqual(FULL);
});

test("a context at the bound starts no handover", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, { tokens: HANDOVER_CONTEXT_TOKENS });
  expect(seen.steps).toEqual([]);
});

/** Two turn ends, the second one after the change moved to its next task group. */
const nextGroup = async ($: Engine, on: On, tokens: number) => {
  const world: World = { tokens, tasks: "- [x] 3.1 One\n- [ ] 3.2 Two\n" };
  const stubbed = stubs(on, world);
  await stop($);
  await stubbed.clock.settle();
  expect(stubbed.seen.steps).toEqual([]);
  world.tasks = "- [x] 3.1 One\n- [x] 3.2 Two\n- [ ] 4.1 Three\n";
  await stop($);
  await stubbed.clock.settle();
  return stubbed.seen;
};

test("Next Task Group: a small context compacts, and `/compact` keeps the facts of a handover", async ($: Engine, on: On) => {
  const seen = await nextGroup($, on, 1000);
  expect(seen.steps).toEqual(["command compact"]);
  expect(seen.args[0]).toContain("Task: 4.1 Three");
  expect(seen.args[0]).toContain("Values of the user: `csv`");
});

test("Next Task Group: a context over 75k tokens hands over", async ($: Engine, on: On) => {
  expect((await nextGroup($, on, 75_001)).steps).toEqual(FULL);
});

test("Session Age", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, {
    startedAt: 10 * HOUR - HANDOVER_AGE_MS - 1,
  });
  expect(seen.steps).toEqual(FULL);
});

test("Running Agent", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, { ...OVER, agents: ["running"] });
  expect(seen.steps).toEqual([]);
});

test("Running Background Task", async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, OVER);
  await stop($, [{ id: "b1", type: "shell", status: "running" }]);
  await clock.settle();
  expect(seen.steps).toEqual([]);
});

test("Auto", async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.steps).toEqual(FULL);
});

/** A model request of `agentId` or of the main thread. */
const step = async ($: Engine, agentId?: string) => {
  const stream = $.turn.step({
    turnId: "t1",
    index: 0,
    model: SESSION_MODEL,
    messageCount: 1,
    ...(agentId === undefined ? {} : { agentId }),
  });
  for await (const _chunk of stream);
};

/** Records the model that each step names below the hooks. */
const recordSteps = (on: On): string[] => {
  const models: string[] = [];
  on("turn.step", async function* (_$, e) {
    yield* [];
    models.push(e.model);
    return {
      turnId: e.turnId,
      index: e.index,
      answer: "",
      toolUses: [],
      stopReason: "end_turn" as const,
      usage: null,
    };
  });
  return models;
};

test("the first step after a handover runs on the model of the table, and the next on the session model", async ($: Engine, on: On) => {
  const { clock } = stubs(on, OVER);
  const models = recordSteps(on);
  await stop($);
  await clock.settle();
  await step($);
  await step($);
  expect(models).toEqual(["haiku", SESSION_MODEL]);
});

test("the model column names an alias or a full ID for the first row that holds, and null keeps the session model", () => {
  const row = (c: Case, tokensMax: number, model: string | null): PathRow => ({
    case: c,
    tokensMax,
    path: "handover",
    model,
  });
  const table = [
    row("context", 100, "haiku"),
    row("context", Number.POSITIVE_INFINITY, null),
    row("idle", Number.POSITIVE_INFINITY, "claude-haiku-4-5"),
  ];
  expect(modelOf("context", 100, table)).toBe("haiku");
  expect(modelOf("context", 101, table)).toBeNull();
  expect(modelOf("idle", 1, table)).toBe("claude-haiku-4-5");
  expect(modelOf("age", 1, table)).toBeNull();
});

test("a second turn end during a handover starts no second handover", async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, OVER);
  await stop($);
  await stop($);
  await clock.settle();
  expect(seen.steps.filter((s) => s === "write")).toHaveLength(1);
});

const BUILT_IN = { options: { compaction: "built-in" } };
const FORCED = { options: { compaction: "handover" } };

test("Cold Cache, Yes", async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, { answer: "Yes" });
  await turnEnd($);
  await clock.set(12 * HOUR);
  const out = await typed($);
  await clock.settle();
  expect(out.drop).toBeDefined();
  expect(seen.asks).toHaveLength(1);
  expect(seen.steps).toEqual(FULL);
  expect(seen.prompts[0]).toContain("Now add the tests.");
  expect(seen.prompts[0]?.indexOf(seen.texts[0] as string)).toBeLessThan(
    seen.prompts[0]?.indexOf("Now add the tests.") ?? 0,
  );
});

test("Cold Cache, No", async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, { answer: "No" });
  await turnEnd($);
  await clock.set(12 * HOUR);
  const out = await typed($);
  await clock.settle();
  expect(out.drop).toBeUndefined();
  expect(out.text).toBe("Now add the tests.");
  expect(seen.asks).toHaveLength(1);
  expect(seen.steps).toEqual(["prompt"]);
});

const JEV = { options: { decide: "jev", TYPESAFE_API_KEY: "secure-key" } };
const COLD = {
  tokens: 120_000,
  answer: "No",
  tasks: "- [x] 3.1 One\n- [ ] 3.2 Two\n",
};

/** The stubs with a Jev that answers `noul` (or the `status`), and the requests that it got. */
const jevStubs = (on: On, noul: number, status = 200) => {
  const stubbed = stubs(on, COLD);
  const fetches: {
    url: string;
    init?: { headers?: Record<string, string>; body?: string };
  }[] = [];
  on("http.fetch", (_$, e) => {
    fetches.push(e);
    const answers = { handover: { type: "noul", noul } };
    return {
      value: {
        status,
        ok: status === 200,
        headers: {},
        text: JSON.stringify({ model: "jev-latest", answers, usage: {} }),
      },
    };
  });
  return { ...stubbed, fetches };
};

const returned = async (
  $: Engine,
  clock: { set: (ms: number) => Promise<void>; settle: () => Promise<void> },
) => {
  await turnEnd($);
  await clock.set(12 * HOUR);
  const out = await typed($);
  await clock.settle();
  return out;
};

test(
  "Jev Takes the Handover Offer: a sure yes of Jev hands over with no dialog, and the request holds the context, the cold cache, and the open task",
  JEV,
  async ($: Engine, on: On) => {
    const { seen, clock, fetches } = jevStubs(on, 0.9);
    const out = await returned($, clock);
    expect(out.drop).toBeDefined();
    expect(seen.asks).toEqual([]);
    expect(seen.steps).toEqual(FULL);
    expect(seen.prompts[0]).toContain("Now add the tests.");
    expect(fetches).toHaveLength(1);
    const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
    expect(body.state).toContain("120000 tokens");
    expect(body.state).toContain("120 minutes");
    expect(body.state).toContain("3.2 Two");
    expect(body.questions.handover.type).toBe("noul");
    expect(fetches[0]?.init?.headers?.["authorization"]).toBe(
      "Bearer secure-key",
    );
    expect(fetches[0]?.init?.body).not.toContain("secure-key");
  },
);

test(
  "a sure no of Jev passes the prompt with no dialog and no handover",
  JEV,
  async ($: Engine, on: On) => {
    const { seen, clock } = jevStubs(on, 0.1);
    const out = await returned($, clock);
    expect(out.text).toBe("Now add the tests.");
    expect(seen.asks).toEqual([]);
    expect(seen.steps).toEqual(["prompt"]);
  },
);

// Jev is sure from 0.7 for a yes and up to 0.3 for a no (`primitives-noul.md`) (the user, 2026-10-23: "follow typesafe's guidelines/best practices").
for (const [noul, steps, asks] of [
  [0.71, FULL, 0],
  [0.29, ["prompt"], 0],
  [0.69, ["prompt"], 1],
  [0.31, ["prompt"], 1],
  [0.5, ["prompt"], 1],
] as const)
  test(
    `an answer of P(yes) = ${noul} gives ${asks} dialogs`,
    JEV,
    async ($: Engine, on: On) => {
      const { seen, clock } = jevStubs(on, noul);
      await returned($, clock);
      expect(seen.asks).toHaveLength(asks);
      expect(seen.steps).toEqual(asks === 1 ? ["prompt"] : steps);
    },
  );

test(
  "a failed call to Jev leaves the dialog",
  JEV,
  async ($: Engine, on: On) => {
    const { seen, clock } = jevStubs(on, 0.9, 500);
    await returned($, clock);
    expect(seen.asks).toHaveLength(1);
  },
);

test(
  "with the option `jev` and no key, the dialog shows and nothing is sent",
  { options: { decide: "jev" } },
  async ($: Engine, on: On) => {
    const { seen, clock, fetches } = jevStubs(on, 0.9);
    await returned($, clock);
    expect(seen.asks).toHaveLength(1);
    expect(fetches).toEqual([]);
  },
);

test("a resumed session with no turn end gets an offer", async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, { answer: "No" });
  await typed($);
  await clock.settle();
  expect(seen.asks).toHaveLength(1);
});

test("a warm cache gets no offer", async ($: Engine, on: On) => {
  const { seen } = stubs(on, { answer: "Yes" });
  await turnEnd($);
  await typed($);
  expect(seen.asks).toEqual([]);
});

test("the prompt waits for the answer to the offer", async ($: Engine, on: On) => {
  let answer: (label: string) => void = () => {};
  const held = new Promise<string>((resolve) => {
    answer = resolve;
  });
  const { seen, clock } = stubs(on, { answer: held });
  await turnEnd($);
  await clock.set(12 * HOUR);
  let isDone = false;
  const pending = typed($).then((out) => {
    isDone = true;
    return out;
  });
  await clock.settle();
  expect(seen.asks).toHaveLength(1);
  expect(isDone).toBe(false);
  answer("No");
  expect((await pending).text).toBe("Now add the tests.");
});

test("Built-In", BUILT_IN, async ($: Engine, on: On) => {
  const { seen, clock } = stubs(on, { ...OVER, startedAt: 0, answer: "Yes" });
  await stop($);
  await turnEnd($);
  await clock.set(12 * HOUR);
  const out = await typed($);
  await clock.settle();
  expect(out.text).toBe("Now add the tests.");
  expect(seen.asks).toEqual([]);
  expect(seen.steps).toEqual(["prompt"]);
});

test("Handover", FORCED, async ($: Engine, on: On) => {
  const { seen } = await stopped($, on, OVER);
  expect(seen.steps).toEqual(FULL);
});
