// The gate defects of the final review (task 20.2 of change `redesign-0-4-0`): the copy commands, the redirect form of a read, the heredoc strip, the env scan, the `git` programs, and the config stamp.
// The gate runs on strings and the adapter on a fake `$`, so no command runs.

import { expect, test } from "bun:test";
import {
  onCheck,
  onPermission,
} from "../../../plugins/claudetto/modules/gate/adapters/mod.ts";
import {
  type Facts,
  gate,
} from "../../../plugins/claudetto/modules/gate/domain/gate.ts";

/** The facts of a project at `/p` whose `hasEnvFile` answers `isThere`. */
const facts = (isThere: boolean): Facts => ({
  cwd: "/p",
  home: "/u",
  tmp: "/t",
  temps: ["/t", "/tmp", "/private/tmp"],
  hasEnvFile: async () => isThere,
  userEdits: async () => [],
  git: async () => "clean",
});

const decide = async (command: string, isThere: boolean): Promise<string> =>
  (await gate({ tool: "Bash", input: { command } }, facts(isThere))).decision;

// Defect 1: `cp`, `mv`, and `ln` copy or link the content of their source operands.
for (const command of [
  "cp .env /t/a",
  "mv .env /t/a",
  "ln -s .env /t/a",
  "cp -t /t .env",
  "cp --target-directory=/t .env",
  "cp -a /p/.env.local /t/a",
])
  test(`\`${command}\` is denied, because the source is a secret file`, async () => {
    const v = await decide(command, true);

    expect(v).toBe("deny");
  });

/** A command that the gate cannot read asks when the project has an env file, and it is allowed when the project has none. */
const FED_COMMANDS = [
  "cp $(printf x) /t/a",
  "mv `printf x` /t/a",
  'ln -s "$UNSET" /t/a',
  "echo $(<$(printf x))",
  "echo $(< $(printf x))",
  "cat <$(printf x)",
  "cat 0<$(printf x)",
  "cat <>$(printf x)",
  "cat <`printf x`",
  "cat <*",
  "cat <x?y",
  'cat <"$UNSET"',
  "cat <''",
  "echo $(<)",
  "source $(printf x)",
  ". $(printf x)",
  "exec <$(printf x)",
];
for (const command of FED_COMMANDS)
  for (const isThere of [true, false])
    test(`\`${command}\` gets \`${isThere ? "ask" : "allow"}\` when the project ${isThere ? "has" : "has no"} env file`, async () => {
      const v = await decide(command, isThere);

      expect(v).toBe(isThere ? "ask" : "allow");
    });

for (const command of [
  "cp .env.example /t/a",
  "cp .env.example .env",
  "ln -s /p/bin/x /t/x",
  "mv a.txt b.txt",
  "echo .env",
  "printf '%s' .env",
  "ls -l .env",
  "touch .env",
  "stat .env",
  "chmod 600 .env",
  "[ -f .env ]",
  "test -s .env",
])
  test(`\`${command}\` still gets \`allow\`, because it reads no content of a secret file`, async () => {
    const v = await decide(command, true);

    expect(v).toBe("allow");
  });

// Defect 2: a read by redirect whose target the gate cannot read, in `FED_COMMANDS` above.
for (const command of [
  "cat < /p/README.md",
  "wc -l < a.txt",
  "cat <<'EOF'\nx\nEOF",
  "cat <<< hello",
  "cat <(printf x)",
  "cat 2>&1 < a.txt",
])
  test(`\`${command}\` still gets \`allow\` with an env file, because its target is a plain name`, async () => {
    const v = await decide(command, true);

    expect(v).toBe("allow");
  });

// Defect 3: the strip of a literal heredoc ends at the first line of the delimiter.
for (const word of ["EOF", "END", "DOC_1"])
  test(`a \`$(cat <<'${word}'\` body does not hide the code after its first \`${word}\` line`, async () => {
    const command = `x=$(cat <<'${word}'\nbody\n${word}\npython3 $(printf x)\n${word}\n)`;

    const v = await decide(command, true);

    expect(v).toBe("ask");
  });

