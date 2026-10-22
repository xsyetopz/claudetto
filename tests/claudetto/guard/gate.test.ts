// The permission gate of the `guard` slice (spec `permission-gate`, task 5.1 of change `0-3-0`), with commands as strings.
// The `git` state is a stub, so no command runs.

import { expect, test } from "bun:test";
import {
  type Facts,
  gate,
} from "../../../plugins/claudetto/slices/guard/domain/gate.ts";
import corpus from "./corpus/gate.json" with { type: "json" };

/** The facts of a project at `/p`, with a `git` that gives `dirty` for each path in `dirty`. */
const facts = (...dirty: string[]): Facts & { runs: string[][] } => {
  const runs: string[][] = [];
  return {
    cwd: "/p",
    home: "/u",
    tmp: "/t",
    runs,
    git: async (scope, dir, paths) => {
      runs.push([scope, dir, ...paths]);
      const all = paths.length ? paths : [dir];
      return all.some((p) => dirty.some((d) => p.includes(d)))
        ? "dirty"
        : "clean";
    },
  };
};

const bash = (command: string, f: Facts = facts()) =>
  gate({ tool: "Bash", input: { command } }, f);
const decisions = async (commands: string[]) =>
  Promise.all(commands.map(async (c) => [c, (await bash(c)).decision]));

for (const decision of ["allow", "ask", "deny"] as const)
  test(`each \`${decision}\` command of the corpus gets \`${decision}\``, async () => {
    const wrong = (await decisions(corpus[decision])).filter(
      ([, d]) => d !== decision,
    );
    expect(wrong).toStrictEqual([]);
  });

test("Ordinary Session: a build, a test, and read-only `git` need no `git` run", async () => {
  const f = facts();
  for (const c of ["bun test", "git status", "git diff | grep x"])
    expect((await bash(c, f)).decision).toBe("allow");
  expect(f.runs).toStrictEqual([]);
});

test("Committed File: `rm` of a file with a commit and no change runs", async () => {
  const f = facts();
  expect((await bash("rm src/old.ts", f)).decision).toBe("allow");
  expect(f.runs).toStrictEqual([["delete", "/p", "/p/src/old.ts"]]);
});

test("Uncommitted File: `rm` of a file with no commit asks, and names the target", async () => {
  const v = await bash("rm notes.md", facts("notes.md"));
  expect(v.decision).toBe("ask");
  expect(v.reason).toContain("`notes.md`");
});

test("Project in the Temp Folder: `rm -r` of an untracked folder of the project asks", async () => {
  const f = { ...facts("scratch"), cwd: "/t/p" };
  expect((await bash("rm -r scratch", f)).decision).toBe("ask");
  expect((await bash("rm -r /t/other", f)).decision).toBe("allow");
});

test('Home Folder: `rm -rf ~` and `rm -rf "$HOME"` are denied with a reason', async () => {
  for (const c of ["rm -rf ~", 'rm -rf "$HOME"']) {
    const v = await bash(c);
    expect(v.decision).toBe("deny");
    expect(v.reason).toContain(`\`! ${c}\``);
  }
});

test("Reset on a Clean Tree runs, and `reset --hard` with changes asks", async () => {
  expect((await bash("git reset --hard HEAD~1")).decision).toBe("allow");
  expect((await bash("git reset --hard", facts("/p"))).decision).toBe("ask");
});

test("Local Git Loss: `checkout --`, `restore`, and `clean -f` ask only when the paths can lose work", async () => {
  const f = facts("a.ts");
  expect((await bash("git checkout -- src/a.ts", f)).decision).toBe("ask");
  expect((await bash("git restore src/a.ts", f)).decision).toBe("ask");
  expect((await bash("git checkout -- src/b.ts", f)).decision).toBe("allow");
  expect((await bash("git clean -fd", facts("/p"))).decision).toBe("ask");
  expect(f.runs[0]).toStrictEqual(["changes", "/p", "src/a.ts"]);
});

test("a `git -C` and a `cd` move the folder of the `git` check", async () => {
  const f = facts();
  await bash("cd sub && git -C inner reset --hard", f);
  expect(f.runs).toStrictEqual([["changes", "/p/sub/inner"]]);
});

test("a script with no commit asks, and a committed script runs", async () => {
  expect((await bash("bash new.sh", facts("new.sh"))).decision).toBe("ask");
  expect((await bash("./tools/run.sh")).decision).toBe("allow");
});

test("Secret Reads: the reason gives no `!` command", async () => {
  const v = await bash("cat .env");
  expect(v.reason).toContain("`.env`");
  expect(v.reason).not.toContain("`!");
});

test("Secret Reads: `Read`, `Grep`, and `Glob` of a `.env` file are denied", async () => {
  const calls = [
    { tool: "Read", input: { file_path: "/p/.env" } },
    { tool: "Read", input: { file_path: "/u/.ssh/id_rsa" } },
    { tool: "Grep", input: { pattern: "KEY", path: ".env.local" } },
    { tool: "Grep", input: { pattern: "KEY", glob: ".env*" } },
    { tool: "Glob", input: { pattern: "**/.env" } },
  ];
  for (const call of calls)
    expect((await gate(call, facts())).decision).toBe("deny");
});

test("Example File: `Read` of `.env.example` runs", async () => {
  const call = { tool: "Read", input: { file_path: "/p/.env.example" } };
  expect(await gate(call, facts())).toStrictEqual({ decision: "allow" });
});

test("System Tampering: `Edit` and `Write` of a system folder are denied, and `/usr/local` is not one", async () => {
  const write = (file_path: string) =>
    gate({ tool: "Write", input: { file_path, content: "x" } }, facts());
  expect((await write("/Library/LaunchDaemons/x.plist")).decision).toBe("deny");
  expect((await write("/usr/local/etc/x.conf")).decision).toBe("allow");
  expect((await write("/p/src/a.ts")).decision).toBe("allow");
});

test("a deny wins over an `ask`, and no `git` check runs then", async () => {
  const f = facts("notes.md");
  expect((await bash("rm notes.md; sudo true", f)).decision).toBe("deny");
  expect(f.runs).toStrictEqual([]);
});

// Task 5.1a: only an `ask` of the delete and local `git` gates goes to Jev.
for (const [command, jev] of [
  ["rm notes.md", true],
  ["git reset --hard", true],
  ["git clean -fd", true],
  ["rm -rf ../other", true],
  ["git push --force", false],
  ['eval "$X"', false],
  ['rm notes.md; eval "$X"', false],
] as const)
  test(`\`${command}\` asks${jev ? "" : " with no"} \`jev\``, async () => {
    const v = await bash(command, facts("/p"));
    expect(v.decision).toBe("ask");
    expect(v.jev === true).toBe(jev);
  });

test("an `ask` with two findings gives the reason of each", async () => {
  const v = await bash('rm notes.md; eval "$X"', facts("/p"));
  expect(v.reason?.split("\n")).toHaveLength(2);
});
