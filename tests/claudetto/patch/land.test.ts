// The CLI `claudetto-patch` on real repositories in a temp folder: list, land a clean patch, and report a conflict without a resolve.

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../src/plugins/claudetto/slices/patch/adapters/cli.ts";

const sh = (cwd: string, ...args: string[]) => {
  const run = Bun.spawnSync(
    ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
    { cwd },
  );
  if (run.exitCode !== 0) throw new Error(run.stderr.toString());
  return run.stdout.toString().trim();
};

const read = (root: string, file: string) =>
  Bun.file(path.join(root, file)).text();

/** A repository with `a.txt`, and a patch for the agent `a1` that changes line 1 of `a.txt` and adds `b.txt`. */
const repo = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "patch-"));
  sh(root, "init", "-q");
  await Bun.write(path.join(root, "a.txt"), "one\ntwo\nthree\n");
  sh(root, "add", "-A");
  sh(root, "commit", "-qm", "base");
  const base = sh(root, "rev-parse", "HEAD");
  const folder = path.join(root, ".claudetto/patches/a1");
  await mkdir(folder, { recursive: true });
  await Bun.write(path.join(folder, "base"), base);
  // Builds the patch in a temporary index, as the hook does.
  await Bun.write(path.join(root, "a.txt"), "ONE\ntwo\nthree\n");
  await Bun.write(path.join(root, "b.txt"), "new\n");
  const env = {
    ...process.env,
    GIT_INDEX_FILE: path.join(root, ".git/tmp.index"),
  };
  Bun.spawnSync(["git", "add", "-A", "a.txt", "b.txt"], { cwd: root, env });
  Bun.spawnSync(
    [
      "git",
      "diff",
      "--cached",
      "--binary",
      `--output=${path.join(folder, "changes.patch")}`,
      base,
    ],
    { cwd: root, env },
  );
  sh(root, "checkout", "--", "a.txt");
  sh(root, "clean", "-fq", "b.txt");
  return root;
};

const run = async (root: string, argv: string[]) => {
  const logs: string[] = [];
  const errors: string[] = [];
  const code = await main(
    argv,
    { log: (m) => logs.push(m), error: (m) => errors.push(m) },
    root,
  );
  return { code, logs: logs.join("\n"), errors: errors.join("\n") };
};

test("`list` names each agent with its base and its file count", async () => {
  const out = await run(await repo(), ["list"]);
  expect(out.code).toBe(0);
  expect(out.logs).toContain("a1\tbase ");
  expect(out.logs).toContain("2 files");
});

test("`land` applies a clean patch, with its new file", async () => {
  const root = await repo();
  const out = await run(root, ["land", "a1"]);
  expect(out.code).toBe(0);
  expect(await read(root, "a.txt")).toBe("ONE\ntwo\nthree\n");
  expect(await read(root, "b.txt")).toBe("new\n");
});

test("`land` reports a patch that does not apply, and changes no file", async () => {
  const root = await repo();
  await Bun.write(path.join(root, "a.txt"), "mine\ntwo\nthree\n");
  sh(root, "commit", "-qam", "live change");
  const out = await run(root, ["land", "a1"]);
  expect(out.code).toBe(1);
  expect(out.errors).toContain("does not apply");
  expect(await read(root, "a.txt")).toBe("mine\ntwo\nthree\n");
  expect(await Bun.file(path.join(root, "b.txt")).exists()).toBe(false);
});

test("`land --3way` leaves conflict markers and exits 1, and picks no side", async () => {
  const root = await repo();
  await Bun.write(path.join(root, "a.txt"), "mine\ntwo\nthree\n");
  sh(root, "commit", "-qam", "live change");
  const out = await run(root, ["land", "a1", "--3way"]);
  expect(out.code).toBe(1);
  const text = await read(root, "a.txt");
  expect(text).toContain("<<<<<<<");
  expect(text).toContain("mine");
  expect(text).toContain("ONE");
});

test("`land` of an agent with no patch, and a bad verb, fail", async () => {
  const root = await repo();
  expect((await run(root, ["land", "zz"])).code).toBe(1);
  expect((await run(root, ["nope"])).code).toBe(2);
});
