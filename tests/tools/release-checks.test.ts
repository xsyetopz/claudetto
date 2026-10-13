// Behavior of the checks that `tools/release.ts` runs before its first tag, and of the rollback of its tags, in a temporary git repository.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { $ } from "bun";
import {
  makeTags,
  type Plan,
  preflight,
  tagExists,
} from "../../tools/release-checks.ts";
import { tmpDir } from "../support/repo.ts";

const committedRepo = async (): Promise<string> => {
  const root = tmpDir("release-checks");
  await $`git init -q`.cwd(root);
  fs.writeFileSync(path.join(root, "a.txt"), "a\n");
  await $`git add a.txt`.cwd(root);
  await $`git -c user.name=t -c user.email=t@example.com -c commit.gpgsign=false commit -qm init`.cwd(
    root,
  );
  return root;
};

const passes = async () => true;
const fails = async () => false;

test("a clean repository with no tag of the release and matching generated files passes", async () => {
  const root = await committedRepo();
  expect(
    await preflight({ root, tags: ["v1-a"], generatedOk: passes }),
  ).toStrictEqual([]);
});

test("an uncommitted change stops the preflight", async () => {
  const root = await committedRepo();
  fs.writeFileSync(path.join(root, "a.txt"), "changed\n");
  const problems = await preflight({
    root,
    tags: ["v1-a"],
    generatedOk: passes,
  });
  expect(problems).toHaveLength(1);
});

test("an untracked file stops the preflight", async () => {
  const root = await committedRepo();
  fs.writeFileSync(path.join(root, "new.txt"), "new\n");
  const problems = await preflight({
    root,
    tags: ["v1-a"],
    generatedOk: passes,
  });
  expect(problems).toHaveLength(1);
});

test("generated files that differ from their sources stop the preflight", async () => {
  const root = await committedRepo();
  const problems = await preflight({
    root,
    tags: ["v1-a"],
    generatedOk: fails,
  });
  expect(problems).toHaveLength(1);
});

test("a tag of the release that already exists stops the preflight", async () => {
  const root = await committedRepo();
  await $`git -c tag.gpgsign=false tag v1-a`.cwd(root);
  const problems = await preflight({
    root,
    tags: ["v1-a", "v1-b"],
    generatedOk: passes,
  });
  expect(problems).toHaveLength(1);
});

test("a failed tag step deletes the tags that the run made, and then fails", async () => {
  const root = await committedRepo();
  const plans: Plan[] = [
    { dir: "plugins/a", tag: "t-a" },
    { dir: "plugins/b", tag: "t-b" },
  ];
  const tagDir = async (dir: string) => {
    if (dir === "plugins/b") throw new Error("tag step failed");
    await $`git -c tag.gpgsign=false tag t-a`.cwd(root);
  };
  await expect(makeTags(root, plans, tagDir)).rejects.toThrow(
    "tag step failed",
  );
  expect(await tagExists(root, "t-a")).toBe(false);
  expect(await tagExists(root, "t-b")).toBe(false);
});

test("a release whose tag steps all succeed keeps its tags", async () => {
  const root = await committedRepo();
  const plans: Plan[] = [
    { dir: "plugins/a", tag: "t-a" },
    { dir: "plugins/b", tag: "t-b" },
  ];
  const tagDir = async (dir: string) => {
    await $`git -c tag.gpgsign=false tag ${dir === "plugins/a" ? "t-a" : "t-b"}`.cwd(
      root,
    );
  };
  await makeTags(root, plans, tagDir);
  expect(await tagExists(root, "t-a")).toBe(true);
  expect(await tagExists(root, "t-b")).toBe(true);
});
