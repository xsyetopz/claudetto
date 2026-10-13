// Reads of a Claude Code transcript (`~/.claude/projects/<folder>/<session>.jsonl`).
// The `start-cost` slice has its own copy of these shapes and readers, because a slice imports only `kernel/` and its own folder.

import path from "node:path";
import { rethrowUnless } from "../../../../../kernel/errors.ts";
import type { Store } from "../ports.ts";

/** The token counts of one API request, as the transcript records them. */
export type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  } | null;
  iterations?: Iteration[];
};

/** An entry of `usage.iterations`. An advisor call has the `advisor_message` type. */
export type Iteration = Usage & { type?: string; model?: string };

/** The `message` of a transcript line: its request id, its usage, and its content blocks. */
export type Message = {
  id?: string;
  model?: string;
  usage?: Usage;
  content?: Block[] | string;
  stop_reason?: string | null;
};

/** An `attachment` of a transcript line. Its fields depend on its `type`. */
export type Attachment = {
  type: string;
  tools?: { name: string; description?: string }[];
  systemPrompt?: unknown[];
  content?: unknown;
  addedLines?: string[];
  builtInTypes?: string[];
  names?: string[];
  hookEvent?: string;
  files?: unknown;
  style?: unknown;
  [key: string]: unknown;
};

/** One parsed line of a transcript, such as a user, assistant, or attachment record. A line such as a `summary` record has no `timestamp`. */
export type Entry = {
  type?: string;
  subtype?: string;
  timestamp?: string;
  entrypoint?: string;
  isMeta?: boolean;
  error?: string;
  origin?: { kind?: string };
  toolUseResult?: { agentId?: string };
  message?: Message;
  attachment?: Attachment;
  [key: string]: unknown;
};

/** A content block of a message, such as a `text`, `tool_use`, or `tool_result` block, or a tool call. */
export type Block = {
  type?: string;
  text?: string;
  id?: string;
  name?: string;
  input?: {
    file_path?: string;
    command?: string;
    skill?: string;
    description?: string;
    message?: unknown;
  };
  tool_use_id?: string;
  content?: unknown;
};

/** The parsed lines of the transcript text `text`. A line that is not a JSON object is left out. */
export const parseEntries = (text: string): Entry[] => {
  const entries: Entry[] = [];
  for (const line of text.split("\n")) {
    try {
      const entry = JSON.parse(line) as unknown;
      if (entry !== null && typeof entry === "object")
        entries.push(entry as Entry);
    } catch (err) {
      // A blank or a cut line has no entry.
      rethrowUnless(err, "SyntaxError");
    }
  }
  return entries;
};

/** The parsed lines of the transcript `file`. A missing file has no entries. */
export const readEntries = async (
  store: Store,
  file: string,
): Promise<Entry[]> => parseEntries((await store.read(file)) ?? "");

/** The `agentType` of the transcript `file` from its `.meta.json`, `subagent` when it has none, and `main` for a file outside a `subagents` folder. */
export const agentType = async (
  store: Store,
  file: string,
): Promise<string> => {
  if (!file.includes(`${path.sep}subagents${path.sep}`)) return "main";
  const text = await store.read(file.replace(/\.jsonl$/, ".meta.json"));
  // A run with no meta file has the default type.
  if (text === null) return "subagent";
  try {
    const meta = JSON.parse(text) as { agentType?: string } | null;
    return meta?.agentType || "subagent";
  } catch (err) {
    rethrowUnless(err, "SyntaxError");
    return "subagent";
  }
};

/** The tokens of one request: input, cache creation, and cache read. */
export const contextOf = (usage: Usage): number =>
  (usage.input_tokens ?? 0) +
  (usage.cache_creation_input_tokens ?? 0) +
  (usage.cache_read_input_tokens ?? 0);

/** The characters of a tool-result `content`: a string or a list of text blocks. */
export const charsOf = (content: unknown): number => {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return (content as Block[]).reduce(
    (n, block) => n + (block?.text?.length ?? 0),
    0,
  );
};

/** One request of the model: its message id, and its usage. */
export type ModelRequest = {
  id: string | undefined;
  usage: Usage;
};

/**
 * The requests of a transcript in order, as `{ id, usage }`.
 * A request is written once for each content block, so the first entry of a message id stands.
 * An entry with no tokens (the synthetic message of Claude Code) is left out.
 */
export const requestsOf = (entries: Entry[]): ModelRequest[] => {
  const seen = new Set<string>();
  const out: ModelRequest[] = [];
  for (const entry of entries) {
    const message = entry.type === "assistant" ? entry.message : null;
    if (!message?.usage || contextOf(message.usage) === 0) continue;
    if (message.id && seen.has(message.id)) continue;
    if (message.id) seen.add(message.id);
    out.push({ id: message.id, usage: message.usage });
  }
  return out;
};

/** The tool calls of a transcript in order, as the `tool_use` blocks. */
export const toolCalls = (entries: Entry[]): Block[] => {
  const calls: Block[] = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content as Block[])
      if (block?.type === "tool_use") calls.push(block);
  }
  return calls;
};
