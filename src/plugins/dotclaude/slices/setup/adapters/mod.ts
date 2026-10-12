// The mod handler of the drift check: `session.start`.
// It reads the facts, and appends one note to the conversation when `drift.ts` finds a difference.
// The note is a user-role row that the model reads, because a module cannot add context at `session.start` in another way.
// A fact that fails to read gives no line, so a failure cannot make a false report.

import type { EngineInterface, Hook } from "claude-code";
import { failedText, wordsOf } from "../../../../../kernel/skill-command.ts";
import type { Handler } from "../../../../../kernel/slice.ts";
import { driftLines, driftNote } from "../domain/drift.ts";

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
  const [settings, user, policy, version, usage, composed, effort, force] =
    await Promise.all([
      attempt(() => $.settings.read()),
      // The `autoMode` lists count only in the user settings, so this read is not the merge.
      attempt(() => $.settings.read({ source: "user" })),
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
      user,
    }),
  );
  if (note)
    await $.session.append({
      message: { type: "user", content: [{ type: "text", text: note }] },
    });
  return note;
};

/**
 * `session.start`: the drift check runs once, when the session is ready and before the first prompt.
 * The event has no field for the source, so a resumed session shows as a transcript with user turns.
 * A resume keeps the note of the first start in the transcript, so it gets no second note.
 * A turn count that fails to read counts as a new session.
 */
export const onSessionStart: Hook<"session.start"> = async ($, e, next) => {
  const started = await next(e);
  const turns = await attempt(() => $.session.turns());
  if (!((turns ?? 0) > 0)) await reportDrift($);
  return started;
};

// The handler that answers the typed command `/dotclaude:setup` with no model turn.
// It runs the previews of the skill `setup` (steps 2 and 3), asks with `$.ui.ask`, and runs the apply (step 5).
// A global install of an add-on tool is not here, because `dotclaude-setup addons` never runs one.
// The skill stays for a call of the model, for a command with arguments that need a shell, and for those installs.

/** The time that one run of the CLI may take, in milliseconds. */
const TIMEOUT_MS = 120_000;
const SCOPES = ["user", "project", "local"] as const;
const APPLY = "Apply";
const SKIP = "Skip";

/** Runs `dotclaude-setup` with `words`, and gives the text of the run. */
const runSetup = async (
  $: Parameters<Handler<"command.run">>[0],
  words: string[],
): Promise<string> => {
  const run = await $.process.run(
    ["bun", "--no-env-file", `${$.plugin.root}/bin/dotclaude-setup`, ...words],
    { timeoutMs: TIMEOUT_MS },
  );
  const text = (run.exitCode === 0 ? run.stdout : run.stderr || run.stdout).trim();
  return run.exitCode === 0
    ? text
    : `dotclaude-setup ${words.join(" ")} failed with exit status ${run.exitCode}.\n${text}`;
};

/** Steps 2, 3, and 5 of the skill: preview, ask, apply. */
export const onSetup: Handler<"command.run"> = async ($, e, next) => {
  const words = wordsOf(e.args);
  if (words === undefined || words.length > 1) return next(e);
  const given = SCOPES.find((scope) => scope === words[0]);
  if (words.length === 1 && given === undefined) return next(e);
  try {
    const scope =
      given ?? (await $.ui.ask("Which settings file should get the snippet?", [...SCOPES]));
    if (!SCOPES.some((s) => s === scope)) return { text: "Setup stopped: no scope." };
    const settings = await runSetup($, ["settings", "--scope", scope]);
    const addons = await runSetup($, ["addons"]);
    const out = [settings, addons];
    if ((await $.ui.ask("Apply the settings changes?", [APPLY, SKIP])) === APPLY)
      out.push(await runSetup($, ["settings", "--scope", scope, "--apply"]));
    if ((await $.ui.ask("Run the add-on project steps?", [APPLY, SKIP])) === APPLY)
      out.push(await runSetup($, ["addons", "--apply"]));
    out.push("Restart Claude Code to load the changes.");
    return { text: out.join("\n\n") };
  } catch (error) {
    // The catch has no narrower test, because `$.process.run` and `$.ui.ask` document no error type.
    // `$.ui.ask` rejects when the user dismisses the dialog and in a `-p` run, so nothing is applied then.
    return { text: failedText("dotclaude-setup", error) };
  }
};
