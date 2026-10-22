// Stubs that the lab tests of the handoff share.

import type { On, SessionMessage } from "claude-code";

export const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Read a.txt.", toolUses: [], handle: "h0" },
  { role: "assistant", text: "Done.", toolUses: [], handle: "h1" },
];

export const stubSession = (on: On): void => {
  on("session.model", () => ({ value: "claude-haiku-5-5" }));
  on("fs.stat", () => ({
    value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
  }));
  on("session.compact", () => ({ skip: "the built-in compaction" }));
};
