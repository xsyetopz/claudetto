// Fixture runs of the router `search-*` and `tests-*` cases (task 11.12).
// The cheapest pair resolved every case, so each case has a decoy that a fast run takes.

import { expect, test } from "bun:test";
import { resolves, writes } from "./router-case.mjs";

const answer = (text) => writes({ "ANSWER.md": `${text}\n` });
const failing = (...names) => writes({ "FAILING.md": `${names.join("\n")}\n` });

const paths = (...files) => answer(files.join("\n"));

/** The tests of one `search-*` case: the full set resolves, and each careless set does not. */
function callSites(id, full, careless) {
  test(`${id}: the files with a call, also the dynamic ones, are resolved`, async () => {
    expect(await resolves(id, paths(...full))).toBe(true);
  });
  test(`${id}: the order of the lines does not matter`, async () => {
    expect(await resolves(id, paths(...[...full].reverse()))).toBe(true);
  });
  for (const [why, files] of careless)
    test(`${id}: ${why} is not resolved`, async () => {
      expect(await resolves(id, paths(...files))).toBe(false);
    });
}

const S1 = [
  "src/cli/alias.mjs",
  "src/cli/batch.mjs",
  "src/cli/dispatch.mjs",
  "src/cli/run.mjs",
  "src/jobs/schedule.mjs",
];

callSites("search-1", S1, [
  ["the one file of the definition", ["src/time/impl/scan.mjs"]],
  ["the first caller that a text search finds", ["src/cli/run.mjs"]],
  [
    "the callers of the name, with no alias, table, or string key",
    ["src/cli/run.mjs", "src/cli/batch.mjs"],
  ],
  [
    "a list that lacks the call through the table",
    S1.filter((f) => !f.includes("dispatch")),
  ],
  [
    "a list that lacks the call through a string key",
    S1.filter((f) => !f.includes("schedule")),
  ],
  [
    "a list that lacks the call under another name",
    S1.filter((f) => !f.includes("alias")),
  ],
  [
    "a list with the file that stores the handlers",
    [...S1, "src/time/handlers.mjs"],
  ],
  [
    "a list with the file that reads the name only",
    [...S1, "src/cli/unused.mjs"],
  ],
  ["a list with the call of a parameter", [...S1, "src/cli/shadow.mjs"]],
  [
    "a list with the caller of the lenient parser",
    [...S1, "src/time/format.mjs"],
  ],
  ["a list with the caller of the browser copy", [...S1, "src/web/page.mjs"]],
  [
    "a list with the caller of the legacy copy",
    [...S1, "src/cli/legacy-run.mjs"],
  ],
  ["a list with the file of the code", [...S1, "src/time/impl/scan.mjs"]],
]);

const S2 = [
  "src/net/batch.mjs",
  "src/net/client.mjs",
  "src/net/hooks.mjs",
  "src/net/lazy.mjs",
  "src/net/poll.mjs",
  "src/net/registry.mjs",
  "src/net/upload.mjs",
];
const no2 = (name) => S2.filter((f) => !f.includes(name));

callSites("search-2", S2, [
  ["the file of the body", ["src/net/backoff/engine.mjs"]],
  ["the one caller of the brief", ["src/net/client.mjs"]],
  ["a list that lacks the call by the default import", no2("upload")],
  ["a list that lacks the call by the old name `withBackoff`", no2("poll")],
  ["a list that lacks the call through `Reflect.apply`", no2("hooks")],
  ["a list that lacks the call through a string key", no2("registry")],
  ["a list that lacks the call after a dynamic import", no2("lazy")],
  ["a list that lacks the call as a callback of `map`", no2("batch")],
  [
    "a list with the file that stores the function",
    [...S2, "src/net/keep.mjs"],
  ],
  ["a list with the call of a parameter", [...S2, "src/net/shadow.mjs"]],
  ["a list with the call of a local copy", [...S2, "src/net/mock.mjs"]],
  [
    "a list with the caller of the job queue function",
    [...S2, "src/jobs/worker.mjs"],
  ],
  ["a list with a file that only re-exports", [...S2, "src/net/retry.mjs"]],
]);

const S3 = [
  "src/cli/dump.mjs",
  "src/cli/pipe.mjs",
  "src/http/handler.mjs",
  "src/http/middleware.mjs",
  "src/log/write.mjs",
];
const no3 = (name) => S3.filter((f) => !f.includes(name));

callSites("search-3", S3, [
  ["the file of the code", ["src/security/scrub/pipeline.mjs"]],
  ["the one caller that the log code has", ["src/log/write.mjs"]],
  ["a list that lacks the call through a table of steps", no3("middleware")],
  ["a list that lacks the call through a string key", no3("dump")],
  ["a list that lacks the call as a callback", no3("pipe")],
  ["a list that lacks the call in the handler", no3("handler")],
  [
    "a list with the file that stores the function",
    [...S3, "src/cli/keep.mjs"],
  ],
  ["a list with the call of a local copy", [...S3, "src/http/mock.mjs"]],
  [
    "a list with the caller of the strict copy",
    [...S3, "src/audit/report.mjs"],
  ],
  ["a list with the re-export of the log code", [...S3, "src/log/redact.mjs"]],
  [
    "a list with the file of the code",
    [...S3, "src/security/scrub/pipeline.mjs"],
  ],
]);

const T1 = [
  "case beta",
  "case delta",
  "case sigma",
  "case psi",
  "row 3",
  "case chi",
];

test("tests-1: the six failing tests, with the skipped one left out, are resolved", async () => {
  expect(await resolves("tests-1", failing(...T1))).toBe(true);
});

for (const [why, names] of [
  ["a list that lacks the test of the second file", T1.slice(0, 5)],
  ["a list that lacks the generated row", T1.filter((n) => n !== "row 3")],
  ["a list that has the skipped test", [...T1, "case tau"]],
  ["a list from the source that has a passing test", [...T1, "case omega"]],
])
  test(`tests-1: ${why} is not resolved`, async () => {
    expect(await resolves("tests-1", failing(...names))).toBe(false);
  });

const T2 = ["case three", "parse > handles empty", "format > handles pad"];

test("tests-2: the full names of the failing tests are resolved", async () => {
  expect(await resolves("tests-2", failing(...T2))).toBe(true);
});

for (const [why, names] of [
  [
    "the bare names of the suite tests",
    ["case three", "handles empty", "handles pad"],
  ],
  [
    "the suite names with the wrong tests",
    ["case three", "parse > handles pad", "format > handles empty"],
  ],
  ["a list that lacks a suite test", T2.slice(0, 2)],
])
  test(`tests-2: ${why} is not resolved`, async () => {
    expect(await resolves("tests-2", failing(...names))).toBe(false);
  });

const T3 = ["red", "blue", "gray", "plum", "rust", "olive", "taupe"].map(
  (n) => `case ${n}`,
);

test("tests-3: the seven failing tests are resolved", async () => {
  expect(await resolves("tests-3", failing(...T3))).toBe(true);
});

for (const [why, names] of [
  ["a list that lacks the missing export", T3.filter((n) => n !== "case plum")],
  ["a list that lacks the rejected test", T3.filter((n) => n !== "case olive")],
  ["a list that has a passing test", [...T3, "case navy"]],
])
  test(`tests-3: ${why} is not resolved`, async () => {
    expect(await resolves("tests-3", failing(...names))).toBe(false);
  });

test("a run that edits a source file is tampering", async () => {
  expect(
    await resolves("tests-1", (job) => {
      failing(...T1)(job);
      writes({ "src/m.mjs": "export {};\n" })(job);
    }),
  ).toBe(false);
});
