// The profile items that wait for an eval.
// Each item cuts prompt size or traffic, and might cost quality, so it is off by default.
// `settings.mjs --with <name>` adds an item to the profile, and an eval arm uses the same switch.
// An item moves into `profile.json` only after `just eval` shows no loss beyond the noise bound.

import { OPT_IN } from "./optin.mjs";

/** The eval-gated items. Each part is merged into the profile when its name is given. */
export const GATED = {
  telemetry: {
    env: { DISABLE_TELEMETRY: "1" },
  },
  "nonessential-traffic": {
    env: { CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
  },
  "subagent-cache-1h": { subagentPromptCacheTtl: "1h" },
};

/** `profile` with the parts of the items in `names`. An unknown name throws. */
export function withGated(profile, names) {
  const items = { ...GATED, ...OPT_IN };
  const out = structuredClone(profile);
  for (const name of names) {
    if (!Object.hasOwn(items, name))
      throw new Error(
        `Unknown item "${name}". Use ${Object.keys(items).join(", ")}.`,
      );
    for (const [key, part] of Object.entries(items[name])) {
      out[key] = Array.isArray(part)
        ? [...(out[key] ?? []), ...part]
        : isObject(part)
          ? mergeObject(out[key] ?? {}, part)
          : part;
    }
  }
  return out;
}

function mergeObject(base, part) {
  const out = { ...base };
  for (const [key, value] of Object.entries(part))
    out[key] = Array.isArray(value)
      ? [...new Set([...(base[key] ?? []), ...value])]
      : value;
  return out;
}

const isObject = (value) => value !== null && typeof value === "object";
