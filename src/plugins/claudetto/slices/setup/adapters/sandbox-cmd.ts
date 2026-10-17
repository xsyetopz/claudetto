// The `sandbox` command of `claudetto-setup`: the hard stop of the AI policy in `.claude/settings.local.json`.
// It acts only in a checkout of a repository that the user does not own and whose verdict is not `allowed` or `conditions`.
// It merges the sandbox keys of `HARD_STOP`, keeps each other key, and writes a record of its changes to `.claudetto/sandbox-stop.json`.
// With `--remove`, it takes out only the changes of the record, in any checkout.
// Without `--apply`, it prints the changes and writes nothing.
// Before it writes the hard stop, it checks the programs that the sandbox needs on this platform (`domain/prereqs.ts`).
// When one is missing, or the platform has no sandbox, it writes nothing, because `failIfUnavailable` then stops Claude Code at startup.
// On Linux and WSL2 it also checks the seccomp filter helper, `sandbox.network.allowAllUnixSockets`, and a test run of the `bwrap` that Claude Code uses (`adapters/linux-ready.ts`).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
import {
  PROJECT_SETTINGS,
  SANDBOX_STOP_RECORD,
  SETTINGS_FILE,
} from "../../../../../kernel/paths.ts";
import { keyOf } from "../../../../../kernel/repo/remote.ts";
import {
  bypassesOf,
  planStop,
  recordOf,
  removeStop,
  type StopRecord,
  stopCaseOf,
} from "../domain/hard-stop.ts";
import {
  type LinuxSettings,
  linuxSettingsOf,
} from "../domain/linux-sandbox.ts";
import {
  type Host,
  sandboxToolsOf,
  type ToolsCase,
} from "../domain/prereqs.ts";
import type { Change } from "../domain/types.ts";
import {
  DRY_RUN,
  SANDBOX_BYPASS,
  SANDBOX_CLEARED,
  SANDBOX_COSTS,
  SANDBOX_INSTALL,
  SANDBOX_INSTALL_UNKNOWN,
  SANDBOX_MATCH,
  SANDBOX_NO_ORIGIN,
  SANDBOX_NO_RECORD,
  SANDBOX_OWN,
  SANDBOX_PLATFORM,
  SANDBOX_STOP,
  SANDBOX_TOOLS_MISSING,
  SANDBOX_WROTE,
  SANDBOX_WSL1,
  SETTINGS_FAILED,
} from "../prompts.ts";
import { originOf, ownersOf, verdictOf } from "./checkout.ts";
import { type Places, readOptional, settingsFile } from "./files.ts";
import type { Io } from "./io.ts";
import {
  type LinuxProbe,
  linuxReady,
  programOn,
  thisProbe,
} from "./linux-ready.ts";

/** The parsed JSON of `file`, or `undefined` when it is missing. Throws on text that is not JSON. */
const readJson = async (file: string): Promise<unknown> =>
  fs.existsSync(file)
    ? (JSON.parse(await Bun.file(file).text()) ?? undefined)
    : undefined;

/** Writes `data` to `file` as JSON, and makes its folder first. */
const writeJson = async (file: string, data: unknown): Promise<void> => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, `${JSON.stringify(data, null, 2)}\n`);
};

/** The platform of this computer. */
const thisHost = (): Host => ({
  platform: process.platform,
  release: os.release(),
});

/** Prints why the sandbox cannot start on `host`, with the install command for a missing program. Gives `false` then. */
const toolsReady = async (
  host: Host,
  env: NodeJS.ProcessEnv,
  io: Io,
  cfg: LinuxSettings,
  probe: LinuxProbe,
): Promise<boolean> => {
  const tools: ToolsCase = sandboxToolsOf(host, programOn(env, cfg));
  if (tools.kind === "ready")
    return host.platform !== "linux" || linuxReady(cfg, env, io, probe);
  if (tools.kind === "unsupported") {
    if (tools.why === "wsl1") io.log(SANDBOX_WSL1);
    else io.log(SANDBOX_PLATFORM({ platform: host.platform }));
    return false;
  }
  const programs = tools.programs.map((p) => `\`${p}\``).join(", ");
  io.log(SANDBOX_TOOLS_MISSING({ programs }));
  io.log(
    tools.install === undefined
      ? SANDBOX_INSTALL_UNKNOWN
      : SANDBOX_INSTALL({ command: tools.install }),
  );
  return false;
};

