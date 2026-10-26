// The extraction of the commands, the plugins, the attachments, and the single built-ins from the bundle text.
// Each pattern starts from the shape of the code, not from a list of known names.
// A size is the static text of the part that the model reads (`scan.ts`). A part that shows twice keeps its larger size.

import {
  type Found,
  type Group,
  KEBAB,
  keep,
  nameOf,
  openOf,
  type Part,
  parts,
} from "./found.ts";
import { extractPrompt } from "./prompt.ts";
import { blockEnd, bytesWithRefs, literalBytes } from "./scan.ts";

/** Commands: objects with `type:"local"|"local-jsx"|"prompt"` and a top-level `name:` in any order. The size is the text of `description` and `argumentHint`. */
const commands = (t: string): Part[] => {
  const f: Found = new Map();
  for (const m of t.matchAll(/\btype:"(?:local|local-jsx|prompt)"/g)) {
    const open = openOf(t, m.index);
    const name = nameOf(t, open, KEBAB);
    const own = t.slice(open, open + 1200);
    if (!name || !/\b(?:description|load|call)\b/.test(own)) continue;
    const text = ["description", "argumentHint"].map(
      (k) => new RegExp(`${k}:"((?:[^"\\\\]|\\\\.)*)"`).exec(own)?.[1] ?? "",
    );
    keep(f, name, Buffer.byteLength(text.join("")) || null);
  }
  return parts("commands", f);
};

/** Plugins: the `cc-plugin-<name>` lines of the bundle. No size, because a plugin holds parts that other rows count. */
const plugins = (t: string): Part[] =>
  parts(
    "plugins",
    new Map(
      [...t.matchAll(/\ncc-plugin-([a-z][a-z0-9-]*)(?=\n)/g)].map((m) => [
        m[1] as string,
        null,
      ]),
    ),
  );

/** The static bytes of the longest renderer of the kind: a `case"kind":` branch, or a `kind:(e)=>` entry of the map of renderers. */
const renderBytes = (t: string, kind: string): number | null => {
  let best = 0;
  const label = `case"${kind}":`;
  for (let at = t.indexOf(label); at >= 0; at = t.indexOf(label, at + 1))
    best = Math.max(
      best,
      bytesWithRefs(
        t,
        at + label.length,
        blockEnd(t, at + label.length, /^(?:case"|default:)/),
      ),
    );
  for (const m of t.matchAll(new RegExp(`[,{]${kind}:(?:async)?\\(`, "g")))
    best = Math.max(
      best,
      bytesWithRefs(t, m.index + 1, blockEnd(t, m.index + 1)),
    );
  return best || null;
};

/**
 * Attachments: the union of every literal array of 20 or more snake_case strings that holds `"todo_reminder"`
 * (the sets that resume and the request builder keep), and every `attachment.type===` comparison.
 */
const attachments = (t: string): Part[] => {
  const kinds = new Set<string>();
  for (const m of t.matchAll(
    /\[(?:(?:"[a-z][a-z0-9_]*"|\.\.\.\[\]),?){20,}\]/g,
  ))
    if (m[0].includes('"todo_reminder"'))
      for (const k of m[0].matchAll(/"([^"]+)"/g)) kinds.add(k[1] as string);
  for (const m of t.matchAll(/attachment\.type[!=]==?"([a-z][a-z0-9_]*)"/g))
    kinds.add(m[1] as string);
  return [...kinds].map((name) => ({
    group: "attachments",
    name,
    bytes: renderBytes(t, name),
  }));
};

/** Single built-ins: one row each, found by a phrase (`present`). The size is the template literals that hold the `phrases` (a dash when none is in the bundle). */
// biome-ignore format: a table
const SINGLES: [Group, string, string, string[]][] = [
  ["compaction", "summary prompt", "Your task is to create a detailed summary", ["Your task is to create a detailed summary of the conversation so far", "Your task is to create a detailed summary of this conversation. This summary"]],
  ["attribution", "commit and PR", "Co-Authored-By: ${", ["Co-Authored-By: ${", "Generated with [Claude Code]"]],
  ["git", "instructions", "# Committing changes with git", ["# Committing changes with git"]],
  ["statusline", "statusLine", '"statusLine"', []],
  ["servertools", "advisor", "advisor_2", ["which constraint breaks the tie"]],
];
const singles = (t: string): Part[] =>
  SINGLES.filter(([, , present]) => t.includes(present)).map(
    ([group, name, , phrases]) => {
      const starts = new Set(
        phrases
          .map((p) => t.lastIndexOf("`", t.indexOf(p)))
          .filter((k) => k >= 0),
      );
      return {
        group,
        name,
        bytes: starts.size
          ? [...starts].reduce((n, k) => n + literalBytes(t, k), 0)
          : null,
      };
    },
  );

/** All parts of the bundle text `t`. */
export const extract = (t: string): Part[] => [
  ...commands(t),
  ...plugins(t),
  ...attachments(t),
  ...extractPrompt(t),
  ...singles(t),
];
