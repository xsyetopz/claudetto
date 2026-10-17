// The CLI `claudetto-run-checks` (`adapters/cli.ts`) on small fake commands: the outcome of each check, the exit status, and the log file.
// The commands are real `bun` scripts in a temporary folder, and the CLI runs them through the real runner.
// The tests read the outcomes and the log files, and not the words of the printed summary.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type Deps,
  groupRunner,
  main,
  runChecks,
} from "../../../plugins/claudetto/slices/checks/adapters/cli.ts";
import { renderTotal } from "../../../plugins/claudetto/slices/checks/domain/summary.ts";
import {
  COMMAND_TIMEOUT_MS,
  MAX_FAILURE_LINES,
  MAX_PASS_OUTPUT_LINES,
} from "../../../plugins/claudetto/slices/checks/limits.ts";
import { CHECKS_DIR } from "../../../src/kernel/paths.ts";

/** The milliseconds that the fake clock adds at each reading. */
const TICK = 1500;

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

/** The ports of the CLI with the real runner, a fake clock, and the printed lines in `lines` and `errors`. */
const portsOf = (
  lines: string[] = [],
  errors: string[] = [],
  over: Partial<Deps> = {},
): Deps => {
  let tick = 0;
  return {
    runner: groupRunner,
    clock: { now: () => 1_700_000_000_000 + tick++ * TICK },
    writeLog: async (file, text) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await Bun.write(file, text);
    },
    log: (l) => lines.push(l),
    error: (l) => errors.push(l),
    env: { get: () => undefined },
    ...over,
  };
};

/** Run the checks in `dir` with the real runner and give the outcomes. */
const check = (dir: string, ...commands: string[]) =>
  runChecks(commands, dir, portsOf());

/** Run the CLI in `dir` and give the exit status and the printed lines. */
const run = async (dir: string, ...commands: string[]) => {
  const lines: string[] = [];
  const errors: string[] = [];
  const status = await main(commands, dir, portsOf(lines, errors));
  return { status, lines, errors };
};

/** Write the script `name` in `dir`, which prints `count` lines from `line 0` on. */
const printing = (dir: string, name: string, count: number): Promise<number> =>
  Bun.write(
    path.join(dir, name),
    `for (let i = 0; i < ${count}; i++) console.log('line ' + i);`,
  );

const logs = (dir: string): string[] =>
  fs.readdirSync(path.join(dir, CHECKS_DIR)).sort();

const logText = (dir: string, logFile: string): Promise<string> =>
  Bun.file(path.join(dir, logFile)).text();

test("passing commands exit 0, with their time and one log file each", async () => {
  const dir = await project();
  const outcomes = await check(dir, "bun ok.js", "bun ok.js");
  expect(outcomes.map((o) => o.exitCode)).toStrictEqual([0, 0]);
  expect(outcomes.map((o) => o.ms)).toStrictEqual([TICK, TICK]);
  expect(outcomes.map((o) => o.failures)).toStrictEqual([null, null]);
  expect(logs(dir)).toHaveLength(2);
  expect((await run(dir, "bun ok.js", "bun ok.js")).status).toBe(0);
});

test("the summary has one block for each command and the total of the outcomes", async () => {
  const dir = await project();
  const [outcomes, printed] = [
    await check(dir, "bun ok.js", "bun bad.js"),
    await run(dir, "bun ok.js", "bun bad.js"),
  ];
  expect(printed.lines.at(-1)).toBe(renderTotal(outcomes));
  expect(printed.lines.filter((l) => l.includes("bun ")).length).toBe(2);
});

test("a passing command with short output keeps the output lines", async () => {
  const dir = await project();
  await printing(dir, "lines.js", MAX_PASS_OUTPUT_LINES);
  const [o] = await check(dir, "bun lines.js");
  expect(o?.exitCode).toBe(0);
  expect(o?.shortOutput).toStrictEqual(
    Array.from({ length: MAX_PASS_OUTPUT_LINES }, (_, i) => `line ${i}`),
  );
});

