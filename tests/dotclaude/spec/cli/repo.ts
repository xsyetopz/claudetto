// Helpers of the `merge` tests: a git repository with a plan, a generator, and a branch.

import path from "node:path";
import { read } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

export const git = (cwd: string, ...args: string[]): string => {
  const r = Bun.spawnSync(
    ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
    { cwd },
  );
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  }
  return r.stdout.toString().trim();
};

export const JUSTFILE =
  "generate:\n    mkdir -p plugins\n    cp src.txt plugins/out.txt\n";

/** A git repository on `main` with the plan `c1`, a generator, and one commit. */
export const makeRepo = async (justfile = JUSTFILE): Promise<string> => {
  const root = await makePlan(
    [{ id: "P01", lane: "review" }, { id: "P02" }, { id: "P03", lane: "done" }],
    {
      justfile,
      "src.txt": "base\n",
      "shared.txt": "base\n",
      "plugins/out.txt": "base\n",
    },
  );
  git(root, "init", "-q", "-b", "main");
  // A runner can set `core.autocrlf`, and then a merge writes CRLF into the files.
  // The tests compare the bytes, so the repository keeps the line endings as written.
  git(root, "config", "core.autocrlf", "false");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  return root;
};

/** A branch `name` with one commit that writes `text` to `file`; the checkout returns to `main`. */
export const branch = async (
  root: string,
  name: string,
  file: string,
  text: string,
): Promise<void> => {
  git(root, "checkout", "-q", "-b", name);
  await Bun.write(path.join(root, file), text);
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", name);
  git(root, "checkout", "-q", "main");
};

export const lanesOf = async (
  root: string,
): Promise<Record<string, string>> => {
  const [, ...lines] = (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n");
  return Object.fromEntries(
    lines
      .map((l) => JSON.parse(l) as { package: string; lane: string })
      .map((e) => [e.package, e.lane]),
  );
};