test("a `$(cat <<'EOF'` body with a closing line and a `)` still counts as text", async () => {
  const command = "git commit -m \"$(cat <<'EOF'\nfix: a $(b)\nEOF\n)\"";

  const v = await decide(command, true);

  expect(v).toBe("allow");
});

// Defect 5: a `-c` key that can hold a program, and the env words that name a program.
for (const command of [
  "git -c core.pager='sh -c x' log",
  "git -c core.sshCommand=x fetch",
  "git -c core.fsmonitor=x status",
  "git -c core.editor=x commit",
  "git -c core.hooksPath=/t/h status",
  "git -c diff.external=x diff",
  "git -c credential.helper=x fetch",
  "git -c gpg.program=x log",
  "git -c sequence.editor=x log",
  "git -c filter.x.clean=y status",
  "git -c filter.x.smudge=y status",
  "git -c uploadpack.packObjectsHook=x fetch",
  "git -c protocol.ext.allow=always fetch",
  "git -ccore.pager=x log",
  "git -c pager.log=less log",
  "git -c pager.log log",
  "git --config-env core.pager=V log",
  "git --config-env=core.pager=V log",
  "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.pager GIT_CONFIG_VALUE_0=x git log",
  "GIT_CONFIG_PARAMETERS=\"'core.pager=x'\" git log",
  "GIT_PAGER=x git log",
  "GIT_EDITOR=x git commit",
  "GIT_SSH=x git fetch",
  "GIT_SSH_COMMAND=x git fetch",
  "GIT_EXTERNAL_DIFF=x git diff",
  "GIT_ASKPASS=x git fetch",
  "EDITOR=x git commit",
  "env GIT_PAGER=x git log",
  "export GIT_PAGER=x; git log",
])
  test(`\`${command}\` gets \`ask\`, because git runs a program for it`, async () => {
    const v = await decide(command, false);

    expect(v).toBe("ask");
  });

for (const command of [
  "git -c color.ui=always log",
  "git -c user.name=a -c user.email=b@c.d commit -m x",
  "git -c core.quotepath=false status",
  "git -c pager.log=false log",
  "git -c advice.detachedHead=false status",
  "git -c init.defaultBranch=main status",
  "git -c log.abbrevCommit=true log",
  "git -c format.pretty=oneline log",
  "git -c diff.noprefix=true diff",
  "GIT_PAGER=cat git log",
  "GIT_EDITOR=true git commit -m x",
])
  test(`\`${command}\` still gets \`allow\`, because its key or program runs no code`, async () => {
    const v = await decide(command, false);

    expect(v).toBe("allow");
  });

// The adapter: the env scan (defect 4) and the config stamp (defect 6).
type Run = readonly string[];

/** A fake `$` for the project `/proj` and the session folder `cwd`. `find` answers `listed(argv)`, and the argv of each run is in `runs`. */
const scanFake = (
  cwd: string,
  listed: (argv: Run) => string,
  runs: Run[],
  exitCode = () => 0,
) => ({
  session: { cwd: async () => cwd, root: async () => "/proj" },
  env: { get: async (name: string) => ({ HOME: "/u", TMPDIR: "/t/" })[name] },
  clock: { now: async () => 1_000 },
  fs: {
    stat: async () => Promise.reject(new Error("ENOENT")),
    read: async () => Promise.reject(new Error("ENOENT")),
  },
  process: {
    run: async (argv: Run) => {
      runs.push(argv);
      return argv[0] === "find"
        ? { exitCode: exitCode(), stdout: listed(argv), stderr: "" }
        : { exitCode: 1, stdout: "", stderr: "" };
    },
  },
});

type Verdict = { decision: string };
const check = (
  tool: string,
  input: Record<string, unknown>,
  $: unknown,
): Promise<Verdict> =>
  (onCheck as unknown as (...a: unknown[]) => Promise<Verdict>)(
    $,
    { tool, input },
    async () => ({ decision: "allow" }),
  );
const FED = { command: "cat $(printf x)" };

test("Env Scan: a symlink named like an env file counts", async () => {
  const runs: Run[] = [];
  const $ = scanFake("/proj/link", () => "", runs);

  await check("Bash", FED, $);

  const scan = runs.find((r) => r[1] === "/proj") as Run;
  expect(scan.join(" ")).toContain("( -type f -o -type l )");
});

