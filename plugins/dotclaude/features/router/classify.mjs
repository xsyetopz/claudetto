// The task classifier: rules on the task text, with no model call.

import { KEYWORD_ORDER, KEYWORDS, TYPE_CLASS } from "./data.mjs";

const text = ({ description, prompt }) =>
  `${description ?? ""}\n${prompt ?? ""}`.toLowerCase();

/** The first class in `KEYWORD_ORDER` whose keywords match `s`, or null. */
function byKeyword(s) {
  return KEYWORD_ORDER.find((k) => KEYWORDS[k].test(s)) ?? null;
}

/**
 * The task class of a subagent spawn, from `subagentType`, `description`, and `prompt`.
 * A known type decides the class, and a keyword refines it: a web question to `web`,
 * a rename or migration to `bulk`, and a trust-boundary audit to `audit`.
 * A type with no class (`general-purpose`) gets the class of its keywords, or null when none matches.
 * A null class means that the router leaves the spawn alone.
 */
export function classifySpawn(task) {
  const s = text(task);
  const type = String(task.subagentType ?? "")
    .split(":")
    .pop();
  const base = TYPE_CLASS[type];
  if (!base) return byKeyword(s);
  if (base === "search" && KEYWORDS.web.test(s)) return "web";
  if (base === "scoped" && KEYWORDS.bulk.test(s)) return "bulk";
  if (base === "review" && KEYWORDS.audit.test(s)) return "audit";
  return base;
}

/**
 * The task class of a user prompt for the main loop.
 * The main loop runs only the classes `plan`, `review`, `debug`, and `orchestration`,
 * because a switch to Haiku 5.5 in the main loop costs a cache rebuild and loses the context of the session.
 */
export function classifyPrompt(prompt) {
  const k = byKeyword(String(prompt ?? "").toLowerCase());
  if (k === "audit") return "review";
  return ["plan", "review", "debug"].includes(k) ? k : "orchestration";
}
