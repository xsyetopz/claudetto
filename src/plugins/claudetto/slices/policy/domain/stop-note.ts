// The note that offers the hard stop of `/claudetto:setup sandbox`, after Claude records a verdict that does not clear a checkout.
// The note goes only to a checkout on this disk whose settings do not yet deny the hosts of `STOP_HOSTS`.
// The settings are the merged settings of the session, which merge `deniedDomains` across the settings files.

import { STOP_HOSTS } from "../../../../../kernel/repo/stop-hosts.ts";
import { NOTE_HARD_STOP } from "../prompts.ts";

/** True when `settings` turn the sandbox on and deny each host of `STOP_HOSTS`. */
const hasStop = (settings: unknown): boolean => {
  const box = (settings as { sandbox?: unknown } | null | undefined)?.sandbox as
    | { enabled?: unknown; network?: { deniedDomains?: unknown } }
    | undefined;
  const denied = box?.network?.deniedDomains;
  return (
    box?.enabled === true &&
    Array.isArray(denied) &&
    STOP_HOSTS.every((h) => denied.includes(h))
  );
};

/**
 * The note for a recorded `verdict` of the repository `key`, with a blank line before it, or `""`.
 * `root` is the checkout on this disk, and `own` tells if the user owns the repository.
 * Only `silent` and `forbidden` get the note, because `allowed` and `conditions` let Claude contribute.
 */
export const stopNoteOf = (
  verdict: string,
  target: { key: string; root: string | undefined; own: boolean },
  settings: unknown,
): string =>
  (verdict === "silent" || verdict === "forbidden") &&
  target.root !== undefined &&
  !target.own &&
  !hasStop(settings)
    ? `\n\n${NOTE_HARD_STOP({ repo: target.key })}`
    : "";
