// The rows of `claudetto-statusline` for each width, with and without color.
// The cases run `main` with a fixed clock, a fake `git`, and a fixed status object.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/claudetto/slices/statusline/adapters/cli.ts";
import { MAX_ROWS } from "../../../src/plugins/claudetto/slices/statusline/limits.ts";
import {
  plainText,
  width,
} from "../../../src/plugins/claudetto/slices/statusline/width.ts";
import { depsFor, GIT_TEXT, type Run, STATUS } from "./support.ts";

const ESC = String.fromCharCode(27);
/** The block, bar, and shade characters that a bar would use. */
const BAR = /[▀-▟■-□▰-▱─-╿]/;

const render = async (
  columns: number,
  env: Record<string, string> = {},
  input: unknown = STATUS,
): Promise<Run> => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main(
    [],
    depsFor(input, run, { env: { COLUMNS: String(columns), ...env } }),
  );
  return run;
};

test("a wide terminal shows two rows of numbers with icons, and `NO_COLOR` keeps each icon", async () => {
  const run = await render(124, { NO_COLOR: "1" });
  expect(run.status).toBe(0);
  expect(run.err).toStrictEqual([]);
  expect(run.out).toStrictEqual([
    [
      "⌂ claudetto       · ⎇ main ✎2 ↑1 ↓2                      · ◷ 7d  80% ▲11%  ⏵Oct 13 at 5pm ↻Oct 14 at 4pm",
      "◈ Opus 5.5 high ✦ · ▤ 15% of 300k ⇥180k · $1.23 +300 -20 · ◷ 5h  23% ▼13%                 ↻3:12pm",
    ].join("\n"),
  ]);
});

test("a narrow terminal drops the segments at the right of a row, and the first segment stays", async () => {
  const run = await render(32, { NO_COLOR: "1" });
  expect(run.out).toStrictEqual([
    ["⌂ claudetto", "◈ Opus 5.5 high ✦", "◷ 5h 23% ▼13% ↻3h12m"].join("\n"),
  ]);
});

test("a very narrow terminal cuts the first segment with `…`", async () => {
  const run = await render(14, { NO_COLOR: "1" });
  const rows = (run.out[0] ?? "").split("\n");
  expect(rows).toStrictEqual(["⌂ claudet…", "◈ Opus 5.…", "◷ 5h 23% …"]);
  for (const row of rows) expect(width(row)).toBeLessThanOrEqual(10);
});

test("no row is wider than the terminal, with or without color", async () => {
  for (const columns of [124, 60, 44, 30, 20, 12]) {
    for (const env of [{}, { NO_COLOR: "1" }]) {
      const rows = ((await render(columns, env)).out[0] ?? "").split("\n");
      expect(rows.length).toBeLessThanOrEqual(MAX_ROWS);
      for (const row of rows)
        expect(width(row)).toBeLessThanOrEqual(columns - 4);
    }
  }
});

test("`NO_COLOR` gives no escape sequence, and the color run gives the same text with sequences", async () => {
  const plain = (await render(124, { NO_COLOR: "1" })).out[0] ?? "";
  const colored = (await render(124)).out[0] ?? "";
  expect(plain).not.toContain(ESC);
  expect(colored).toContain(ESC);
  expect(plainText(colored)).toBe(plain);
});

test("an empty `NO_COLOR` keeps the color", async () => {
  expect((await render(124, { NO_COLOR: "" })).out[0]).toContain(ESC);
});

test("the output has no bar character", async () => {
  for (const env of [{}, { NO_COLOR: "1" }]) {
    expect((await render(124, env)).out[0]).not.toMatch(BAR);
  }
});

test("a session with no git repository, no cost, and no limits shows the segments that remain", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  const input = { cwd: "/work/solo", model: { display_name: "Custom" } };
  run.status = await main(
    [],
    depsFor(input, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      runner: {
        run: () => ({
          exitCode: 128,
          stdout: "",
          stderr: "fatal: to nie jest repozytorium git",
        }),
      },
    }),
  );
  expect(run.out).toStrictEqual([["⌂ solo", "◈ Custom"].join("\n")]);
});

test("a `git` that is missing shows the error mark, and the cause goes to stderr", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      runner: {
        run: () => {
          throw new Error("spawn git ENOENT");
        },
      },
    }),
  );
  expect(run.status).toBe(0);
  expect(run.out[0]).toContain("⎇ ✗");
  expect(run.out[0]).toContain("⌂ claudetto");
  expect(run.err.join("")).toContain("spawn git ENOENT");
});

test("a detached head shows the short object name", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  const text = GIT_TEXT.replace(
    "# branch.head main",
    "# branch.head (detached)",
  );
  await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: "124", NO_COLOR: "1" },
      runner: { run: () => ({ exitCode: 0, stdout: text, stderr: "" }) },
    }),
  );
  expect(run.out[0]).toContain("⎇ 1234567");
});

test("input that is not a JSON object prints one empty row, writes the cause to stderr, and exits with 0", async () => {
  for (const input of ["{", "[]", "null", ""]) {
    const run: Run = { status: -1, out: [], err: [] };
    run.status = await main([], depsFor(input, run));
    expect(run.status).toBe(0);
    expect(run.out).toStrictEqual([""]);
    expect(run.err.join("")).not.toBe("");
  }
});

test("a failure prints one empty row, writes the cause to stderr, and exits with 0", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main(
    [],
    depsFor(STATUS, run, {
      stdin: async () => {
        throw new Error("stdin closed");
      },
    }),
  );
  expect(run.status).toBe(0);
  expect(run.out).toStrictEqual([""]);
  expect(run.err.join("")).toContain("stdin closed");
});
