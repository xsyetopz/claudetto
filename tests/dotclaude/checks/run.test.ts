// The CLI `dotclaude-run-checks` (`adapters/cli.ts`) on small fake commands: exit status, counts, failure lines, and the log file.
// The commands are real `bun` scripts in a temporary folder, and the CLI runs them through the real process runner.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { processRunner } from "../../../src/kernel/node/process.ts";
import { CHECKS_DIR } from "../../../src/kernel/paths.ts";
import { main } from "../../../src/plugins/dotclaude/slices/checks/adapters/cli.ts";
import { MAX_PASS_OUTPUT_LINES } from "../../../src/plugins/dotclaude/slices/checks/limits.ts";

/** A folder with the fake check scripts `ok.js`, `bad.js`, and `noisy.js`. */
const project = async (): Promise<string> => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "checks-"));
  await Bun.write(
    path.join(dir, "ok.js"),
    "console.log(' 3 pass'); console.log(' 0 fail');",
  );
  await Bun.write(
    path.join(dir, "bad.js"),
    "console.log(' 2 pass'); console.log(' 1 fail'); console.log('error: expected 1, got 2'); console.error('stderr text'); process.exit(3);",
  );
  await Bun.write(
    path.join(dir, "noisy.js"),
    "for (let i = 0; i < 100; i++) console.log('error line ' + i); process.exit(1);",
  );
  return dir;
};

/** Run the CLI in `dir` with the real runner, and collect the printed lines. */
const run = async (dir: string, ...commands: string[]) => {
  const lines: string[] = [];
  const errors: string[] = [];
  let tick = 0;
  const status = await main(commands, dir, {
    runner: processRunner,
    clock: { now: () => 1_700_000_000_000 + tick++ * 1500 },
    writeLog: async (file, text) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await Bun.write(file, text);
    },
    log: (l) => lines.push(l),
    error: (l) => errors.push(l),
    windows: false,
    env: { get: () => undefined },
  });
  return { status, out: lines.join("\n"), errors };
};

/** Write the script `name` in `dir`, which prints `count` lines from `line 0` on. */
const printing = (dir: string, name: string, count: number): Promise<number> =>
  Bun.write(
    path.join(dir, name),
    `for (let i = 0; i < ${count}; i++) console.log('line ' + i);`,
  );

const logs = (dir: string): string[] =>
  fs.readdirSync(path.join(dir, CHECKS_DIR)).sort();

test("passing commands exit 0 and print counts, time, and the log file", async () => {
  const dir = await project();
  const r = await run(dir, "bun ok.js", "bun ok.js");
  expect(r.status).toBe(0);
  expect(r.out).toContain("exit 0 | 1.5s | 3 passed, 0 failed, 0 skipped");
  expect(r.out).toContain("2 of 2 commands passed");
  expect(logs(dir)).toHaveLength(2);
  expect(r.out).not.toContain("failures:");
});

test("a passing command with short output shows the output in the summary", async () => {
  const dir = await project();
  await printing(dir, "lines.js", MAX_PASS_OUTPUT_LINES);
  const r = await run(dir, "bun lines.js");
  expect(r.status).toBe(0);
  expect(r.out).toContain("  output:");
  expect(r.out).toContain("    line 0");
  expect(r.out).toContain(`    line ${MAX_PASS_OUTPUT_LINES - 1}`);
});

test("a passing command with output over the bound shows no output, and the log keeps it", async () => {
  const dir = await project();
  await printing(dir, "lines.js", MAX_PASS_OUTPUT_LINES + 1);
  const r = await run(dir, "bun lines.js");
  expect(r.status).toBe(0);
  expect(r.out).not.toContain("output:");
  expect(r.out).not.toContain("    line 0");
  const text = await Bun.file(
    path.join(dir, CHECKS_DIR, logs(dir)[0] as string),
  ).text();
  expect(text).toContain(`line ${MAX_PASS_OUTPUT_LINES}`);
});

test("one failed command makes the exit status 1 and the later commands still run", async () => {
  const dir = await project();
  const r = await run(dir, "bun bad.js", "bun ok.js");
  expect(r.status).toBe(1);
  expect(r.out).toContain("exit 3");
  expect(r.out).toContain("2 passed, 1 failed, 0 skipped");
  expect(r.out).toContain("error: expected 1, got 2");
  expect(r.out).toContain("1 of 2 commands passed");
});

test("the log file holds the full output of stdout and stderr, and the summary names it", async () => {
  const dir = await project();
  const r = await run(dir, "bun bad.js");
  const [name] = logs(dir);
  expect(r.out).toContain(`log: ${CHECKS_DIR}/${name}`);
  const text = await Bun.file(
    path.join(dir, CHECKS_DIR, name as string),
  ).text();
  expect(text).toContain("error: expected 1, got 2");
  expect(text).toContain("stderr text");
});

