// Refreshes the dotclaude marketplace, then updates each plugin of `plugins/` that the user installed (`just update`).

import path from "node:path";
import { $ } from "bun";
import { must, pluginDirs, recipe } from "./recipes.ts";

await recipe(async () => {
  await must($`claude plugin marketplace update dotclaude`);
  for (const dir of pluginDirs())
    await must($`claude plugin update ${`${path.basename(dir)}@dotclaude`}`);
});
