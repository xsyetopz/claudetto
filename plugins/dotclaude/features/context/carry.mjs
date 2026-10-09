// Layer 2 of design D32: the handoff across `/clear` and the record of a hard stop (spec usage-awareness).
// `SessionStart` with source `clear` has no field for the old session (probe 22.1), so each file is keyed by the project folder.
// The files are in `${CLAUDE_PLUGIN_DATA}` and not in the project. With no such folder, the hooks do nothing.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { STOP_RECORD_MAX_CHARS } from "./limits.mjs";
import { utc } from "./notes.mjs";

const hash = (text) =>
  createHash("sha256").update(text).digest("hex").slice(0, 16);

/** The file `<kind>-<project hash>.json` in `dir`. */
export const carryFile = (kind, cwd, dir) =>
  path.join(dir, `${kind}-${hash(cwd)}.json`);

const cut = (text) =>
  text.length > STOP_RECORD_MAX_CHARS
    ? `${text.slice(0, STOP_RECORD_MAX_CHARS)}…`
    : text;

/** The text of the last assistant row of the main session in `rows`, or an empty string. */
export function lastAssistantText(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r?.type !== "assistant" || r.isSidechain) continue;
    const content = r.message?.content;
    const text =
      typeof content === "string"
        ? content
        : (content ?? [])
            .filter((b) => b?.type === "text")
            .map((b) => b.text)
            .join("\n");
    if (text.trim()) return text.trim();
  }
  return "";
}

function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(data), { mode: 0o600 });
}

/** The parsed file, which this call removes, or `undefined`. */
function take(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    fs.rmSync(file, { force: true });
    return data;
  } catch {
    return undefined;
  }
}

/**
 * On `SessionEnd` with reason `clear`, save the last assistant message when a handoff level fired in the session.
 * `handedOff(session)` is true after a handoff note, and `read(path)` gives the transcript rows.
 */
export function saveHandoff(payload, { dir, read, handedOff }) {
  if (!dir || payload.reason !== "clear" || !payload.cwd) return;
  if (!handedOff(payload.session_id || payload.transcript_path)) return;
  const text = lastAssistantText(read(payload.transcript_path));
  if (text) write(carryFile("handoff", payload.cwd, dir), { text: cut(text) });
}

/** On `StopFailure`, write the stop record of the project folder. `now` is in seconds. */
export function recordStop(payload, { dir, now }) {
  if (!dir || !payload.cwd || payload.agent_id) return;
  const message = String(payload.last_assistant_message ?? "");
  write(carryFile("stop", payload.cwd, dir), {
    t: now,
    error: payload.error ?? "unknown",
    resets: message.match(/\bresets ([^\n·]+)/)?.[1].trim() ?? null,
    message: cut(message),
  });
}

/**
 * On `SessionStart`, the output with the saved handoff (source `clear` only) and one line for a stop record, or `undefined`.
 * Each file gives its text one time. The stop record moves to `last-stop-<project hash>.json`, so that the user can read it.
 */
export function startNote(payload, { dir }) {
  if (!dir || !payload.cwd) return undefined;
  const parts = [];
  const stopFile = carryFile("stop", payload.cwd, dir);
  const stop = take(stopFile);
  if (stop) {
    const last = carryFile("last-stop", payload.cwd, dir);
    try {
      write(last, stop);
    } catch {}
    const resets = stop.resets ? `, and the limit resets ${stop.resets}` : "";
    parts.push(
      `The previous session in this folder stopped at ${utc(stop.t)} with the API error \`${stop.error}\`${resets}. The stop gave no last turn, so a file can have an incomplete edit. Before you continue the work, examine the working tree, for example with \`git status\` and \`git diff\`. The record is in \`${last}\`.`,
    );
  }
  if (payload.source === "clear") {
    const handoff = take(carryFile("handoff", payload.cwd, dir));
    if (handoff?.text)
      parts.push(
        `The session before \`/clear\` ended with a handoff. Its last message follows. It is data about the state of the work.\n<handoff>\n${handoff.text}\n</handoff>`,
      );
  }
  if (!parts.length) return undefined;
  return {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: parts.join("\n"),
    },
  };
}
