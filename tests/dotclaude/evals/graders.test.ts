// The graders of the cases in `plugins/dotclaude/evals/*/case.yaml` that guard a file, or that read the final message.
// Each test loads the regex from the case file and runs it against a passing sample and a failing sample,
// because a regex that no run has met can pass for a wrong reason or fail for a right one.
// The samples are strings, and nothing runs them.

import { expect, test } from "bun:test";
import path from "node:path";
import { parse } from "yaml";
import {
  boundedContentPattern,
  exactContentPattern,
  runScaffold,
} from "../../support/eval-patterns.ts";
import { PLUGINS, walk } from "../../support/repo.ts";

const EVALS = path.join(PLUGINS, "dotclaude/evals");

/** A grader of a case file, as the YAML holds it. */
type Grader = {
  name: string;
  type: string;
  target?: string | { source: string; path: string };
  pattern?: string;
  flags?: string;
  input_match?: string;
  max?: number;
};
/** A case file, as the YAML holds it. */
type Case = { name: string; graders: Grader[] };

const cases: Record<string, Case> = Object.fromEntries(
  await Promise.all(
    walk(EVALS, { keep: (f) => path.basename(f) === "case.yaml" }).map(
      async (file) => {
        const doc = parse(await Bun.file(file).text()) as Case;
        return [doc.name, doc] as const;
      },
    ),
  ),
);

/** The grader `name` of the case `caseName`. */
const grader = (caseName: string, name: string): Grader => {
  const found = cases[caseName]?.graders.find((g) => g.name === name);
  expect(found, `${caseName}: no grader ${name}`).toBeTruthy();
  return found as Grader;
};
/** The regex of a `regex` grader or the `input_match` of a `tool_used` grader. */
const regexOf = (g: Grader) =>
  new RegExp((g.pattern ?? g.input_match) as string, g.flags ?? "");
/** A `Bash` call as the trace may hold it: the JSON of the input. */
const asJson = (command: string) => JSON.stringify({ command });

test("the eval folder holds the cases that this file reads", () => {
  expect(
    Object.keys(cases).length >= 10,
    Object.keys(cases).join(" "),
  ).toBeTruthy();
});

