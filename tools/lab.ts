// The hook lab (`just lab`): `claude plugin test` on each plugin that has a `tests/` folder.
// The first plugin that fails stops the run with its exit code.

import { $claude } from "./telemetry.ts";
import { has, must, pluginDirs, recipe } from "./recipes.ts";

await recipe(async () => {
  for (const dir of pluginDirs().filter((d) => has(d, "tests")))
    await must($claude`claude plugin test ${dir}`);
});
