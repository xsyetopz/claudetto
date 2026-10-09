// The CVP gate of setup.
// An account in the Cyber Verification Program (CVP) gets `claude-mythos-5-1` in place of `claude-fable-5-1`.
// An answer alone grants nothing, because any user can answer yes.
// So a probe call must show that Mythos 5.1 serves the account: exit 0, and `modelUsage` names only Mythos 5.1.
// A call for a model outside `availableModels` falls back to another model without an error, so `is_error` is not a gate.

import { spawnSync } from "node:child_process";

export const FABLE = "claude-fable-5-1";
export const MYTHOS = "claude-mythos-5-1";

/** The probe command. `--settings` allows Mythos 5.1 for the call, whatever the profile holds. */
export const PROBE = [
  "claude",
  [
    "-p",
    "Reply with the one word: ok",
    "--model",
    MYTHOS,
    "--settings",
    JSON.stringify({ availableModels: [MYTHOS] }),
    "--output-format",
    "json",
  ],
];

/**
 * The model for the CVP gate, from the answer and the probe result.
 * `probe` is `null` (no probe ran) or `{ status, stdout }` of the process.
 * Returns `{ model, reason }`. The reason is a line for the user when `model` is Fable 5.1 after a yes.
 */
export function decideModel(answer, probe) {
  if (answer !== "yes") return { model: FABLE, reason: "" };
  const keep = (reason) => ({
    model: FABLE,
    reason: `The account cannot call Mythos 5.1 (${reason}). Setup keeps Fable 5.1.`,
  });
  if (!probe) return keep("no probe result");
  if (probe.status !== 0) return keep(`the probe exited with ${probe.status}`);
  let usage;
  try {
    usage = JSON.parse(probe.stdout)?.modelUsage;
  } catch {
    return keep("the probe output is not JSON");
  }
  if (usage === null || typeof usage !== "object")
    return keep("the probe output has no `modelUsage`");
  const names = Object.keys(usage);
  if (names.length !== 1 || names[0] !== MYTHOS)
    return keep(`the probe was served by ${names.join(", ") || "no model"}`);
  return { model: MYTHOS, reason: "" };
}

const spawnRun = (command, args) =>
  spawnSync(command, args, { encoding: "utf8", timeout: 120_000 });

/**
 * `profile` with the model that the gate picks in `availableModels`.
 * `say(line)` gets the reason when a yes does not win Mythos 5.1.
 * `run(command, args)` is the process call (tests give a fixture) and returns `{ status, stdout }`. It runs only after a yes.
 */
export function withCvp(profile, answer, say, run = spawnRun) {
  let probe = null;
  if (answer === "yes") {
    try {
      probe = run(...PROBE);
    } catch (err) {
      probe = { status: err.message, stdout: "" };
    }
  }
  const { model, reason } = decideModel(answer, probe);
  const out = structuredClone(profile);
  out.availableModels = (out.availableModels ?? []).map((m) =>
    m === FABLE || m === MYTHOS ? model : m,
  );
  if (reason) say(reason);
  return out;
}
