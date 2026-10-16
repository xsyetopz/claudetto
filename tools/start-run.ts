// Captures and measures the start of a clean sandbox session in one command.
//
//   bun tools/start-run.ts [--port 8787] [--dir DIR]
//
// 1. Removes the sandbox (`--dir DIR` names it, as for `claudetto-sandbox`), so the session is clean.
// 2. Starts `claudetto-capture` on the port, with its output in `$TMPDIR/claudetto-capture`.
// 3. Starts `claudetto-sandbox` through the proxy. Send one prompt, then type `/exit`.
// 4. Stops the proxy, and runs the `MEASURE` script on the transcript of the session.
// Exits with the exit code of the measure, so a start above `START_TOKENS` fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SANDBOX_TEMP } from "../src/kernel/temp-paths.ts";
import { has, pluginDirs, REPO } from "./recipes.ts";

const USAGE = "Usage: bun tools/start-run.ts [--port PORT] [--dir DIR]";

// Gives the port and the sandbox folder, or null when an argument is not known or has no value.
export const startRunArgs = (
  args: string[],
): { port: string; root: string } | null => {
  const opts: Record<string, string> = {
    "--port": "8787",
    "--dir": path.join(os.tmpdir(), SANDBOX_TEMP),
  };
  for (let i = 0; i < args.length; i += 2) {
    const [key, value] = [args[i] as string, args[i + 1]];
    if (!(key in opts) || value === undefined || value.startsWith("--"))
      return null;
    opts[key] = value;
  }
  return {
    port: opts["--port"] as string,
    root: path.resolve(opts["--dir"] as string),
  };
};

// Gives the newest `.jsonl` transcript under the `projects` folder of the sandbox config, or null.
export const latestTranscript = (projects: string): string | null => {
  if (!fs.existsSync(projects)) return null;
  const files = fs.readdirSync(projects).flatMap((d) =>
    fs
      .readdirSync(path.join(projects, d))
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(projects, d, f)),
  );
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] ?? null;
};

const LAB = path.join(REPO, "plugins/claudetto-lab/bin");
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

const main = async (port: string, root: string): Promise<number> => {
  // The sandbox loads each plugin of this checkout.
  const pluginArgs = pluginDirs()
    .filter((dir) => has(dir, ".claude-plugin", "plugin.json"))
    .flatMap((dir) => ["--plugin-dir", dir]);

  // A folder that the sandbox did not make is refused, and the session would not be clean.
  if (
    run(path.join(LAB, "claudetto-sandbox"), ["--dir", root, "--clean"])
      .exitCode !== 0
  )
    return 1;

  const proxy = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      path.join(LAB, "claudetto-capture"),
      "--port",
      port,
    ],
    { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
  );
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (proxy.exitCode !== null) {
    console.error(`The capture proxy stopped with exit ${proxy.exitCode}.`);
    return 1;
  }

  console.log("\nSend one prompt in the sandbox session, then type /exit.\n");
  run(path.join(LAB, "claudetto-sandbox"), ["--dir", root, ...pluginArgs], {
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
  const transcript = latestTranscript(projects);
  if (!transcript) {
    console.error(
      `No transcript in ${projects}. Send one prompt before /exit.`,
    );
    return 1;
  }
  return run(MEASURE, [transcript]).exitCode ?? 1;
};

if (import.meta.main) {
  const parsed = startRunArgs(process.argv.slice(2));
  if (!parsed) {
    console.error(USAGE);
    process.exit(2);
  }
  process.exit(await main(parsed.port, parsed.root));
}
