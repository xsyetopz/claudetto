// Runs `claudetto-sandbox` with a `--plugin-dir` for each plugin of this checkout (`just sandbox` and `just debug-agents`).
// The arguments of this script go to `claudetto-sandbox` before the plugin folders.

import path from "node:path";
import { has, pluginDirs, REPO } from "../recipes.ts";

const dirs = pluginDirs()
  .filter((dir) => has(dir, ".claude-plugin", "plugin.json"))
  .flatMap((dir) => ["--plugin-dir", dir]);
const bin = path.join("tools", "sandbox", "main.ts");
// The sandbox session is interactive, so it gets the terminal of this process.
const child = Bun.spawn(["bun", bin, ...Bun.argv.slice(2), ...dirs], {
  cwd: REPO,
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(await child.exited);