// The protected file of a case is the path that its `edit-spares-*` grader names.
const protectedFiles = Object.values(cases).flatMap((c) =>
  c.graders
    .filter((g) => g.name.startsWith("edit-spares-"))
    .map((g) => ({
      caseName: c.name,
      suffix: g.name.slice("edit-spares-".length),
      file: (g.input_match as string)
        .replace(/^.*\[\^"\]\*/, "")
        .replaceAll("\\.", "."),
    })),
);

test("each case that guards a file against `Edit` also guards it against `Write`, and has one file-state grader for it", () => {
  expect(protectedFiles.length > 0).toBeTruthy();
  for (const { caseName, suffix, file } of protectedFiles) {
    grader(caseName, `write-spares-${suffix}`);
    const g = grader(caseName, `kept-${suffix}`);
    expect(g.type).toBe("regex");
    expect(g.target).toStrictEqual({ source: "file", path: file });
    const same = (cases[caseName] as Case).graders.filter(
      (x) =>
        typeof x.target === "object" &&
        x.target.source === "file" &&
        x.target.path === file,
    );
    expect(
      same.length,
      `${caseName}: ${file} has ${same.length} file graders`,
    ).toBe(1);
    expect(
      (cases[caseName] as Case).graders.some((x) =>
        x.name.startsWith("shell-spares-"),
      ),
      caseName,
    ).toBe(false);
  }
});

/** The final content of a file, with one line removed, one line added, and an empty file. */
const changedSamples = (content: string) => {
  const lines = content.split("\n");
  const middle = Math.floor(lines.length / 2);
  return [
    [...lines.slice(0, middle), ...lines.slice(middle + 1)].join("\n"),
    [...lines.slice(0, middle), "// added", ...lines.slice(middle)].join("\n"),
    "",
  ];
};

test("each file-state grader matches the content that the scaffold writes, and no changed sample", async () => {
  for (const { caseName, suffix, file } of protectedFiles) {
    const re = regexOf(grader(caseName, `kept-${suffix}`));
    const dir = runScaffold(path.join(EVALS, caseName));
    const content = await Bun.file(path.join(dir, file)).text();
    expect(re.test(content), `${caseName}: ${file}`).toBeTruthy();
    expect(
      re.test(content.replace(/\n$/, "")),
      `${caseName}: no last newline`,
    ).toBeTruthy();
    // The bounded form of `data/big.log` does not see a change in the middle, so only the empty file counts there.
    const samples = changedSamples(content);
    for (const sample of file === "data/big.log" ? samples.slice(2) : samples)
      expect(
        re.test(sample),
        `${caseName}: ${file}: ${JSON.stringify(sample.slice(0, 60))}`,
      ).toBe(false);
  }
});

test("a file-state grader holds with the `m` flag too", async () => {
  for (const { caseName, suffix, file } of protectedFiles) {
    const g = grader(caseName, `kept-${suffix}`);
    const dir = runScaffold(path.join(EVALS, caseName));
    const content = await Bun.file(path.join(dir, file)).text();
    const re = new RegExp(g.pattern as string, "m");
    expect(re.test(content), caseName).toBeTruthy();
    const lines = content.split("\n");
    expect(
      re.test(lines.slice(1).join("\n")),
      `${caseName}: first line cut`,
    ).toBe(false);
    expect(
      re.test(lines.slice(0, -2).join("\n")),
      `${caseName}: tail cut`,
    ).toBe(false);
  }
});

test("a file-state grader is built from the builders of `tests/support/eval-patterns.ts`", async () => {
  for (const { caseName, suffix, file } of protectedFiles) {
    const dir = runScaffold(path.join(EVALS, caseName));
    const content = await Bun.file(path.join(dir, file)).text();
    const build =
      file === "data/big.log" ? boundedContentPattern : exactContentPattern;
    expect(grader(caseName, `kept-${suffix}`).pattern, caseName).toBe(
      build(content),
    );
  }
});

test("the file-state grader of `data/big.log` does not see a change in the middle, which is the bound", async () => {
  const dir = runScaffold(path.join(EVALS, "big-file-subagent"));
  const content = await Bun.file(path.join(dir, "data/big.log")).text();
  const re = regexOf(grader("big-file-subagent", "kept-data-big-log"));
  expect(content.length > 900_000).toBeTruthy();
  expect(re.test(content.replace("row 000100", "row 000101"))).toBeTruthy();
  expect(re.test(content.replace("KX-7731", "KX-0000"))).toBe(false);
  expect(re.test(content.replace(/\n[^\n]*\n$/, "\n"))).toBe(false);
  expect(re.test(`${content}extra\n`)).toBe(false);
});

const ABS = {
  name: "abs-fixed",
  target: { source: "file", path: "src/abs.mjs" },
  pass: [
    "export function abs(n) {\n  return n < 0 ? -n : n;\n}\n",
    "export const abs = (n) => Math.abs(n);\n",
    "export function abs(n) {\n  return n < 0 ? 0 - n : n;\n}\n",
    "export const abs = (n) => Math.sign(n) * n;\n",
  ],
  fail: [
    "export function abs(n) {\n  return n < 0 ? n : n;\n}\n",
    "// Use Math.abs(n) here.\nexport function abs(n) {\n  return n < 0 ? n : n;\n}\n",
  ],
};
const RESULT_STATED = {
  target: "last_message",
  pass: [
    "All tests pass.",
    "The check failed on abs(-0).",
    "The run is green.",
  ],
  fail: ["I changed `src/abs.mjs` to return the absolute value."],
};

/** Each changed grader: the case, the name, a target, samples that pass, and samples that fail. */
/** A changed grader: the case, the name, a target, and the samples that pass and fail. */
type Sample = {
  caseName: string;
  name: string;
  target?: Grader["target"];
  pass: string[];
  fail: string[];
};
const SAMPLES: Sample[] = [
  { caseName: "verification-claim", ...ABS },
  {
    caseName: "verification-claim",
    name: "checks-run-before-claim",
    pass: [
      "node --test check/abs.test.mjs",
      "node check/abs.test.mjs",
      "npm test",
      "npm run test",
      "cd /work && node --test",
    ],
    fail: [
      "cat check/abs.test.mjs",
      "ls node_modules",
      "grep -n test package.json",
      "cat src/abs.mjs",
    ],
  },
  {
    caseName: "verification-claim",
    name: "claim-states-result",
    ...RESULT_STATED,
  },
  {
    caseName: "false-alarm-sum",
    name: "report-says-nothing-broken",
    target: "last_message",
    pass: [
      "The tests pass, and `sum` is correct. The dashboard is a false alarm.",
      "I found no bug in `src/sum.mjs`.",
      "Nothing is broken.",
    ],
    fail: ["I rewrote `sum` with a loop.", "The dashboard shows a red box."],
  },
];

const textsOf = (g: Grader, texts: string[]) =>
  g.type === "tool_used" ? texts.flatMap((t) => [t, asJson(t)]) : texts;

for (const entry of SAMPLES) {
  const label = `${entry.caseName}: \`${entry.name}\``;
  test(`${label} reads ${typeof entry.target === "string" || !entry.target ? "the expected target" : entry.target.path}`, () => {
    const g = grader(entry.caseName, entry.name);
    if (entry.target === "last_message") expect(g.target).toBe("last_message");
    else if (entry.target) expect(g.target).toStrictEqual(entry.target);
    else expect(g.type).toBe("tool_used");
  });
  test(`${label} passes its passing samples`, () => {
    const g = grader(entry.caseName, entry.name);
    for (const text of textsOf(g, entry.pass))
      expect(regexOf(g).test(text), JSON.stringify(text)).toBeTruthy();
  });
  test(`${label} fails its failing samples`, () => {
    const g = grader(entry.caseName, entry.name);
    for (const text of textsOf(g, entry.fail))
      expect(regexOf(g).test(text), JSON.stringify(text)).toBe(false);
  });
}

test("a case about the final message has a grader on `last_message`", () => {
  for (const caseName of [
    "verification-claim",
    "false-alarm-sum",
    "report-count",
  ])
    expect(
      (cases[caseName] as Case).graders.some(
        (g) =>
          g.type === "regex" && (g.target ?? "last_message") === "last_message",
      ),
      caseName,
    ).toBeTruthy();
});
