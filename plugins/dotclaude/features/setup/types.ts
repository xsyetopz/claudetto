// The shared types of the setup steps.
// The parsed JSON files arrive as `any`, so these types name only the keys that the steps read.

/** One command of a setup step, and the label that the report prints for it. */
export type Step = { label: string; cmd: string[] };

/** The state lines, the global installs to offer, and the project steps of the add-ons. */
export type AddonPlan = {
  lines: string[];
  installs: string[];
  steps: Step[];
};

/** One change line of a settings merge, and the key path that it names. */
export type Change = { key: string; line: string };

/** The parsed `installed_plugins.json`, where `plugins` maps each plugin ID to its entries. */
export type InstalledPlugins =
  | { plugins?: Record<string, unknown> }
  | null
  | undefined;

/** The parsed user settings, where `enabledPlugins` maps each plugin ID to its state. */
export type UserSettings =
  | { enabledPlugins?: Record<string, unknown> }
  | null
  | undefined;
