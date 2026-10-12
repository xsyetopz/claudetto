// Puts the code items of each `description` in single backticks,
// because the bundle text has them bare and an editor shows the description as Markdown.
// A code item is a settings key of the schema, a dotted path that starts with one,
// a file path, a file name, a slash command, a CLI flag, an env var, a snake_case name, a URL, or `true` and `false`.
// A literal value in quotes with no space, such as 'accept' or "default", loses the quotes and goes in backticks.
// An inline JSON object goes in backticks as one item.
// A tool name goes in backticks only when it is not also an English word, such as `SendMessage`.
// Text that is already in backticks stays as it is.

import type { Schema } from "./model.ts";

const TOOLS = [
  "AskUserQuestion",
  "EnterPlanMode",
  "EnterWorktree",
  "ExitPlanMode",
  "ExitWorktree",
  "ListAgents",
  "NotebookEdit",
  "SendFeedback",
  "SendMessage",
  "TodoWrite",
  "ToolSearch",
  "WebFetch",
  "WebSearch",
];

const PATTERNS = [
  // A permission rule, such as `Read(...)` or `Bash(npm run *)`.
  String.raw`\b[A-Z][A-Za-z]+\([^()]*\)`,
  // A tool name.
  String.raw`\b(?:${TOOLS.join("|")})\b`,
  // A URL.
  String.raw`https?://[^\s)"'\]]+[^\s)"'\].,;:]`,
  // A Windows path, which can hold `Program Files`.
  String.raw`\b[A-Z]:/(?:Program Files/)?[\w.\-/]*\w`,
  // A path from home, the root, or the current folder, or a slash command.
  String.raw`(?<![\w/.\-])(?:~|\.{1,2})?/[\w.\-*/@{}]*[\w*}]`,
  // A dot folder or file, such as `.claude/settings.json` or `.mcp.json`.
  String.raw`(?<![\w/])\.[a-z][\w\-]*(?:[./][\w\-*]+)*`,
  // A file name with a known extension.
  String.raw`\b[\w\-]+(?:\.[\w\-]+)*\.(?:json|jsonl|md|mjs|js|ts|sh|ps1|yaml|yml|toml|txt|plist|exe)\b`,
  // A CLI flag.
  String.raw`(?<![\w\-])--?[a-z](?:[a-z\-]*[a-z])?\b`,
  // An env var.
  String.raw`\b[A-Z][A-Z0-9]*_[A-Z0-9_]*[A-Z0-9]\b(?:=[\w.]+)?`,
  // A snake_case name.
  String.raw`\b[a-z][a-z0-9]*_[a-z0-9_]*[a-z0-9]\b`,
  // A literal value.
  String.raw`\b(?:true|false)\b`,
  // A word that can be a settings key, checked against the keys of the schema.
  String.raw`\b(?<word>[a-zA-Z]\w*(?:\.[a-zA-Z]\w*)*)\b`,
];
const ITEM = new RegExp(PATTERNS.join("|"), "g");

// Each property name in `schema`, at any depth.
const keyNames = (
  schema: unknown,
  out: Set<string> = new Set(),
): Set<string> => {
  if (!schema || typeof schema !== "object") return out;
  const node = schema as Schema;
  for (const [key, sub] of Object.entries(node.properties ?? {})) {
    out.add(key);
    keyNames(sub, out);
  }
  if (node.items) keyNames(node.items, out);
  if (node.additionalProperties) keyNames(node.additionalProperties, out);
  for (const alt of node.anyOf ?? []) keyNames(alt, out);
  return out;
};

// Whether `word` is a key or a dotted path that starts with a key.
// A plain English word that is also a key, such as `model` or `env`, stays as prose
// unless it is camelCase or dotted.
const isKey = (word: string, keys: Set<string>): boolean => {
  const head = word.split(".")[0] as string;
  if (!keys.has(head)) return false;
  return word.includes(".") || /[a-z][A-Z]/.test(word);
};

// `text` with each code item in single backticks.
export const wrapCodeSpans = (text: string, keys: Set<string>): string =>
  text
    .replace(/\{[^{}`]*"[^{}`]*\}/g, (json) => `\`${json}\``)
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/(?<!\w)'([^'\s]+)'(?!\w)/g, "`$1`")
            .replace(/"([^"\s]+)"/g, "`$1`"),
    )
    .join("")
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(ITEM, (item: string, ...rest: unknown[]) =>
            (rest.at(-1) as { word?: string }).word === undefined ||
            isKey(item, keys)
              ? `\`${item}\``
              : item,
          ),
    )
    .join("");

// A copy of `schema` with the code items of each `description` in backticks.
export const applyCodeSpans = <T>(
  schema: T,
  keys: Set<string> = keyNames(schema),
): T => {
  if (Array.isArray(schema))
    return schema.map((item) => applyCodeSpans(item, keys)) as T;
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema))
    out[key] =
      key === "description" && typeof value === "string"
        ? wrapCodeSpans(value, keys)
        : key === "properties"
          ? Object.fromEntries(
              Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                k,
                applyCodeSpans(v, keys),
              ]),
            )
          : applyCodeSpans(value, keys);
  return out as T;
};
