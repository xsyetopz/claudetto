import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleanRefusal } from "../domain/clean.ts";
import { report } from "../domain/frontmatter.ts";
import {
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
  if (args[0] === "--clean") {
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
    const entries = fs.readdirSync(root);
    const refusal = cleanRefusal(root, entries, isDefault);
    if (refusal) {
      console.error(refusal);
      return 1;
    }
    makeWritable(root);
    fs.rmSync(root, { recursive: true, force: true });
    console.log(`Removed ${root}`);
    return 0;
  }

  let rest = absolutePluginDirs(args);

  const check = rest.includes("--check-frontmatter");
  let log: string | null = null;
  if (check) {
    log = path.join(
      fs.mkdtempSync(
        path.join(process.env["TMPDIR"] || os.tmpdir(), "sandbox-frontmatter-"),
      ),
      "debug.txt",
    );
    rest = [
      ...rest.filter((a) => a !== "--check-frontmatter"),
      "--debug-file",
      log,
      "-p",
      "Reply with OK.",
    ];
  }

  await setUp({ root, config, home, project });
  const claude = Bun.which("claude");
  if (!claude) {
    console.error("claude is not on PATH. Put the claude executable on PATH.");
    return 1;
  }
  // The token is read with the real HOME, and only the child gets the sandbox HOME.
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
  // Claude Code gives no error for a `--model` that `availableModels` leaves out.
  const model = rest.includes("--model")
    ? rest[rest.indexOf("--model") + 1]
    : "";
  const allowed = model ? await availableModels(config) : undefined;
  if (
    Array.isArray(allowed) &&
    model?.startsWith("claude-") &&
    !allowed.includes(model)
  )
    console.error(MODEL_NOT_ALLOWED({ model, allowed: allowed.join(", ") }));
  // Managed settings can lock a plugin name, and then Claude Code ignores its `--plugin-dir` copy.
  const { exitCode } = Bun.spawnSync([claude, ...rest], {
    cwd: project,
    env,
    stdio: ["inherit", "inherit", "inherit"],
  });
  if (!check) return exitCode ?? 1;
  if (exitCode !== 0) {
    console.error(`The sandbox session failed with exit ${exitCode}.`);
    return 1;
  }
  if (!log || !fs.existsSync(log)) {
    console.error(`The session wrote no debug log at ${log}.`);
    return 1;
  }
  const { lines, code } = report(log, await Bun.file(log).text());
  for (const l of lines) console.log(l);
  return code;
};