test("Env Scan: an env file in the home folder, a parent folder, or the session folder counts, at depth 1", async () => {
  const runs: Run[] = [];
  const $ = scanFake(
    "/w1/a/b",
    (argv) => (argv.includes("-maxdepth") ? "/w1/a/.env\n" : ""),
    runs,
  );

  const v = await check("Bash", FED, $);

  const near = runs.find((r) => r.includes("-maxdepth")) as Run;
  expect(near.slice(0, 7)).toStrictEqual([
    "find",
    "/w1/a/b",
    "/w1/a",
    "/w1",
    "/",
    "/u",
    "-maxdepth",
  ]);
  expect(near[near.indexOf("-maxdepth") + 1]).toBe("1");
  expect(v.decision).toBe("ask");
});

test("Env Scan: a find that fails counts as an env file", async () => {
  const runs: Run[] = [];
  const $ = scanFake(
    "/w2",
    () => "",
    runs,
    () => 1,
  );

  const v = await check("Bash", FED, $);

  expect(v.decision).toBe("ask");
});

test("Env Scan: a file that one `Bash` call makes shows at the next call", async () => {
  const runs: Run[] = [];
  let listing = "";
  const $ = scanFake("/w3", () => listing, runs);

  const before = await check("Bash", FED, $);
  listing = "/proj/.env\n";
  const after = await check("Bash", FED, $);

  expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
});

for (const tool of ["Write", "Edit", "NotebookEdit"])
  test(`Env Scan: a \`${tool}\` call ends the hold of the scan`, async () => {
    const runs: Run[] = [];
    let listing = "";
    const $ = scanFake(`/w4${tool}`, () => listing, runs);
    await check("Bash", FED, $);
    const scans = runs.length;

    listing = "/proj/.env\n";
    await check(tool, { file_path: "/proj/x" }, $);
    const after = await check("Bash", FED, $);

    expect(runs.length).toBeGreaterThan(scans);
    expect(after.decision).toBe("ask");
  });

test("Env Scan: the permission step of the same call reuses the scan", async () => {
  const runs: Run[] = [];
  const $ = scanFake("/w5", () => "", runs);
  await check("Bash", FED, $);
  const scans = runs.length;

  await (onPermission as unknown as (...a: unknown[]) => Promise<unknown>)(
    $,
    { tool_name: "Bash", tool_input: FED },
    async () => ({}),
  );

  expect(runs.length).toBe(scans);
});

/** A fake `$` for the repo `/w6x` whose config has the alias `p`, with the stat `meta` of each file. */
const stampFake = (
  cwd: string,
  alias: () => string,
  meta: Record<string, Record<string, number>>,
) => ({
  ...scanFake(cwd, () => "", []),
  fs: {
    stat: async (path: string) =>
      meta[path] ?? Promise.reject(new Error("ENOENT")),
    read: async () => Promise.reject(new Error("ENOENT")),
  },
  process: {
    run: async (argv: Run) => ({
      exitCode: 0,
      stdout: argv.includes("--get-regexp")
        ? `file:.git/config\0alias.p\n${alias()}\0`
        : "push\nstatus\n",
      stderr: "",
    }),
  },
});

// The stamp reads no `ino` or `ctimeMs`, because the typed `FsStat` has neither, so the text of the file stands in (`adapter.test.ts`).
for (const field of ["size"])
  test(`Git Facts: a rewrite that keeps the mtime but changes the \`${field}\` is read again`, async () => {
    const dir = `/w6${field}`;
    const file = { mtimeMs: 5, size: 10, ino: 7, ctimeMs: 5 };
    const meta = { [`${dir}/.git/config`]: file };
    let alias = "status";
    const $ = stampFake(dir, () => alias, meta);
    const before = await check("Bash", { command: "git p" }, $);

    alias = "!git push --force";
    meta[`${dir}/.git/config`] = { ...file, [field]: 99 };
    const after = await check("Bash", { command: "git p" }, $);

    expect([before.decision, after.decision]).toStrictEqual(["allow", "ask"]);
  });
