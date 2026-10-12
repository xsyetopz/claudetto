// Captures and measures the start of a clean sandbox session in one command.
//
//   bun src/plugins/dotclaude-lab/slices/sandbox/adapters/start-run.ts [--port 8787] [--dir DIR]
//
// 1. Removes the sandbox (`--dir DIR` names it, as for `dotclaude-sandbox`), so the session is clean.
// 2. Starts `dotclaude-capture` on the port, with its output in `$TMPDIR/dotclaude-capture`.
// 3. Starts `dotclaude-sandbox` through the proxy. Send one prompt, then type `/exit`.
// 4. Stops the proxy, and runs the `MEASURE` script on the transcript of the session.
// Exits with the exit code of the measure, so a start above `START_TOKENS` fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SANDBOX_TEMP } from "../../../../../kernel/paths.ts";

// This file sits six folders below the repository root.
const REPO = path.resolve(import.meta.dirname, "../../../../../..");
const args = process.argv.slice(2);
const port = args.includes("--port")
  ? (args[args.indexOf("--port") + 1] as string)
  : "8787";
const dir = args.includes("--dir")
  ? (args[args.indexOf("--dir") + 1] as string)
  : path.join(os.tmpdir(), SANDBOX_TEMP);
const root = path.resolve(dir);
const LAB = path.join(REPO, "plugins/dotclaude-lab/bin");
// The measure step. Change this one constant when the command moves.
const MEASURE = path.join(REPO, "tools/measure.ts");
const run = (
  script: string,
  rest: string[],
  opts: { env?: Record<string, string | undefined> } = {},
) =>
  Bun.spawnSync([process.execPath, "--no-env-file", script, ...rest], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    ...opts,
  });
// The sandbox loads each plugin of this checkout.
const pluginArgs = fs
  .readdirSync(path.join(REPO, "plugins"), { withFileTypes: true })
  .filter(
    (d) =>
      d.isDirectory() &&
      fs.existsSync(
        path.join(REPO, "plugins", d.name, ".claude-plugin/plugin.json"),
      ),
  )
  .flatMap((d) => ["--plugin-dir", path.join(REPO, "plugins", d.name)]);

run(path.join(LAB, "dotclaude-sandbox"), ["--dir", root, "--clean"]);

const proxy = Bun.spawn(
  [
    process.execPath,
    "--no-env-file",
    path.join(LAB, "dotclaude-capture"),
    "--port",
    port,
  ],
  { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
);
await new Promise((resolve) => setTimeout(resolve, 1500));
if (proxy.exitCode !== null) {
  console.error(`The capture proxy stopped with exit ${proxy.exitCode}.`);
  process.exit(1);
}

console.log("\nSend one prompt in the sandbox session, then type /exit.\n");
run(path.join(LAB, "dotclaude-sandbox"), ["--dir", root, ...pluginArgs], {
  env: {
    ...process.env,
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ENABLE_TOOL_SEARCH: "true",
  },
});
// The proxy sizes the first request after it forwards it, so give it time to finish.
await new Promise((resolve) => setTimeout(resolve, 5000));
proxy.kill();

const projects = path.join(root, "config", "projects");
const files = fs.existsSync(projects)
  ? fs.readdirSync(projects).flatMap((d) =>
      fs
        .readdirSync(path.join(projects, d))
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => path.join(projects, d, f)),
    )
  : [];
files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
if (!files[0]) {
  console.error(`No transcript in ${projects}. Send one prompt before /exit.`);
  process.exit(1);
}
process.exit(run(MEASURE, [files[0]]).exitCode ?? 1);
