// Reads of a Claude Code transcript (`~/.claude/projects/<folder>/<session>.jsonl`), shared by the `start` and `usage` features.

import path from "node:path";
import { rethrowUnless } from "./errors.ts";

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

/** One model request of a transcript: its message id, and its usage. */
export type ModelRequest = {
  id: string | undefined;
  usage: Usage;
};

/** The parsed lines of a transcript. A line that is not a JSON object is left out. */
export async function readEntries(file: string): Promise<Entry[]> {
  const entries: Entry[] = [];
  for (const line of (await Bun.file(file).text()).split("\n")) {
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
}

/** The tokens of one request: input, cache creation, and cache read. */
export function contextOf(usage: Usage): number {
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0)
  );
}

/**
 * The requests of a transcript in order, as `{ id, usage }`.
 * A request is written once for each content block, so the first entry of a message id stands.
 * An entry with no tokens (the synthetic message of Claude Code) is left out.
 */
export function requestsOf(entries: Entry[]): ModelRequest[] {
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
}

/** The characters of a tool-result `content`: a string or a list of text blocks. */
export function charsOf(content: unknown): number {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return (content as Block[]).reduce(
    (n, block) => n + (block?.text?.length ?? 0),
    0,
  );
}

/** The tool calls of a transcript in order, as the `tool_use` blocks. */
export function toolCalls(entries: Entry[]): Block[] {
  const calls: Block[] = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content as Block[])
      if (block?.type === "tool_use") calls.push(block);
  }
  return calls;
}

/** The `agentType` of the transcript `file` from its `.meta.json`, `subagent` when it has none, and `main` for a file outside a `subagents` folder. */
export async function agentType(file: string): Promise<string> {
  if (!file.includes(`${path.sep}subagents${path.sep}`)) return "main";
  try {
    const meta = JSON.parse(
      await Bun.file(file.replace(/\.jsonl$/, ".meta.json")).text(),
    ) as { agentType?: string };
    return meta.agentType || "subagent";
  } catch (err) {
    // A run with no meta file has the default type.
    rethrowUnless(err, "ENOENT", "SyntaxError");
    return "subagent";
  }
}
