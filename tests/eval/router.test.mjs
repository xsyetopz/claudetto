// The router search of design D12, on fixed data and with no live run.

import { expect, test } from "bun:test";
import {
  HAIKU,
  OPUS,
  SONNET,
} from "../../plugins/dotclaude/features/router/data.mjs";
import { parseArgs } from "../../tools/eval/cli.mjs";
import {
  candidatePairs,
  cheaperThan,
  losses,
  searchClass,
} from "../../tools/eval/router.mjs";
import {
  EVAL_ROUTER_MIN_PAIRS,
  EVAL_ROUTER_NOISE,
} from "../../tools/limits.mjs";

/** A fixed reference for the search tests, so that they do not depend on the rows of the router table. */
const REVIEW_REF = { model: OPUS, effort: "high" };

const usage = {
  cost: 1,
  turns: 1,
  ms: 1,
  input: 1,
  output: 1,
  cacheRead: 0,
  cacheWrite: 0,
};
const CASES = Array.from(
  { length: EVAL_ROUTER_MIN_PAIRS },
  (_, i) => `case-${i}`,
);

// Fixed runs: every case has the given resolve, over-claim, and violation values.
const runsOf = ({
  resolved = true,
  overClaim = false,
  violation = false,
  wrongfulRevert = false,
  cases = CASES,
  failing = [],
}) =>
  cases.map((c) => ({
    case: c,
    arm: "x",
    resolved: resolved && !failing.includes(c),
    overClaim,
    violation,
    wrongfulRevert,
    usage,
    faults: [],
  }));

const key = (p) => `${p.model}:${p.effort}`;
const GOOD = {};
const BAD = { resolved: false };

/** A run function from a table of pair to outcome, with a log of its calls. */
function fake(outcomes, fallback = BAD) {
  const calls = [];
  const run = async (_taskClass, pair) => {
    calls.push(key(pair));
    return runsOf(outcomes[key(pair)] ?? fallback);
  };
  return { run, calls };
}

test("the search stops at the first pair with no loss", async () => {
  const f = fake({
    [`${HAIKU}:low`]: BAD,
    [`${HAIKU}:medium`]: GOOD,
    [`${OPUS}:high`]: GOOD,
  });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.found).toBe(true);
  expect(r.chosen).toEqual({ model: HAIKU, effort: "medium" });
  expect(f.calls).toEqual([`${OPUS}:high`, `${HAIKU}:low`, `${HAIKU}:medium`]);
  expect(r.tried.map((t) => key(t.pair))).toEqual([
    `${HAIKU}:low`,
    `${HAIKU}:medium`,
  ]);
});

test("a search with no passing pair names the reference pair", async () => {
  const f = fake({ [`${OPUS}:high`]: GOOD });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.found).toBe(false);
  expect(r.chosen).toEqual({ model: OPUS, effort: "high" });
  expect(r.message).toContain(`${OPUS} at high`);
  expect(r.message).toContain("no cheaper pair passed");
  expect(f.calls).toHaveLength(1 + cheaperThan(r.reference).length);
});

test("an over-claim rise counts as a loss", async () => {
  const f = fake({
    [`${OPUS}:high`]: GOOD,
    [`${HAIKU}:low`]: { overClaim: true },
    [`${HAIKU}:medium`]: GOOD,
  });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.tried[0].losses).toEqual(["overClaim"]);
  expect(r.chosen.effort).toBe("medium");
});

test("a wrongful-revert rise counts as a loss", async () => {
  const f = fake({
    [`${OPUS}:high`]: GOOD,
    [`${HAIKU}:low`]: { wrongfulRevert: true },
    [`${HAIKU}:medium`]: GOOD,
  });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.tried[0].losses).toEqual(["wrongfulRevert"]);
  expect(r.chosen.effort).toBe("medium");
});

test("the order skips banned pairs", () => {
  const keys = candidatePairs().map(key);
  expect(keys.some((k) => k.endsWith(":max"))).toBe(false);
  expect(keys).not.toContain(`${SONNET}:xhigh`);
  expect(keys).toContain(`${HAIKU}:xhigh`);
  expect(keys.indexOf(`${HAIKU}:low`)).toBe(0);
  expect(keys.indexOf(`${SONNET}:high`)).toBeLessThan(
    keys.indexOf(`${OPUS}:low`),
  );
});

