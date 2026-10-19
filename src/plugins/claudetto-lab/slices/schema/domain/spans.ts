import type { Schema } from "./types.ts";

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
  String.raw`\b[A-Z][A-Za-z]+\([^()]*\)`,
  String.raw`\b(?:${TOOLS.join("|")})\b`,
  String.raw`https?://[^\s)"'\]]+[^\s)"'\].,;:]`,
  String.raw`\b[A-Z]:/(?:Program Files/)?[\w.\-/]*\w`,
  String.raw`(?<![\w/.\-])(?:~|\.{1,2})?/[\w.\-*/@{}]*[\w*}]`,
  String.raw`(?<![\w/])\.[a-z][\w\-]*(?:[./][\w\-*]+)*`,
  String.raw`\b[\w\-]+(?:\.[\w\-]+)*\.(?:json|jsonl|md|mjs|js|ts|sh|ps1|yaml|yml|toml|txt|plist|exe)\b`,
  String.raw`(?<![\w\-])--?[a-z](?:[a-z\-]*[a-z])?\b`,
  String.raw`\b[A-Z][A-Z0-9]*_[A-Z0-9_]*[A-Z0-9]\b(?:=[\w.]+)?`,
  String.raw`\b[a-z][a-z0-9]*_[a-z0-9_]*[a-z0-9]\b`,
  String.raw`\b(?:true|false)\b`,
  String.raw`\b(?<word>[a-zA-Z]\w*(?:\.[a-zA-Z]\w*)*)\b`,
];
const ITEM = new RegExp(PATTERNS.join("|"), "g");

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

const isKey = (word: string, keys: Set<string>): boolean => {
  const head = word.split(".")[0] as string;
  if (!keys.has(head)) return false;
  return word.includes(".") || /[a-z][A-Z]/.test(word);
};

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
