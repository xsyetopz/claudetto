// The folders and the state file of the sandbox, and the `claude` executable.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { readJson } from "./json.mjs";

/** Creates `config/`, `home/`, and `project/` (a git repository) in `root`, and trusts the project. */
export function setUp({ config, home, project }) {
  fs.mkdirSync(config, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  if (!fs.existsSync(path.join(project, ".git"))) {
    fs.mkdirSync(project, { recursive: true });
    spawnSync("git", ["init", "-q", project]);
  }
  const state = path.join(config, ".claude.json");
  // A state file that is absent or damaged starts again from an empty object.
  const json = readJson(state) ?? {};
  json.hasCompletedOnboarding = true;
  json.theme ??= "dark";
  json.projects ??= {};
  // macOS resolves `/tmp` and `/var` to `/private`, and the trust key is the
  // resolved path.
  for (const dir of new Set([project, fs.realpathSync(project)]))
    json.projects[dir] = {
      ...json.projects[dir],
      hasTrustDialogAccepted: true,
    };
  fs.writeFileSync(state, JSON.stringify(json, null, 2));
}

/** The first executable `name` on `PATH`, or `undefined`. */
export function which(name) {
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
      : [""];
  for (const dir of (process.env.PATH || "").split(path.delimiter))
    for (const ext of exts) {
      const file = path.join(dir, name + ext);
      try {
        fs.accessSync(file, fs.constants.X_OK);
        if (fs.statSync(file).isFile()) return file;
      } catch (err) {
        // A folder of `PATH` with no such file, or a file that cannot run, is not the program.
        if (!["ENOENT", "ENOTDIR", "EACCES"].includes(err?.code)) throw err;
      }
    }
}

/** The `availableModels` list in `settings.json` of the folder `config`, or `undefined` when there is none. */
export function availableModels(config) {
  return readJson(path.join(config, "settings.json"))?.availableModels;
}

// claude runs with the project as its working directory, so a relative
// `--plugin-dir` would point into the project and Claude Code would skip it.
// Resolve each one against the working directory of the caller.
export function absolutePluginDirs(args, cwd = process.cwd()) {
  return args.map((a, i) =>
    args[i - 1] === "--plugin-dir"
      ? path.resolve(cwd, a)
      : a.startsWith("--plugin-dir=")
        ? `--plugin-dir=${path.resolve(cwd, a.slice(13))}`
        : a,
  );
}
