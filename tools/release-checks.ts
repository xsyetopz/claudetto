// The checks that `tools/release.ts` runs before it makes its first tag, and the rollback of its tags.
// None of these functions tags or pushes, except `makeTags`, which deletes only the tags that it finds.

import { $ } from "bun";

/** One plugin folder and the tag that `claude plugin tag --dry-run` names for it. */
export type Plan = { dir: string; tag: string };

/** True when the repository at `root` has the local tag `tag`. */
export const tagExists = async (
  root: string,
  tag: string,
): Promise<boolean> => {
  const r = await $`git rev-parse -q --verify ${`refs/tags/${tag}`}`
    .cwd(root)
    .quiet()
    .nothrow();
  return r.exitCode === 0;
};

/**
 * The problems that stop a release before its first tag, one message each.
 * An empty list means that the release may make its tags.
 * `generatedOk` tells whether the generated files match their sources.
 */
export const preflight = async (opts: {
  root: string;
  tags: string[];
  generatedOk: () => Promise<boolean>;
}): Promise<string[]> => {
  const problems: string[] = [];
  const status = await $`git status --porcelain`
    .cwd(opts.root)
    .quiet()
    .nothrow();
  if (status.exitCode !== 0) {
    problems.push("`git status` failed, so the working tree is not known.");
  } else if (status.stdout.toString().trim() !== "") {
    problems.push(
      "The working tree has changes. Commit or remove them before a release.",
    );
  }
  if (!(await opts.generatedOk())) {
    problems.push(
      "The generated files differ from their sources. Run `just generate`, commit the result, and run the release again.",
    );
  }
  for (const tag of opts.tags) {
    if (await tagExists(opts.root, tag))
      problems.push(
        `The tag \`${tag}\` already exists. Delete it, or change the version, before a release.`,
      );
  }
  return problems;
};

/**
 * Makes the tag of each plan with `tagDir`, in order.
 * When a step fails, it deletes the tags of `plans` that exist now, because the
 * preflight showed that none of them existed before this run, and it fails too.
 */
export const makeTags = async (
  root: string,
  plans: Plan[],
  tagDir: (dir: string) => Promise<void>,
): Promise<void> => {
  try {
    for (const { dir } of plans) await tagDir(dir);
  } catch (err) {
    for (const { tag } of plans) {
      if (await tagExists(root, tag))
        await $`git tag -d ${tag}`.cwd(root).quiet().nothrow();
    }
    throw err;
  }
};
