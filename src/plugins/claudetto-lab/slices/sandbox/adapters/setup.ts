import fs from "node:fs";
import path from "node:path";
import { SANDBOX_MARKER } from "../domain/clean.ts";
import { readJson } from "./json.ts";

export interface SandboxDirs {
  root: string;
  config: string;
  home: string;
  project: string;
}

interface ClaudeState {
  hasCompletedOnboarding?: boolean;
  theme?: string;
  projects?: Record<string, object>;
}

export const setUp = async ({
  root,
  config,
  home,
  project,
}: SandboxDirs): Promise<void> => {
  fs.mkdirSync(root, { recursive: true });
  await Bun.write(path.join(root, SANDBOX_MARKER), "");
  fs.mkdirSync(config, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  if (!fs.existsSync(path.join(project, ".git"))) {
    fs.mkdirSync(project, { recursive: true });
    if (Bun.which("git")) Bun.spawnSync(["git", "init", "-q", project]);
  }
  const state = path.join(config, ".claude.json");
  const json: ClaudeState = (await readJson<ClaudeState>(state)) ?? {};
  json.hasCompletedOnboarding = true;
  json.theme ??= "dark";
  json.projects ??= {};
  // macOS resolves `/tmp` and `/var` to `/private`, and the trust key is the resolved path.
  for (const dir of new Set([project, fs.realpathSync(project)]))
    json.projects[dir] = {
      ...json.projects[dir],
      hasTrustDialogAccepted: true,
    };
  await Bun.write(state, JSON.stringify(json, null, 2));
};

export const availableModels = async (
  config: string,
): Promise<string[] | undefined> =>
  (
    await readJson<{ availableModels?: string[] }>(
      path.join(config, "settings.json"),
    )
  )?.availableModels;

// Claude runs in the project, so a relative `--plugin-dir` would point into it and be skipped.
export const absolutePluginDirs = (
  args: string[],
  cwd: string = process.cwd(),
): string[] =>
  args.map((a, i) =>
    args[i - 1] === "--plugin-dir"
      ? path.resolve(cwd, a)
      : a.startsWith("--plugin-dir=")
        ? `--plugin-dir=${path.resolve(cwd, a.slice(13))}`
        : a,
  );
