// The parts of a handoff that need no model (design D47): the cache test, the changed files, and the quoted words of the user.

import type { SessionMessage } from "claude-code";
import { jevBody, YES_NO_UNSURE_BAND } from "../../jev/index.ts";
import { clip } from "./compact.ts";
import {
  CACHE_TTL_MS,
  COLD_FILES_MAX,
  COLD_PROMPT_CHARS_MAX,
} from "./limits.ts";
import { OFFER_QUESTION, OFFER_STATE } from "./prompts.ts";

const WRITERS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

/** True when the last request of the main thread is older than the cache TTL, or unseen in this process (a resumed session has no cache). */
export const isCold = (now: number, lastTurnAt: number | null): boolean =>
  lastTurnAt === null || now - lastTurnAt > CACHE_TTL_MS;

export const cut = (text: string): string => clip(text, COLD_PROMPT_CHARS_MAX);

/** The paths that the tool calls changed, each once, the newest `COLD_FILES_MAX` in the order of first change. */
export const changedFiles = (messages: readonly SessionMessage[]): string[] => {
  const files = new Set<string>();
  for (const use of messages.flatMap((m) => m.toolUses)) {
    const path = (use.input as { file_path?: unknown } | undefined)?.file_path;
    if (WRITERS.has(use.tool) && typeof path === "string") files.add(path);
  }
  return [...files].slice(-COLD_FILES_MAX);
};

/** The request body that asks Jev, as the yes or no question `handover`, whether to hand over. `idleMs` is `null` when the process has seen no turn. */
export const offerBody = (v: {
  tokens: number;
  idleMs: number | null;
  task: string;
}) =>
  jevBody(
    OFFER_STATE({
      tokens: String(v.tokens),
      idle:
        v.idleMs === null
          ? "an unknown time"
          : `${Math.round(v.idleMs / 60_000)} minutes`,
      ttl: String(CACHE_TTL_MS / 60_000),
      task: cut(v.task),
    }),
    { handover: { type: "noul", instructions: OFFER_QUESTION } },
  );

/** `Yes` from 0.7 and `No` up to 0.3 (`primitives-noul.md`: the band of `YES_NO_UNSURE_BAND` around 0.5), else `undefined`, and the dialog shows. */
export const offerAnswer = (p: number | undefined): "Yes" | "No" | undefined =>
  p === undefined
    ? undefined
    : p >= 0.5 + YES_NO_UNSURE_BAND
      ? "Yes"
      : p <= 0.5 - YES_NO_UNSURE_BAND
        ? "No"
        : undefined;

/** `texts` as one block quote, with a `>` line between two quoted messages. */
export const quote = (texts: readonly string[]): string =>
  texts
    .map((t) =>
      cut(t.trim())
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n"),
    )
    .join("\n>\n");
