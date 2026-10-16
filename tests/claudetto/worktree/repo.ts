// Scratch git repositories for the worktree hook tests, and a runner of the hook script as a subprocess.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RUN = path.resolve(
  import.meta.dir,
  "../../../plugins/claudetto/slices/worktree/adapters/run.ts",
);

/** Runs `git` in `cwd` and gives the trimmed output. Throws on a failure. */
export const sh = (cwd: string, ...args: string[]): string => {
  const r = Bun.spawnSync(["git", ...args], { cwd });
  if (r.exitCode !== 0)
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString().trim();
};

/** A repository with one commit, a tracked file, `.gitignore` for `.env` and `cache/`, and `.worktreeinclude` for `.env`. */
export const makeRepo = async (): Promise<string> => {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "wt-hook-")),
  );
  sh(root, "init", "-q", "-b", "main");
  sh(root, "config", "user.email", "t@example.com");
  sh(root, "config", "user.name", "t");
  sh(root, "config", "commit.gpgsign", "false");
  await Bun.write(path.join(root, "a.txt"), "a\n");
  await Bun.write(
    path.join(root, ".gitignore"),
    ".env\ncache/\n.claude/worktrees/\n",
  );
  await Bun.write(path.join(root, ".worktreeinclude"), ".env\n");
  await Bun.write(path.join(root, ".env"), "SECRET=1\n");
  fs.mkdirSync(path.join(root, "cache"));
  await Bun.write(path.join(root, "cache", "x"), "x\n");
  sh(root, "add", "-A");
  sh(root, "commit", "-q", "-m", "first");
  return root;
};

/** Removes a scratch folder. */
export const drop = (dir: string): void =>
  fs.rmSync(dir, { recursive: true, force: true });

/** The home folder of the hook runs, so a hook never writes to the real home. */
export const home = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), "wt-home-")),
);

/** Runs the hook script with `payload` on stdin. */
export const hook = (mode: string, payload: unknown) => {
  const r = Bun.spawnSync(["bun", "--no-env-file", RUN, mode], {
    env: { ...process.env, HOME: home },
    stdin: Buffer.from(
      typeof payload === "string" ? payload : JSON.stringify(payload),
    ),
  });
  return {
    status: r.exitCode,
    out: r.stdout.toString().trim(),
    err: r.stderr.toString().trim(),
  };
};
