// `events.jsonl`: two appends on two branches merge with no conflict, through `merge=union` of `.gitattributes`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { read, run } from "./helpers.ts";
import { CHANGE, makePlan } from "./plan.ts";

const git = (cwd: string, ...args: string[]): void => {
  const r = Bun.spawnSync(
    ["git", "-c", "user.name=t", "-c", "user.email=t@t", ...args],
    { cwd },
  );
  if (r.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  }
};

test("two appends on two branches merge with no conflict and keep both lines", async () => {
  const root = await makePlan([{ id: "P01" }, { id: "P02" }]);
  fs.copyFileSync(
    path.join(import.meta.dir, "../../../../.gitattributes"),
    path.join(root, ".gitattributes"),
  );
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");

  git(root, "checkout", "-q", "-b", "side");
  expect((await run(root, "lane", "P02", "doing")).code).toBe(0);
  git(root, "commit", "-q", "-am", "side");

  git(root, "checkout", "-q", "main");
  expect((await run(root, "lane", "P01", "doing")).code).toBe(0);
  git(root, "commit", "-q", "-am", "main");

  git(root, "merge", "-q", "--no-edit", "side");
  const lines = (await read(root, `${CHANGE}/events.jsonl`))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { package: string; lane: string });
  const doing = lines.filter((l) => l.lane === "doing").map((l) => l.package);
  expect(doing.sort()).toStrictEqual(["P01", "P02"]);
  expect((await run(root, "status", "c1")).out).toContain("● P02 doing");
});
