// The arguments of `just eval` (see `cli.mjs` for the usage).

import {
  EVAL_CONCURRENCY_DEFAULT,
  EVAL_COST_LIMIT_USD,
  EVAL_RUNS_DEFAULT,
} from "../limits.mjs";
import {
  ADDON_ARMS,
  ARMS,
  CONCISE_ARM,
  DELEGATION_ARMS,
  GATED_ARMS,
  STOP_CHECK_ARMS,
  STYLE_PREFIX,
  VARIANT_ARMS,
} from "./arms.mjs";

function positive(v, name) {
  const n = Number(v);
  if (!(n > 0)) throw new Error(`\`${name}\` needs a number above 0.`);
  return n;
}

const text = (v) => v;

/** The items as code spans, for a message. */
const codes = (items) => items.map((x) => `\`${x}\``).join(", ");

// Flag to its field and the parser of its value.
const VALUE_FLAGS = {
  "--cases": ["cases", (v) => v.split(",")],
  "--runs": ["runs", positive],
  "--limit": ["limit", positive],
  "--model": ["model", text],
  "--variant": ["variant", text],
  "--profile": ["profile", text],
  "--env": ["env", text],
  "--out": ["out", text],
  "--claude-version": ["claudeVersion", text],
  "--gated": ["gated", (v) => v.split(",")],
  "--styles": ["styles", (v) => v.split(",")],
  "--concurrency": ["concurrency", positive],
  "--suite": ["suite", text],
};

// Flag to the field that it sets to true.
const SWITCHES = {
  "--dry-run": "dryRun",
  "--no-delegation": "noDelegation",
  "--no-stop-check": "noStopCheck",
  "--no-addons": "noAddons",
  "--router": "router",
};

export function parseArgs(argv) {
  const o = {
    runs: EVAL_RUNS_DEFAULT,
    limit: EVAL_COST_LIMIT_USD,
    concurrency: EVAL_CONCURRENCY_DEFAULT,
    model: "sonnet",
    claudeVersion: "2.1.295",
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (Object.hasOwn(SWITCHES, a)) {
      o[SWITCHES[a]] = true;
      continue;
    }
    if (!Object.hasOwn(VALUE_FLAGS, a))
      throw new Error(`Unknown argument: \`${a}\`.`);
    if (i + 1 >= argv.length) throw new Error(`\`${a}\` needs a value.`);
    const [field, parse] = VALUE_FLAGS[a];
    o[field] = parse(argv[++i], a);
  }
  if (o.variant && o.noDelegation)
    throw new Error("`--variant` and `--no-delegation` cannot run together.");
  if (o.noStopCheck && (o.variant || o.noDelegation || o.router || o.gated))
    throw new Error(
      "`--no-stop-check` cannot run with `--variant`, `--no-delegation`, `--router`, or `--gated`.",
    );
  if (
    o.noAddons &&
    (o.variant || o.noDelegation || o.noStopCheck || o.router || o.gated)
  )
    throw new Error(
      "`--no-addons` cannot run with `--variant`, `--no-delegation`, `--no-stop-check`, `--router`, or `--gated`.",
    );
  if (o.router && (o.variant || o.noDelegation))
    throw new Error(
      "`--router` cannot run with `--variant` or `--no-delegation`.",
    );
  if (o.gated) {
    const unknown = o.gated.filter((g) => !GATED_ARMS.includes(`gated-${g}`));
    if (unknown.length)
      throw new Error(
        `Unknown gated item: ${codes(unknown)}. Known: ${codes(GATED_ARMS.map((a) => a.slice(6)))}.`,
      );
    if (o.variant || o.noDelegation || o.router)
      throw new Error(
        "`--gated` cannot run with `--variant`, `--no-delegation`, or `--router`.",
      );
    o.arms = ["dotclaude", ...o.gated.map((g) => `gated-${g}`)];
  } else if (o.styles) {
    if (
      o.variant ||
      o.noDelegation ||
      o.noStopCheck ||
      o.noAddons ||
      o.router ||
      o.gated
    )
      throw new Error("`--styles` runs only with the common flags.");
    const bad = o.styles.filter((n) => !/^[a-z0-9-]+$/.test(n));
    if (bad.length)
      throw new Error(
        `Bad style name: ${codes(bad)}. A name has only a to z, 0 to 9, and \`-\`.`,
      );
    o.arms = [
      "dotclaude",
      CONCISE_ARM,
      ...o.styles.map((n) => `${STYLE_PREFIX}${n}`),
    ];
  } else if (o.variant) o.arms = VARIANT_ARMS;
  else if (o.noStopCheck) o.arms = STOP_CHECK_ARMS;
  else if (o.noAddons) o.arms = ADDON_ARMS;
  else o.arms = o.noDelegation ? DELEGATION_ARMS : ARMS;
  return o;
}
