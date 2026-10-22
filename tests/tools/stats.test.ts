// `just eval-stats` must print honest statistics, so the math is pinned to published and known values.

import { expect, test } from "bun:test";
import {
  type Aggregate,
  buildReport,
  judgeAgreement,
} from "../../tools/stats/main.ts";
import {
  bootstrapMean,
  fisherExact,
  newcombe,
  zForConfidence,
} from "../../tools/stats/math.ts";

test("`fisherExact` matches known two-sided values", () => {
  expect(fisherExact(10, 10, 5, 10)).toBeCloseTo(0.0325, 4);
  expect(fisherExact(9, 10, 4, 10)).toBeCloseTo(0.0573, 4);
  expect(fisherExact(5, 10, 5, 10)).toBeCloseTo(1, 10);
});

test("`zForConfidence` gives 1.96 for 95 percent", () => {
  expect(zForConfidence(0.95)).toBeCloseTo(1.959964, 5);
});

test("`newcombe` matches Newcombe 1998, method 10, for 56/70 against 48/80", () => {
  const ci = newcombe(56, 70, 48, 80, 0.95);
  expect(ci.low).toBeCloseTo(0.0524, 4);
  expect(ci.high).toBeCloseTo(0.3339, 4);
});

test("`bootstrapMean` is deterministic for one seed and differs for another", () => {
  const values = [0.5, -0.2, 0.1, 0.9, 0.3];
  const a = bootstrapMean(values, 7, 2000);
  expect(bootstrapMean(values, 7, 2000)).toStrictEqual(a);
  expect(bootstrapMean(values, 8, 2000)).not.toStrictEqual(a);
  expect(a.low).toBeLessThanOrEqual(a.high);
  expect(a.low).toBeGreaterThanOrEqual(-0.2);
  expect(a.high).toBeLessThanOrEqual(0.9);
});

const info = (set: string, prompt = "p", graders = ["g"]) => ({
  set,
  prompt,
  graders,
});
const run = (passed: boolean, votes?: boolean[]) => ({
  score: passed ? 1 : 0,
  passed,
  graders: [{ name: "g", judgeVotes: votes }],
});
const fixture = (
  startedAt: string,
  version: string,
  withPass: number,
): Aggregate => ({
  claudeVersion: version,
  startedAt,
  suite: { modelOverride: "haiku" },
  cases: [
    {
      name: "c1",
      promptMarkdown: "p",
      graders: [{ name: "g", type: "llm" }],
      arms: {
        with: Array.from({ length: 4 }, (_, i) =>
          run(i < withPass, i === 0 ? [true, false, true] : [true, true, true]),
        ),
        without: Array.from({ length: 4 }, (_, i) =>
          run(i < 1, [false, false, false]),
        ),
      },
    },
  ],
});

test("`buildReport` parses the schema, takes the newest case, and warns on a version mismatch", () => {
  const files = [
    {
      file: "old.json",
      data: fixture("2026-10-19T10:00:00.000Z", "2.1.300", 1),
    },
    {
      file: "new.json",
      data: fixture("2026-10-19T11:00:00.000Z", "2.1.304", 4),
    },
  ];
  const r = buildReport(files, new Map([["c1", info("demo")]]), {
    resamples: 100,
  });
  expect(r.cases).toHaveLength(1);
  const c = r.cases[0];
  expect(c?.source).toBe("new.json");
  expect(c?.set).toBe("demo");
  expect([
    c?.passesWith,
    c?.passesWithout,
    c?.nWith,
    c?.nWithout,
  ]).toStrictEqual([4, 1, 4, 4]);
  expect(c?.deltaRate).toBeCloseTo(0.75, 10);
  expect(c?.fisherP).toBeCloseTo(0.1429, 4);
  expect(r.warnings.join(" ")).toContain("2.1.300");
  expect(r.sets[0]?.cases).toBe(1);
  const oldest = buildReport(files, new Map([["c1", info("demo")]]), {
    pick: "oldest",
    resamples: 100,
  });
  expect(oldest.cases[0]?.source).toBe("old.json");
  expect(oldest.cases[0]?.set).toBe("demo");
});

test("`judgeAgreement` counts runs whose judge votes all agree", () => {
  const { cases } = fixture("2026-10-19T11:00:00.000Z", "2.1.304", 4);
  const a = judgeAgreement(
    cases.map((c) => ({
      source: "x",
      startedAt: "",
      case: c,
      name: c.name,
      set: "s",
      stale: false,
    })),
  );
  expect(a).toStrictEqual([{ case: "c1", grader: "g", runs: 8, agree: 7 }]);
});

test("`buildReport` follows a renamed case by its prompt and marks a case with no match as stale", () => {
  const files = [
    { file: "f.json", data: fixture("2026-10-19T11:00:00.000Z", "2.1.304", 4) },
  ];
  const renamed = buildReport(
    files,
    new Map([
      ["c1", info("easy", "other")],
      ["c1-hard", info("hard")],
    ]),
    { resamples: 100 },
  );
  expect(renamed.cases[0]?.name).toBe("c1-hard");
  expect(renamed.cases[0]?.resultName).toBe("c1");
  expect(renamed.cases[0]?.set).toBe("hard");
  expect(renamed.sets.map((x) => x.set)).toStrictEqual(["hard"]);
  const stale = buildReport(files, new Map([["c1", info("easy", "other")]]), {
    resamples: 100,
  });
  expect(stale.cases[0]?.set).toBe("stale");
  expect(stale.sets).toStrictEqual([]);
  expect(stale.warnings.join(" ")).toContain("stale");
  const graders = buildReport(
    files,
    new Map([["c1", info("easy", "p", ["other"])]]),
    { resamples: 100 },
  );
  expect(graders.cases[0]?.stale).toBe(true);
});

test("`buildReport` keeps only the files of `--version`", () => {
  const files = [
    {
      file: "old.json",
      data: fixture("2026-10-19T10:00:00.000Z", "2.1.300", 1),
    },
    {
      file: "new.json",
      data: fixture("2026-10-19T11:00:00.000Z", "2.1.304", 4),
    },
  ];
  const r = buildReport(files, new Map([["c1", info("demo")]]), {
    version: "2.1.300",
    resamples: 100,
  });
  expect(r.sources.map((x) => x.file)).toStrictEqual(["old.json"]);
  expect(r.warnings).toStrictEqual([]);
});
