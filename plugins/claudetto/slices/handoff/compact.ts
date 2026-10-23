// The handoff file (design D13, spec `handover`): its path, and the text at its start with the open change and the passed checks.

import type { OpenChange } from "../../kernel/change.ts";
import { proven } from "../../kernel/checks.ts";
import { HANDOFF_DIR } from "../../kernel/paths.ts";
import { CHANGE_HEADER, CHECKS_LINE } from "./prompts.ts";

/** `text` cut to `max` characters, with `...` at the cut. */
export const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

/** The path from the project root, such as `.claudetto/handoffs/handoff-20261015T101010Z.md` (UTC). */
export const handoffPath = (now: Date): string => {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return `${HANDOFF_DIR}/handoff-${stamp}.md`;
};

/**
 * `text` with the open change at its start: the folder, the next open task, and the passed `checks`.
 * A checked box with no passed check of its task is open (spec `handover`, "Box with No Check"):
 * `lines` holds the task lines by id, and `proven` in `kernel/checks.ts` tests them.
 * With no change, only the passed checks are added, and with none the text stays as it is.
 */
export const withChange = (
  text: string,
  change: OpenChange | null,
  checks: readonly string[] = [],
  lines: ReadonlyMap<string, { line: string }> = new Map(),
): string => {
  const passed =
    checks.length === 0 ? "none" : checks.map((c) => `\`${c}\``).join(", ");
  if (change === null)
    return checks.length === 0
      ? text
      : [CHECKS_LINE({ checks: passed }), "", text].join("\n");
  const ids = (list: readonly string[]) =>
    list.length === 0 ? "none" : list.map((id) => `\`${id}\``).join(", ");
  const isProved = (id: string) => proven(lines.get(id)?.line ?? "", checks);
  return [
    CHANGE_HEADER({
      name: change.name,
      next: change.next,
      done: ids(change.done.filter(isProved)),
      unproved: ids(change.done.filter((id) => !isProved(id))),
      checks: passed,
    }),
    "",
    text,
  ].join("\n");
};