test("the summary cuts the failure lines, and the log keeps all of them", async () => {
  const dir = await project();
  const r = await run(dir, "bun noisy.js");
  expect(r.out).toContain("more lines in the log");
  expect(r.out).not.toContain("error line 99");
  const text = await Bun.file(
    path.join(dir, CHECKS_DIR, logs(dir)[0] as string),
  ).text();
  expect(text).toContain("error line 99");
});

test("a command with shell syntax runs through the shell", async () => {
  const dir = await project();
  const r = await run(dir, "bun ok.js | cat && bun bad.js; exit 4");
  expect(r.status).toBe(1);
  expect(r.out).toContain("exit 4");
  expect(r.out).toContain("5 passed, 1 failed, 0 skipped");
});

test("a program that does not exist fails with status 127", async () => {
  const dir = await project();
  const r = await run(dir, "no-such-program-dotclaude --flag");
  expect(r.status).toBe(1);
  expect(r.out).toContain("exit 127");
  expect(r.out).toContain("Cannot run no-such-program-dotclaude");
});

test("no command is a usage error with status 2 and no log file", async () => {
  const dir = await project();
  const r = await run(dir);
  expect(r.status).toBe(2);
  expect(r.errors.join("\n")).toContain("Usage");
  expect(fs.existsSync(path.join(dir, CHECKS_DIR))).toBe(false);
});

test("two runs in the same second write two log files", async () => {
  const dir = await project();
  await run(dir, "bun ok.js");
  await run(dir, "bun ok.js");
  expect(logs(dir)).toHaveLength(2);
});

// Windows has no POSIX signals, so a command cannot end by `kill -9` there, and the run gives status 0.
test.skipIf(process.platform === "win32")(
  "a command killed by a signal names the signal and prints no empty failures header",
  async () => {
    const dir = await project();
    const r = await run(dir, "kill -9 $$");
    expect(r.status).toBe(1);
    expect(r.out).toContain("SIGKILL");
    expect(r.out).not.toContain("failures:");
  },
);

test("a command over the time bound says that it timed out", async () => {
  // A fake runner: the real runner needs the whole time bound to time out.
  const lines: string[] = [];
  const status = await main(["slow"], os.tmpdir(), {
    runner: {
      run: () => ({
        exitCode: null,
        stdout: "",
        stderr: "",
        signal: "SIGTERM",
        timedOut: true,
      }),
    },
    clock: { now: () => 0 },
    writeLog: async () => {},
    log: (l) => lines.push(l),
    error: () => {},
    windows: false,
    env: { get: () => undefined },
  });
  const out = lines.join("\n");
  expect(status).toBe(1);
  expect(out).toContain("timed out after 1800s");
  expect(out).not.toContain("failures:");
});

test("the log folder is in `CLAUDE_PROJECT_DIR`, and the commands run in the current folder", async () => {
  const cwd = await project();
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "checks-project-"));
  const status = await main(["bun ok.js"], cwd, {
    runner: processRunner,
    clock: { now: () => 1_700_000_000_000 },
    writeLog: async (file, text) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await Bun.write(file, text);
    },
    log: () => {},
    error: () => {},
    windows: false,
    env: {
      get: (name) => (name === "CLAUDE_PROJECT_DIR" ? projectDir : undefined),
    },
  });
  expect(status).toBe(0);
  expect(logs(projectDir)).toHaveLength(1);
  expect(fs.existsSync(path.join(cwd, CHECKS_DIR))).toBe(false);
});

test("an unquoted flag is a usage error with status 2, and no command runs", async () => {
  const dir = await project();
  const ran: string[] = [];
  const errors: string[] = [];
  const status = await main(["bun", "--version"], dir, {
    runner: {
      run: (file, args) => {
        ran.push([file, ...args].join(" "));
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    },
    clock: { now: () => 0 },
    writeLog: async () => {},
    log: () => {},
    error: (l) => errors.push(l),
    windows: false,
    env: { get: () => undefined },
  });
  expect(status).toBe(2);
  expect(ran).toEqual([]);
  expect(errors.join("\n")).toContain('dotclaude-run-checks "bun --version"');
  expect(fs.existsSync(path.join(dir, CHECKS_DIR))).toBe(false);
});

test("a quoted command with a flag still runs", async () => {
  const dir = await project();
  const r = await run(dir, "bun --version");
  expect(r.status).toBe(0);
  expect(r.errors).toEqual([]);
  expect(r.out).toContain("exit 0");
});
