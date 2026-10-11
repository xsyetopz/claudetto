// The OpenSpec steps of setup.
// `planOpenSpec` only reads.
// `runOpenSpec` writes, and `setupOpenSpec` calls it only with `--apply`, after the user agrees.
// OpenSpec 1.14.1 has no `--delivery` flag on `init`, so the order is `init`, `config set delivery skills`, `update`.
// `update` then removes the command copies and keeps the skills (probe 2.15).

import fs from "node:fs";
import path from "node:path";
import { runProgram } from "../../lib/run-program.ts";
import type { Step } from "./types.ts";

const CONFIG = ["openspec", "config"];

/** The lowest OpenSpec version that the dotclaude docs describe. */
export const OPENSPEC_MIN = "1.14.0";

/** True when version text `a` is lower than `b`. */
const olderThan = (a: string, b: string) =>
  String(a).localeCompare(b, "en", { numeric: true }) < 0;

/** Run `cmd`, and return its trimmed output, or null when it fails or is missing. */
const run = (cmd: string[]) => {
  // `Bun.spawnSync` throws when the program is missing, and the caller treats that as a failure.
  let r: ReturnType<typeof runProgram>;
  try {
    r = runProgram(cmd[0] as string, cmd.slice(1), {
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
    });
  } catch {
    return null;
  }
  return r.exitCode === 0 ? (r.stdout as Buffer).toString().trim() : null;
};

/** Print the OpenSpec state of the computer and of `projectDir`. */
export function reportOpenSpec(projectDir: string): void {
  const openspec = run(["openspec", "--version"]);
  const node = run(["node", "--version"])?.replace(/^v/, "");
  console.log("OpenSpec:");
  if (!openspec) console.log("  openspec: not found");
  else if (olderThan(openspec, OPENSPEC_MIN))
    console.log(`  openspec: ${openspec}, older than ${OPENSPEC_MIN}`);
  else console.log(`  openspec: ${openspec}`);
  console.log(
    `  node: ${node ?? "not found"}${node && olderThan(node, "20.19.0") ? ", older than 20.19.0" : ""}`,
  );
  console.log(
    `  project: ${fs.existsSync(path.join(projectDir, "openspec")) ? "initialized" : "not initialized"} (${projectDir})`,
  );
}

/** True when `dir` holds a file. `openspec update` leaves the empty folder. */
const hasFiles = (dir: string) =>
  fs.existsSync(dir) && fs.readdirSync(dir).length > 0;

/** The steps that bring `projectDir` to skills-only delivery with telemetry off. Empty when `openspec` is missing or old. */
export function planOpenSpec(projectDir: string): Step[] {
  const version = run(["openspec", "--version"]);
  if (!version || olderThan(version, OPENSPEC_MIN)) return [];
  const steps = [];
  if (run([...CONFIG, "get", "telemetry.enabled"]) !== "false")
    steps.push({
      label: "turn telemetry off",
      cmd: [...CONFIG, "set", "telemetry.enabled", "false"],
    });
  const init = !fs.existsSync(path.join(projectDir, "openspec"));
  if (init)
    steps.push({
      label: "initialize the project",
      cmd: ["openspec", "init", "--tools", "claude", "--no-animation"],
    });
  const delivery = run([...CONFIG, "get", "delivery"]) !== "skills";
  if (delivery)
    steps.push({
      label: "deliver the workflows as skills only",
      cmd: [...CONFIG, "set", "delivery", "skills"],
    });
  const copies = hasFiles(path.join(projectDir, ".claude/commands/opsx"));
  if (init || delivery || copies)
    steps.push({
      label: "remove the command copies of the skills",
      cmd: ["openspec", "update"],
    });
  return steps;
}

/** Print the steps of `planOpenSpec`. */
export function reportOpenSpecSteps(steps: Step[]): void {
  if (!steps.length) return;
  console.log("\nOpenSpec steps. To run them, add --apply:");
  for (const s of steps) console.log(`  ${s.label}: ${s.cmd.join(" ")}`);
}

/** Run `steps` in `projectDir` in order, and stop at the first failure. Return true when all pass. */
export function runOpenSpec(steps: Step[], projectDir: string): boolean {
  for (const s of steps) {
    console.log(`OpenSpec: ${s.cmd.join(" ")}`);
    let r: { exitCode: number | null };
    try {
      r = runProgram(s.cmd[0] as string, s.cmd.slice(1), {
        cwd: projectDir,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });
    } catch (err) {
      console.error((err as Error).message);
      r = { exitCode: 1 };
    }
    if (r.exitCode !== 0) {
      console.error(
        `OpenSpec step failed: ${s.label}. Later steps did not run.`,
      );
      return false;
    }
  }
  return true;
}

/** Print the steps, and run them when `confirmed`. Return false when a step fails. */
export function setupOpenSpec(projectDir: string, confirmed: boolean): boolean {
  const steps = planOpenSpec(projectDir);
  reportOpenSpecSteps(steps);
  return confirmed ? runOpenSpec(steps, projectDir) : true;
}
