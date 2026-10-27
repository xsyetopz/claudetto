// Runs `claudetto-sandbox` with a `--plugin-dir` for each plugin of this checkout (`just sandbox` and `just debug-agents`).
// The arguments of this script go to `claudetto-sandbox` before the plugin folders.

import path from "node:path";
import { argv, spawn } from "bun";
import { pluginDirsWith, REPO } from "../../tools/recipes.ts";

const dirs = (await pluginDirsWith(".claude-plugin", "plugin.json")).flatMap(
	(dir) => ["--plugin-dir", dir],
);
const bin = path.join("dev", "sandbox", "main.ts");
// The sandbox session is interactive, so it gets the terminal of this process.
const child = spawn(["bun", bin, ...argv.slice(2), ...dirs], {
	cwd: REPO,
	stdio: ["inherit", "inherit", "inherit"],
});
process.exitCode = await child.exited;
