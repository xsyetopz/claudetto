// The profile parts that depend on an add-on plugin.
// Setup merges a part only when the add-on is installed, so the core profile stays small.
// This file names the add-on as text and imports nothing from it.

/** The profile part of each add-on, by plugin name. */
export const ADDON_PARTS = {
  // `ctx7` runs through `npx`, so it needs the npm registry, and it asks `context7.com` for docs.
  // The `allowed-tools` line of the skill does not approve its `ctx7` call on Claude Code 2.1.294 (live run),
  // so the profile allows the skill and the same command form. A test pins the form to the skill.
  "dotclaude-docs": {
    permissions: {
      allow: [
        "Skill(dotclaude-docs:docs)",
        "Bash(CTX7_TELEMETRY_DISABLED=1 npx -y ctx7@0.5.14 *)",
      ],
    },
    sandbox: {
      network: { allowedDomains: ["context7.com", "registry.npmjs.org"] },
    },
  },
};

/**
 * The names in `ADDON_PARTS` that are installed and not disabled.
 * `installed` is the parsed `installed_plugins.json`, and `enabled` is the `enabledPlugins` map.
 */
export function installedAddons(installed, enabled) {
  const keys = new Set([
    ...Object.keys(installed?.plugins ?? {}),
    ...Object.keys(enabled ?? {}).filter((key) => enabled[key] === true),
  ]);
  return Object.keys(ADDON_PARTS).filter((name) =>
    [...keys].some(
      (key) => key.split("@")[0] === name && enabled?.[key] !== false,
    ),
  );
}

/** `profile` with the parts of the add-ons in `names`. Arrays join without a repeat. */
export function withAddons(profile, names) {
  let out = structuredClone(profile);
  for (const name of names) out = merge(out, ADDON_PARTS[name]);
  return out;
}

function merge(base, part) {
  const out = { ...base };
  for (const [key, value] of Object.entries(part))
    out[key] = Array.isArray(value)
      ? [...new Set([...(base[key] ?? []), ...value])]
      : typeof value === "object" && value !== null
        ? merge(base[key] ?? {}, value)
        : value;
  return out;
}
