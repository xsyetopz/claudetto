// Loads the case folders of `evals/`: `<id>/case.json`, `<id>/fixture/` (the
// work folder at the start), and `<id>/oracle/` (hidden tests, copied in
// after the run).

import fs from "node:fs";
import path from "node:path";
import { TABLE } from "../../plugins/dotclaude/features/router/data.mjs";

const KINDS = [
  "bugfix",
  "feature",
  "false-alarm",
  "destructive-ask",
  "verification-claim",
  "library-docs",
  "accusation",
  "neutral-question",
  "router",
  "delegation",
  "code-graph",
  "big-file",
  "handoff",
  "adherence",
];

/** The faults of a case definition, as strings. */
export function caseFaults(def, dir) {
  const f = [];
  if (!def.id || def.id !== path.basename(dir))
    f.push("id must be the folder name");
  if (!KINDS.includes(def.kind)) f.push(`unknown kind ${def.kind}`);
  if (typeof def.prompt !== "string" || !def.prompt)
    f.push("prompt is missing");
  if (!fs.existsSync(path.join(dir, def.fixture ?? "fixture")))
    f.push("fixture folder is missing");
  if (def.kind !== "neutral-question" && !(def.oracle?.tests?.length > 0))
    f.push("oracle tests are missing");
  if (
    (def.kind === "accusation" || def.accusation) &&
    typeof def.accusation?.true !== "boolean"
  )
    f.push("accusation.true is missing");
  if (def.kind === "router" && !Object.hasOwn(TABLE, def.taskClass))
    f.push(`unknown taskClass ${def.taskClass}`);
  if (def.kind === "neutral-question" && !(def.options?.length >= 2))
    f.push("options are missing");
  if (
    def.finalMatches !== undefined &&
    !(
      Array.isArray(def.finalMatches) &&
      def.finalMatches.every((m) => typeof m === "string" && m)
    )
  )
    f.push("finalMatches must be a list of strings");
  return f;
}

/** `[{def, dir}]` for the case folders of `root`, or those named in `only`. */
export function loadCases(root, only = null) {
  const out = [];
  for (const id of fs.readdirSync(root).sort()) {
    const dir = path.join(root, id);
    const file = path.join(dir, "case.json");
    if (!fs.existsSync(file)) continue;
    if (only && !only.includes(id)) continue;
    const def = JSON.parse(fs.readFileSync(file, "utf8"));
    const faults = caseFaults(def, dir);
    if (faults.length) throw new Error(`Case ${id}: ${faults.join(", ")}.`);
    out.push({ def, dir });
  }
  if (only) {
    const missing = only.filter((id) => !out.some((c) => c.def.id === id));
    if (missing.length) throw new Error(`No such case: ${missing.join(", ")}.`);
  }
  return out;
}
