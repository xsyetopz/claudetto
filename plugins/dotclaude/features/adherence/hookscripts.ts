// The scripts that a hook config names, as pure functions.
// Choice: the adherence hook is a command hook that runs on Node.js, so it can read the config files.
// For a file `rel`, it reads `hooks/hooks.json` and the inline `hooks` of `.claude-plugin/plugin.json`
// in each folder from the project root down to the folder of `rel`.
// It also reads the `hooks` of the project settings files (`SETTINGS_HOOK_FILES`) at the project root.
// It resolves a script path in a `command` against that folder (the plugin root), or against the project root
// when the path starts with `${CLAUDE_PROJECT_DIR}`. The prefix `${CLAUDE_PLUGIN_ROOT}` and a `./` prefix mean the plugin root.
// A path that it cannot resolve to a relative path, such as an absolute path, is ignored.

import { PLUGIN_MANIFEST, SETTINGS_HOOK_FILES } from "./limits.ts";
import type { Reader } from "./text.ts";

/** A parsed JSON file, read as an object. Undefined when the file is absent or not JSON. */
type Parsed = Record<string, unknown> | undefined;

const SCRIPT = /\.(?:[cm]?[jt]s|sh|bash|zsh|py|rb|pl)$/;
const PROJECT = /^\$(?:\{CLAUDE_PROJECT_DIR\}|CLAUDE_PROJECT_DIR)\//;
const PLUGIN = /^\$(?:\{CLAUDE_PLUGIN_ROOT\}|CLAUDE_PLUGIN_ROOT)\//;

/** The `command` strings in a parsed `hooks.json` value, at any depth. */
function commands(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) for (const v of value) commands(v, out);
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value))
      if (k === "command" && typeof v === "string") out.push(v);
      else commands(v, out);
  return out;
}

/** The normal form of a relative path: no `.` part, and `..` parts folded. Undefined when the path leaves the root. */
function normal(p: string): string | undefined {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (!out.pop()) return undefined;
    } else out.push(part);
  }
  return out.join("/");
}

/** The script paths in `command`, each relative to the project root, for a plugin folder `dir` ("" for the root). */
export function scriptPaths(command: string, dir: string): string[] {
  const out: string[] = [];
  const bare = command.replace(/"(\$(?:\{\w+\}|\w+))"/g, "$1");
  for (const raw of bare.split(/[\s"';&|()]+/)) {
    if (!SCRIPT.test(raw) || raw.startsWith("-") || raw.startsWith("/"))
      continue;
    const fromRoot = PROJECT.test(raw);
    const rest = raw.replace(PROJECT, "").replace(PLUGIN, "");
    if (rest.startsWith("$") || rest.startsWith("~")) continue;
    const full = normal(fromRoot || !dir ? rest : `${dir}/${rest}`);
    if (full) out.push(full);
  }
  return out;
}

/** The parsed files of one hook call, by the `read` function of that call. */
const PARSED = new WeakMap<Reader, Map<string, Parsed>>();

/** The parsed JSON of the file `file`, or undefined when it is absent or not JSON. One parse for each file and each `read`. */
async function parsed(read: Reader, file: string): Promise<Parsed> {
  const cache = PARSED.get(read) ?? new Map<string, Parsed>();
  PARSED.set(read, cache);
  if (!cache.has(file)) cache.set(file, parseFile(await read(file)));
  return cache.get(file);
}

function parseFile(text: string | null): Parsed {
  if (text === null || text === undefined) return undefined;
  try {
    return JSON.parse(text) as Parsed;
  } catch {
    return undefined;
  }
}

/**
 * True when a hook config above `rel` names `rel` as a script in a `command`.
 * `read(file)` gives the text of an absolute path or null, and `root` is the project folder.
 */
export async function namedByHooks(
  rel: string,
  root: string,
  read: Reader,
): Promise<boolean> {
  const names = (json: unknown, dir: string): boolean =>
    commands(json).some((c) => scriptPaths(c, dir).includes(rel));
  for (const file of SETTINGS_HOOK_FILES)
    if (names((await parsed(read, `${root}/${file}`))?.["hooks"], ""))
      return true;
  const dirs = rel.split("/").slice(0, -1);
  for (let n = 0; n <= dirs.length; n++) {
    const dir = dirs.slice(0, n).join("/");
    const base = `${root}/${dir ? `${dir}/` : ""}`;
    if (names(await parsed(read, `${base}hooks/hooks.json`), dir)) return true;
    if (
      names((await parsed(read, `${base}${PLUGIN_MANIFEST}`))?.["hooks"], dir)
    )
      return true;
  }
  return false;
}
