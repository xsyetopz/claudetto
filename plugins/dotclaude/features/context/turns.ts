// The turn bound of a subagent (design D22, task 10.9).
// A subagent has no turn count in its context, so the hook counts the turns in the transcript
// and reads `maxTurns` from the agent file.

import path from "node:path";
import { rethrowUnless, UNREADABLE } from "../../lib/errors.ts";
import { TURNS_LEFT_AT } from "./limits.ts";

/** One parsed line of a transcript, with the fields that the hooks read. */
export type TranscriptRow = {
  type?: string;
  message?: {
    id?: string;
    model?: string;
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
};

/** The folder of the agent files of this plugin. */
const AGENTS_DIR = path.join(import.meta.dirname, "../../agents");

/** All parsed rows of `file`, or none when it is absent. The count of turns needs the whole file, because a tail can cut early rows. */
export async function allRows(file: string): Promise<TranscriptRow[]> {
  let text: string;
  try {
    text = await Bun.file(file).text();
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return [];
  }
  return parseRows(text.split("\n"));
}

/** The parsed rows of `lines`. A line that is not JSON, such as a cut first line, is skipped. */
export function parseRows(lines: string[]): TranscriptRow[] {
  const rows: TranscriptRow[] = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch (err) {
      rethrowUnless(err, "SyntaxError");
    }
  }
  return rows;
}

/**
 * The assistant turns in `rows`.
 * A row can repeat the `message.id` of an earlier row, and one id is one API response, so the count is of distinct ids.
 * A row with no id counts as one turn.
 */
export function countTurns(rows: TranscriptRow[]): number {
  const ids = new Set();
  let anonymous = 0;
  for (const row of rows) {
    if (row?.type !== "assistant" || !row.message) continue;
    if (row.message.id) ids.add(row.message.id);
    else anonymous++;
  }
  return ids.size + anonymous;
}

/** The `maxTurns` in the frontmatter of the agent `agentType` (a `dotclaude:` prefix is allowed), or undefined. */
export async function maxTurnsOf(
  agentType: string | undefined,
  dir: string = AGENTS_DIR,
): Promise<number | undefined> {
  const name = String(agentType ?? "").replace(/^dotclaude:/, "");
  if (!/^[a-z][a-z0-9-]*$/.test(name)) return undefined;
  try {
    const head = (await Bun.file(path.join(dir, `${name}.md`)).text()).split(
      /\n---/,
    )[0] as string;
    const value = /^maxTurns:\s*(\d+)\s*$/m.exec(head)?.[1];
    return value ? Number(value) : undefined;
  } catch (err) {
    rethrowUnless(err, ...UNREADABLE);
    return undefined;
  }
}

/** The facts for a subagent with `turns` of `maxTurns`, or undefined while more than `TURNS_LEFT_AT` turns are left. */
export function turnFact(
  turns: number,
  maxTurns: number | undefined,
): string | undefined {
  if (!maxTurns || maxTurns - turns > TURNS_LEFT_AT) return undefined;
  return `You made ${turns} turns, and the limit is ${maxTurns} turns.`;
}