test("a passing command with output over the bound keeps no output, and the log keeps it", async () => {
  const dir = await project();
  await printing(dir, "lines.js", MAX_PASS_OUTPUT_LINES + 1);
  const [o] = await check(dir, "bun lines.js");
  expect(o?.exitCode).toBe(0);
  expect(o?.shortOutput).toBeNull();
  expect(await logText(dir, o?.logFile as string)).toContain(
    `line ${MAX_PASS_OUTPUT_LINES}`,
  );
});

test("one failed command fails the run and the later commands still run", async () => {
  const dir = await project();
  const outcomes = await check(dir, "bun bad.js", "bun ok.js");
  const [bad, ok] = outcomes;
  expect(bad?.exitCode).toBe(3);
  expect(bad?.failures?.lines).toContain("error: expected 1, got 2");
  expect(ok?.exitCode).toBe(0);
  expect((await run(dir, "bun bad.js", "bun ok.js")).status).toBe(1);
});

test("the log file holds the full output of stdout and stderr, and the outcome names it", async () => {
  const dir = await project();
  const [o] = await check(dir, "bun bad.js");
  expect(o?.logFile).toBe(`${CHECKS_DIR}/${logs(dir)[0]}`);
  const text = await logText(dir, o?.logFile as string);
  expect(text).toContain("error: expected 1, got 2");
  expect(text).toContain("stderr text");
});

test("the printed lines are the last ones up to the bound, and the log keeps all of them", async () => {
  const dir = await project();
  const [o] = await check(dir, "bun noisy.js");
  expect(o?.failures?.lines).toHaveLength(MAX_FAILURE_LINES);
  expect(o?.failures?.omitted).toBe(100 - MAX_FAILURE_LINES);
  expect(o?.failures?.lines.at(-1)).toBe("error line 99");
  expect(o?.failures?.lines).not.toContain("error line 0");
  expect(await logText(dir, o?.logFile as string)).toContain("error line 0");
});

test("a command with shell syntax runs through the shell", async () => {
  const dir = await project();
  const [o] = await check(dir, "bun ok.js | cat && bun bad.js; exit 4");
  expect(o?.exitCode).toBe(4);
});

test("a failed part of a pipe fails the check", async () => {
  const dir = await project();
  const [piped, last] = await check(dir, "bun bad.js | tail -1", "true");
  expect(piped?.exitCode).toBe(3);
  expect(last?.exitCode).toBe(0);
  expect((await run(dir, "bun bad.js | tail -1")).status).toBe(1);
});

test("a quoted argument with two spaces reaches the program in one piece", async () => {
  const dir = await project();
  const [o] = await check(dir, `bun -e 'console.log("two  spaces")'`);
  expect(o?.exitCode).toBe(0);
  expect(o?.shortOutput).toStrictEqual(["two  spaces"]);
});

test("an assignment before the program runs through the shell and sets the variable", async () => {
  const dir = await project();
  const [o] = await check(
    dir,
    "GREETING=hi bun -e 'console.log(process.env.GREETING)'",
  );
  expect(o?.exitCode).toBe(0);
  expect(o?.shortOutput).toStrictEqual(["hi"]);
});

test("a failing command that prints no final newline keeps its last line", async () => {
  const dir = await project();
  await Bun.write(
    path.join(dir, "nonl-bad.js"),
    "process.stdout.write('error: no final newline'); process.exit(1);",
  );
  const [o] = await check(dir, "bun nonl-bad.js");
  expect(o?.exitCode).toBe(1);
  expect(o?.failures?.lines).toStrictEqual(["error: no final newline"]);
});

test("a program that does not exist fails with status 127 and names the program in the log", async () => {
  const dir = await project();
  const [o] = await check(dir, "no-such-program-claudetto --flag");
  expect(o?.exitCode).toBe(127);
  expect(await logText(dir, o?.logFile as string)).toContain(
    "no-such-program-claudetto",
  );
  expect((await run(dir, "no-such-program-claudetto")).status).toBe(1);
});

