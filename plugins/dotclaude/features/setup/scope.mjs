// The scope of each profile key.
// Claude Code reads some keys only from user settings and local settings.
// The schema of 2.1.294 says so in the description of each key.

/** The keys that Claude Code ignores in project settings (`.claude/settings.json`). */
export const NOT_IN_PROJECT = [
  "syncClaudeAiSkills",
  "syncClaudeAiPlugins",
  "modelPicker",
  "footerLinksRegexes",
  "autoMemoryDirectory",
];

/**
 * The files to write for the scope the user picked, each with its part of `profile`.
 * Project scope sends the `NOT_IN_PROJECT` keys to local settings, which Claude Code reads for them.
 * `moved` names those keys, so that setup can tell the user where they went.
 */
export function splitProfile(profile, scope) {
  if (scope !== "project") return [{ scope, profile, moved: [] }];
  const moved = Object.keys(profile).filter((k) => NOT_IN_PROJECT.includes(k));
  if (!moved.length) return [{ scope, profile, moved }];
  const local = Object.fromEntries(moved.map((k) => [k, profile[k]]));
  const project = Object.fromEntries(
    Object.entries(profile).filter(([k]) => !moved.includes(k)),
  );
  return [
    { scope: "project", profile: project, moved: [] },
    { scope: "local", profile: local, moved },
  ];
}
