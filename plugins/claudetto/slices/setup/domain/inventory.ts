// The inventory of `claudetto-setup --inventory` (spec `setup`, "Inventory"): names, sizes, and values, and no email, name, or UUID.
import { type MemoryFile, ruleRows } from "./claude-md.ts";
import { isObject, type Json } from "./merge.ts";

export const obj = (v: unknown): Json => (isObject(v) ? v : {});

const BUILTIN = "@builtin";

/** The key paths where `current` sets a scalar that differs from `snippet`. A list only gains entries, so it is no conflict. */
const conflicts = (
  current: unknown,
  snippet: Json,
  at = "",
): { key: string; user: unknown; snippet: unknown }[] =>
  Object.entries(snippet).flatMap(([key, value]) => {
    const where = at ? `${at}.${key}` : key;
    const had = obj(current)[key];
    if (isObject(value)) return conflicts(had, value, where);
    if (had === undefined || Array.isArray(value)) return [];
    if (JSON.stringify(had) === JSON.stringify(value)) return [];
    return [{ key: where, user: had, snippet: value }];
  });

/** What an enabled plugin adds: its docs text, the file extensions of its LSP servers, and its skill names. */
export type PluginInfo = {
  description: string | null;
  lsp: string[];
  skills: string[];
};

/** The OpenSpec installs that setup finds (design D20): `global` by package manager, the `openspec` on `PATH`, and the files of its skills and commands. */
export type OpenspecFinds = {
  global: { manager: string; version: string }[];
  path: string | null;
  skills: string[];
  commands: string[];
  devDependency: string[];
};

/** The inventory of the settings `current` against `snippet`. A built-in mod with no value is `null`, which is its default state. */
export const inventory = (v: {
  current: Json;
  snippet: Json;
  state: Json;
  mcpJson: Json;
  projectDir: string;
  plan: { tier: string; cap: number | undefined };
  skills: [string, string, string][];
  pluginInfo: Record<string, PluginInfo>;
  openspec: OpenspecFinds;
  rules: [string, number][];
  memoryFiles: MemoryFile[];
}): Json => {
  const plugins = obj(v.current["enabledPlugins"]);
  const builtins = [
    ...Object.keys(obj(v.snippet["enabledPlugins"])),
    ...Object.keys(plugins),
  ].filter((id) => id.endsWith(BUILTIN));
  const copies = new Map(
    Object.entries(v.pluginInfo).flatMap(([id, { skills }]) =>
      skills.map((n) => [n, `${id.split("@")[0]}:${n}`] as const),
    ),
  );
  const scopes: [string, unknown][] = [
    ["user", v.state["mcpServers"]],
    ["local", obj(obj(v.state["projects"])[v.projectDir])["mcpServers"]],
    ["project", v.mcpJson["mcpServers"]],
  ];
  const env = obj(v.current["env"]);
  return {
    plan: { tier: v.plan.tier, cap: v.plan.cap ?? null },
    plugins: Object.keys(plugins)
      .filter((id) => plugins[id] === true && !id.endsWith(BUILTIN))
      .map((id) => {
        const info = v.pluginInfo[id];
        return {
          id,
          description: info?.description ?? null,
          ...(info?.lsp.length && { lsp: info.lsp }),
        };
      }),
    builtins: Object.fromEntries(
      [...new Set(builtins)].map((id) => [id, plugins[id] ?? null]),
    ),
    mcpServers: scopes.flatMap(([scope, servers]) =>
      Object.keys(obj(servers)).map((name) => ({ name, scope })),
    ),
    skills: v.skills.map(([scope, name, description]) => ({
      name,
      scope,
      description,
      chars: description.length,
      ...(copies.has(name) && { copyOf: copies.get(name) }),
    })),
    claudeAiSync: {
      syncClaudeAiSkills: v.current["syncClaudeAiSkills"] ?? null,
      syncClaudeAiPlugins: v.current["syncClaudeAiPlugins"] ?? null,
      ENABLE_CLAUDEAI_MCP_SERVERS: env["ENABLE_CLAUDEAI_MCP_SERVERS"] ?? null,
    },
    openspec: v.openspec,
    rules: ruleRows(
      v.rules,
      v.skills.filter(([scope]) => scope === "user").map(([, name]) => name),
      Object.keys(plugins).some(
        (id) => id.startsWith("claudetto-docs@") && plugins[id] === true,
      ),
    ),
    memoryFiles: v.memoryFiles,
    conflicts: conflicts(v.current, v.snippet),
  };
};
