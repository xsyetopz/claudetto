// Tags each plugin of `plugins/` at HEAD and pushes all tags in one atomic push (`just release`).
// Before the first tag, it checks the tree, the generated files, and the tag names, and it stops when one fails.
// If a tag step or the push fails, it deletes the tags that it made.
// With `--dry-run`, it prints the tags and stops.

import { $ } from "bun";
import { $claude } from "./telemetry.ts";
import { makeTags, type Plan, preflight } from "./preflight.ts";
import { must, output, pluginDirs, REPO, recipe } from "./recipes.ts";

/** True when `bun tools/generate/index.ts --check` (`just generate --check`) passes. */
const generatedOk = async (): Promise<boolean> =>
  (await $`bun tools/generate/index.ts --check`.cwd(REPO).nothrow())
    .exitCode === 0;

await recipe(async () => {
  const plans: Plan[] = [];
  for (const dir of pluginDirs()) {
    const out = await output($claude`claude plugin tag --dry-run ${dir}`);
    const tag = out.match(/^Tag:\s+(\S+)/m)?.[1];
    if (!tag) {
      console.error(
        `\`claude plugin tag --dry-run ${dir}\` printed no \`Tag:\` line.`,
      );
      process.exit(1);
    }
    plans.push({ dir, tag });
  }
  const tags = plans.map((plan) => plan.tag);
  const problems = await preflight({ root: REPO, tags, generatedOk });
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log(`Tags: ${tags.join(" ")}`);
  if (Bun.argv[2] === "--dry-run") return;
  await makeTags(
    REPO,
    plans,
    async (dir) => {
      await must($claude`claude plugin tag ${dir}`);
    },
    async () => {
      await must(
        $`git push --atomic origin ${tags.map((t) => `refs/tags/${t}`)}`,
      );
    },
  );
});
