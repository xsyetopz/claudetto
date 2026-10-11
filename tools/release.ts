// Tags each plugin of `plugins/` at HEAD and pushes all tags in one atomic push (`just release`).
// With `--dry-run`, it prints the tags and stops.

import { $ } from "bun";
import { must, output, pluginDirs, recipe } from "./recipes.ts";

await recipe(async () => {
  const tags: string[] = [];
  for (const dir of pluginDirs()) {
    const out = await output($`claude plugin tag --dry-run ${dir}`);
    const tag = out.match(/^Tag:\s+(\S+)/m)?.[1];
    if (!tag) {
      console.error(
        `\`claude plugin tag --dry-run ${dir}\` printed no \`Tag:\` line.`,
      );
      process.exit(1);
    }
    tags.push(tag);
  }
  console.log(`Tags: ${tags.join(" ")}`);
  if (Bun.argv[2] === "--dry-run") return;
  for (const dir of pluginDirs()) await must($`claude plugin tag ${dir}`);
  await must($`git push --atomic origin ${tags.map((t) => `refs/tags/${t}`)}`);
});
