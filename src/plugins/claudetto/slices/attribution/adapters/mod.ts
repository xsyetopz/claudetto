// The mod handlers of the `attribution` slice: the attribution reminder, as Claude Code sends it (`domain/reminder.ts`).
// `prompt.submit` adds the reminder to the context of a prompt when the lines changed since the last one, such as after a model switch.
// The engine puts the `<system-reminder>` wrapper around each context entry.
// After a compaction that stands (the filter leaves out `precompute`), the conversation no longer holds the reminder, so the next prompt sends it again.
// A new subagent that is not a fork gets the reminder at the end of its task prompt.
// Both hooks also write the commit line to the record of the session, which the `commit-msg` hook of git reads (`kernel/commit-hook`).
// An empty record file means that the commit line is off, so the git hook passes.
// The call of `agent.spawn` names the model only when the caller chose it, so the commit line of another subagent names `Claude`.

import type { Handler } from "../../../../../kernel/slice.ts";
import { linesOf } from "../domain/lines.ts";
import { agentFile, MAIN_FILE, recordDir } from "../domain/record.ts";
import { managedOf, reminderToSend } from "../domain/reminder.ts";
import { SUBAGENT_REMINDER } from "../prompts.ts";

/** The reminder that the conversation of each session holds. */
const sent = new Map<string, string>();

/** The value of `read`, or `undefined` when the engine cannot give it, so the event passes on with no change. */
const quiet = async <T>(read: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await read();
  } catch {
    return undefined;
  }
};

export { onBash, onPullRequestTool } from "./git.ts";

type Engine = Parameters<Handler<"prompt.submit">>[0];

/** The commit lines that this process wrote, by file path, so that a line is written once. */
const written = new Map<string, string>();

/**
 * Writes `line` to the record file `file` of `session`, and when the line is off, empties each file of the session.
 * A missing home folder or a failed write leaves the record as it is.
 */
const record = (
  $: Engine,
  session: string,
  file: string,
  line: string,
): Promise<unknown> =>
  quiet(async () => {
    const home = await $.env.get("HOME");
    if (home === undefined) return;
    const dir = recordDir(home, session);
    const path = `${dir}/${file}`;
    if (written.get(path) === line) return;
    written.set(path, line);
    if (line !== "") return $.fs.write(path, line);
    if (!(await $.fs.exists(dir))) return;
    for (const entry of await $.fs.list(dir))
      if (entry.kind === "file") await $.fs.write(`${dir}/${entry.name}`, "");
  });

/** The reminder for the lines of `model` and the session, or `undefined` when the engine cannot give the settings. */
const reminderNow = (
  $: Engine,
  model: () => Promise<string | undefined>,
  last: (session: string) => string | undefined,
) =>
  quiet(async () => {
    const session = await $.session.id();
    const lines = linesOf(await $.settings.read(), await model());
    const policy = await $.settings.read({ source: "policy" });
    return {
      session,
      commit: lines.commit,
      text: reminderToSend(lines, managedOf(policy), last(session)),
    };
  });

export const onSubmit: Handler<"prompt.submit"> = async ($, e, next) => {
  const now = await reminderNow(
    $,
    () => $.session.model(),
    (s) => sent.get(s),
  );
  if (now) await record($, now.session, MAIN_FILE, now.commit);
  if (now?.text === undefined) return next(e);
  const out = await next({ ...e, context: [...(e.context ?? []), now.text] });
  if (out.drop === undefined) sent.set(now.session, now.text);
  return out;
};

export const onCompact: Handler<"session.compact"> = async ($, e, next) => {
  const out = await next(e);
  if (out.skip === undefined && e.agentId === undefined) {
    const session = await quiet(() => $.session.id());
    if (session !== undefined) sent.delete(session);
  }
  return out;
};

export const onSpawn: Handler<"agent.spawn"> = async ($, e, next) => {
  if (e.resume !== undefined) return next(e);
  const now = await reminderNow(
    $,
    async () => e.model,
    () => undefined,
  );
  if (now) await record($, now.session, agentFile(e.model), now.commit);
  if (now?.text === undefined) return next(e);
  const text = SUBAGENT_REMINDER({ text: now.text });
  return next({ ...e, prompt: `${e.prompt}\n\n${text}` });
};