test("no command is a usage error with status 2 and no log file", async () => {
  const dir = await project();
  const r = await run(dir);
  expect(r.status).toBe(2);
  expect(r.errors).toHaveLength(1);
  expect(fs.existsSync(path.join(dir, CHECKS_DIR))).toBe(false);
});

test("an empty argument is a usage error with status 2, and no command runs", async () => {
  const dir = await project();
  const r = await run(dir, "", "bun ok.js");
  expect(r.status).toBe(2);
  expect(r.lines).toStrictEqual([]);
  expect(fs.existsSync(path.join(dir, CHECKS_DIR))).toBe(false);
});

test("two runs in the same second write two log files", async () => {
  const dir = await project();
  await check(dir, "bun ok.js");
  await check(dir, "bun ok.js");
  expect(logs(dir)).toHaveLength(2);
});

test("a command killed by a signal gives the signal and no failure lines", async () => {
  const dir = await project();
  const [o] = await check(dir, "kill -9 $$");
  expect(o?.exitCode).toBeNull();
  expect(o?.stop).toStrictEqual({ kind: "signal", name: "SIGKILL" });
  expect(o?.failures?.lines).toStrictEqual([]);
});

test("a command over the time bound gives a timeout stop with the bound", async () => {
  // A fake runner: the real runner needs the whole time bound to time out.
  const outcomes = await runChecks(
    ["slow"],
    os.tmpdir(),
    portsOf([], [], {
      runner: {
        run: () => ({
          exitCode: null,
          stdout: "",
          stderr: "",
          signal: "SIGTERM",
          timedOut: true,
        }),
      },
      writeLog: async () => {},
    }),
  );
  expect(outcomes[0]?.stop).toStrictEqual({
    kind: "timeout",
    afterMs: COMMAND_TIMEOUT_MS,
  });
  expect(outcomes[0]?.exitCode).toBeNull();
  expect(outcomes[0]?.failures?.lines).toStrictEqual([]);
});

/** True when a process with `pid` runs. */
const alive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test("a timeout ends the check and each child process of it", async () => {
  const dir = await project();
  const pidFile = path.join(dir, "child.pid");
  const script = `bun -e 'setInterval(() => {}, 1000)' & echo $! > ${pidFile}; wait`;
  const r = await groupRunner.run("bash", ["-c", script], {
    cwd: dir,
    timeout: 1000,
  });
  expect(r.timedOut).toBe(true);
  const pid = Number((await Bun.file(pidFile).text()).trim());
  expect(pid).toBeGreaterThan(0);
  for (let i = 0; i < 40 && alive(pid); i++) await Bun.sleep(50);
  expect(alive(pid)).toBe(false);
});

test("the log folder is in `CLAUDE_PROJECT_DIR`, and the commands run in the current folder", async () => {
  const cwd = await project();
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "checks-project-"));
  const status = await main(
    ["bun ok.js"],
    cwd,
    portsOf([], [], {
      env: {
        get: (name) => (name === "CLAUDE_PROJECT_DIR" ? projectDir : undefined),
      },
    }),
  );
  expect(status).toBe(0);
  expect(logs(projectDir)).toHaveLength(1);
  expect(fs.existsSync(path.join(cwd, CHECKS_DIR))).toBe(false);
});

test("an unquoted flag is a usage error with status 2, and no command runs", async () => {
  const dir = await project();
  const ran: string[] = [];
  const errors: string[] = [];
  const status = await main(
    ["bun", "--version"],
    dir,
    portsOf([], errors, {
      runner: {
        run: (file, args) => {
          ran.push([file, ...args].join(" "));
          return { exitCode: 0, stdout: "", stderr: "" };
        },
      },
      writeLog: async () => {},
    }),
  );
  expect(status).toBe(2);
  expect(ran).toStrictEqual([]);
  expect(errors).toHaveLength(1);
  expect(fs.existsSync(path.join(dir, CHECKS_DIR))).toBe(false);
});

test("a quoted command with a flag still runs", async () => {
  const dir = await project();
  const r = await run(dir, "bun --version");
  expect(r.status).toBe(0);
  expect(r.errors).toStrictEqual([]);
});
