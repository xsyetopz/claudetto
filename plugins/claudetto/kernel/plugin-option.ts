// The value of a plugin option for a command that gets no `CLAUDE_PLUGIN_OPTION_*` env var.

/** The env var, else the first string value of the option in a `<plugin>@*` entry of `pluginConfigs` in the user settings. */
export const pluginOption = (
  plugin: string,
  name: string,
  env: Record<string, string | undefined>,
  settings: unknown,
): string | undefined => {
  const fromEnv = env[`CLAUDE_PLUGIN_OPTION_${name.toUpperCase()}`];
  if (fromEnv) return fromEnv;
  const configs = (settings as { pluginConfigs?: unknown } | null | undefined)
    ?.pluginConfigs;
  if (typeof configs !== "object" || configs === null) return undefined;
  for (const [id, config] of Object.entries(configs)) {
    const value = (config as { options?: Record<string, unknown> } | null)
      ?.options?.[name];
    if (id.startsWith(`${plugin}@`) && typeof value === "string") return value;
  }
  return undefined;
};
