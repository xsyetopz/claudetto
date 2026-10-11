// The usage of the subagents and of the tool results of a session.

import fs from "node:fs";
import path from "node:path";
import {
  agentType,
  charsOf,
  contextOf,
  readEntries,
  requestsOf,
  toolCalls,
} from "../../lib/transcript.mjs";

/**
 * One row for each subagent transcript of a session file: the requests,
 * the context of the final request, and the input tokens summed over all requests.
 * Subagent transcripts are in the folder next to the session file, named like it.
 */
export function subagentRuns(sessionFile) {
  const dir = path.join(sessionFile.replace(/\.jsonl$/, ""), "subagents");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .map((f) => {
      const requests = requestsOf(readEntries(path.join(dir, f)));
      return {
        id: f.replace(/^agent-|\.jsonl$/g, ""),
        agentType: agentType(path.join(dir, f)),
        requests: requests.length,
        finalContext: requests.length
          ? contextOf(requests[requests.length - 1].usage)
          : 0,
        totalInput: requests.reduce((n, r) => n + contextOf(r.usage), 0),
      };
    });
}

/** The tool-result characters of the main session for each tool, as `{ tool, count, chars, largest }` in order of size. */
export function toolResults(entries) {
  const names = new Map(toolCalls(entries).map((c) => [c.id, c.name]));
  const by = new Map();
  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== "tool_result") continue;
      const tool = names.get(block.tool_use_id) ?? "unknown";
      const chars = charsOf(block.content);
      const row = by.get(tool) ?? { tool, count: 0, chars: 0, largest: 0 };
      row.count += 1;
      row.chars += chars;
      row.largest = Math.max(row.largest, chars);
      by.set(tool, row);
    }
  }
  return [...by.values()].sort((a, b) => b.chars - a.chars);
}

// A command that only prints a file, and the shell separators that end it.
const PRINTERS = ["cat", "sed", "head", "tail", "wc"];
const SEPARATORS = /&&|;|\|\||\n/;
const FILE_NAME = /\.[a-z]{1,5}$/i;
// An output redirect or a heredoc marker, with its target: the command writes that file or reads stdin.
const REDIRECT = /\d*>>?(?!&)\s*\S+|<<-?\s*\S+/g;

/** The file names that a `Bash` command prints with `cat`, `sed -n`, `head`, `tail`, or `wc`. */
function printedFiles(command) {
  const files = [];
  for (const part of command.split(SEPARATORS)) {
    const words = part.split("|")[0].replace(REDIRECT, " ").trim().split(/\s+/);
    let i = 0;
    while (/^\w+=/.test(words[i] ?? "")) i += 1;
    if (!PRINTERS.includes(words[i])) continue;
    if (words[i] === "sed" && !words.includes("-n")) continue;
    for (const word of words.slice(i + 1)) {
      const w = word.replace(/^["']|["']$/g, "");
      if (w.startsWith("-") || /[*?{}]/.test(w) || !FILE_NAME.test(w)) continue;
      files.push(w);
    }
  }
  return files;
}

/**
 * The file reads of the main session, from `Read` calls and from `Bash` commands that print a file.
 * A call is one read, and it is a repeat when an earlier call touched a file of the same name.
 */
export function repeatReads(entries) {
  const seen = new Set();
  let reads = 0;
  let repeats = 0;
  const byFile = new Map();
  for (const call of toolCalls(entries)) {
    let files = [];
    if (call.name === "Read" && call.input?.file_path)
      files = [call.input.file_path];
    else if (call.name === "Bash")
      files = printedFiles(call.input?.command ?? "");
    if (!files.length) continue;
    const names = files.map((f) => path.basename(f));
    reads += 1;
    if (names.some((n) => seen.has(n))) repeats += 1;
    for (const n of names) {
      seen.add(n);
      byFile.set(n, (byFile.get(n) ?? 0) + 1);
    }
  }
  const most = [...byFile.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return { reads, repeats, most };
}
