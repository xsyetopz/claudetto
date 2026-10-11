// The glue of the drift check for the hooks module: the handler of `session.start`.
// It reads the facts, and appends one note to the conversation when `rules.mjs` finds a difference.
// The note is a user-role row that the model reads, because a module cannot add context at `session.start` in another way.
// A fact that fails to read gives no line, so a failure cannot make a false report.

/** @import { EngineInterface, Hook } from "claude-code" */

import { driftLines, driftNote } from "./rules.mjs";

/**
 * The result of `read()`, or undefined when it fails.
 * The catch has no narrower test on purpose.
 * The calls of `$` give no documented error type, and a fact with no value gives no line (see above),
 * so a failed read can only remove a line of the note and never adds a false one.
 *
 * @template T
 * @param {() => Promise<T> | T} read
 * @returns {Promise<T | undefined>}
 */
async function attempt(read) {
  try {
    return await read();
  } catch {
    return undefined;
  }
}

/**
 * The note of the drift check, or undefined.
 *
 * @param {EngineInterface} $
 */
async function reportDrift($) {
  const [settings, policy, version, usage, composed, effort, force] =
    await Promise.all([
      attempt(() => $.settings.read()),
      attempt(() => $.settings.read({ source: "policy" })),
      attempt(() => $.session.version()),
      attempt(() => $.session.usage({ breakdown: "summary" })),
      // The `bare` trait keeps the prompt hooks of dotclaude out, so this call only lists the sections of the engine.
      attempt(() => $.prompt.compose({ traits: ["bare"] })),
      attempt(() => $.env.get("CLAUDE_CODE_EFFORT_LEVEL")),
      attempt(() => $.env.get("CLAUDE_CODE_SUBAGENT_MODEL_FORCE")),
    ]);
  const note = driftNote(
    driftLines({
      settings,
      policy,
      version: version?.version,
      skills: usage?.context?.breakdown?.skills?.skillFrontmatter,
      sections: composed?.sections,
      blocking: {
        CLAUDE_CODE_EFFORT_LEVEL: effort,
        CLAUDE_CODE_SUBAGENT_MODEL_FORCE: force,
      },
      root: $.plugin.root,
    }),
  );
  if (note)
    await $.session.append({
      message: { type: "user", content: [{ type: "text", text: note }] },
    });
  return note;
}

/**
 * `session.start`: the drift check runs once, when the session is ready and before the first prompt.
 * The event has no field for the source, so a resumed session shows as a transcript with user turns.
 * A resume keeps the note of the first start in the transcript, so it gets no second note.
 * A turn count that fails to read counts as a new session.
 *
 * @type {Hook<"session.start">}
 */
export async function onSessionStart($, e, next) {
  const started = await next(e);
  const turns = await attempt(() => $.session.turns());
  if (!((turns ?? 0) > 0)) await reportDrift($);
  return started;
}
