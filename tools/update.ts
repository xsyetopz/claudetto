// Refreshes the claudetto marketplace, then updates each plugin of `plugins/` that the user installed (`just update`).

import path from "node:path";
import { must, pluginDirs, recipe } from "./recipes.ts";
import { $claude } from "./telemetry.ts";

await recipe(async () => {
  await must($claude()`claude plugin marketplace update claudetto`);
  for (const dir of pluginDirs())
    await must(
      $claude()`claude plugin update ${`${path.basename(dir)}@claudetto`}`,
    );
});
