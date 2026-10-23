// The file readers of the inventory of `claudetto-setup`: the settings, the skills, the plugins, and the Context7 files.
import path from "node:path";
import { fileReader, writeAtomic } from "../../../kernel/node/fs.ts";
import { obj, type PluginInfo } from "../domain/inventory.ts";
import { isObject, type Json } from "../domain/merge.ts";

/** The parsed JSON of `file`, `{}` when the file is missing. Throws on text that is not a JSON object. */
export const readSettings = async (file: string): Promise<Json> => {
  const data: unknown = JSON.parse((await fileReader.read(file)) ?? "{}");
  if (!isObject(data)) throw new Error("The settings are not an object.");
  return data;
};

/** Writes `file` as `change` makes it from its text, when the text differs. */
export const amend = async (file: string, change: (text: string) => string) => {
  const text = (await fileReader.read(file)) ?? "";
  const next = change(text);
  if (next !== text) await writeAtomic(file, next);
};

/** The frontmatter `description` of the skill file `text`, or all of `text` when it has none. */
const skillDescription = (text: string): string => {
  try {
    const meta = Bun.YAML.parse(text.split(/^---$/m)[1] ?? "") as Json | null;
    const description = meta?.["description"];
    if (typeof description === "string") return description;
  } catch {}
  return text;
};

/** The sorted names in `dir` that `test` accepts, each with the text of its file. */
const textsIn = async (
  dir: string,
  test: RegExp,
): Promise<[string, string][]> => {
  const names = (await fileReader.list(dir)).sort().filter((n) => test.test(n));
  return Promise.all(
    names.map(
      async (n) =>
        [n, (await fileReader.read(path.join(dir, n))) ?? ""] as [
          string,
          string,
        ],
    ),
  );
};

/** The official Context7 skill `find-docs` and the Context7 rules in `dir`, each with the characters that it adds to each session. */
export const context7Files = async (
  dir: string,
): Promise<[string, number][]> => {
  const skill = path.join(dir, "skills", "find-docs", "SKILL.md");
  const text = await fileReader.read(skill);
  const rules = await textsIn(path.join(dir, "rules"), /context7.*\.md$/i);
  return [
    ...(text === null
      ? []
      : [[skill, skillDescription(text).length] as [string, number]]),
    ...rules.map(
      ([n, x]) => [path.join(dir, "rules", n), x.length] as [string, number],
    ),
  ];
};

/** Each rule file `*.md` in the `rules` folder of `dir`, as `[name, characters]`. */
export const rulesIn = async (dir: string): Promise<[string, number][]> =>
  (await textsIn(path.join(dir, "rules"), /\.md$/)).map(([n, x]) => [
    n,
    x.length,
  ]);

/** The skills in `dir` of `scope`, each as `[scope, name, description]`. */
export const skillsIn = async (
  dir: string,
  scope: string,
): Promise<[string, string, string][]> => {
  const skills = path.join(dir, "skills");
  const found: [string, string, string][] = [];
  for (const name of (await fileReader.list(skills)).sort()) {
    const text = await fileReader.read(path.join(skills, name, "SKILL.md"));
    if (text !== null) found.push([scope, name, skillDescription(text)]);
  }
  return found;
};

/** The parsed JSON of `file`, `{}` when it is missing or bad. */
export const readOr = (file: string): Promise<Json> =>
  readSettings(file).catch(() => ({}));

/**
 * What each plugin of `enabled` adds, from its `plugin.json` and its entry in the marketplace file, under the config folder `dir`.
 * An LSP plugin of a marketplace with `strict: false` declares its servers only in that entry.
 */
export const pluginInfo = async (
  dir: string,
  enabled: unknown,
): Promise<Record<string, PluginInfo>> => {
  const installed = await readOr(
    path.join(dir, "plugins", "installed_plugins.json"),
  );
  const markets = await readOr(
    path.join(dir, "plugins", "known_marketplaces.json"),
  );
  const on = isObject(enabled) ? enabled : {};
  const out: Record<string, PluginInfo> = {};
  for (const id of Object.keys(on).filter((k) => on[k] === true)) {
    const [name, market = ""] = id.split("@");
    const root = (obj(installed["plugins"])[id] as Json[] | undefined)?.[0]?.[
      "installPath"
    ];
    const location = obj(markets[market])["installLocation"];
    const list =
      typeof location === "string"
        ? (
            await readOr(
              path.join(location, ".claude-plugin", "marketplace.json"),
            )
          )["plugins"]
        : [];
    const entry = obj(
      (Array.isArray(list) ? list : []).find((p) => obj(p)["name"] === name),
    );
    const isRoot = typeof root === "string";
    const manifest = isRoot
      ? await readOr(path.join(root, ".claude-plugin", "plugin.json"))
      : {};
    const servers =
      [manifest["lspServers"], entry["lspServers"]].find(isObject) ?? {};
    const description = manifest["description"] ?? entry["description"];
    out[id] = {
      description: typeof description === "string" ? description : null,
      lsp: Object.values(servers).flatMap((s) =>
        Object.keys(obj(obj(s)["extensionToLanguage"])),
      ),
      skills: isRoot
        ? (await fileReader.list(path.join(root, "skills"))).sort()
        : [],
    };
  }
  return out;
};
