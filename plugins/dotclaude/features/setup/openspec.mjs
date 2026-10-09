// The OpenSpec steps of setup.
// `planOpenSpec` only reads.
// `runOpenSpec` writes, and `setupOpenSpec` calls it only with `--openspec --apply`, after the user agrees.
// OpenSpec 1.14.1 has no `--delivery` flag on `init`, so the order is `init`, `config set delivery skills`, `update`.
// `update` then removes the command copies and keeps the skills (probe 2.15).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { run } from "./environment.mjs";
import { OPENSPEC_MIN, olderThan } from "./rules.mjs";

const CONFIG = ["openspec", "config"];

/** True when `dir` holds a file. `openspec update` leaves the empty folder. */
const hasFiles = (dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0;

/** The steps that bring `projectDir` to skills-only delivery with telemetry off. Empty when `openspec` is missing or old. */
export function planOpenSpec(projectDir) {
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
export function reportOpenSpecSteps(steps) {
  if (!steps.length) return;
  console.log("\nOpenSpec steps. To run them, add --openspec to --apply:");
  for (const s of steps) console.log(`  ${s.label}: ${s.cmd.join(" ")}`);
}

/** Run `steps` in `projectDir` in order, and stop at the first failure. Return true when all pass. */
export function runOpenSpec(steps, projectDir) {
  for (const s of steps) {
    console.log(`OpenSpec: ${s.cmd.join(" ")}`);
    const r = spawnSync(s.cmd[0], s.cmd.slice(1), {
      cwd: projectDir,
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.error(
        `OpenSpec step failed: ${s.label}. Later steps did not run.`,
      );
      return false;
    }
  }
  return true;
}

/** Print the steps, and run them when `confirmed`. Return false when a step fails. */
export function setupOpenSpec(projectDir, confirmed) {
  const steps = planOpenSpec(projectDir);
  reportOpenSpecSteps(steps);
  return confirmed ? runOpenSpec(steps, projectDir) : true;
}
