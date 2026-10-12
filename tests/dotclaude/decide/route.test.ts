// The route of a decision (`domain/route.ts`) with fake providers, so no call reaches Jev or a model.
// Each cause of no Jev answer goes to the fallback, and the result names that cause.

import { expect, test } from "bun:test";
import {
  causeOfExit,
  route,
} from "../../../plugins/dotclaude/slices/decide/domain/route.ts";
import type {
  Cause,
  Decision,
  DecisionProvider,
  DecisionRequest,
} from "../../../plugins/dotclaude/slices/decide/ports.ts";

const REQUEST: DecisionRequest = { question: "Use the cache?" };

/** A fake provider that gives `result`, and records each request it gets. */
const fake = (
  name: DecisionProvider["name"],
  result: Decision,
  seen: DecisionRequest[] = [],
): DecisionProvider => ({
  name,
  decide: async (request) => {
    seen.push(request);
    return result;
  },
});

const JEV_CAUSES: Cause[] = ["invalid-key", "no-balance", "usage", "failed"];

for (const cause of JEV_CAUSES) {
  test(`a Jev failure with the cause \`${cause}\` goes to the fallback with that cause`, async () => {
    const jev = fake("jev", { ok: false, cause });
    const model = fake("fallback", {
      ok: true,
      text: "yes, the cache is safe",
      answer: { choice: "yes", confidence: 0.9 },
    });
    expect(await route(jev, model, REQUEST)).toEqual({
      source: "fallback",
      text: "yes, the cache is safe",
      cause,
    });
  });
}

test("no Jev provider gives the cause `no-key` and asks the fallback", async () => {
  const model = fake("fallback", {
    ok: true,
    text: "no",
    answer: { choice: "no", confidence: 0.9 },
  });
  expect(await route(undefined, model, REQUEST)).toEqual({
    source: "fallback",
    text: "no",
    cause: "no-key",
  });
});

test("a Jev answer is used and the fallback is not asked", async () => {
  const modelSeen: DecisionRequest[] = [];
  const jev = fake("jev", {
    ok: true,
    text: "pick A",
    answer: { choice: "A", confidence: 0.9 },
  });
  const model = fake(
    "fallback",
    { ok: true, text: "pick B", answer: { choice: "B", confidence: 0.9 } },
    modelSeen,
  );
  expect(await route(jev, model, REQUEST)).toEqual({
    source: "jev",
    text: "pick A",
  });
  expect(modelSeen).toEqual([]);
});

test("a failed fallback after a Jev failure gives no answer, with the Jev cause", async () => {
  const jev = fake("jev", { ok: false, cause: "no-balance" });
  const model = fake("fallback", { ok: false, cause: "model-failed" });
  expect(await route(jev, model, REQUEST)).toEqual({
    source: "none",
    cause: "no-balance",
  });
});

test("a failed fallback with no key gives no answer, with the cause `no-key`", async () => {
  const model = fake("fallback", { ok: false, cause: "model-failed" });
  expect(await route(undefined, model, REQUEST)).toEqual({
    source: "none",
    cause: "no-key",
  });
});

test("the exit code of the CLI gives its cause: 2 usage, 3 invalid key, 4 no balance", () => {
  expect(causeOfExit(2)).toBe("usage");
  expect(causeOfExit(3)).toBe("invalid-key");
  expect(causeOfExit(4)).toBe("no-balance");
});

test("any other exit code gives the cause `failed`", () => {
  expect(causeOfExit(1)).toBe("failed");
  expect(causeOfExit(0)).toBe("failed");
  expect(causeOfExit(null)).toBe("failed");
});