test("a search for a Sonnet reference never runs a banned pair", async () => {
  const f = fake({}, BAD);
  await searchClass("scoped", f.run);
  expect(f.calls).not.toContain(`${SONNET}:xhigh`);
  expect(f.calls.some((c) => c.endsWith(":max"))).toBe(false);
});

test("an unknown task class throws", async () => {
  await expect(searchClass("nope", fake({}).run)).rejects.toThrow(
    "No such task class: nope.",
  );
});

test("the router flag is a switch and excludes the variant flag", () => {
  expect(parseArgs(["--router"]).router).toBe(true);
  expect(() => parseArgs(["--router", "--variant", "v.md"])).toThrow();
});

test("a null measure is not a pass", async () => {
  const f = fake({
    [`${OPUS}:high`]: GOOD,
    [`${HAIKU}:low`]: { overClaim: null },
    [`${HAIKU}:medium`]: GOOD,
  });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.tried[0].losses).toEqual(["overClaim"]);
  expect(r.chosen.effort).toBe("medium");
});

test("a pair with too few paired runs is not accepted", async () => {
  const few = CASES.slice(0, EVAL_ROUTER_MIN_PAIRS - 1);
  const run = async () => runsOf({ cases: few });
  const r = await searchClass("review", run, { reference: REVIEW_REF });
  expect(r.found).toBe(false);
  expect(r.tried[0].losses).toEqual(["pairs"]);
});

test("a resolve difference with a lower bound below the noise is a loss", async () => {
  // One case in nine falls: the mean is -0.11 and the lower bound is far below -0.05.
  const f = fake({
    [`${OPUS}:high`]: GOOD,
    [`${HAIKU}:low`]: { failing: [CASES[0]] },
    [`${HAIKU}:medium`]: GOOD,
  });
  const r = await searchClass("review", f.run, { reference: REVIEW_REF });
  expect(r.tried[0].losses).toEqual(["resolve"]);
  expect(r.chosen.effort).toBe("medium");
});

// Router run 2026-10-09: the intervals of `orchestration`, `web`, and `scoped` against their reference pairs.
// Each rate gets the same test, so an interval that reaches past the noise bound in the bad direction is a loss.
const interval = (lo, hi) => ({ lo, hi });
const pairedWith = (over) => ({
  resolve: interval(0, 0),
  overClaim: interval(0, 0),
  policyViolation: interval(0, 0),
  ...over,
});
const n = EVAL_ROUTER_MIN_PAIRS;

test("an over-claim interval that reaches past the noise bound is a loss, also when it includes 0", () => {
  expect(
    losses(
      pairedWith({ overClaim: interval(-0.333, 0.667) }),
      EVAL_ROUTER_NOISE,
      n,
    ),
  ).toEqual(["overClaim"]);
  expect(
    losses(pairedWith({ overClaim: interval(0, 0.333) }), EVAL_ROUTER_NOISE, n),
  ).toEqual(["overClaim"]);
  expect(
    losses(
      pairedWith({ overClaim: interval(0.333, 0.667) }),
      EVAL_ROUTER_NOISE,
      n,
    ),
  ).toEqual(["overClaim"]);
});

test("equal rates are no loss, and a fall in a bad rate or a rise in resolve is no loss", () => {
  expect(losses(pairedWith({}), EVAL_ROUTER_NOISE, n)).toEqual([]);
  expect(
    losses(
      pairedWith({
        resolve: interval(0, 0.333),
        overClaim: interval(-0.556, -0.111),
      }),
      EVAL_ROUTER_NOISE,
      n,
    ),
  ).toEqual([]);
});

test("the resolve and rise tests are mirrors at the noise bound", () => {
  const at = EVAL_ROUTER_NOISE;
  expect(losses(pairedWith({ resolve: interval(-at, 0) }), at, n)).toEqual([
    "resolve",
  ]);
  expect(
    losses(pairedWith({ policyViolation: interval(0, at) }), at, n),
  ).toEqual(["policyViolation"]);
  expect(
    losses(pairedWith({ wrongfulRevert: interval(0, at) }), at, n),
  ).toEqual(["wrongfulRevert"]);
  expect(
    losses(
      pairedWith({
        resolve: interval(-at / 2, 0),
        overClaim: interval(0, at / 2),
      }),
      at,
      n,
    ),
  ).toEqual([]);
});
