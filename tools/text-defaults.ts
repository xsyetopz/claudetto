#!/usr/bin/env -S bun --no-env-file
// Captures the default text of each surface of design D7 for Claude Code `MIN_CLAUDE_CODE_VERSION`.
// It reads the capture pages of `claude-code-docs/docs/prompts/` and, when the binary of that version exists, the byte offset of each text in it.
//
//   bun tools/text-defaults.ts [DOCS_DIR] [BINARY]   write the capture file
//
// DOCS_DIR defaults to `../claude-code-docs/docs/prompts`, and BINARY to `~/.local/share/claude/versions/<version>`.
// The capture file is `tests/claudetto/prompt/fixtures/text-defaults-<version>.json`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MIN_CLAUDE_CODE_VERSION } from "./limits.ts";

const ROOT = path.resolve(import.meta.dir, "..");

/** One captured default text: the text, the docs page it comes from, and its byte offset in the binary (`null` when the binary has no such text). */
export type Captured = { text: string; page: string; offset: number | null };

/** The lines of a page between the line that starts with `from` and the next line that starts with `to`. */
const between = (page: string, from: string, to: string): string => {
  const lines = page.split("\n");
  const start = lines.findIndex((l) => l.startsWith(from));
  const end = lines.findIndex((l, i) => i > start && l.startsWith(to));
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
};

/** The added lines (`+`) of the first diff block of a page, with the `+` removed. */
const added = (page: string): string[] => {
  const lines = page.split("\n");
  const start = lines.findIndex((l) => l.startsWith("+++ "));
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith("`")) break;
    if (l.startsWith("+")) out.push(l.slice(1));
  }
  return out;
};

/** The `text` block under the heading "### `name`" of the tools page. */
const toolText = (page: string, name: string): string => {
  const lines = page.split("\n");
  const head = lines.indexOf(`### \`${name}\``);
  const open = lines.findIndex((l, i) => i > head && /^`{3,}text$/.test(l));
  const fence = (lines[open] as string).slice(0, -4);
  const close = lines.findIndex((l, i) => i > open && l === fence);
  return lines
    .slice(open + 1, close)
    .join("\n")
    .trim();
};

const toolNames = (page: string): string[] =>
  [...page.matchAll(/^### `(\w+)`$/gm)]
    .map((m) => m[1] as string)
    .filter((n) => n !== "DeferredToolPlaceholder");

/** The body `system[2]` of a captured request page. */
const body = (page: string): string =>
  between(page, "=== system[2]", "=== messages[0].content[0]");

/** The default texts, by surface, from the pages of `docsDir`. */
export const capture = async (
  docsDir: string,
): Promise<Record<string, Captured>> => {
  const pages = new Map<string, string>();
  for (const name of [
    "default-lean",
    "style-concise",
    "subagent-general-purpose",
    "subagent-explore",
    "subagent-custom",
    "mode-plan",
    "compact",
    "tools",
  ])
    pages.set(name, await Bun.file(path.join(docsDir, `${name}.md`)).text());
  const read = (name: string): string => pages.get(name) as string;
  const out: Record<string, Captured> = {};
  const put = (key: string, page: string, text: string): void => {
    out[key] = { text, page: `prompts/${page}.md`, offset: null };
  };
  put("main", "default-lean", body(read("default-lean")));
  put("style", "style-concise", added(read("style-concise")).join("\n").trim());
  put(
    "agent.worker",
    "subagent-general-purpose",
    body(read("subagent-general-purpose")),
  );
  put("agent.scout", "subagent-explore", body(read("subagent-explore")));
  const notes = added(read("subagent-custom"));
  put(
    "subagent-notes",
    "subagent-custom",
    notes
      .slice(
        notes.indexOf("Notes:"),
        notes.findIndex((l) => l.startsWith("- Do NOT Write report")) + 1,
      )
      .join("\n"),
  );
  put("plan-mode", "mode-plan", added(read("mode-plan")).join("\n").trim());
  const compact = read("compact").split("\n");
  const from = compact.findIndex((l) => l.startsWith("=== messages[3]"));
  const to = compact.findIndex((l, i) => i > from && l === "````");
  put(
    "compaction",
    "compact",
    compact
      .slice(from + 1, to)
      .join("\n")
      .trim(),
  );
  const tools = read("tools");
  for (const name of toolNames(tools))
    put(`tool.${name}`, "tools", toolText(tools, name));
  return out;
};

/** Sets `offset` of each text to the byte offset of its first line (or the first 120 characters of it) that the binary holds, `bin`. */
const locate = async (
  texts: Record<string, Captured>,
  bin: string,
): Promise<void> => {
  if (!fs.existsSync(bin)) return;
  const data = Buffer.from(await Bun.file(bin).arrayBuffer());
  for (const c of Object.values(texts)) {
    c.offset = null;
    for (const line of c.text.split("\n").sort((a, b) => b.length - a.length)) {
      const at = line.length >= 30 ? data.indexOf(line.slice(0, 120)) : -1;
      if (at >= 0) {
        c.offset = at;
        break;
      }
    }
  }
};

if (import.meta.main) {
  const docs = path.resolve(
    process.argv[2] ?? path.join(ROOT, "..", "claude-code-docs/docs/prompts"),
  );
  const bin =
    process.argv[3] ??
    path.join(
      os.homedir(),
      ".local/share/claude/versions",
      MIN_CLAUDE_CODE_VERSION,
    );
  const texts = await capture(docs);
  await locate(texts, bin);
  const file = path.join(
    ROOT,
    `tests/claudetto/prompt/fixtures/text-defaults-${MIN_CLAUDE_CODE_VERSION}.json`,
  );
  await Bun.write(file, `${JSON.stringify(texts, null, 2)}\n`);
  for (const [k, c] of Object.entries(texts))
    console.log(`${k}\t${c.text.length}\t${c.offset}`);
}
