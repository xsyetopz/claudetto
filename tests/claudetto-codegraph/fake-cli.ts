// A FAKE `codegraph` for the tests of claudetto-codegraph. The tests never run the real CLI.
// The fake is a shell script on a `PATH` folder. It logs its arguments, and answers `--version`.

import fs from "node:fs";
import path from "node:path";
import { type Env, PLUGINS, tmpDir } from "../support/repo.ts";

const PLUGIN = path.join(PLUGINS, "claudetto-codegraph");

export { PLUGIN };

/** Runs `cmd` with `args` and waits. Gives `{ status, stdout, stderr }` as text, and `status` is the exit code. */
export const run = (
  cmd: string,
  args: string[],
  { input, ...options }: { input?: string; cwd?: string; env?: Env } = {},
) => {
  const r = Bun.spawnSync({
    cmd: [cmd, ...args],
    stdin: input === undefined ? "ignore" : Buffer.from(input),
    stdout: "pipe",
    stderr: "pipe",
    ...options,
  });
  return {
    status: r.exitCode,
    stdout: r.stdout.toString(),
    stderr: r.stderr.toString(),
  };
};

// The fake is a Node script with a launcher: `sh`.
// `FAKE_EXIT` makes it exit with that code after it writes `FAKE_STDERR` to stderr.
const FAKE = `import fs from "node:fs";
import path from "node:path";
const dir = process.env.FAKE_DIR;
const log = (line) => fs.appendFileSync(path.join(dir, "log"), line + "\\n");
const [command, ...rest] = process.argv.slice(2);
log([command, ...rest].join(" "));
if (process.env.FAKE_EXIT) {
  console.error(process.env.FAKE_STDERR ?? "");
  process.exit(Number(process.env.FAKE_EXIT));
}
if (command === "--version") console.log("9.9.9");
`;

/** Writes the fake `codegraph` into `bin`, with the `sh` launcher. */
const installFake = async (bin: string) => {
  await Bun.write(path.join(bin, "codegraph.mjs"), FAKE);
  // `Bun.write` has no `mode`, so the launcher gets its execute bit from `chmodSync`.
  const launcher = path.join(bin, "codegraph");
  await Bun.write(
    launcher,
    `#!/bin/sh\nexec "${process.execPath}" "$0.mjs" "$@"\n`,
  );
  fs.chmodSync(launcher, 0o755);
};

/** A project folder and a fake CLI folder. `index` makes `.codegraph/codegraph.db`. */
export const setUp = async ({
  index = true,
  installed = true,
}: {
  index?: boolean;
  installed?: boolean;
} = {}) => {
  const dir = tmpDir("codegraph");
  const project = path.join(dir, "project");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(project);
  fs.mkdirSync(bin);
  if (index) {
    fs.mkdirSync(path.join(project, ".codegraph"));
    await Bun.write(path.join(project, ".codegraph", "codegraph.db"), "");
  }
  if (installed) await installFake(bin);
  // The child process needs more than `PATH` in its environment, so the base is the test environment
  // without the variables of a parent Claude Code session.
  const base = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !k.startsWith("CLAUDE_") && k !== "PATH",
    ),
  );
  const system = ["/usr/bin", "/bin"];
  const env = {
    ...base,
    PATH: [bin, ...system].join(path.delimiter),
    FAKE_DIR: dir,
    HOME: dir,
  };
  return {
    dir,
    project,
    env,
    /** The lines that the fake got, one per call. */
    log: async () => {
      const file = path.join(dir, "log");
      return fs.existsSync(file)
        ? (await Bun.file(file).text()).trim().split("\n")
        : [];
    },
  };
};