/** Prints the change lines, and writes the files when `apply` is set. Gives the exit status. */
const finish = async (
  changes: Change[],
  apply: boolean,
  write: () => Promise<void>,
  file: string,
  io: Io,
): Promise<number> => {
  io.log(`${changes.length} change(s):`);
  for (const { line } of changes) io.log(`  ${line}`);
  if (!apply) {
    io.log(`\n${DRY_RUN}`);
    return 0;
  }
  await write();
  io.log(`\n${SANDBOX_WROTE({ file })}`);
  return 0;
};

/**
 * Run the `sandbox` command and return the exit status.
 * `host` is the platform for the prerequisite check, and `probe` is what the Linux checks ask the system.
 * A test gives another one of each.
 */
export const sandboxCommand = async (
  { apply, remove }: { apply: boolean; remove: boolean },
  { configDir, projectDir }: Places,
  env: NodeJS.ProcessEnv,
  io: Io,
  host: Host = thisHost(),
  probe: LinuxProbe = thisProbe(),
): Promise<number> => {
  const file = settingsFile("local", configDir, projectDir) ?? "";
  const recordFile = path.join(projectDir, SANDBOX_STOP_RECORD);
  let current: unknown;
  let record: StopRecord | undefined;
  try {
    current = await readJson(file);
    record = recordOf(await readJson(recordFile));
  } catch (err) {
    io.error(SETTINGS_FAILED({ file, message: (err as Error).message }));
    return 1;
  }
  io.log(`Target: ${file}`);
  if (remove) {
    if (record === undefined) {
      io.log(SANDBOX_NO_RECORD({ record: recordFile }));
      return 0;
    }
    const plan = removeStop(current, record);
    return finish(
      plan.changes,
      apply,
      async () => {
        if (plan.changes.length) await writeJson(file, plan.settings);
        fs.rmSync(recordFile, { force: true });
      },
      file,
      io,
    );
  }
  const repo = originOf(projectDir, env);
  const owners =
    repo === undefined ? new Set<string>() : ownersOf(projectDir, env);
  const verdict = repo === undefined ? undefined : await verdictOf(repo, env);
  const shown = { repo: repo ? keyOf(repo) : "", verdict: verdict ?? "none" };
  const stopCase = stopCaseOf(repo, owners, verdict);
  if (stopCase === "no-origin") io.log(SANDBOX_NO_ORIGIN({ dir: projectDir }));
  if (stopCase === "own") io.log(SANDBOX_OWN(shown));
  if (stopCase === "cleared") io.log(SANDBOX_CLEARED(shown));
  if (stopCase !== "stop") return 0;
  io.log(SANDBOX_STOP(shown));
  const user = await readOptional(path.join(configDir, SETTINGS_FILE));
  const shared = await readOptional(path.join(projectDir, PROJECT_SETTINGS));
  const cfg = linuxSettingsOf([
    { file: path.join(configDir, SETTINGS_FILE), settings: user },
    { file: path.join(projectDir, PROJECT_SETTINGS), settings: shared },
    { file, settings: current },
  ]);
  if (!(await toolsReady(host, env, io, cfg, probe))) return 1;
  io.log(SANDBOX_COSTS);
  const bypasses = bypassesOf([user, shared, current]);
  if (bypasses.length)
    io.log(
      SANDBOX_BYPASS({ commands: bypasses.map((c) => `\`${c}\``).join(", ") }),
    );
  const plan = planStop(current, record);
  if (!plan.changes.length) {
    io.log(SANDBOX_MATCH({ file }));
    return 0;
  }
  return finish(
    plan.changes,
    apply,
    async () => {
      await writeJson(recordFile, plan.record);
      await writeJson(file, plan.settings);
    },
    file,
    io,
  );
};
