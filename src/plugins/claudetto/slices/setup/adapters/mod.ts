// The mod handler of `session.start`: the git excludes of the runtime paths, and the drift check.
// The exclude step is idempotent and fails open, so a failed git call or write changes nothing and stops nothing.
// It reads the facts, and shows one notice to the user when `drift.ts` finds a difference.
// The notice goes to the transcript with `$.ui.log`, which does not send it to the model.
// A note that the model reads went into its reply of the first task, with an offer to change the settings.
// A fact that fails to read gives no line, so a failure cannot make a false report.

import type { EngineInterface, Hook } from "claude-code";
import { oneLine } from "../../../../../kernel/text.ts";
import { driftLines, driftNote } from "../domain/drift.ts";
import { GIT_TIMEOUT_MS } from "../limits.ts";
import { addExcludes } from "./hook-exclude.ts";

/**
 * The result of `read()`, or undefined when it fails.
 * The catch has no narrower test on purpose.
 * The calls of `$` give no documented error type, and a fact with no value gives no line (see above),
 * so a failed read can only remove a line of the note and never adds a false one.
 */
const attempt = async <T>(
  read: () => Promise<T> | T,
): Promise<T | undefined> => {
  try {
    return await read();
  } catch {
    return undefined;
  }
};

/**
 * The note of the drift check, or undefined.
 */
const reportDrift = async ($: EngineInterface): Promise<string | undefined> => {
  const [settings, user, policy, usage, effort, force, socket] =
    await Promise.all([
      attempt(() => $.settings.read()),
      // The `autoMode` lists count only in the user settings, so this read is not the merge.
      attempt(() => $.settings.read({ source: "user" })),
      attempt(() => $.settings.read({ source: "policy" })),
      attempt(() => $.session.usage({ breakdown: "summary" })),
      attempt(() => $.env.get("CLAUDE_CODE_EFFORT_LEVEL")),
      attempt(() => $.env.get("CLAUDE_CODE_SUBAGENT_MODEL_FORCE")),
      attempt(() => $.env.get("SSH_AUTH_SOCK")),
    ]);
  const note = driftNote(
    driftLines({
      settings,
      policy,
      skills: usage?.context?.breakdown?.skills?.skillFrontmatter,
      blocking: {
        CLAUDE_CODE_EFFORT_LEVEL: effort,
        CLAUDE_CODE_SUBAGENT_MODEL_FORCE: force,
      },
      root: $.plugin.root,
      user,
      agentSocket: socket,
    }),
  );
  if (note) $.ui.log(oneLine(note));
  return note;
};

/** The runtime paths in `.git/info/exclude`, through the `$` calls of the host. The files are those of the working folder of the session. */
const excludeAtStart = ($: EngineInterface) =>
  addExcludes({
    git: async (args) => {
      const run = await $.process.run(["git", ...args], {
        timeoutMs: GIT_TIMEOUT_MS,
      });
      return { code: run.exitCode, out: run.stdout.trim() };
    },
    read: async (file) =>
      (await $.fs.exists(file)) ? ((await $.fs.read(file)) as string) : "",
    write: (file, text) => $.fs.write(file, text),
  });

/**
 * `session.start`: the exclude step runs first, and the drift check runs once, when the session is ready and before the first prompt.
 * The event has no field for the source, so a resumed session shows as a transcript with user turns.
 * A resume keeps the note of the first start in the transcript, so it gets no second note.
 * A turn count that fails to read counts as a new session.
 */
export const onSessionStart: Hook<"session.start"> = async ($, e, next) => {
  const started = await next(e);
  await attempt(() => excludeAtStart($));
  const turns = await attempt(() => $.session.turns());
  if (!((turns ?? 0) > 0)) await reportDrift($);
  return started;
};
