import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanRefusal } from "../domain/clean.ts";
import { report } from "../domain/frontmatter.ts";
import {
  MISSING_PLUGIN_DIR,
  MODEL_NOT_ALLOWED,
  NOTHING_TO_REMOVE,
  REFUSE_SYMLINK,
  USAGE,
} from "../prompts.ts";
import { cleanEnv, loginToken } from "./login.ts";
import { absolutePluginDirs, availableModels, setUp } from "./setup.ts";

/** The name of the scratch folder of `claudetto-sandbox` in the temp folder. */
const SANDBOX_TEMP = "claudetto-sandbox";

// A folder without the write bit keeps its files, so `rmSync` cannot remove them.
const makeWritable = (dir: string): void => {
  fs.chmodSync(dir, fs.statSync(dir).mode | 0o700);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }))
    if (entry.isDirectory()) makeWritable(path.join(dir, entry.name));
};

/** Removes the sandbox folder `root`, and returns the exit code. */
const cleanRoot = (root: string): number => {
  const rootStat = fs.lstatSync(root, { throwIfNoEntry: false });
  if (!rootStat) {
    console.log(NOTHING_TO_REMOVE({ root }));
    return 0;
  }
  // A symlink would make `makeWritable` act on the folder it points to.
  if (rootStat.isSymbolicLink()) {
    console.error(REFUSE_SYMLINK({ root }));
    return 1;
  }
  const isDefault = root === path.resolve(os.tmpdir(), SANDBOX_TEMP);
  const refusal = cleanRefusal(root, fs.readdirSync(root), isDefault);
  if (refusal) {
    console.error(refusal);
    return 1;
  }
  makeWritable(root);
  fs.rmSync(root, { recursive: true, force: true });
  console.log(`Removed ${root}`);
  return 0;
};

/** The env of the child: the login token is read with the real HOME, and only the child gets the sandbox HOME. */
const childEnv = async (
  config: string,
  home: string,
): Promise<NodeJS.ProcessEnv> => {
  const env: NodeJS.ProcessEnv = {
    ...(await cleanEnv()),
    CLAUDE_CONFIG_DIR: config,
    HOME: home,
  };
  delete env["ZDOTDIR"];
  delete env["XDG_CONFIG_HOME"];
  // The token is not written to disk or printed.
  const token = await loginToken();
  if (token) env["CLAUDE_CODE_OAUTH_TOKEN"] = token;
  else console.error("No login token found. Run /login inside the sandbox.");
  return env;
};

/** The count of `--plugin-dir` folders of `rest`, or null (after it prints why) when one holds no plugin manifest. */
const checkPluginDirs = (rest: string[]): number | null => {
  const dirs = rest.flatMap((a, i) =>
    rest[i - 1] === "--plugin-dir"
      ? [a]
      : a.startsWith("--plugin-dir=")
        ? [a.slice(13)]
        : [],
  );
  const missing = dirs.filter(
    (dir) => !fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json")),
  );
  for (const dir of missing) console.error(MISSING_PLUGIN_DIR({ dir }));
  return missing.length > 0 ? null : dirs.length;
};

// Claude Code gives no error for a `--model` that `availableModels` leaves out, so the run would serve another model than the arm. Returns true when it would.
const modelDiffers = async (
  rest: string[],
  config: string,
): Promise<boolean> => {
  const model = rest.includes("--model")
    ? rest[rest.indexOf("--model") + 1]
    : "";
  const allowed = model ? await availableModels(config) : undefined;
  if (
    Array.isArray(allowed) &&
    model?.startsWith("claude-") &&
    !allowed.includes(model)
  ) {
    console.error(MODEL_NOT_ALLOWED({ model, allowed: allowed.join(", ") }));
    return true;
  }
  return false;
};

/** The exit code of a `--check-frontmatter` session, from its exit and its debug log. */
const frontmatterResult = async (
  exitCode: number,
  log: string | null,
  plugins: number,
): Promise<number> => {
  if (exitCode !== 0) {
    console.error(`The sandbox session failed with exit ${exitCode}.`);
    return 1;
  }
  if (!log || !fs.existsSync(log)) {
    console.error(`The session wrote no debug log at ${log}.`);
    return 1;
  }
  const { lines, code } = report(log, await Bun.file(log).text(), plugins);
  for (const l of lines) console.log(l);
  return code;
};

/** The arguments of a `--check-frontmatter` session, and its debug log: one headless session that writes the log. */
const frontmatterRun = (rest: string[]): { rest: string[]; log: string } => {
  const log = path.join(
    fs.mkdtempSync(
      path.join(process.env["TMPDIR"] || os.tmpdir(), "sandbox-frontmatter-"),
    ),
    "debug.txt",
  );
  return {
    rest: [
      ...rest.filter((a) => a !== "--check-frontmatter"),
      "--debug-file",
      log,
      "-p",
      "Reply with OK.",
    ],
    log,
  };
};

export const main = async (argv: string[]): Promise<number> => {
  const args = [...argv];
  const dirAt = args.indexOf("--dir");
  const next = args[dirAt + 1];
  if (dirAt !== -1) {
    if (!next || next.startsWith("--")) {
      console.error("--dir needs a directory, not a flag.");
      return 1;
    }
    args.splice(dirAt, 2);
  }
  const root = path.resolve(
    dirAt === -1 ? path.join(os.tmpdir(), SANDBOX_TEMP) : (next as string),
  );
  const config = path.join(root, "config");
  const project = path.join(root, "project");
  const home = path.join(root, "home");

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(USAGE);
    return 0;
  }
  if (args[0] === "--clean") return cleanRoot(root);

  let rest = absolutePluginDirs(args);
  const plugins = checkPluginDirs(rest);
  if (plugins === null) return 1;

  const check = rest.includes("--check-frontmatter");
  let log: string | null = null;
  if (check) ({ rest, log } = frontmatterRun(rest));

  await setUp({ root, config, home, project });
  const claude = Bun.which("claude");
  if (!claude) {
    console.error("claude is not on PATH. Put the claude executable on PATH.");
    return 1;
  }
  const env = await childEnv(config, home);
  if (await modelDiffers(rest, config)) return 1;
  // Managed settings can lock a plugin name, and then Claude Code ignores its `--plugin-dir` copy.
  const { exitCode } = Bun.spawnSync([claude, ...rest], {
    cwd: project,
    env,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (!check) return exitCode ?? 1;
  return frontmatterResult(exitCode ?? 1, log, plugins);
};
